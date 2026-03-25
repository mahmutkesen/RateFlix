const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const optionalAuth = require('../middleware/optionalAuth');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Get Me (Profile Info)
router.get('/me', auth, authController.getMe);

// Verify Email
router.get('/verify/:token', authController.verifyEmail);
router.get('/test-email', authController.testEmail);

// Profile & Social
router.get('/profile/:id', optionalAuth, authController.getUserProfile);
router.get('/search', authController.searchUsers);
router.post('/follow/:id', auth, authController.followUser);
router.post('/unfollow/:id', auth, authController.unfollowUser);

// Password Reset (Mock)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
