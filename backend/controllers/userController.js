const axios = require('axios');
const List = require('../models/List');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdb = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: TMDB_API_KEY,
        language: 'tr-TR'
    }
});

// @desc    Add movie to watchlist
// @route   PUT /api/users/:userId/watchlist
exports.addToWatchlist = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.params.userId;

        // Security check: only own user can modify watchlist (unless admin)
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let watchlist = await List.findOne({ user: userId, type: 'watchlist' });

        if (!watchlist) {
            watchlist = await List.create({
                user: userId,
                name: 'İzlenecekler',
                type: 'watchlist',
                isPublic: false,
                items: []
            });
        }

        const isAdded = watchlist.items.some(item => item.tmdbId === movieId);
        if (!isAdded) {
            const movie = await tmdb.get(`/movie/${movieId}`);
            watchlist.items.push({
                tmdbId: movieId,
                mediaType: 'movie',
                posterPath: movie.data.poster_path
            });
            await watchlist.save();
        }

        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to watchlist' });
    }
};

// @desc    Remove movie from watchlist
// @route   DELETE /api/users/:userId/watchlist/:movieId
exports.removeFromWatchlist = async (req, res) => {
    try {
        const { userId, movieId } = req.params;

        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let watchlist = await List.findOne({ user: userId, type: 'watchlist' });
        if (watchlist) {
            watchlist.items = watchlist.items.filter(item => item.tmdbId !== movieId);
            await watchlist.save();
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error removing from watchlist' });
    }
};

const User = require('../models/User');
const Review = require('../models/Review');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const { attachCommentTargets } = require('../utils/communityFeed');

// @desc    Add movie to watched list
// @route   PUT /api/users/:userId/watched
exports.addToWatched = async (req, res) => {
    try {
        const { movieId, watchedDate } = req.body;
        const userId = req.params.userId;

        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let watchedList = await List.findOne({ user: userId, type: 'watched' });

        if (!watchedList) {
            watchedList = await List.create({
                user: userId,
                name: 'İzlediklerim',
                type: 'watched',
                isPublic: true,
                items: []
            });
        }

        const isAdded = watchedList.items.some(item => item.tmdbId === movieId);
        if (!isAdded) {
            const movie = await tmdb.get(`/movie/${movieId}`);
            watchedList.items.push({
                tmdbId: movieId,
                mediaType: 'movie',
                posterPath: movie.data.poster_path,
                title: movie.data.title || movie.data.name || '',
                addedAt: watchedDate || Date.now()
            });
            await watchedList.save();
        }

        res.json(watchedList);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to watched list' });
    }
};

// Helper to batch fetch comment counts for a set of IDs and targetType
async function getCommentCountsMap(ids, targetType) {
    if (!ids || ids.length === 0) return {};
    try {
        const objectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
        const stringIds = ids.map(id => id.toString());
        const counts = await Comment.aggregate([
            {
                $match: {
                    $or: [
                        { targetId: { $in: objectIds } },
                        { targetId: { $in: stringIds } }
                    ],
                    targetType
                }
            },
            { $group: { _id: "$targetId", count: { $sum: 1 } } }
        ]);
        return counts.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr.count;
            return acc;
        }, {});
    } catch (e) {
        console.error('getCommentCountsMap error:', e);
        return {};
    }
}

