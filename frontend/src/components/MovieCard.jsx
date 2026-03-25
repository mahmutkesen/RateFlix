import React from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import { FaStar, FaPlus, FaCheck, FaHeart, FaEye, FaList } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import './MovieCard.css';
import { useUserLists } from '../context/UserListsContext';

const MovieCard = ({ item, type }) => {
    const [rateflixRating, setRateflixRating] = React.useState(0);
    const { userLists, refreshLists } = useUserLists();

    React.useEffect(() => {
        const fetchRating = async () => {
            try {
                const res = await api.get(`/reviews/average/${item.id}/${type}`);
                if (res.data && res.data.count > 0) {
                    setRateflixRating(res.data.average);
                } else {
                    setRateflixRating(0);
                }
            } catch (err) {
                setRateflixRating(0);
            }
        };
        fetchRating();
    }, [item.id, type]);

    const token = localStorage.getItem('token');
    const { showToast } = useToast();
    const [showListMenu, setShowListMenu] = React.useState(false);

    const handleListClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token) {
            showToast('Liste işlemi için giriş yapmalısınız.', 'error');
            return;
        }
        setShowListMenu(!showListMenu);
    };

    const handleAddToList = async (e, listId, listName) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.post(`/lists/${listId}/items`, {
                tmdbId: item.id,
                mediaType: type || item.media_type || 'movie',
                posterPath: item.poster_path
            });
            showToast(`"${item.title || item.name}" başarıyla "${listName}" listesine eklendi!`, 'success');
            setShowListMenu(false);
        } catch (err) {
            showToast(err.response?.data?.message || 'Listeye eklenirken bir hata oluştu.', 'error');
        }
    };

    return (
        <Link to={`/${type}/${item.id}`} className="movie-card">
            <div className="card-image-wrapper">
                <img
                    src={getImageUrl(item.poster_path)}
                    alt={item.title || item.name}
                    className="card-image"
                    loading="lazy"
                />
                <div className="card-overlay">
                    <div className="badges-stack">
                        <span className="rating-badge tmdb">
                            <FaStar className="star-icon" />
                            {item.vote_average?.toFixed(1) || '0.0'}
                        </span>
                        <span className="rating-badge rateflix">
                            <div className="rf-logo-small">R</div>
                            {rateflixRating.toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
            <div className="card-content" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h3 className="card-title" title={item.title || item.name} style={{ margin: 0, flex: 1 }}>
                        {item.title || item.name}
                    </h3>
                    {token && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={handleListClick}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--primary-color)',
                                    width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0, marginLeft: '0.5rem', transition: 'background 0.3s'
                                }}
                                title="Add to List"
                                className="hover-bg-primary"
                            >
                                <FaPlus style={{ fontSize: '0.8rem' }} />
                            </button>

                            {/* Dropdown Menu - Expanding Upwards */}
                            {showListMenu && (
                                <div className="glass-panel animate-slide-in" style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: 0,
                                    marginBottom: '10px',
                                    zIndex: 100,
                                    minWidth: '180px',
                                    padding: '8px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    borderRadius: '8px',
                                    boxShadow: '0 -5px 15px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '4px' }}>
                                        LİSTELERİM
                                    </div>
                                    {userLists.length === 0 ? (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '5px' }}>Yükleniyor...</div>
                                    ) : (
                                        userLists
                                            .sort((a, b) => {
                                                const order = { 'watched': 1, 'watchlist': 2, 'favorites': 3, 'custom': 4 };
                                                return (order[a.type] || 5) - (order[b.type] || 5);
                                            })
                                            .map(list => {
                                                const listNameMapping = { 'watchlist': 'İzleyeceklerim', 'watched': 'İzlediklerim', 'favorites': 'Favorilerim' };
                                                const iconMapping = { 'watchlist': <FaEye />, 'watched': <FaCheck />, 'favorites': <FaHeart /> };
                                                return (
                                                    <button
                                                        key={list._id}
                                                        onClick={(e) => handleAddToList(e, list._id, listNameMapping[list.type] || list.name)}
                                                        style={{
                                                            width: '100%', padding: '8px', textAlign: 'left', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px'
                                                        }}
                                                        className="list-item-hover"
                                                    >
                                                        <span style={{ color: list.type === 'favorites' ? '#e74c3c' : (list.type === 'watched' ? '#2ecc71' : 'var(--primary-color)') }}>
                                                            {iconMapping[list.type] || <FaList />}
                                                        </span>
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listNameMapping[list.type] || list.name}</span>
                                                    </button>
                                                );
                                            })
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <p className="card-year">
                    {(item.release_date || item.first_air_date || '').split('-')[0]}
                </p>
            </div>
        </Link>
    );
};

export default MovieCard;
