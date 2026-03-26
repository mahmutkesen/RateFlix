import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import RatingStars from '../components/RatingStars';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { FaUser, FaStar, FaList, FaTrash, FaClock, FaFilm, FaChevronDown, FaChevronUp, FaThumbsUp, FaThumbsDown, FaComment, FaPaperPlane, FaTimes } from 'react-icons/fa';
import './Home.css';
import './Community.css';

const listItemColors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];

const Community = () => {
    const [reviews, setReviews] = useState([]);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myUser, setMyUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null, targetId: null });
    const { showToast } = useToast();

    // New states for Tab and Expansion logic
    const [activeTab, setActiveTab] = useState('reviews');
    const [expandedListId, setExpandedListId] = useState(null);
    // Like/Dislike local state: { [id]: { likes, dislikes, liked, disliked } }
    const [reactions, setReactions] = useState({});

    // Comment states
    const [comments, setComments] = useState({}); // { [targetId]: comments[] }
    const [expandedComments, setExpandedComments] = useState({}); // { [targetId]: boolean }
    const [commentText, setCommentText] = useState({}); // { [targetId]: string }
    const [loadingComments, setLoadingComments] = useState({}); // { [targetId]: boolean }

    const initReactions = (items) => {
        const myId = JSON.parse(localStorage.getItem('user') || 'null')?.id;
        const map = {};
        items.forEach(item => {
            const likes = item.likes?.length || 0;
            const dislikes = item.dislikes?.length || 0;
            const liked = myId ? (item.likes || []).some(id => id === myId || id?._id === myId || id?.toString() === myId) : false;
            const disliked = myId ? (item.dislikes || []).some(id => id === myId || id?._id === myId || id?.toString() === myId) : false;
            map[item._id] = { likes, dislikes, liked, disliked };
        });
        return map;
    };

    useEffect(() => {
        const fetchCommunityData = async () => {
            setLoading(true);
            try {
                const [reviewsRes, listsRes] = await Promise.all([
                    api.get('/reviews/all').catch(() => ({ data: [] })),
                    api.get('/lists/public').catch(() => ({ data: [] }))
                ]);
                setReviews(reviewsRes.data);
                setLists(listsRes.data);
                setReactions(prev => ({ ...initReactions(reviewsRes.data), ...initReactions(listsRes.data) }));
            } catch (err) {
                console.error("Error fetching community data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunityData();
    }, []);

    const handleDeleteReview = (id) => {
        setConfirmDelete({ isOpen: true, type: 'review', id });
    };

    const handleDeleteList = (id) => {
        setConfirmDelete({ isOpen: true, type: 'list', id });
    };

    const confirmDeleteAction = async () => {
        const { type, id, targetId } = confirmDelete;
        try {
            if (type === 'review') {
                await api.delete(`/reviews/${id}`);
                setReviews(reviews.filter(r => r._id !== id));
                showToast("İnceleme silindi.", 'success');
            } else if (type === 'list') {
                await api.delete(`/lists/${id}`);
                setLists(lists.filter(l => l._id !== id));
                showToast("Liste silindi.", 'success');
            } else if (type === 'comment') {
                await api.delete(`/comments/${id}`);
                setComments(prev => ({
                    ...prev,
                    [targetId]: prev[targetId].filter(c => c._id !== id)
                }));
                showToast("Yorum silindi.", 'success');
            }
        } catch (error) {
            showToast("Silme işlemi başarısız.", 'error');
        } finally {
            setConfirmDelete({ isOpen: false, type: null, id: null, targetId: null });
        }
    };

    const toggleList = (id) => {
        setExpandedListId(expandedListId === id ? null : id);
    };

    const toggleComments = async (targetId) => {
        const isExpanded = !expandedComments[targetId];
        setExpandedComments(prev => ({ ...prev, [targetId]: isExpanded }));

        if (isExpanded && (!comments[targetId] || comments[targetId].length === 0)) {
            fetchComments(targetId);
        }
    };

    const fetchComments = async (targetId) => {
        setLoadingComments(prev => ({ ...prev, [targetId]: true }));
        try {
            const res = await api.get(`/comments/${targetId}`);
            setComments(prev => ({ ...prev, [targetId]: res.data }));
        } catch (err) {
            console.error("Comment fetch error", err);
        } finally {
            setLoadingComments(prev => ({ ...prev, [targetId]: false }));
        }
    };

    const handleCommentSubmit = async (e, targetId, targetType) => {
        e.preventDefault();
        const text = commentText[targetId];
        if (!text || text.trim().length === 0) return;
        if (!myUser) return showToast('Yorum yapmak için giriş yapmalısınız.', 'error');

        try {
            const res = await api.post('/comments', {
                content: text,
                targetId,
                targetType
            });
            setComments(prev => ({ ...prev, [targetId]: [res.data, ...(prev[targetId] || [])].slice(0, 10) }));
            setCommentText(prev => ({ ...prev, [targetId]: '' }));
            showToast('Yorum eklendi!', 'success');
        } catch (err) {
            showToast('Yorum eklenemedi.', 'error');
        }
    };

    const handleCommentReaction = async (commentId, type, targetId) => {
        if (!myUser) return showToast('Giriş yapmalısınız.', 'error');
        try {
            const res = await api.post(`/comments/${commentId}/${type}`);
            setComments(prev => ({
                ...prev,
                [targetId]: prev[targetId].map(c =>
                    c._id === commentId
                        ? {
                            ...c,
                            likes: res.data.liked ? [...c.likes, myUser.id] : c.likes.filter(id => id.toString() !== myUser.id),
                            dislikes: res.data.disliked ? [...c.dislikes, myUser.id] : c.dislikes.filter(id => id.toString() !== myUser.id)
                        }
                        : c
                )
            }));
        } catch (err) {
            showToast('İşlem başarısız.', 'error');
        }
    };

    const handleCommentDelete = async (commentId, targetId) => {
        setConfirmDelete({ isOpen: true, type: 'comment', id: commentId, targetId });
    };

    const renderComments = (targetId, targetType, initialCount = 0) => {
        const isExpanded = expandedComments[targetId];
        const itemComments = comments[targetId] || [];
        const isLoading = loadingComments[targetId];
        const displayCount = comments[targetId] ? itemComments.length : initialCount;

        return (
            <div className={`comment-section ${isExpanded ? 'active' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => toggleComments(targetId)}
                        className="comment-toggle-btn"
                    >
                        <FaComment size={12} /> {isExpanded ? 'Yorumları Kapat' : `Yorumlar (${displayCount})`}
                        {isExpanded ? <FaChevronUp size={10} style={{ marginLeft: '4px' }} /> : <FaChevronDown size={10} style={{ marginLeft: '4px' }} />}
                    </button>
                </div>

                {isExpanded && (
                    <div className="comment-drawer animate-fade-in">
                        {/* Add Comment Input */}
                        {myUser && (
                            <form onSubmit={(e) => handleCommentSubmit(e, targetId, targetType)} className="comment-form">
                                <input
                                    type="text"
                                    placeholder="Bir yorum yaz..."
                                    value={commentText[targetId] || ''}
                                    onChange={(e) => setCommentText(prev => ({ ...prev, [targetId]: e.target.value }))}
                                    maxLength="500"
                                />
                                <button type="submit" disabled={!commentText[targetId]?.trim()}>
                                    <FaPaperPlane />
                                </button>
                            </form>
                        )}

                        {/* Comment List */}
                        <div className="comment-list">
                            {isLoading ? (
                                <div className="small-spinner-container"><div className="small-spinner"></div></div>
                            ) : itemComments.length === 0 ? (
                                <p className="no-comments">Henüz yorum yok. İlk yorumu sen yap!</p>
                            ) : (
                                itemComments.map(c => {
                                    const myId = myUser?.id;
                                    const liked = (c.likes || []).some(id => id === myId || id?._id === myId || id?.toString() === myId);
                                    const disliked = (c.dislikes || []).some(id => id === myId || id?._id === myId || id?.toString() === myId);

                                    return (
                                        <div key={c._id} className="comment-item">
                                            <div className="comment-avatar">
                                                {c.user?.profilePic ? (
                                                    <img src={c.user.profilePic} alt={c.user.username} />
                                                ) : (
                                                    <FaUser />
                                                )}
                                            </div>
                                            <div className="comment-body">
                                                <div className="comment-header">
                                                    <span className="comment-author">{c.user?.username || 'Kullanıcı'}</span>
                                                    <span className="comment-date">{new Date(c.createdAt).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                                <p className="comment-content">{c.content}</p>
                                                <div className="comment-actions">
                                                    <div className="comment-reactions">
                                                        <button
                                                            onClick={() => handleCommentReaction(c._id, 'like', targetId)}
                                                            className={liked ? 'active-like' : ''}
                                                        >
                                                            <FaThumbsUp size={10} /> {c.likes?.length || 0}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCommentReaction(c._id, 'dislike', targetId)}
                                                            className={disliked ? 'active-dislike' : ''}
                                                        >
                                                            <FaThumbsDown size={10} /> {c.dislikes?.length || 0}
                                                        </button>
                                                    </div>
                                                    {myUser && (myUser.id === c.user?._id || myUser.id === c.user || myUser.role === 'admin') && (
                                                        <button onClick={() => handleCommentDelete(c._id, targetId)} className="comment-delete">
                                                            <FaTrash size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>Topluluk verileri yükleniyor...</p>
        </div>
    );

    return (
        <div className="community-page animate-fade-in" style={{ padding: '0 2rem' }}>
            <header className="hero" style={{ padding: '4rem 0 2rem' }}>
                <h1>Topluluk Merkezi</h1>
                <p>Diğer RateFlix üyelerinin neler izlediğini keşfedin, incelemeleri okuyun ve listeleri inceleyin.</p>
            </header>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                <button
                    onClick={() => setActiveTab('reviews')}
                    style={{
                        background: activeTab === 'reviews' ? 'linear-gradient(135deg, var(--primary-color), #f39c12)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.8rem 2.5rem',
                        borderRadius: '30px',
                        color: activeTab === 'reviews' ? '#000' : 'var(--text-muted)',
                        fontSize: '1.2rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.8rem', transition: 'all 0.3s',
                        boxShadow: activeTab === 'reviews' ? '0 4px 15px rgba(212, 175, 55, 0.4)' : 'none'
                    }}
                    className="hover-scale"
                >
                    <FaStar /> Son İncelemeler
                </button>
                <button
                    onClick={() => setActiveTab('lists')}
                    style={{
                        background: activeTab === 'lists' ? 'linear-gradient(135deg, var(--primary-color), #f39c12)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.8rem 2.5rem',
                        borderRadius: '30px',
                        color: activeTab === 'lists' ? '#000' : 'var(--text-muted)',
                        fontSize: '1.2rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.8rem', transition: 'all 0.3s',
                        boxShadow: activeTab === 'lists' ? '0 4px 15px rgba(212, 175, 55, 0.4)' : 'none'
                    }}
                    className="hover-scale"
                >
                    <FaList /> Herkese Açık Listeler
                </button>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Son İncelemeler */}
                {activeTab === 'reviews' && (
                    <section className="animate-fade-in">
                        {reviews.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Henüz inceleme bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {reviews.map(review => (
                                    <div key={review._id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                            <div className="review-content-wrapper" style={{ display: 'flex', gap: '1rem' }}>
                                                {/* Poster */}
                                                <Link to={`/${review.mediaType}/${review.tmdbId}`} style={{ flexShrink: 0 }}>
                                                    {review.posterPath ? (
                                                        <img
                                                            src={getImageUrl(review.posterPath, 'w200')}
                                                            alt={review.movieTitle}
                                                            style={{ width: '80px', borderRadius: '8px', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div style={{ width: '80px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <FaFilm style={{ color: 'var(--text-muted)' }} />
                                                        </div>
                                                    )}
                                                </Link>

                                                {/* İçerik */}
                                                <div style={{ flex: 1 }}>
                                                    <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <Link to={review.user ? `/profile/${review.user.username || review.user._id || review.user}` : '#'} style={{ textDecoration: 'none' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                <div style={{ background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.7rem' }}>
                                                                    {review.user?.profilePic ? <img src={review.user.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <FaUser />}
                                                                </div>
                                                                {review.user?.username || (typeof review.user === 'string' ? `User-${review.user.substring(0, 5)}` : 'Kullanıcı')}
                                                            </div>
                                                        </Link>
                                                        <Link to={`/${review.mediaType}/${review.tmdbId}`} style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                                                            {review.movieTitle || 'İsimsiz İçerik'}
                                                        </Link>
                                                    </div>
                                                    <RatingStars rating={review.rating} readonly />
                                                </div>

                                                <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '0.95rem', margin: '0.8rem 0' }}>
                                                    "{review.reviewText || 'Sadece puan verdi.'}"
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    <span><FaClock style={{ marginRight: '0.3rem' }} /> {new Date(review.createdAt).toLocaleDateString('tr-TR')}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {/* Like Button */}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                if (!myUser) return showToast('Beğenmek için giriş yapmalısınız.', 'error');
                                                                const prev = reactions[review._id] || { likes: 0, dislikes: 0, liked: false, disliked: false };
                                                                setReactions(r => ({ ...r, [review._id]: { ...prev, likes: prev.liked ? prev.likes - 1 : prev.likes + 1, dislikes: prev.disliked ? prev.disliked - 1 : prev.dislikes, liked: !prev.liked, disliked: false } }));
                                                                try { await api.post(`/reviews/${review._id}/like`); } catch { setReactions(r => ({ ...r, [review._id]: prev })); }
                                                            }}
                                                            style={{ background: reactions[review._id]?.liked ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[review._id]?.liked ? '#2ed573' : 'rgba(255,255,255,0.1)'}`, color: reactions[review._id]?.liked ? '#2ed573' : 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontSize: '0.8rem' }}
                                                        >
                                                            <FaThumbsUp size={11} /> {reactions[review._id]?.likes || 0}
                                                        </button>
                                                        {/* Dislike Button */}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                if (!myUser) return showToast('Giriş yapmalısınız.', 'error');
                                                                const prev = reactions[review._id] || { likes: 0, dislikes: 0, liked: false, disliked: false };
                                                                setReactions(r => ({ ...r, [review._id]: { ...prev, dislikes: prev.disliked ? prev.dislikes - 1 : prev.dislikes + 1, likes: prev.liked ? prev.likes - 1 : prev.likes, liked: false, disliked: !prev.disliked } }));
                                                                try { await api.post(`/reviews/${review._id}/dislike`); } catch { setReactions(r => ({ ...r, [review._id]: prev })); }
                                                            }}
                                                            style={{ background: reactions[review._id]?.disliked ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[review._id]?.disliked ? '#ff7675' : 'rgba(255,255,255,0.1)'}`, color: reactions[review._id]?.disliked ? '#ff7675' : 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontSize: '0.8rem' }}
                                                        >
                                                            <FaThumbsDown size={11} /> {reactions[review._id]?.dislikes || 0}
                                                        </button>
                                                        {myUser && (myUser.id === review.user?._id || myUser.id === review.user || myUser.role === 'admin') && (
                                                            <button onClick={() => handleDeleteReview(review._id)} style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer' }} title="Sil">
                                                                <FaTrash />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Comment Section for Review */}
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                                    {renderComments(review._id, 'review', review.commentCount || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Ayrılmış Listeler */}
                {activeTab === 'lists' && (
                    <section className="animate-fade-in">
                        {lists.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Herkese açık liste bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {lists.map((list, idx) => (
                                    <div key={list._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', transition: 'all 0.3s', backgroundColor: expandedListId === list._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                                        <div
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                                            onClick={() => toggleList(list._id)}
                                        >
                                            <div>
                                                <Link to={list.user ? `/profile/${list.user.username || list.user._id || list.user}` : '#'} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                                                    <div style={{
                                                        background: `${listItemColors[idx % listItemColors.length]}22`,
                                                        border: `1px solid ${listItemColors[idx % listItemColors.length]}44`,
                                                        borderRadius: '8px',
                                                        padding: '0.5rem 0.75rem',
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                        marginBottom: '0.75rem',
                                                        fontSize: '0.8rem', fontWeight: 700,
                                                        color: listItemColors[idx % listItemColors.length]
                                                    }}>
                                                        {list.user?.profilePic ? <img src={list.user.profilePic} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%' }} /> : <FaUser style={{ fontSize: '0.7rem' }} />}
                                                        {list.user?.username || (typeof list.user === 'string' ? `User-${list.user.substring(0, 5)}` : 'Kullanıcı')}
                                                    </div>
                                                </Link>
                                                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.3rem', color: '#fff' }}>{list.name}</h3>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{list.items?.length || 0} içerik</p>
                                                {list.description && (
                                                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.4rem', fontStyle: 'italic' }}>{list.description}</p>
                                                )}
                                                {myUser && (myUser.id === list.user?._id || myUser.id === list.user || myUser.role === 'admin') && !['favorites', 'watchlist', 'watched'].includes(list.type) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list._id); }}
                                                        style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                    >
                                                        <FaTrash size={10} /> Listeyi Sil
                                                    </button>
                                                )}

                                                {/* Unexpanded Preview Row */}
                                                {expandedListId !== list._id && list.items?.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflow: 'hidden' }}>
                                                        {list.items.slice(0, 5).map((item, i) => (
                                                            <div key={i} style={{ flexShrink: 0 }}>
                                                                {item.posterPath ? (
                                                                    <img src={getImageUrl(item.posterPath, 'w92')} alt={item.title} style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                ) : (
                                                                    <div style={{ width: '40px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <FaFilm size={12} color="var(--text-muted)" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {list.items.length > 5 && (
                                                            <div style={{ width: '40px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                +{list.items.length - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.5rem', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                                                {expandedListId === list._id ? <FaChevronUp /> : <FaChevronDown />}
                                                {/* List Like/Dislike */}
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                                    <button onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!myUser) return showToast('Beğenmek için giriş yapmalısınız.', 'error');
                                                        const prev = reactions[list._id] || { likes: 0, dislikes: 0, liked: false, disliked: false };
                                                        setReactions(r => ({ ...r, [list._id]: { ...prev, likes: prev.liked ? prev.likes - 1 : prev.likes + 1, dislikes: prev.disliked ? prev.dislikes - 1 : prev.dislikes, liked: !prev.liked, disliked: false } }));
                                                        try { await api.post(`/lists/${list._id}/like`); } catch { setReactions(r => ({ ...r, [list._id]: prev })); }
                                                    }}
                                                        style={{ background: reactions[list._id]?.liked ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[list._id]?.liked ? '#2ed573' : 'rgba(255,255,255,0.1)'}`, color: reactions[list._id]?.liked ? '#2ed573' : 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontSize: '0.75rem' }}>
                                                        <FaThumbsUp size={10} /> {reactions[list._id]?.likes || 0}
                                                    </button>
                                                    <button onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!myUser) return showToast('Giriş yapmalısınız.', 'error');
                                                        const prev = reactions[list._id] || { likes: 0, dislikes: 0, liked: false, disliked: false };
                                                        setReactions(r => ({ ...r, [list._id]: { ...prev, dislikes: prev.disliked ? prev.dislikes - 1 : prev.dislikes + 1, likes: prev.liked ? prev.likes - 1 : prev.likes, liked: false, disliked: !prev.disliked } }));
                                                        try { await api.post(`/lists/${list._id}/dislike`); } catch { setReactions(r => ({ ...r, [list._id]: prev })); }
                                                    }}
                                                        style={{ background: reactions[list._id]?.disliked ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[list._id]?.disliked ? '#ff7675' : 'rgba(255,255,255,0.1)'}`, color: reactions[list._id]?.disliked ? '#ff7675' : 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontSize: '0.75rem' }}>
                                                        <FaThumbsDown size={10} /> {reactions[list._id]?.dislikes || 0}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Content View */}
                                        {expandedListId === list._id && (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {list.items?.length > 0 ? (
                                                        list.items.map(item => (
                                                            <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} key={item.tmdbId} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }} className="hover-scale">
                                                                {item.posterPath ? (
                                                                    <img src={getImageUrl(item.posterPath, 'w200')} alt={item.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem' }} />
                                                                ) : (
                                                                    <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                                                        <FaFilm />
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                                            </Link>
                                                        ))
                                                    ) : (
                                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
                                                            Bu listede henüz içerik yok.
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Comment Section for List */}
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                                    {renderComments(list._id, 'list', list.commentCount || 0)}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

            </div>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={confirmDelete.type === 'review' ? "İncelemeyi Sil" : confirmDelete.type === 'list' ? "Listeyi Sil" : "Yorumu Sil"}
                message="Bunu kalıcı olarak silmek istediğinize emin misiniz?"
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete({ isOpen: false, type: null, id: null, targetId: null })}
            />
        </div>
    );
};

export default Community;