// @desc    Get all liked and disliked items for a user (reviews, lists, comments)
// @route   GET /api/users/:userId/reactions
exports.getUserReactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const viewerId = req.user?.id;

        let targetUser;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            targetUser = await User.findById(userId).select('username profilePic');
        }
        if (!targetUser) {
            targetUser = await User.findOne({ username: userId }).select('username profilePic');
        }
        if (!targetUser) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        const targetId = targetUser._id;
        const isSelf = viewerId && viewerId === targetId.toString();

        // 1. Liked & Disliked Reviews
        const [likedReviewsRaw, dislikedReviewsRaw] = await Promise.all([
            Review.find({ likes: targetId }).sort({ updatedAt: -1 }).limit(50).populate('user', 'username profilePic').lean(),
            Review.find({ dislikes: targetId }).sort({ updatedAt: -1 }).limit(50).populate('user', 'username profilePic').lean()
        ]);

        const allReviewIds = [...likedReviewsRaw, ...dislikedReviewsRaw].map(r => r._id);
        const reviewCountsMap = await getCommentCountsMap(allReviewIds, 'review');

        const likedReviews = likedReviewsRaw.map(r => ({ ...r, commentCount: reviewCountsMap[r._id.toString()] || 0 }));
        const dislikedReviews = dislikedReviewsRaw.map(r => ({ ...r, commentCount: reviewCountsMap[r._id.toString()] || 0 }));

        // 2. Liked & Disliked Lists (only public lists unless viewer is the creator)
        const listVisibilityQuery = isSelf ? {} : { isPublic: true };
        const [likedListsRaw, dislikedListsRaw] = await Promise.all([
            List.find({ likes: targetId, ...listVisibilityQuery }).sort({ updatedAt: -1 }).limit(50).populate('user', 'username profilePic').lean(),
            List.find({ dislikes: targetId, ...listVisibilityQuery }).sort({ updatedAt: -1 }).limit(50).populate('user', 'username profilePic').lean()
        ]);

        const allListIds = [...likedListsRaw, ...dislikedListsRaw].map(l => l._id);
        const listCountsMap = await getCommentCountsMap(allListIds, 'list');

        const likedLists = likedListsRaw.map(l => ({ ...l, commentCount: listCountsMap[l._id.toString()] || 0 }));
        const dislikedLists = dislikedListsRaw.map(l => ({ ...l, commentCount: listCountsMap[l._id.toString()] || 0 }));

        // 3. Liked & Disliked Comments
        const [likedCommentsRaw, dislikedCommentsRaw] = await Promise.all([
            Comment.find({ likes: targetId }).sort({ updatedAt: -1 }).limit(50).populate('user', 'username profilePic').lean(),
            Comment.find({ dislikes: targetId }).sort({ updatedAt: -1 }).limit(50).populate('user', 'username profilePic').lean()
        ]);

        const [likedComments, dislikedComments] = await Promise.all([
            attachCommentTargets(likedCommentsRaw, viewerId),
            attachCommentTargets(dislikedCommentsRaw, viewerId)
        ]);

        res.json({
            user: { _id: targetUser._id, username: targetUser.username, profilePic: targetUser.profilePic },
            likedReviews,
            dislikedReviews,
            likedLists,
            dislikedLists,
            likedComments,
            dislikedComments
        });
    } catch (err) {
        console.error('getUserReactions error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};

// @desc    Get friend activity feed (lists, reviews/comments, liked content)
// @route   GET /api/users/friends/activity
exports.getFriendActivity = async (req, res) => {
    try {
        const viewerId = req.user.id;
        const viewer = await User.findById(viewerId).select('following');
        if (!viewer) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

        const followingIds = viewer.following || [];
        if (followingIds.length === 0) {
            return res.json({
                followingCount: 0,
                lists: [],
                comments: [],
                likedContent: []
            });
        }

        // Fetch followed users dictionary for quick lookup of friend details
        const followedUsers = await User.find({ _id: { $in: followingIds } }).select('username profilePic').lean();
        const friendsMap = new Map(followedUsers.map(u => [u._id.toString(), u]));

        // 1. Lists shared by friends
        const listsRaw = await List.find({
            user: { $in: followingIds },
            isPublic: true,
            "items.0": { $exists: true }
        }).sort({ createdAt: -1 }).limit(40).populate('user', 'username profilePic').lean();

        const listCountsMap = await getCommentCountsMap(listsRaw.map(l => l._id), 'list');
        const lists = listsRaw.map(l => ({
            ...l,
            commentCount: listCountsMap[l._id.toString()] || 0,
            activityType: 'list'
        }));

        // 2. Reviews and Comments posted by friends
        const [friendReviewsRaw, friendCommentsRaw] = await Promise.all([
            Review.find({ user: { $in: followingIds } })
                .sort({ createdAt: -1 })
                .limit(40)
                .populate('user', 'username profilePic')
                .lean(),
            Comment.find({ user: { $in: followingIds } })
                .sort({ createdAt: -1 })
                .limit(40)
                .populate('user', 'username profilePic')
                .lean()
        ]);

        const reviewCountsMap = await getCommentCountsMap(friendReviewsRaw.map(r => r._id), 'review');
        const friendReviews = friendReviewsRaw.map(r => ({
            ...r,
            commentCount: reviewCountsMap[r._id.toString()] || 0,
            activityType: 'review'
        }));

        const friendComments = (await attachCommentTargets(friendCommentsRaw, viewerId)).map(c => ({
            ...c,
            activityType: 'comment'
        }));

        // Combine friend reviews & comments into a unified comments/feedback section sorted by date
        const comments = [...friendReviews, ...friendComments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);

        // 3. Content liked or disliked by friends (Reviews, Lists, Comments)
        const reactionQuery = {
            $or: [
                { likes: { $in: followingIds } },
                { dislikes: { $in: followingIds } }
            ]
        };

        const [reactedReviewsRaw, reactedListsRaw, reactedCommentsRaw] = await Promise.all([
            Review.find(reactionQuery)
                .sort({ updatedAt: -1 })
                .limit(40)
                .populate('user', 'username profilePic')
                .lean(),
            List.find({ ...reactionQuery, isPublic: true })
                .sort({ updatedAt: -1 })
                .limit(40)
                .populate('user', 'username profilePic')
                .lean(),
            Comment.find(reactionQuery)
                .sort({ updatedAt: -1 })
                .limit(40)
                .populate('user', 'username profilePic')
                .lean()
        ]);

        const [reactedReviewsCounts, reactedListsCounts, attachedReactedComments] = await Promise.all([
            getCommentCountsMap(reactedReviewsRaw.map(r => r._id), 'review'),
            getCommentCountsMap(reactedListsRaw.map(l => l._id), 'list'),
            attachCommentTargets(reactedCommentsRaw, viewerId)
        ]);

        const formatFriends = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr
                .map(id => id.toString())
                .filter(id => friendsMap.has(id))
                .map(id => friendsMap.get(id));
        };

        const reactedReviews = reactedReviewsRaw.map(r => {
            const likedByFriends = formatFriends(r.likes);
            const dislikedByFriends = formatFriends(r.dislikes);
            return {
                ...r,
                commentCount: reactedReviewsCounts[r._id.toString()] || 0,
                activityType: 'liked_review',
                likedByFriends,
                dislikedByFriends,
                reactionType: likedByFriends.length > 0 && dislikedByFriends.length > 0 ? 'both' : dislikedByFriends.length > 0 ? 'dislike' : 'like'
            };
        });

        const reactedLists = reactedListsRaw.map(l => {
            const likedByFriends = formatFriends(l.likes);
            const dislikedByFriends = formatFriends(l.dislikes);
            return {
                ...l,
                commentCount: reactedListsCounts[l._id.toString()] || 0,
                activityType: 'liked_list',
                likedByFriends,
                dislikedByFriends,
                reactionType: likedByFriends.length > 0 && dislikedByFriends.length > 0 ? 'both' : dislikedByFriends.length > 0 ? 'dislike' : 'like'
            };
        });

        const reactedComments = attachedReactedComments.map(c => {
            const likedByFriends = formatFriends(c.likes);
            const dislikedByFriends = formatFriends(c.dislikes);
            return {
                ...c,
                activityType: 'liked_comment',
                likedByFriends,
                dislikedByFriends,
                reactionType: likedByFriends.length > 0 && dislikedByFriends.length > 0 ? 'both' : dislikedByFriends.length > 0 ? 'dislike' : 'like'
            };
        });

        const reactedContent = [...reactedReviews, ...reactedLists, ...reactedComments]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 60);

        res.json({
            followingCount: followingIds.length,
            lists,
            comments,
            likedContent: reactedContent,
            reactedContent
        });
    } catch (err) {
        console.error('getFriendActivity error:', err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
};
