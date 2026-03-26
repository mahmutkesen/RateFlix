const User = require('../models/User');
const Review = require('../models/Review');
const List = require('../models/List');

// @desc    Get site statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const reviewCount = await Review.countDocuments();
        const listCount = await List.countDocuments({ type: 'custom' });
         
        res.json({
            users: userCount,
            reviews: reviewCount,
            lists: listCount,
            newReviewsToday: 0
        });
    } catch (err) {
        console.error('getStats Error:', err);
        res.status(500).send('Server Error');
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error('getAllUsers Error:', err);
        res.status(500).send('Server Error');
    }
};



// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.role = role;
        await user.save();

        res.json({ message: `User role updated to ${role}`, user: { id: user._id, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Prevent admin from deleting themselves (optional but safer)
        if (user._id.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own admin account' });
        }

        // Cleanup user data (reviews, lists) - Optional: you might want to keep them but anonymize
        await Promise.all([
            Review.deleteMany({ user: user._id }),
            List.deleteMany({ user: user._id }),
            User.findByIdAndDelete(req.params.id)
        ]);

        res.json({ message: 'User and associated data removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
