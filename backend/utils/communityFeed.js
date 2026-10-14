/**
 * Aggregation-based feed builders shared by the community, profile and friend-activity endpoints.
 * Only safe public user fields (username, profilePic) are ever joined - never email/password.
 */
const mongoose = require('mongoose');
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
async function runFeed(Model, { match, q, searchFields, sort, sortExtras, skip = 0, limit = 50, targetType, extraFields }) {
    const pipeline = [{ $match: match || {} }, ...userLookupStages()];

    const search = buildSearchMatch(q, searchFields);
    if (search) pipeline.push({ $match: search });

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

function fetchListFeed({ match = {}, q, sort = 'newest', skip = 0, limit = 50 } = {}) {
    return runFeed(List, {
        match,
        q,
        searchFields: ['name', 'description', 'user.username', 'items.title'],
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
    if (!comments.length) return [];

    const reviewIds = [];
    const listIds = [];
    comments.forEach(c => {
        if (c.targetType === 'review') reviewIds.push(c.targetId);
        else if (c.targetType === 'list') listIds.push(c.targetId);
    });

    const [reviews, lists] = await Promise.all([
        reviewIds.length
            ? Review.find({ _id: { $in: reviewIds } }).select('tmdbId mediaType movieTitle posterPath user').populate('user', 'username').lean()
            : [],
        listIds.length
            ? List.find({ _id: { $in: listIds } }).select('name isPublic user type items.posterPath').populate('user', 'username').lean()
            : []
    ]);

    const reviewMap = new Map(reviews.map(r => [r._id.toString(), r]));
    const listMap = new Map(lists.map(l => [l._id.toString(), l]));

    return comments.reduce((acc, c) => {
        const key = c.targetId?.toString();
        if (c.targetType === 'review') {
            const r = reviewMap.get(key);
            if (!r) return acc;
            acc.push({
                ...c,
                target: {
                    type: 'review',
                    _id: r._id,
                    tmdbId: r.tmdbId,
                    mediaType: r.mediaType,
                    movieTitle: r.movieTitle,
                    posterPath: r.posterPath,
                    owner: r.user ? { _id: r.user._id, username: r.user.username } : null
                }
            });
        } else if (c.targetType === 'list') {
            const l = listMap.get(key);
            if (!l) return acc;
            const ownerId = l.user?._id?.toString();
            if (!l.isPublic && ownerId !== viewerId) return acc;
            acc.push({
                ...c,
                target: {
                    type: 'list',
                    _id: l._id,
                    name: l.name,
                    posterPath: l.items?.[0]?.posterPath || '',
                    owner: l.user ? { _id: l.user._id, username: l.user.username } : null
                }
            });
        }
        return acc;
    }, []);
}

async function fetchCommentFeed({ match = {}, viewerId, limit = 50 } = {}) {
    const comments = await Comment.aggregate([
        { $match: match },
        { $sort: { createdAt: -1, _id: -1 } },
        // Over-fetch slightly because orphaned/private targets are filtered out afterwards
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
