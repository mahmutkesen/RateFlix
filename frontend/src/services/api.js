import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Backend URL
});

// Simple Get Request Cache (30 seconds)
const cache = new Map();
const CACHE_DURATION = 30000; 

// Add a request interceptor to append JWT token and handle cache
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.method === 'get') {
            const cached = cache.get(config.url);
            if (cached && (Date.now() - cached.time < CACHE_DURATION)) {
                return Promise.resolve({ ...cached.response, isCached: true });
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors and populate cache
api.interceptors.response.use(
    (response) => {
        if (response.config.method === 'get' && !response.isCached) {
            cache.set(response.config.url, { response, time: Date.now() });
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login?expired=true';
        }
        return Promise.reject(error);
    }
);

export default api;
