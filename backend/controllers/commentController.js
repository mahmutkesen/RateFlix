const Comment = require('../models/Comment');

exports.addComment = async (req, res) => {
    try {
        const { content, targetId, targetType } = req.body;
        const newComment = new Comment({
            user: req.user.id,
            content,
            targetId,
            targetType
        });
        await newComment.save();
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'username profilePic');
        res.status(201).json(populatedComment);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.getComments = async (req, res) => {
    try {
        const { targetId } = req.params;
        const comments = await Comment.find({ targetId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'username profilePic');
        res.json(comments);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.toggleCommentLike = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        
        const userId = req.user.id;
        const liked = comment.likes.includes(userId);
        
        if (liked) {
            comment.likes = comment.likes.filter(id => id.toString() !== userId);
        } else {
            comment.likes.push(userId);
            comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
        }
        
        await comment.save();
        res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length, liked: !liked, disliked: false });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.toggleCommentDislike = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        
        const userId = req.user.id;
        const disliked = comment.dislikes.includes(userId);
        
        if (disliked) {
            comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
        } else {
            comment.dislikes.push(userId);
            comment.likes = comment.likes.filter(id => id.toString() !== userId);
        }
        
        await comment.save();
        res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length, liked: false, disliked: !disliked });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        
        if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        await comment.deleteOne();
        res.json({ message: 'Comment removed' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};
