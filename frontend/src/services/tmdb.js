import axios from 'axios';

// The TMDB API key read from env, or a fallback public one for testing if not provided
// WARNING: Do not use this fallback key in production. It is just for immediate testing.
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbApi = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: TMDB_API_KEY,
        language: 'tr-TR' // Türkçe veri getirmesi için
    }
});

export const getTrending = (type = 'movie', timeWindow = 'week', page = 1) => tmdbApi.get(`/trending/${type}/${timeWindow}?page=${page}`);
export const getTopRated = (type = 'movie', page = 1) => tmdbApi.get(`/${type}/top_rated?page=${page}`);
export const getDetails = (type, id) => tmdbApi.get(`/${type}/${id}`);

export const UNIFIED_CATEGORIES = [
  { id: 'action', name: 'Aksiyon', movie: '28', tv: '10759' },
  { id: 'comedy', name: 'Komedi', movie: '35', tv: '35' },
  { id: 'horror', name: 'Korku', movie: '27', tv: '9648' },
  { id: 'scifi', name: 'Bilim-Kurgu', movie: '878', tv: '10765' },
  { id: 'drama', name: 'Dram', movie: '18', tv: '18' },
  { id: 'animation', name: 'Animasyon', movie: '16', tv: '16' },
  { id: 'crime', name: 'Suç', movie: '80', tv: '80' },
  { id: 'documentary', name: 'Belgesel', movie: '99', tv: '99' },
  { id: 'family', name: 'Aile', movie: '10751', tv: '10751' },
  { id: 'fantasy', name: 'Fantastik', movie: '14', tv: '10765' },
  { id: 'romance', name: 'Romantik', movie: '10749', tv: '10766' },
  { id: 'mystery', name: 'Gizem', movie: '9648', tv: '9648' },
  { id: 'war', name: 'Savaş', movie: '10752', tv: '10768' },
  { id: 'western', name: 'Vahşi Batı', movie: '37', tv: '37' },
];
export const discoverContent = (type = 'movie', genreId, page = 1) => 
    tmdbApi.get(`/discover/${type}?with_genres=${genreId}&page=${page}&sort_by=popularity.desc`);
export const searchMulti = (query, page = 1) => tmdbApi.get('/search/multi', { params: { query, page } });

export const getImageUrl = (path, size = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export default tmdbApi;
