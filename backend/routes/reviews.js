const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

// Get ALL reviews (community feed)
router.get('/all', reviewController.getAllReviews);

// Get average rating for a movie/show
router.get('/average/:tmdbId/:mediaType', reviewController.getAverageRating);

// Get items sorted by RateFlix rating
router.get('/top-rated', reviewController.getTopRatedItems);

// Get user's reviews
router.get('/user', auth, reviewController.getUserReviews);

// Get all reviews for a specific TMDB item
router.get('/:tmdbId/:mediaType', reviewController.getReviewsByItem);

// Add or update a review
router.post('/', auth, reviewController.addReview);

// Like / Dislike a review
router.post('/:id/like', auth, reviewController.toggleReviewLike);
router.post('/:id/dislike', auth, reviewController.toggleReviewDislike);

// Delete a review
router.delete('/:id', auth, reviewController.deleteReview);

module.exports = router;
