import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 60000,
});

// Simple Get Request Cache (15 seconds - short enough to feel fresh)
const cache = new Map();
const CACHE_DURATION = 15000;

export const clearCache = (urlPattern) => {
    if (!urlPattern) {
        cache.clear();
    } else {
        for (const key of cache.keys()) {
            if (key.includes(urlPattern)) cache.delete(key);
        }
    }
};

// Request interceptor: attach token + serve cache for GETs
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.method === 'get') {
            const cached = cache.get(config.url);
            if (cached && (Date.now() - cached.time < CACHE_DURATION)) {
                // Return a resolved promise with cached data
                config.adapter = () => Promise.resolve({ ...cached.response, config });
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: cache GETs, invalidate on mutations, handle 401
api.interceptors.response.use(
    (response) => {
        try {
            const method = response.config?.method;
            if (method === 'get') {
                cache.set(response.config.url, { response, time: Date.now() });
            } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
                // Any mutation clears all cache so pages show fresh data instantly
                cache.clear();
            }
        } catch (e) {
            // Never let cache logic break a successful response
        }
        return response;
    },
    async (error) => {
        // Handle 401 - token expired
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login?expired=true';
            return Promise.reject(error);
        }

        // Retry on 503 or timeout (Render cold start)
        const config = error.config;
        if (config && (error.response?.status === 503 || error.code === 'ECONNABORTED')) {
            config._retryCount = (config._retryCount || 0) + 1;
            if (config._retryCount <= 3) {
                console.log(`Render waking up... retry ${config._retryCount}`);
                await new Promise(r => setTimeout(r, 3000));
                return api(config);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
