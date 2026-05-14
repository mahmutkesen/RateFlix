import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 10.63.148.85 is the developer's local machine IP on the current network.
// If your network changes, you need to update this IP or use EXPO_PUBLIC_API_URL.
const BASE_URL = 'https://rateflix-backend.onrender.com/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error('AsyncStorage error while getting token:', e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            try {
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                // You might want to trigger a logout event here
            } catch (e) {
                console.error('AsyncStorage error while removing token:', e);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
