const axios = require('axios');
const Review = require('../models/Review');
const List = require('../models/List');
const { getCache, setCache } = require('../utils/redisClient');
const { publishNotification } = require('../utils/rabbitClient');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';

// Helper to fetch from TMDB
const tmdb = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: TMDB_API_KEY,
        language: 'tr-TR'
    }
});

// @desc    Get popular movies
// @route   GET /api/movies/popular
exports.getPopularMovies = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const cacheKey = `movies:popular:page:${page}`;
        
        // 1. Önce Redis'e (Önbelleğe) bak
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        // 2. Redis'te yoksa TMDB'den çek
        const response = await tmdb.get(`/movie/popular?page=${page}`);
        
        // 3. Çekilen veriyi Redis'e kaydet (1 saat = 3600 saniye)
        await setCache(cacheKey, response.data, 3600);
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching popular movies' });
    }
};

// @desc    Get top rated movies
// @route   GET /api/movies/top-rated
exports.getTopRatedMovies = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const cacheKey = `movies:toprated:page:${page}`;
        
        // 1. Önce Redis'e bak
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        // 2. Redis'te yoksa TMDB'den çek
        const response = await tmdb.get(`/movie/top_rated?page=${page}`);
        
        // 3. Veriyi Redis'e kaydet (1 saat)
        await setCache(cacheKey, response.data, 3600);
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching top rated movies' });
    }
};

// @desc    Search movies
// @route   GET /api/movies/search
exports.searchMovies = async (req, res) => {
    try {
        const { q, page = 1 } = req.query;
        if (!q) return res.status(400).json({ message: 'Search query is required' });
        const response = await tmdb.get(`/search/movie?query=${q}&page=${page}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error searching movies' });
    }
};

// @desc    Filter movies by genre
// @route   GET /api/movies
exports.filterMovies = async (req, res) => {
    try {
        const { genre, page = 1 } = req.query;
        const endpoint = genre ? `/discover/movie?with_genres=${genre}&page=${page}` : `/movie/now_playing?page=${page}`;
        const response = await tmdb.get(endpoint);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error filtering movies' });
    }
};

// @desc    Get movie details
// @route   GET /api/movies/:id
exports.getMovieDetails = async (req, res) => {
    try {
        const response = await tmdb.get(`/movie/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        res.status(500).json({ message: 'Error fetching movie details' });
    }
};

// @desc    Rate movie (Internal logic using Review model)
// @route   POST /api/movies/:id/rate
exports.rateMovie = async (req, res) => {
    try {
        const { rating, reviewText = '' } = req.body;
        const tmdbId = req.params.id;
        const userId = req.user.id;

        // Fetch basic info from TMDB for storage
        const movie = await tmdb.get(`/movie/${tmdbId}`);

        let review = await Review.findOne({ user: userId, tmdbId, mediaType: 'movie' });

        if (review) {
            review.rating = rating;
            review.reviewText = reviewText;
            await review.save();
        } else {
            review = await Review.create({
                user: userId,
                tmdbId,
                mediaType: 'movie',
                rating,
                reviewText,
                movieTitle: movie.data.title,
                posterPath: movie.data.poster_path
            });

            // Asenkron Bildirim Fırlat
            publishNotification({
                userId,
                type: 'REVIEW',
                message: `"${movie.data.title}" filmine başarıyla puan verdiniz.`
            });
        }

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Error rating movie' });
    }
};

// @desc    Like movie (Toggle in "favorites" list)
// @route   POST /api/movies/:id/like
exports.likeMovie = async (req, res) => {
    try {
        const tmdbId = req.params.id;
        const userId = req.user.id;

        let favoritesList = await List.findOne({ user: userId, type: 'favorites' });

        if (!favoritesList) {
            favoritesList = await List.create({
                user: userId,
                name: 'Favorilerim',
                type: 'favorites',
                isPublic: true,
                items: []
            });
        }

        const isLiked = favoritesList.items.some(item => item.tmdbId === tmdbId);

        if (isLiked) {
            favoritesList.items = favoritesList.items.filter(item => item.tmdbId !== tmdbId);
        } else {
            const movie = await tmdb.get(`/movie/${tmdbId}`);
            favoritesList.items.push({
                tmdbId,
                mediaType: 'movie',
                posterPath: movie.data.poster_path
            });

            // Asenkron Bildirim Fırlat (Ana sistemi beklemeden)
            publishNotification({
                userId,
                type: 'FAVORITE',
                message: `"${movie.data.title}" adlı filmi favorilerinize eklediniz.`
            });
        }

        await favoritesList.save();
        res.json({ message: isLiked ? 'Removed from favorites' : 'Added to favorites', list: favoritesList });
    } catch (error) {
        res.status(500).json({ message: 'Error liking movie' });
    }
};
