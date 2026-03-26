import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', // Backend URL
    timeout: 60000, // Extend timeout to 60 seconds for Render cold starts
});

// Retry Interceptor for Render Free Tier (Cold Start)
api.interceptors.response.use(undefined, async (err) => {
    const { config, response } = err;
    if (!config || !config.retry || response?.status !== 503) {
        if (config && (response?.status === 503 || err.code === 'ECONNABORTED')) {
            config.retry = (config.retry || 0) + 1;
            if (config.retry <= 3) {
                console.log(`Render is waking up... Retry attempt ${config.retry}`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                return api(config);
            }
        }
        return Promise.reject(err);
    }
    return Promise.reject(err);
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
        try {
            if (response.config && response.config.method === 'get' && !response.isCached) {
                cache.set(response.config.url, { response, time: Date.now() });
            }
        } catch (e) {
            // Ignore cache errors - don't let them break successful responses
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
