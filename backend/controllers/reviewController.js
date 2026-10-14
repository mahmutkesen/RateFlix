const Review = require('../models/Review');
const Comment = require('../models/Comment');
const { fetchReviewFeed } = require('../utils/communityFeed');
const { parsePaging } = require('../utils/searchUtils');

let memReviews = [
    // Mock reviews for popular items so bubbles show up
    { _id: 'mock1', tmdbId: '912649', mediaType: 'movie', rating: 4.8, reviewText: "Amazing!", user: { _id: 'u1', username: 'Admin' }, updatedAt: new Date() },
    { _id: 'mock2', tmdbId: '827322', mediaType: 'movie', rating: 4.5, reviewText: "Great watch.", user: { _id: 'u2', username: 'Cinephile' }, updatedAt: new Date() },
    { _id: 'mock3', tmdbId: '762441', mediaType: 'movie', rating: 5.0, reviewText: "Classic!", user: { _id: 'u3', username: 'RateFlix_Pro' }, updatedAt: new Date() },
    { _id: 'mock4', tmdbId: '939243', mediaType: 'movie', rating: 4.2, reviewText: "Recommended.", user: { _id: 'u1', username: 'Admin' }, updatedAt: new Date() },
    { _id: 'mock5', tmdbId: '693134', mediaType: 'movie', rating: 4.9, reviewText: "Masterpiece.", user: { _id: 'u2', username: 'Cinephile' }, updatedAt: new Date() },
    { _id: 'mock6', tmdbId: '1011985', mediaType: 'movie', rating: 4.7, reviewText: "Must see!", user: { _id: 'u3', username: 'RateFlix_Pro' }, updatedAt: new Date() }
]; // Memory mock

