const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Watchlist routes
router.put('/:userId/watchlist', auth, userController.addToWatchlist);
router.delete('/:userId/watchlist/:movieId', auth, userController.removeFromWatchlist);

// Watched list routes
router.put('/:userId/watched', auth, userController.addToWatched);

module.exports = router;
