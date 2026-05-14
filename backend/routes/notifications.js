const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @desc    Get user notifications
// @route   GET /api/notifications
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        
        if (notification.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        notification.isRead = true;
        await notification.save();
        res.json(notification);
    } catch (err) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

module.exports = router;
