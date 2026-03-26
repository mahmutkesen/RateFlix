const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const auth = require('../middleware/auth');

// Get all PUBLIC lists (community page)
router.get('/public', listController.getAllPublicLists);

// Get all lists for a user
router.get('/', auth, listController.getUserLists);

// Get a specific list
router.get('/:id', listController.getList);

// Create a new custom list
router.post('/', auth, listController.createList);

// Add item to a list
router.post('/:id/items', auth, listController.addItemToList);

// Remove item from a list
router.delete('/:id/items/:tmdbId', auth, listController.removeItemFromList);

// Like / Dislike a list
router.post('/:id/like', auth, listController.toggleListLike);
router.post('/:id/dislike', auth, listController.toggleListDislike);

// Update custom list
router.patch('/:id', auth, listController.updateList);

// Delete custom list
router.delete('/:id', auth, listController.deleteList);

module.exports = router;
