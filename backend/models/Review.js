const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tmdbId: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['movie', 'tv'],
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 0.5,
        max: 5
    },
    reviewText: {
        type: String,
        trim: true
    },
    movieTitle: {
        type: String,
        default: ''
    },
    posterPath: {
        type: String,
        default: ''
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Ensure a user can only review a specific media item once
ReviewSchema.index({ user: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
