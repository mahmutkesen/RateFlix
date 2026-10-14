const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { authLimiter, emailLimiter } = require('../middleware/rateLimiter');

// Register (Rate limited)
router.post('/register', authLimiter, authController.register);

// Login (Rate limited)
router.post('/login', authLimiter, authController.login);

// Get Me (Profile Info)
router.get('/me', auth, authController.getMe);

// Verify Email
router.get('/verify/:token', authController.verifyEmail);

// Test Email (Protected - only authenticated users/admins to prevent open email spam)
router.get('/test-email', auth, authController.testEmail);

// Profile & Social
router.get('/profile/:id', optionalAuth, authController.getUserProfile);
router.get('/search', authController.searchUsers);
router.post('/follow/:id', auth, authController.followUser);
router.post('/unfollow/:id', auth, authController.unfollowUser);

// Password Reset (Rate limited)
router.post('/forgot-password', emailLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
