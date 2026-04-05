const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const auth = require('../middleware/auth');

// Public routes (Search, Trending, Details)
router.get('/popular', movieController.getPopularMovies);
router.get('/top-rated', movieController.getTopRatedMovies);
router.get('/search', movieController.searchMovies);
router.get('/', movieController.filterMovies);
router.get('/:id', movieController.getMovieDetails);

// Private routes (Rating, Liking)
router.post('/:id/rate', auth, movieController.rateMovie);
router.post('/:id/like', auth, movieController.likeMovie);

module.exports = router;
