const redis = require('redis');

let redisClient;

const initRedis = async () => {
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
        });

        redisClient.on('error', (err) => console.log('🔴 Redis Client Error:', err));
        redisClient.on('connect', () => console.log('🟢 Redis Connected Successfully'));

        await redisClient.connect();
    } catch (error) {
        console.error('🔴 Redis Initialization Error:', error);
    }
};

const getCache = async (key) => {
    if (!redisClient) return null;
    try {
        const data = await redisClient.get(key);
        if (data) {
            console.log(`🟢 [REDIS] CACHE HIT: Veri RAM'den anında getirildi! (${key})`);
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('🔴 Redis Get Error:', error);
        return null;
    }
};

const setCache = async (key, data, expirationInSeconds = 3600) => {
    if (!redisClient) return;
    try {
        await redisClient.setEx(key, expirationInSeconds, JSON.stringify(data));
        console.log(`🔴 [REDIS] CACHE MISS: Veri TMDB'den çekildi ve Redis'e kaydedildi. (${key})`);
    } catch (error) {
        console.error('🔴 Redis Set Error:', error);
    }
};

module.exports = { initRedis, getCache, setCache };
