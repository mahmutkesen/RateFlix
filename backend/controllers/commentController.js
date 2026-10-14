const mongoose = require('mongoose');
const Comment = require('../models/Comment');

exports.addComment = async (req, res) => {
    try {
        const { content, targetId, targetType } = req.body;

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ message: 'Yorum içeriği boş olamaz.' });
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length > 1000) {
            return res.status(400).json({ message: 'Yorum en fazla 1000 karakter olabilir.' });
        }

        if (!targetId || typeof targetId !== 'string') {
            return res.status(400).json({ message: 'Hedef kimliği gereklidir.' });
        }

        if (!['review', 'list'].includes(targetType)) {
            return res.status(400).json({ message: 'Geçersiz yorum hedef türü.' });
        }

        const newComment = new Comment({
            user: req.user.id,
            content: trimmedContent,
            targetId,
            targetType
        });

        await newComment.save();
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'username profilePic');
        res.status(201).json(populatedComment);
    } catch (err) {
        console.error('addComment error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const { targetId } = req.params;
        if (!targetId || typeof targetId !== 'string') {
            return res.status(400).json({ message: 'Geçersiz hedef kimliği' });
        }

        const comments = await Comment.find({ targetId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'username profilePic');
        res.json(comments);
    } catch (err) {
        console.error('getComments error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.toggleCommentLike = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Geçersiz yorum kimliği' });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Yorum bulunamadı' });
        
        const userId = req.user.id;
        const liked = comment.likes.some(id => id.toString() === userId);
        
        if (liked) {
            comment.likes = comment.likes.filter(id => id.toString() !== userId);
        } else {
            comment.likes.push(userId);
            comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
        }
        
        await comment.save();
        res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length, liked: !liked, disliked: false });
    } catch (err) {
        console.error('toggleCommentLike error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.toggleCommentDislike = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Geçersiz yorum kimliği' });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Yorum bulunamadı' });
        
        const userId = req.user.id;
        const disliked = comment.dislikes.some(id => id.toString() === userId);
        
        if (disliked) {
            comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId);
        } else {
            comment.dislikes.push(userId);
            comment.likes = comment.likes.filter(id => id.toString() !== userId);
        }
        
        await comment.save();
        res.json({ likes: comment.likes.length, dislikes: comment.dislikes.length, liked: false, disliked: !disliked });
    } catch (err) {
        console.error('toggleCommentDislike error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Geçersiz yorum kimliği' });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Yorum bulunamadı' });
        
        if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }
        
        await comment.deleteOne();
        res.json({ message: 'Yorum başarıyla silindi' });
    } catch (err) {
        console.error('deleteComment error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};
