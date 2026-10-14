const rateLimit = require('express-rate-limit');

// General API Rate Limiter: 300 requests per 15 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.'
    }
});

// Strict Rate Limiter for Login and Register: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Çok fazla giriş veya kayıt denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.'
    }
});

// Strict Rate Limiter for Password Reset / Email: 5 requests per 15 minutes
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'E-posta gönderme limiti aşıldı. Lütfen bir süre sonra tekrar deneyin.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    emailLimiter
};
