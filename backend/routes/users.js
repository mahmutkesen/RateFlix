const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

// Friend activity feed (must come before :userId)
router.get('/friends/activity', auth, userController.getFriendActivity);

// User reactions (liked & disliked reviews, lists, comments)
router.get('/:userId/reactions', optionalAuth, userController.getUserReactions);

// Watchlist routes
router.put('/:userId/watchlist', auth, userController.addToWatchlist);
router.delete('/:userId/watchlist/:movieId', auth, userController.removeFromWatchlist);

// Watched list routes
router.put('/:userId/watched', auth, userController.addToWatched);

module.exports = router;

