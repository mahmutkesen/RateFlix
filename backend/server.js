const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const axios = require('axios');
const { initRedis } = require('./utils/redisClient');
const { initRabbitMQ } = require('./utils/rabbitClient');
const { startWorker } = require('./workers/notificationWorker');
const { sanitizeMiddleware } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();

// Trust reverse proxy (Render, Vercel, Nginx, Cloudflare)
app.set('trust proxy', 1);

// HTTP Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'https://rateflix-backend.onrender.com',
    'https://rateflix01.vercel.app'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) ||
                          /\.onrender\.com$/.test(origin) ||
                          /\.vercel\.app$/.test(origin);
        if (isAllowed) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Payload Limit to prevent DoS
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Input Sanitization (NoSQL Injection & XSS Protection)
app.use(sanitizeMiddleware);

// Request Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health Check & Keep-Alive Endpoints (No rate-limit, keep Render & MongoDB warm)
app.get(['/', '/health', '/api/health'], async (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    let dbPing = false;
    if (dbState === 1 && mongoose.connection.db) {
        try {
            await mongoose.connection.db.admin().ping();
            dbPing = true;
        } catch (e) {
            dbPing = false;
        }
    }

    res.json({
        status: 'ok',
        service: 'RateFlix Backend API',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            state: dbStatusMap[dbState] || 'unknown',
            alive: dbPing
        }
    });
});

// Apply API Rate Limiting to routes
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

// Global 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ message: 'İstenen kaynak bulunamadı' });
});

// Global Safe Error Handler (Prevents stack trace / database info leakage)
app.use((err, req, res, next) => {
    console.error('[UNHANDLED ERROR]:', err);
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Geçersiz parametre formatı' });
    }
    res.status(500).json({ message: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.' });
});

// Resilient MongoDB Connection
let isConnecting = false;
const connectDB = async () => {
    if (isConnecting) return;
    isConnecting = true;

    if (process.env.USE_MEMORY_DB === 'true') {
        console.log('Running in Pure Javascript In-Memory Mode (No MongoDB Dependency)');
        initRedis();
        initRabbitMQ().then(() => startWorker());
        isConnecting = false;
        return;
    }

    if (!process.env.MONGO_URI) {
        console.error('🔴 MONGO_URI is missing in environment configuration.');
        isConnecting = false;
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log('🟢 MongoDB Connected Successfully');
        initRedis();
        initRabbitMQ().then(() => startWorker());
    } catch (err) {
        console.error('🔴 MongoDB Connection Error:', err.message);
        console.log('⏳ MongoDB connection failed. Will retry in 10 seconds...');
        setTimeout(() => {
            isConnecting = false;
            connectDB();
        }, 10000);
        return;
    }
    isConnecting = false;
};

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection lost. Attempting reconnect in 5 seconds...');
    setTimeout(connectDB, 5000);
});

connectDB();

// Periodic Keep-Alive Ping (Self ping every 13 minutes while alive)
const KEEP_ALIVE_INTERVAL = 13 * 60 * 1000;
setInterval(async () => {
    const targetUrl = process.env.BACKEND_URL || 'https://rateflix-backend.onrender.com';
    try {
        await axios.get(`${targetUrl}/api/health`, { timeout: 10000 });
        console.log(`[KEEP-ALIVE] Pinged ${targetUrl}/api/health successfully.`);
    } catch (e) {
        // Silent catch for keepalive
    }
}, KEEP_ALIVE_INTERVAL);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
