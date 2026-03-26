import React, { useEffect, useState } from 'react';
import { getTrending, getTopRated, getDetails } from '../services/tmdb';
import api from '../services/api';
import MovieSlider from '../components/MovieSlider';
import './Home.css';

const Home = () => {
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [trendingSeries, setTrendingSeries] = useState([]);
    const [topRatedMovies, setTopRatedMovies] = useState([]);
    const [topRatedSeries, setTopRatedSeries] = useState([]);
    const [loading, setLoading] = useState(true);

    const extractResults = (resArray) => {
        try {
            return resArray.flatMap(r => r?.data?.results || []);
        } catch (e) {
            return [];
        }
    };

    const safeFetch = async (promise) => {
        try {
            return await promise;
        } catch (e) {
            console.error("Fetch failed:", e);
            return { data: { results: [] } };
        }
    };

    useEffect(() => {
        const fetchAllContent = async () => {
             setLoading(true);
             try {
                // Parallel fetch all base data
                const [trMResults, trSResults, topMResults, topSResults, rfTopM, rfTopS] = await Promise.all([
                    safeFetch(getTrending('movie', 'week', 1)),
                    safeFetch(getTrending('tv', 'week', 1)),
                    safeFetch(getTopRated('movie', 1)),
                    safeFetch(getTopRated('tv', 1)),
                    api.get('/reviews/top-rated?type=movie').catch(() => ({ data: [] })),
                    api.get('/reviews/top-rated?type=tv').catch(() => ({ data: [] }))
                ]);

                setTrendingMovies(trMResults.data?.results || []);
                setTrendingSeries(trSResults.data?.results || []);

                let finalMovies = topMResults.data?.results || [];
                let finalSeries = topSResults.data?.results || [];

                // Enhance with RateFlix ratings in parallel if needed
                if (rfTopM.data.length > 0 || rfTopS.data.length > 0) {
                    const [rfMovieItems, rfTvItems] = await Promise.all([
                        Promise.all(rfTopM.data.slice(0, 10).map(item => getDetails('movie', item.tmdbId).catch(() => null))),
                        Promise.all(rfTopS.data.slice(0, 10).map(item => getDetails('tv', item.tmdbId).catch(() => null)))
                    ]);

                    const mergeTopRated = (rfDetailsItems, tmdbItems) => {
                        const rfData = rfDetailsItems.filter(r => r && r.data).map(r => r.data);
                        const rfIds = new Set(rfData.map(i => i.id));
                        const filteredTmdb = tmdbItems.filter(i => !rfIds.has(i.id));
                        return [...rfData, ...filteredTmdb];
                    };

                    finalMovies = mergeTopRated(rfMovieItems, finalMovies);
                    finalSeries = mergeTopRated(rfTvItems, finalSeries);
                }

                setTopRatedMovies(finalMovies);
                setTopRatedSeries(finalSeries);

             } catch (error) {
                 console.error("Critical error in fetchAllContent:", error);
             } finally {
                 setLoading(false);
             }
        };
        fetchAllContent();
    }, []);

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>Sinematik deneyiminiz hazırlanıyor...</p>
        </div>
    );

    return (
        <div className="home animate-fade-in">
            <header className="hero">
                <h1>Keşfetmenin Yeni Yolu</h1>
                <p>Sinema yolculuğunuzu takip edin. RateFlix topluluğunda trend olanları keşfedin, puan verin ve inceleyin.</p>
            </header>

            <div className="sliders-wrapper">
                {trendingMovies.length > 0 && <MovieSlider title="Trend Filmler" items={trendingMovies} type="movie" />}
                {trendingSeries.length > 0 && <MovieSlider title="Trend Diziler" items={trendingSeries} type="tv" />}
                {topRatedMovies.length > 0 && <MovieSlider title="En Çok Oylanan Filmler" items={topRatedMovies} type="movie" />}
                {topRatedSeries.length > 0 && <MovieSlider title="En Çok Oylanan Diziler" items={topRatedSeries} type="tv" />}
                
                {trendingMovies.length === 0 && !loading && (
                    <div className="error-message glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <p>Trend içerikleri yükleyemedik. Lütfen birazdan tekrar deneyin.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
