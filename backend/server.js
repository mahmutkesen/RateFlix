const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/admin', require('./routes/admin'));

// MongoDB Connection
if (process.env.USE_MEMORY_DB === 'true') {
    console.log('Running in Pure Javascript In-Memory Mode (No MongoDB Dependency)');
} else {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB Connected'))
        .catch(err => console.error('MongoDB Connection Error: ', err.message));
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
