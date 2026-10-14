/**
 * Aggregation-based feed builders shared by the community, profile and friend-activity endpoints.
 * Only safe public user fields (username, profilePic) are ever joined - never email/password.
 */
const mongoose = require('mongoose');
const axios = require('axios');
const Review = require('../models/Review');
const List = require('../models/List');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { buildSearchMatch, buildSort } = require('./searchUtils');

const usersCollection = () => User.collection.collectionName;
const commentsCollection = () => Comment.collection.collectionName;

const userLookupStages = () => [
    {
        $lookup: {
            from: usersCollection(),
            let: { uid: '$user' },
            pipeline: [
                { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
                { $project: { username: 1, profilePic: 1 } }
            ],
            as: '_u'
        }
    },
    {
        $addFields: {
            user: {
                $ifNull: [
                    { $arrayElemAt: ['$_u', 0] },
                    { _id: '$user', username: 'Silinmiş Kullanıcı', profilePic: '' }
                ]
            }
        }
    },
    { $project: { _u: 0 } }
];

const commentCountStages = (targetType) => [
    {
        $lookup: {
            from: commentsCollection(),
            let: { tid: '$_id' },
            pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$targetId', '$$tid'] }, { $eq: ['$targetType', targetType] }] } } },
                { $count: 'n' }
            ],
            as: '_cc'
        }
    },
    { $addFields: { commentCount: { $ifNull: [{ $arrayElemAt: ['$_cc.n', 0] }, 0] } } },
    { $project: { _cc: 0 } }
];

const reactionCountStage = () => ({
    $addFields: {
        likesCount: { $size: { $ifNull: ['$likes', []] } },
        dislikesCount: { $size: { $ifNull: ['$dislikes', []] } }
    }
});

/**
 * Generic feed runner. Comment counts are computed before sorting only when needed
 * (most_commented), otherwise after pagination to keep queries cheap.
 */
async function runFeed(Model, { match, q, searchFields, extraSearchMatch, sort, sortExtras, skip = 0, limit = 50, targetType, extraFields }) {
    const pipeline = [{ $match: match || {} }, ...userLookupStages()];

    const search = buildSearchMatch(q, searchFields);
    if (search && extraSearchMatch) {
        pipeline.push({ $match: { $or: [search, extraSearchMatch] } });
    } else if (search) {
        pipeline.push({ $match: search });
    } else if (extraSearchMatch) {
        pipeline.push({ $match: extraSearchMatch });
    }

    pipeline.push(reactionCountStage());
    if (extraFields) pipeline.push({ $addFields: extraFields });

    const needsCommentCountForSort = sort === 'most_commented';
    if (needsCommentCountForSort && targetType) pipeline.push(...commentCountStages(targetType));

    pipeline.push({ $sort: buildSort(sort, sortExtras) }, { $skip: skip }, { $limit: limit });

    if (!needsCommentCountForSort && targetType) pipeline.push(...commentCountStages(targetType));

    return Model.aggregate(pipeline);
}

function fetchReviewFeed({ match = {}, q, sort = 'newest', skip = 0, limit = 50 } = {}) {
    return runFeed(Review, {
        match,
        q,
        searchFields: ['movieTitle', 'reviewText', 'user.username'],
        sort,
        sortExtras: {
            highest_rated: { rating: -1, createdAt: -1 },
            lowest_rated: { rating: 1, createdAt: -1 }
        },
        skip,
        limit,
        targetType: 'review'
    });
}

async function fetchListFeed({ match = {}, q, sort = 'newest', skip = 0, limit = 50 } = {}) {
    let extraSearchMatch = null;
    if (q && typeof q === 'string' && q.trim()) {
        const queryTerm = q.trim();
        const tmdbIds = new Set();
        try {
            // 1. Check existing reviews in database with this movie title
            const safeRegex = queryTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const matchingReviews = await Review.find({
                movieTitle: { $regex: safeRegex, $options: 'i' }
            }).distinct('tmdbId');
            matchingReviews.forEach(id => tmdbIds.add(String(id)));

            // 2. Query TMDB Search (with short timeout) to match movie/tv names directly
            try {
                const tmdbRes = await axios.get('https://api.themoviedb.org/3/search/multi', {
                    params: {
                        api_key: process.env.TMDB_API_KEY || '4e44d9029b1270a757cddc766a1bcb63',
                        query: queryTerm,
                        language: 'tr-TR'
                    },
                    timeout: 2500
                });
                if (tmdbRes.data?.results) {
                    tmdbRes.data.results.slice(0, 15).forEach(r => {
                        if (r.id) tmdbIds.add(String(r.id));
                    });
                }
            } catch (tErr) {
                // If TMDB is slow or network issue, continue with review IDs
            }

            if (tmdbIds.size > 0) {
                extraSearchMatch = {
                    'items.tmdbId': { $in: Array.from(tmdbIds) }
                };
            }
        } catch (err) {
            console.error('List movie search helper error:', err);
        }
    }

    return runFeed(List, {
        match,
        q,
        searchFields: ['name', 'description', 'user.username', 'items.title'],
        extraSearchMatch,
        sort,
        sortExtras: {
            most_items: { itemsCount: -1, createdAt: -1 }
        },
        skip,
        limit,
        targetType: 'list',
        extraFields: { itemsCount: { $size: { $ifNull: ['$items', []] } } }
    });
}

