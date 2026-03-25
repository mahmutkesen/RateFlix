const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    type: { // 'custom', 'favorites', 'watchlist', 'watched'
        type: String,
        default: 'custom'
    },
    items: [{
        tmdbId: {
            type: String,
            required: true
        },
        mediaType: {
            type: String,
            enum: ['movie', 'tv'],
            required: true
        },
        posterPath: {
            type: String
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

ListSchema.index({ user: 1 });
ListSchema.index({ type: 1 }); // Useful for filtering default lists

module.exports = mongoose.model('List', ListSchema);
