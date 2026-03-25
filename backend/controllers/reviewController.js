const Review = require('../models/Review');
const Comment = require('../models/Comment');

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

exports.getTopRatedItems = async (req, res) => {
    try {
        const { type } = req.query; // 'movie' or 'tv'
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
        const reviews = await Review.find({}).sort({ createdAt: -1 }).limit(50).populate('user', 'username profilePic');
        
        // Batch fetch comment counts for all these reviews
        const reviewIds = reviews.map(r => r._id);
        const counts = await Comment.aggregate([
            { $match: { targetId: { $in: reviewIds.map(id => id.toString()) }, targetType: 'review' } },
            { $group: { _id: "$targetId", count: { $sum: 1 } } }
        ]);
        const countsMap = counts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const reviewsWithCounts = reviews.map((r) => {
            let reviewObj = r.toObject();
            if (!reviewObj.user) {
                reviewObj.user = { _id: r.toObject().user, username: 'Silinmiş Kullanıcı', profilePic: '' };
            }
            return { ...reviewObj, commentCount: countsMap[r._id.toString()] || 0 };
        });
        res.json(reviewsWithCounts);
    } catch (err) {
        res.status(500).send('Server Error');
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
        const { tmdbId, mediaType, rating, reviewText } = req.body;
        
        if (process.env.USE_MEMORY_DB === 'true') {
            let existing = memReviews.find(r => r.user?._id === req.user.id && r.tmdbId === tmdbId && r.mediaType === mediaType);
            if (existing) {
                existing.rating = rating;
                existing.reviewText = reviewText;
                existing.updatedAt = new Date();
                return res.json(existing);
            }
            const review = { _id: Date.now().toString(), user: { _id: req.user.id, username: 'TestUser' }, tmdbId, mediaType, rating, reviewText, updatedAt: new Date() };
            memReviews.push(review);
            return res.status(201).json(review);
        }

        let review = await Review.findOne({ user: req.user.id, tmdbId, mediaType });
        const { movieTitle, posterPath } = req.body;
        
        if (review) {
            review.rating = rating;
            review.reviewText = reviewText;
            if (movieTitle) review.movieTitle = movieTitle;
            if (posterPath) review.posterPath = posterPath;
            await review.save();
            return res.json(review);
        }
        review = new Review({ 
            user: req.user.id, 
            tmdbId, 
            mediaType, 
            rating, 
            reviewText, 
            movieTitle, 
            posterPath 
        });
        await review.save();
        res.status(201).json(review);
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.deleteReview = async (req, res) => {
    try {
        if (process.env.USE_MEMORY_DB === 'true') {
            const index = memReviews.findIndex(r => r._id === req.params.id);
            if (index !== -1 && (memReviews[index].user?._id === req.user.id || req.user.role === 'admin')) {
                 memReviews.splice(index, 1);
                 return res.json({ message: 'Review removed' });
            }
            return res.status(404).json({ message: 'Review not found or not authorized' });
        }

        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
        
        console.log(`[AUTH DEBUG] Deleting review: ${req.params.id}`);
        console.log(`[AUTH DEBUG] Review User: ${review.user.toString()}`);
        console.log(`[AUTH DEBUG] Req User: ${req.user.id}`);
        console.log(`[AUTH DEBUG] User Role: ${req.user.role}`);

        if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
            console.log(`[AUTH DEBUG] AUTHORIZATION FAILED`);
            return res.status(403).json({ message: 'User not authorized' });
        }
        
        console.log(`[AUTH DEBUG] AUTHORIZATION SUCCESS`);
        await review.deleteOne();
        res.json({ message: 'Review removed' });
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.toggleReviewLike = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
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
    } catch (err) { res.status(500).send('Server Error'); }
};

exports.toggleReviewDislike = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
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
    } catch (err) { res.status(500).send('Server Error'); }
};

