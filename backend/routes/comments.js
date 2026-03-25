const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const auth = require('../middleware/auth');

// @route   POST api/comments
// @desc    Add a comment
router.post('/', auth, commentController.addComment);

// @route   GET api/comments/:targetId
// @desc    Get top 10 comments for a review or list
router.get('/:targetId', commentController.getComments);

// @route   POST api/comments/:id/like
// @desc    Toggle like on a comment
router.post('/:id/like', auth, commentController.toggleCommentLike);

// @route   POST api/comments/:id/dislike
// @desc    Toggle dislike on a comment
router.post('/:id/dislike', auth, commentController.toggleCommentDislike);

// @route   DELETE api/comments/:id
// @desc    Delete a comment
router.delete('/:id', auth, commentController.deleteComment);

module.exports = router;
