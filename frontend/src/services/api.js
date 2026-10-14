import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 30000,
});

// Request interceptor: attach fresh token from localStorage on EVERY request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: auto-retry on server cold starts / network blips, handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Handle 401 - token expired or invalid
        if (error.response?.status === 401) {
            // Only redirect if not already on login/register page
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login?expired=true';
            }
            return Promise.reject(error);
        }

        // Retry on 502, 503, 504, timeout or network blips (Render cold start)
        const isRetryable = error.code === 'ECONNABORTED' ||
                            error.code === 'ERR_NETWORK' ||
                            (error.response && [502, 503, 504].includes(error.response.status));

        if (config && isRetryable) {
            config._retryCount = (config._retryCount || 0) + 1;
            if (config._retryCount <= 3) {
                console.log(`[API Retry] Server waking up or network blip... Attempt ${config._retryCount} for ${config.url}`);
                await new Promise(r => setTimeout(r, 2000 * config._retryCount));
                return api(config);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
