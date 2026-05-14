import axios from 'axios';

const TMDB_API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: TMDB_API_KEY,
        language: 'tr-TR',
    },
});

export const getTrending = (type = 'movie', timeWindow = 'week', page = 1) =>
    tmdbApi.get(`/trending/${type}/${timeWindow}`, { params: { page } });

export const getTopRated = (type = 'movie', page = 1) =>
    tmdbApi.get(`/${type}/top_rated`, { params: { page } });

export const getDetails = (type: string, id: string | number) =>
    tmdbApi.get(`/${type}/${id}`);

export const searchMulti = (query: string, page = 1) =>
    tmdbApi.get('/search/multi', { params: { query, page } });

export const getImageUrl = (path: string | null, size = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const UNIFIED_CATEGORIES = [
    { id: 'action', name: 'Aksiyon', movie: '28', tv: '10759' },
    { id: 'comedy', name: 'Komedi', movie: '35', tv: '35' },
    { id: 'horror', name: 'Korku', movie: '27', tv: '9648' },
    { id: 'scifi', name: 'Bilim-Kurgu', movie: '878', tv: '10765' },
    { id: 'drama', name: 'Dram', movie: '18', tv: '18' },
    { id: 'animation', name: 'Animasyon', movie: '16', tv: '16' },
    { id: 'crime', name: 'Suç', movie: '80', tv: '80' },
    { id: 'documentary', name: 'Belgesel', movie: '99', tv: '99' },
    { id: 'romance', name: 'Romantik', movie: '10749', tv: '10766' },
    { id: 'mystery', name: 'Gizem', movie: '9648', tv: '9648' },
];

export const discoverContent = (type = 'movie', genreId: string, page = 1) =>
    tmdbApi.get(`/discover/${type}`, {
        params: { with_genres: genreId, page, sort_by: 'popularity.desc' },
    });

export default tmdbApi;