exports.getAverageRating = async (req, res) => {
    try {
        const { tmdbId, mediaType } = req.params;
        let reviews = [];
        if (process.env.USE_MEMORY_DB === 'true') {
            reviews = memReviews.filter(r => r.tmdbId === tmdbId && r.mediaType === mediaType);
        } else {
            reviews = await Review.find({ tmdbId, mediaType });
        }
        
        if (reviews.length === 0) return res.json({ average: 0, count: 0 });
        const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        res.json({ average, count: reviews.length });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

let topRatedCache = {
    movie: { data: null, timestamp: 0 },
    tv: { data: null, timestamp: 0 },
    all: { data: null, timestamp: 0 }
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

exports.getTopRatedItems = async (req, res) => {
    try {
        const { type } = req.query; // 'movie' or 'tv'
        const cacheKey = type || 'all';
        
        // Return cached data if valid
        if (topRatedCache[cacheKey].data && (Date.now() - topRatedCache[cacheKey].timestamp < CACHE_TTL)) {
            return res.json(topRatedCache[cacheKey].data);
        }

        let reviews = [];
        if (process.env.USE_MEMORY_DB === 'true') {
            reviews = memReviews;
        } else {
            reviews = await Review.find(type ? { mediaType: type } : {});
        }

        // Group by tmdbId
        const ratingsMap = {};
        reviews.forEach(r => {
            if (type && r.mediaType !== type) return;
            if (!ratingsMap[r.tmdbId]) {
                ratingsMap[r.tmdbId] = { tmdbId: r.tmdbId, mediaType: r.mediaType, sum: 0, count: 0 };
            }
            ratingsMap[r.tmdbId].sum += r.rating;
            ratingsMap[r.tmdbId].count += 1;
        });

        const topRated = Object.values(ratingsMap)
            .map(item => ({
                tmdbId: item.tmdbId,
                mediaType: item.mediaType,
                average: item.sum / item.count,
                count: item.count
            }))
            .sort((a, b) => b.average - a.average || b.count - a.count)
            .slice(0, 20); // Top 20 from RateFlix

        // Update cache
        topRatedCache[cacheKey] = { data: topRated, timestamp: Date.now() };

        res.json(topRated);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.getAllReviews = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            return res.json([...memReviews].reverse().slice(0, 50));
        }
        const { limit, skip } = parsePaging(req.query, 50, 100);
        const q = typeof req.query.q === 'string' ? req.query.q : '';
        const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

        const reviews = await fetchReviewFeed({ q, sort, skip, limit });
        res.json(reviews);
    } catch (err) {
        console.error('getAllReviews error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.getReviewsByItem = async (req, res) => {
    try {
        const { tmdbId, mediaType } = req.params;
        if (process.env.USE_MEMORY_DB === 'true') {
            return res.json(memReviews.filter(r => r.tmdbId === tmdbId && r.mediaType === mediaType));
        }
        const reviews = await Review.find({ tmdbId, mediaType }).populate('user', 'username profilePic');
        res.json(reviews);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.getUserReviews = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            return res.json(memReviews.filter(r => r.user?._id === req.user.id));
        }
        console.log(`[Review Debug] Fetching reviews for User ID: ${req.user.id}`);
        const reviews = await Review.find({ user: req.user.id }).sort({ createdAt: -1 });
        console.log(`[Review Debug] Found ${reviews.length} reviews for user.`);
        res.json(reviews);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

exports.addReview = async (req, res) => {
    try {
        const { tmdbId, mediaType, rating, reviewText, movieTitle, posterPath } = req.body;
        
        if (!tmdbId) {
            return res.status(400).json({ message: 'İçerik kimliği (tmdbId) gereklidir' });
        }

        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 0.5 || numRating > 5) {
            return res.status(400).json({ message: 'Puan 0.5 ile 5 arasında olmalıdır' });
        }

        const validMediaType = ['movie', 'tv'].includes(mediaType) ? mediaType : 'movie';
        const safeReviewText = typeof reviewText === 'string' ? reviewText.trim().slice(0, 2000) : '';
        const safeMovieTitle = typeof movieTitle === 'string' ? movieTitle.trim().slice(0, 200) : '';
        const safePosterPath = typeof posterPath === 'string' ? posterPath.trim().slice(0, 300) : '';

        if (process.env.USE_MEMORY_DB === 'true') {
            let existing = memReviews.find(r => r.user?._id === req.user.id && r.tmdbId === String(tmdbId) && r.mediaType === validMediaType);
            if (existing) {
                existing.rating = numRating;
                existing.reviewText = safeReviewText;
                existing.updatedAt = new Date();
                return res.json(existing);
            }
            const review = { _id: Date.now().toString(), user: { _id: req.user.id, username: 'TestUser' }, tmdbId: String(tmdbId), mediaType: validMediaType, rating: numRating, reviewText: safeReviewText, updatedAt: new Date() };
            memReviews.push(review);
            return res.status(201).json(review);
        }

        let review = await Review.findOne({ user: req.user.id, tmdbId: String(tmdbId), mediaType: validMediaType });
        
        if (review) {
            review.rating = numRating;
            review.reviewText = safeReviewText;
            if (safeMovieTitle) review.movieTitle = safeMovieTitle;
            if (safePosterPath) review.posterPath = safePosterPath;
            await review.save();
            return res.json(review);
        }
        review = new Review({ 
            user: req.user.id, 
            tmdbId: String(tmdbId), 
            mediaType: validMediaType, 
            rating: numRating, 
            reviewText: safeReviewText, 
            movieTitle: safeMovieTitle, 
            posterPath: safePosterPath 
        });
        await review.save();
        // Invalidate cache
        topRatedCache = { movie: { data: null, timestamp: 0 }, tv: { data: null, timestamp: 0 }, all: { data: null, timestamp: 0 } };
        res.status(201).json(review);
    } catch (err) {
        console.error('addReview error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            const index = memReviews.findIndex(r => r._id === req.params.id);
            if (index !== -1 && (memReviews[index].user?._id === req.user.id || req.user.role === 'admin')) {
                 memReviews.splice(index, 1);
                 return res.json({ message: 'Değerlendirme silindi' });
            }
            return res.status(404).json({ message: 'Değerlendirme bulunamadı veya yetkiniz yok' });
        }

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Geçersiz değerlendirme kimliği' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Değerlendirme bulunamadı' });
        
        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }
        
        await review.deleteOne();
        await Comment.deleteMany({ targetId: review._id, targetType: 'review' });
        // Invalidate cache
        topRatedCache = { movie: { data: null, timestamp: 0 }, tv: { data: null, timestamp: 0 }, all: { data: null, timestamp: 0 } };
        res.json({ message: 'Değerlendirme silindi' });
    } catch (err) {
        console.error('deleteReview error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.toggleReviewLike = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Geçersiz kimlik' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Değerlendirme bulunamadı' });
        const userId = req.user.id;
        const liked = review.likes.map(id => id.toString()).includes(userId);
        if (liked) {
            review.likes = review.likes.filter(id => id.toString() !== userId);
        } else {
            review.likes.push(userId);
            review.dislikes = review.dislikes.filter(id => id.toString() !== userId);
        }
        await review.save();
        res.json({ likes: review.likes.length, dislikes: review.dislikes.length, liked: !liked, disliked: false });
    } catch (err) {
        console.error('toggleReviewLike error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

exports.toggleReviewDislike = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Geçersiz kimlik' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Değerlendirme bulunamadı' });
        const userId = req.user.id;
        const disliked = review.dislikes.map(id => id.toString()).includes(userId);
        if (disliked) {
            review.dislikes = review.dislikes.filter(id => id.toString() !== userId);
        } else {
            review.dislikes.push(userId);
            review.likes = review.likes.filter(id => id.toString() !== userId);
        }
        await review.save();
        res.json({ likes: review.likes.length, dislikes: review.dislikes.length, liked: false, disliked: !disliked });
    } catch (err) {
        console.error('toggleReviewDislike error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

