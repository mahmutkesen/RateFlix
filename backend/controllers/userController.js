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
                addedAt: watchedDate || Date.now()
            });
            await watchedList.save();
        }

        res.json(watchedList);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to watched list' });
    }
};