/**
 * Attaches context (which film/list a comment belongs to) and hides comments whose
 * target was deleted or is a private list the viewer does not own.
 */
async function attachCommentTargets(comments, viewerId) {
    if (!comments || !comments.length) return [];

    const reviewIds = [];
    const listIds = [];
    comments.forEach(c => {
        if (!c.targetId) return;
        if (c.targetType === 'review') reviewIds.push(c.targetId);
        else if (c.targetType === 'list') listIds.push(c.targetId);
    });

    const toMongoIds = (ids) => {
        const set = new Set();
        ids.forEach(id => {
            if (!id) return;
            const str = id.toString();
            set.add(str);
            if (mongoose.Types.ObjectId.isValid(str)) {
                set.add(new mongoose.Types.ObjectId(str));
            }
        });
        return Array.from(set);
    };

    const [reviews, lists] = await Promise.all([
        reviewIds.length
            ? Review.find({ _id: { $in: toMongoIds(reviewIds) } })
                .select('tmdbId mediaType movieTitle posterPath user reviewText rating')
                .populate('user', 'username profilePic')
                .lean()
            : [],
        listIds.length
            ? List.find({ _id: { $in: toMongoIds(listIds) } })
                .select('name isPublic user type items')
                .populate('user', 'username profilePic')
                .lean()
            : []
    ]);

    const reviewMap = new Map();
    reviews.forEach(r => {
        reviewMap.set(r._id.toString(), r);
    });

    const listMap = new Map();
    lists.forEach(l => {
        listMap.set(l._id.toString(), l);
    });

    return comments.reduce((acc, c) => {
        const key = c.targetId?.toString();
        if (c.targetType === 'review') {
            const r = reviewMap.get(key);
            const targetObj = r ? {
                type: 'review',
                _id: r._id,
                tmdbId: r.tmdbId,
                mediaType: r.mediaType || 'movie',
                title: r.movieTitle || 'Film İncelemesi',
                movieTitle: r.movieTitle || 'Film İncelemesi',
                posterPath: r.posterPath || '',
                link: `/${r.mediaType || 'movie'}/${r.tmdbId}`,
                reviewAuthor: r.user?.username || 'Kullanıcı',
                reviewText: r.reviewText || '',
                owner: r.user ? { _id: r.user._id, username: r.user.username, profilePic: r.user.profilePic } : null
            } : {
                type: 'review',
                _id: c.targetId,
                title: 'Film İncelemesi',
                movieTitle: 'Film İncelemesi',
                posterPath: '',
                link: '#',
                reviewAuthor: 'Kullanıcı'
            };

            acc.push({
                ...c,
                target: targetObj,
                targetInfo: targetObj
            });
        } else if (c.targetType === 'list') {
            const l = listMap.get(key);
            const ownerId = l?.user?._id?.toString() || l?.user?.toString();
            if (l && !l.isPublic && ownerId !== viewerId) return acc;

            const targetObj = l ? {
                type: 'list',
                _id: l._id,
                title: l.name || 'Liste',
                name: l.name || 'Liste',
                posterPath: l.items?.[0]?.posterPath || '',
                link: '/community',
                owner: l.user ? { _id: l.user._id, username: l.user.username, profilePic: l.user.profilePic } : null
            } : {
                type: 'list',
                _id: c.targetId,
                title: 'Liste',
                name: 'Liste',
                posterPath: '',
                link: '/community'
            };

            acc.push({
                ...c,
                target: targetObj,
                targetInfo: targetObj
            });
        } else {
            acc.push(c);
        }
        return acc;
    }, []);
}

async function fetchCommentFeed({ match = {}, viewerId, limit = 50 } = {}) {
    const comments = await Comment.aggregate([
        { $match: match },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: Math.min(limit * 2, 200) },
        ...userLookupStages(),
        reactionCountStage()
    ]);
    const withTargets = await attachCommentTargets(comments, viewerId);
    return withTargets.slice(0, limit);
}

const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

module.exports = {
    fetchReviewFeed,
    fetchListFeed,
    fetchCommentFeed,
    attachCommentTargets,
    toObjectId
};
