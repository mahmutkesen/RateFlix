import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { discoverContent, UNIFIED_CATEGORIES } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import './CategoryPage.css';

const CategoryPage = () => {
    const { type } = useParams(); // 'movie' or 'tv'
    const [searchParams] = useSearchParams();
    const genreId = searchParams.get('genre');
    
    const [items, setItems] = useState([]);
    const [genreName, setGenreName] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
 
    useEffect(() => {
        if (genreId) {
            const cat = UNIFIED_CATEGORIES.find(c => c.id === genreId);
            if (cat) {
                setGenreName(cat.name);
            }
        }
        setItems([]);
        setPage(1);
        setHasMore(true);
    }, [type, genreId]);

    useEffect(() => {
        const fetchItems = async () => {
            if (!genreId) return;
            const cat = UNIFIED_CATEGORIES.find(c => c.id === genreId);
            if (!cat) return;
            const tmdbGenreId = type === 'movie' ? cat.movie : cat.tv;

            setLoading(true);
            try {
                const res = await discoverContent(type, tmdbGenreId, page);
                if (res.data.results.length === 0) {
                    setHasMore(false);
                } else {
                    setItems(prev => page === 1 ? res.data.results : [...prev, ...res.data.results]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [type, genreId, page]);

    return (
        <div className="category-page animate-fade-in container">
            <header className="category-header">
                <h1>{genreName || 'Keşfet'} <span className="type-badge">{type === 'movie' ? 'Filmler' : 'Diziler'}</span></h1>
                <p>{genreName ? `${genreName} kategorisinin en iyileri` : 'Bu kategorinin en iyilerini keşfedin'}</p>
            </header>

            <div className="movie-grid">
                {items.map(item => (
                    <MovieCard key={item.id} item={item} type={type} />
                ))}
            </div>

            {loading && (
                <div className="loading-trigger">
                    <div className="spinner-small"></div>
                </div>
            )}

            {hasMore && !loading && (
                <div className="load-more-container">
                    <button className="btn-load-more" onClick={() => setPage(prev => prev + 1)}>
                        Daha Fazla Yükle
                    </button>
                </div>
            )}
        </div>
    );
};

export default CategoryPage;
