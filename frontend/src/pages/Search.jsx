import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import tmdbApi from '../services/tmdb';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import { FaSearch, FaSpinner, FaUserFriends, FaUser } from 'react-icons/fa';

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [results, setResults] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'media', 'members'

    const fetchResults = useCallback(async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setUserResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setSearched(true);
        try {
            const [tmdbRes, userRes] = await Promise.all([
                tmdbApi.get('/search/multi', { params: { query: searchQuery } }),
                api.get(`/auth/search?q=${searchQuery}`)
            ]);

            const filtered = tmdbRes.data.results.filter(
                item => item.media_type === 'movie' || item.media_type === 'tv'
            );
            setResults(filtered);
            setUserResults(userRes.data);
        } catch (error) {
            console.error('Search error', error);
            setResults([]);
            setUserResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sync state with URL params (Navbar search updates the URL)
    useEffect(() => {
        const q = searchParams.get('q');
        if (q !== null) {
            setQuery(q);
        }
    }, [searchParams]);

    // Handle debounced search and URL sync
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults(query);
            // Update URL only if the query was changed manually in the search input
            if (query !== (searchParams.get('q') || '')) {
                if (query) {
                    setSearchParams({ q: query });
                } else {
                    setSearchParams({});
                }
            }
        }, 400); 

        return () => clearTimeout(timer); 
    }, [query, fetchResults, searchParams, setSearchParams]);

    return (
        <div className="search-page animate-fade-in container" style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
            <div style={{ textAlign: 'center', margin: '2rem 0 3rem' }}>
                <h1 style={{ 
                    fontSize: '2.8rem', 
                    fontWeight: 800, 
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, #d4af37 0%, #f39c12 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.5px'
                }}>
                    Keşfet
                </h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem' }}>
                    Sıradaki favori film veya dizinizi bulun
                </p>
                
                <div style={{ 
                    position: 'relative', 
                    maxWidth: '640px', 
                    margin: '0 auto'
                }}>
                    <FaSearch style={{ 
                        position: 'absolute', 
                        left: '1.2rem', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: 'var(--primary-color)',
                        fontSize: '1.1rem',
                        zIndex: 1
                    }} />
                    {loading && (
                        <FaSpinner style={{ 
                            position: 'absolute', 
                            right: '1.2rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            color: 'var(--primary-color)',
                            fontSize: '1.1rem',
                            animation: 'spin 1s linear infinite'
                        }} />
                    )}
                    <input 
                        type="text" 
                        placeholder="Film, dizi, üye ara..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '1.2rem 1.5rem 1.2rem 3.5rem',
                            fontSize: '1.2rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '50px',
                            color: 'white',
                            fontSize: '1.1rem',
                            outline: 'none',
                            boxShadow: query ? '0 0 0 3px rgba(212, 175, 55, 0.15), 0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.4)',
                            transition: 'all 0.3s ease'
                        }}
                    />
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
                    {[
                        { id: 'all', label: 'Tüm Sonuçlar' },
                        { id: 'media', label: 'Film & Dizi' },
                        { id: 'members', label: 'Üyeler' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.6rem 1.5rem',
                                borderRadius: '20px',
                                border: '1px solid var(--glass-border)',
                                background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                                color: activeTab === tab.id ? '#000' : 'var(--text-muted)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spinner animation */}
            <style>{`
                @keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }
            `}</style>

            {/* No results state */}
            {searched && !loading && results.length === 0 && userResults.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>"{query}" için sonuç bulunamadı</h2>
                    <p>Farklı bir başlık deneyin veya yazımınızı kontrol edin.</p>
                </div>
            )}

            {/* Results Grid */}
            {(results.length > 0 || userResults.length > 0) && (
                <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        "{query}" için <strong style={{ color: 'var(--primary-color)' }}>{results.length + userResults.length}</strong> sonuç bulundu
                    </p>

                    {/* User Results Section */}
                    {(activeTab === 'all' || activeTab === 'members') && userResults.length > 0 && (
                        <div style={{ marginBottom: '3rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <FaUserFriends style={{ color: 'var(--primary-color)' }} /> Üyeler ({userResults.length})
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                {userResults.map(u => (
                                    <Link key={u._id || u.id} to={`/profile/${u.username || u._id || u.id}`} className="glass-panel hover-scale" style={{ 
                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', textDecoration: 'none', color: '#fff', borderRadius: '15px' 
                                    }}>
                                        <div style={{ 
                                            width: '50px', height: '50px', borderRadius: '50%', 
                                            background: 'linear-gradient(135deg, var(--primary-color), #f39c12)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '1.2rem', color: '#000'
                                        }}>
                                            {u.username? u.username[0].toUpperCase() : 'U'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600 }}>{u.username}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RateFlix Üyesi</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {(activeTab === 'all' && results.length > 0) && (
                                <div style={{ height: '1px', background: 'rgba(212, 175, 55, 0.1)', margin: '3rem 0' }}></div>
                            )}
                        </div>
                    )}

                    {/* Media Results Section */}
                    {(activeTab === 'all' || activeTab === 'media') && results.length > 0 && (
                        <div className="movie-grid">
                            {results.map(item => (
                                <MovieCard key={item.id} item={item} type={item.media_type || 'movie'} />
                            ))}
                        </div>
                    )}

                    {/* No results in specific tab */}
                    {activeTab === 'members' && userResults.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
                            "{query}" ile eşleşen üye bulunamadı
                        </div>
                    )}
                    {activeTab === 'media' && results.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
                            "{query}" ile eşleşen film veya dizi bulunamadı
                        </div>
                    )}
                </>
            )}

            {/* Initial state (nothing typed yet) */}
            {!query && (
                <div style={{ textAlign: 'center', marginTop: '5rem' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.3 }}>🎥</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        Film ve dizileri keşfetmek için yazmaya başlayın
                    </p>
                </div>
            )}
        </div>
    );
};

export default Search;
