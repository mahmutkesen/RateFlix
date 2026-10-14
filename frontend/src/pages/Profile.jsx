import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import RatingStars from '../components/RatingStars';
import { 
    FaUserPlus, FaUserMinus, FaUser, FaStar, FaList, FaFilm, 
    FaChevronDown, FaChevronUp, FaTrash, FaClock, FaThumbsUp, 
    FaThumbsDown, FaComment, FaEye 
} from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import './Profile.css';

const listItemColors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];

const Profile = () => {
    const { userId } = useParams();
    const myUser = JSON.parse(localStorage.getItem('user') || 'null');
    const [profileData, setProfileData] = useState(null);
    const [reactionsData, setReactionsData] = useState({
        likedReviews: [],
        dislikedReviews: [],
        likedLists: [],
        dislikedLists: [],
        likedComments: [],
        dislikedComments: []
    });
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const { showToast } = useToast();
    const [expandedListId, setExpandedListId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null });
    const [editingReview, setEditingReview] = useState(null);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);

    // Profile navigation tabs
    const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'lists' | 'likes' | 'dislikes'
    const [reactionSubFilter, setReactionSubFilter] = useState('all'); // 'all' | 'reviews' | 'lists' | 'comments'

    // Determine target ID (either the URL param or the logged-in user's ID)
    const targetUserId = userId || myUser?.id;

    useEffect(() => {
        const fetchProfile = async () => {
            if (!targetUserId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [profileRes, reactionsRes] = await Promise.all([
                    api.get(`/auth/profile/${targetUserId}`),
                    api.get(`/users/${targetUserId}/reactions`).catch(() => ({ data: {} }))
                ]);

                setProfileData(profileRes.data);
                setReactionsData(reactionsRes.data || {
                    likedReviews: [],
                    dislikedReviews: [],
                    likedLists: [],
                    dislikedLists: [],
                    likedComments: [],
                    dislikedComments: []
                });
                setFollowersCount(profileRes.data?.user?.followers?.length || 0);

                if (myUser && profileRes.data?.user?.followers) {
                    const following = profileRes.data.user.followers.some(f =>
                        (f._id || f).toString() === myUser.id
                    );
                    setIsFollowing(following);
                }
            } catch (err) {
                console.error("Profile fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [targetUserId, myUser?.id]);

    const handleFollow = async () => {
        if (!myUser) {
            showToast("Takip etmek için giriş yapmalısınız.", 'error');
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (isFollowing) {
                await api.post(`/auth/unfollow/${profileData.user._id}`);
                showToast("Takipten çıkıldı.", 'success');
            } else {
                await api.post(`/auth/follow/${profileData.user._id}`);
                showToast("Takip edildi.", 'success');
            }
            const res = await api.get(`/auth/profile/${targetUserId}`);
            setProfileData(res.data);
            setFollowersCount(res.data.user.followers?.length || 0);
            if (myUser && res.data.user.followers) {
                setIsFollowing(res.data.user.followers.some(f => (f._id || f).toString() === myUser.id));
            }
        } catch (err) {
            console.error("Follow error:", err.response?.data || err.message);
            const msg = err.response?.data?.message || "Bir hata oluştu.";
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleList = (id) => {
        setExpandedListId(expandedListId === id ? null : id);
    };

    const handleDeleteReview = (id) => {
        setConfirmDelete({ isOpen: true, type: 'review', id });
    };

    const handleDeleteList = (id) => {
        setConfirmDelete({ isOpen: true, type: 'list', id });
    };

    const confirmDeleteAction = async () => {
        const { type, id } = confirmDelete;
        try {
            if (type === 'review') {
                await api.delete(`/reviews/${id}`);
                setProfileData({
                    ...profileData,
                    reviews: profileData.reviews.filter(r => r._id !== id)
                });
                showToast("İnceleme silindi.", 'success');
            } else if (type === 'list') {
                await api.delete(`/lists/${id}`);
                setProfileData({
                    ...profileData,
                    lists: profileData.lists.filter(l => l._id !== id)
                });
                showToast("Liste silindi.", 'success');
            }
        } catch (error) {
            showToast("Silme işlemi başarısız.", 'error');
        } finally {
            setConfirmDelete({ isOpen: false, type: null, id: null });
        }
    };

    const handleUpdateReview = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.post('/reviews', {
                tmdbId: editingReview.tmdbId,
                mediaType: editingReview.mediaType,
                rating: editingReview.rating,
                reviewText: editingReview.reviewText,
                movieTitle: editingReview.movieTitle,
                posterPath: editingReview.posterPath
            });
            setProfileData({
                ...profileData,
                reviews: profileData.reviews.map(r => r._id === editingReview.id ? { ...r, rating: editingReview.rating, reviewText: editingReview.reviewText } : r)
            });
            setEditingReview(null);
            showToast('İnceleme güncellendi.', 'success');
        } catch (error) {
            showToast('Güncelleme başarısız.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="loading-container" style={{ paddingTop: '100px' }}>
            <div className="spinner"></div>
            <p>Profil yükleniyor...</p>
        </div>
    );

    if (!profileData || !profileData.user) return (
        <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
            <h2>Kullanıcı bulunamadı.</h2>
            <p style={{ color: 'var(--text-muted)' }}>Aranan profil yok veya silinmiş olabilir.</p>
            <Link to="/community" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>Topluluk Sayfasına Dön</Link>
        </div>
    );

    const { user, lists = [], reviews = [] } = profileData;
    const isMyProfile = myUser && (myUser.id === user._id.toString());

    // Reaction counts
    const likedReviews = reactionsData.likedReviews || [];
    const dislikedReviews = reactionsData.dislikedReviews || [];
    const likedLists = reactionsData.likedLists || [];
    const dislikedLists = reactionsData.dislikedLists || [];
    const likedComments = reactionsData.likedComments || [];
    const dislikedComments = reactionsData.dislikedComments || [];

    const totalLikes = likedReviews.length + likedLists.length + likedComments.length;
    const totalDislikes = dislikedReviews.length + dislikedLists.length + dislikedComments.length;

    // Helper: Render Review Item
    const renderReviewCard = (review, allowEdit = false) => {
        const reviewAuthor = review.user;
        const authorName = reviewAuthor?.username || (typeof reviewAuthor === 'string' ? `User-${reviewAuthor.substring(0, 5)}` : 'Kullanıcı');
        const authorLink = reviewAuthor ? `/profile/${reviewAuthor.username || reviewAuthor._id || reviewAuthor}` : '#';

        return (
            <div key={review._id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', gap: '1.2rem', borderRadius: '14px' }}>
                <Link to={`/${review.mediaType}/${review.tmdbId}`} style={{ flexShrink: 0 }}>
                    {review.posterPath ? (
                        <img 
                            src={getImageUrl(review.posterPath, 'w92')} 
                            alt={review.movieTitle} 
                            style={{ width: '65px', height: '98px', borderRadius: '8px', objectFit: 'cover' }} 
                        />
                    ) : (
                        <div style={{ width: '65px', height: '98px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaFilm color="var(--text-muted)" />
                        </div>
                    )}
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <div>
                            <Link to={authorLink} style={{ textDecoration: 'none' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.65rem', overflow: 'hidden' }}>
                                        {reviewAuthor?.profilePic ? <img src={reviewAuthor.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaUser />}
                                    </div>
                                    <span>{authorName}</span>
                                </div>
                            </Link>
                            <Link to={`/${review.mediaType}/${review.tmdbId}`} style={{ fontWeight: 700, color: '#fff', fontSize: '1.05rem', textDecoration: 'none' }} className="hover-text-primary">
                                {review.movieTitle || 'İsimsiz İçerik'}
                            </Link>
                        </div>
                        <RatingStars rating={review.rating} readonly />
                    </div>
                    <p style={{ color: '#ccc', fontSize: '0.92rem', margin: '0.4rem 0 0.8rem', fontStyle: 'italic', wordBreak: 'break-word' }}>
                        "{review.reviewText || 'Sadece puan verdi.'}"
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span><FaClock style={{ marginRight: '0.3rem' }} /> {new Date(review.createdAt).toLocaleDateString('tr-TR')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2ed573' }}>
                                <FaThumbsUp size={11} /> {review.likes?.length || 0}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ff7675' }}>
                                <FaThumbsDown size={11} /> {review.dislikes?.length || 0}
                            </span>
                            {allowEdit && (isMyProfile || myUser?.role === 'admin') && (
                                <div style={{ display: 'flex', gap: '8px', marginLeft: '0.5rem' }}>
                                    <button 
                                        onClick={() => setEditingReview({ 
                                            id: review._id, 
                                            tmdbId: review.tmdbId, 
                                            mediaType: review.mediaType, 
                                            rating: review.rating, 
                                            reviewText: review.reviewText, 
                                            movieTitle: review.movieTitle, 
                                            posterPath: review.posterPath 
                                        })} 
                                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Düzenle
                                    </button>
                                    <button onClick={() => handleDeleteReview(review._id)} style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer' }} title="Sil">
                                        <FaTrash />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Helper: Render List Item
    const renderListCard = (list, allowEdit = false) => {
        const listOwner = list.user;
        const ownerName = listOwner?.username || (typeof listOwner === 'string' ? `User-${listOwner.substring(0, 5)}` : 'Kullanıcı');
        const ownerLink = listOwner ? `/profile/${listOwner.username || listOwner._id || listOwner}` : '#';

        return (
            <div key={list._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', transition: 'all 0.3s', backgroundColor: expandedListId === list._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => toggleList(list._id)}>
                    <div>
                        <Link to={ownerLink} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: 'rgba(212, 175, 55, 0.12)',
                                border: '1px solid rgba(212, 175, 55, 0.25)',
                                borderRadius: '8px',
                                padding: '0.35rem 0.65rem',
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                marginBottom: '0.6rem',
                                fontSize: '0.8rem', fontWeight: 700,
                                color: 'var(--primary-color)'
                            }}>
                                {listOwner?.profilePic ? <img src={listOwner.profilePic} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%' }} /> : <FaUser style={{ fontSize: '0.7rem' }} />}
                                {ownerName}
                            </div>
                        </Link>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: '#fff' }}>{list.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{list.items?.length || 0} içerik</p>
                        {list.description && (
                            <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.3rem', fontStyle: 'italic' }}>{list.description}</p>
                        )}

                        {/* Unexpanded Preview Row */}
                        {expandedListId !== list._id && list.items?.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', overflow: 'hidden' }}>
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
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {allowEdit && (isMyProfile || myUser?.role === 'admin') && !['favorites', 'watchlist', 'watched'].includes(list.type) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteList(list._id); }}
                                style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '0.85rem' }}
                                title="Listeyi Sil"
                            >
                                <FaTrash />
                            </button>
                        )}
                        {expandedListId === list._id ? <FaChevronUp /> : <FaChevronDown />}
                    </div>
                </div>

                {/* Expanded Content View */}
                {expandedListId === list._id && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {list.items?.length > 0 ? (
                            list.items.map(item => (
                                <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} key={item.tmdbId} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }} className="hover-scale">
                                    {item.posterPath ? (
                                        <img src={getImageUrl(item.posterPath, 'w200')} alt={item.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.4rem' }} />
                                    ) : (
                                        <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                                            <FaFilm />
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || 'Film Detayı'}</div>
                                </Link>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
                                Bu listede henüz içerik yok.
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Helper: Render Comment Item
    const renderCommentCard = (comment) => {
        const commentAuthor = comment.user;
        const authorName = commentAuthor?.username || (typeof commentAuthor === 'string' ? `User-${commentAuthor.substring(0, 5)}` : 'Kullanıcı');
        const authorLink = commentAuthor ? `/profile/${commentAuthor.username || commentAuthor._id || commentAuthor}` : '#';
        const target = comment.target;

        return (
            <div key={comment._id} className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to={authorLink} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: '#fff' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden' }}>
                            {commentAuthor?.profilePic ? <img src={commentAuthor.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaUser />}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{authorName}</span>
                    </Link>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <FaClock style={{ marginRight: '0.2rem' }} /> {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                </div>

                <p style={{ color: '#ddd', fontSize: '0.95rem', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {comment.content}
                </p>

                {/* Target context badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {target ? (
                        target.type === 'review' ? (
                            <Link to={`/${target.mediaType || 'movie'}/${target.tmdbId}`} className="comment-target-badge">
                                <FaFilm size={11} /> 🎬 Film: {target.movieTitle || 'İnceleme'}
                            </Link>
                        ) : (
                            <span className="comment-target-badge">
                                <FaList size={11} /> 📋 Liste: {target.name || 'Liste'}
                            </span>
                        )
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Topluluk Yorumu</span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.8rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2ed573' }}>
                            <FaThumbsUp size={11} /> {comment.likes?.length || 0}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ff7675' }}>
                            <FaThumbsDown size={11} /> {comment.dislikes?.length || 0}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
        <div className="profile-page animate-fade-in" style={{ padding: '0 2rem' }}>
            {/* Profile Header */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2.5rem', borderRadius: '18px', flexWrap: 'wrap' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#000', fontWeight: 'bold', flexShrink: 0, overflow: 'hidden' }}>
                    {user.profilePic ? <img src={user.profilePic} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.username.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{user.username}</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => setShowFollowers(true)} className="hover-text-primary"><strong style={{ color: '#fff' }}>{followersCount}</strong> Takipçi</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => setShowFollowing(true)} className="hover-text-primary"><strong style={{ color: '#fff' }}>{user.following?.length || 0}</strong> Takip Edilen</span>
                        <span><strong style={{ color: '#fff' }}>{reviews?.length || 0}</strong> İnceleme</span>
                        <span><strong style={{ color: '#fff' }}>{lists?.length || 0}</strong> Liste</span>
                    </div>
                </div>

                {!isMyProfile && myUser && (
                    <button
                        onClick={handleFollow}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.8rem 1.8rem', borderRadius: '25px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.3s',
                            background: isFollowing
                                ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                : 'linear-gradient(135deg, var(--primary-color), #f39c12)',
                            color: isFollowing ? '#fff' : '#000',
                            boxShadow: isFollowing
                                ? '0 4px 15px rgba(231, 76, 60, 0.4)'
                                : '0 4px 15px rgba(212, 175, 55, 0.4)',
                        }}
                        className="hover-scale"
                    >
                        {isFollowing ? <><FaUserMinus /> Takipten Çık</> : <><FaUserPlus /> Takip Et</>}
                    </button>
                )}
            </div>

            {/* Profile Navigation Tabs */}
            <div className="profile-tabs-wrapper">
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`profile-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                >
                    <FaStar /> İncelemeler ({reviews.length})
                </button>
                <button
                    onClick={() => setActiveTab('lists')}
                    className={`profile-tab-btn ${activeTab === 'lists' ? 'active' : ''}`}
                >
                    <FaList /> {isMyProfile ? 'Tüm Listelerim' : 'Listeler'} ({lists.length})
                </button>
                <button
                    onClick={() => setActiveTab('likes')}
                    className={`profile-tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
                >
                    <FaThumbsUp /> Beğenilenler ({totalLikes})
                </button>
                <button
                    onClick={() => setActiveTab('dislikes')}
                    className={`profile-tab-btn ${activeTab === 'dislikes' ? 'active' : ''}`}
                >
                    <FaThumbsDown /> Dislike Atılanlar ({totalDislikes})
                </button>
            </div>

            {/* Sub-filter pills for Likes / Dislikes tabs */}
            {(activeTab === 'likes' || activeTab === 'dislikes') && (
                <div className="filter-pills-bar animate-fade-in">
                    <button
                        onClick={() => setReactionSubFilter('all')}
                        className={`filter-pill-btn ${reactionSubFilter === 'all' ? 'active' : ''}`}
                    >
                        Tümü ({activeTab === 'likes' ? totalLikes : totalDislikes})
                    </button>
                    <button
                        onClick={() => setReactionSubFilter('reviews')}
                        className={`filter-pill-btn ${reactionSubFilter === 'reviews' ? 'active' : ''}`}
                    >
                        🎬 İncelemeler ({activeTab === 'likes' ? likedReviews.length : dislikedReviews.length})
                    </button>
                    <button
                        onClick={() => setReactionSubFilter('lists')}
                        className={`filter-pill-btn ${reactionSubFilter === 'lists' ? 'active' : ''}`}
                    >
                        📋 Listeler ({activeTab === 'likes' ? likedLists.length : dislikedLists.length})
                    </button>
                    <button
                        onClick={() => setReactionSubFilter('comments')}
                        className={`filter-pill-btn ${reactionSubFilter === 'comments' ? 'active' : ''}`}
                    >
                        💬 Yorumlar ({activeTab === 'likes' ? likedComments.length : dislikedComments.length})
                    </button>
                </div>
            )}

            {/* TAB CONTENT */}
            <div style={{ maxWidth: '880px', margin: '0 auto' }}>
                {/* 1. İncelemeler Tab */}
                {activeTab === 'reviews' && (
                    <section className="animate-fade-in">
                        {reviews.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Henüz inceleme bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {reviews.map(review => renderReviewCard(review, true))}
                            </div>
                        )}
                    </section>
                )}

                {/* 2. Listeler Tab */}
                {activeTab === 'lists' && (
                    <section className="animate-fade-in">
                        {lists.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Henüz liste bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {lists.map(list => renderListCard(list, true))}
                            </div>
                        )}
                    </section>
                )}

                {/* 3. Beğenilenler Tab */}
                {activeTab === 'likes' && (
                    <section className="animate-fade-in">
                        {totalLikes === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Beğenilen herhangi bir içerik bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {/* Liked Reviews */}
                                {(reactionSubFilter === 'all' || reactionSubFilter === 'reviews') && likedReviews.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FaStar /> Beğenilen İncelemeler ({likedReviews.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            {likedReviews.map(r => renderReviewCard(r, false))}
                                        </div>
                                    </div>
                                )}

                                {/* Liked Lists */}
                                {(reactionSubFilter === 'all' || reactionSubFilter === 'lists') && likedLists.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FaList /> Beğenilen Listeler ({likedLists.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            {likedLists.map(l => renderListCard(l, false))}
                                        </div>
                                    </div>
                                )}

                                {/* Liked Comments */}
                                {(reactionSubFilter === 'all' || reactionSubFilter === 'comments') && likedComments.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-color)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FaComment /> Beğenilen Yorumlar ({likedComments.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {likedComments.map(c => renderCommentCard(c))}
                                        </div>
                                    </div>
                                )}

                                {reactionSubFilter === 'reviews' && likedReviews.length === 0 && (
                                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Beğenilen inceleme yok.</div>
                                )}
                                {reactionSubFilter === 'lists' && likedLists.length === 0 && (
                                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Beğenilen liste yok.</div>
                                )}
                                {reactionSubFilter === 'comments' && likedComments.length === 0 && (
                                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Beğenilen yorum yok.</div>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* 4. Dislike Atılanlar Tab */}
                {activeTab === 'dislikes' && (
                    <section className="animate-fade-in">
                        {totalDislikes === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Dislike atılan herhangi bir içerik bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {/* Disliked Reviews */}
                                {(reactionSubFilter === 'all' || reactionSubFilter === 'reviews') && dislikedReviews.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: '#ff7675', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FaThumbsDown /> Dislike Atılan İncelemeler ({dislikedReviews.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            {dislikedReviews.map(r => renderReviewCard(r, false))}
                                        </div>
                                    </div>
                                )}

                                {/* Disliked Lists */}
                                {(reactionSubFilter === 'all' || reactionSubFilter === 'lists') && dislikedLists.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: '#ff7675', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FaThumbsDown /> Dislike Atılan Listeler ({dislikedLists.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            {dislikedLists.map(l => renderListCard(l, false))}
                                        </div>
                                    </div>
                                )}

                                {/* Disliked Comments */}
                                {(reactionSubFilter === 'all' || reactionSubFilter === 'comments') && dislikedComments.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', color: '#ff7675', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FaThumbsDown /> Dislike Atılan Yorumlar ({dislikedComments.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {dislikedComments.map(c => renderCommentCard(c))}
                                        </div>
                                    </div>
                                )}

                                {reactionSubFilter === 'reviews' && dislikedReviews.length === 0 && (
                                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Dislike atılan inceleme yok.</div>
                                )}
                                {reactionSubFilter === 'lists' && dislikedLists.length === 0 && (
                                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Dislike atılan liste yok.</div>
                                )}
                                {reactionSubFilter === 'comments' && dislikedComments.length === 0 && (
                                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Dislike atılan yorum yok.</div>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={confirmDelete.type === 'review' ? "İncelemeyi Sil" : "Listeyi Sil"}
                message="Bunu kalıcı olarak silmek istediğinize emin misiniz?"
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete({ isOpen: false, type: null, id: null })}
            />

            {/* Followers Modal */}
            {showFollowers && (
                <div className="modal-overlay" onClick={() => setShowFollowers(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel animate-scale-up" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto', borderRadius: '16px', position: 'relative' }}>
                        <button onClick={() => setShowFollowers(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="hover-bg-primary">×</button>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaUserPlus style={{ color: 'var(--primary-color)' }} /> Takipçiler <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>({user.followers?.length || 0})</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {user.followers?.length > 0 ? user.followers.map(f => (
                                <Link to={`/profile/${f.username || f._id}`} key={f._id} onClick={() => setShowFollowers(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: '#fff', padding: '0.75rem', borderRadius: '10px', transition: 'background 0.3s', border: '1px solid transparent' }} className="hover-bg-primary">
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                                        {f.profilePic ? <img src={f.profilePic} alt={f.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (f.username?.charAt(0).toUpperCase() || <FaUser />)}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{f.username || 'Kullanıcı'}</span>
                                </Link>
                            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Henüz takipçi yok.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Modal */}
            {showFollowing && (
                <div className="modal-overlay" onClick={() => setShowFollowing(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel animate-scale-up" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto', borderRadius: '16px', position: 'relative' }}>
                        <button onClick={() => setShowFollowing(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="hover-bg-primary">×</button>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaUserPlus style={{ color: 'var(--primary-color)' }} /> Takip Edilenler <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>({user.following?.length || 0})</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {user.following?.length > 0 ? user.following.map(f => (
                                <Link to={`/profile/${f.username || f._id}`} key={f._id} onClick={() => setShowFollowing(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: '#fff', padding: '0.75rem', borderRadius: '10px', transition: 'background 0.3s', border: '1px solid transparent' }} className="hover-bg-primary">
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                                        {f.profilePic ? <img src={f.profilePic} alt={f.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (f.username?.charAt(0).toUpperCase() || <FaUser />)}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{f.username || 'Kullanıcı'}</span>
                                </Link>
                            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Kimseyi takip etmiyor.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {editingReview && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }} onClick={() => setEditingReview(null)}>
                <form
                    onSubmit={handleUpdateReview}
                    className="glass-panel animate-scale-up"
                    style={{ 
                        padding: '2.5rem', 
                        width: '100%', 
                        maxWidth: '500px', 
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', textAlign: 'center' }}>İncelemeyi Düzenle</h2>
                    
                    <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Puanınız</label>
                        <RatingStars rating={editingReview.rating} onChange={(val) => setEditingReview({ ...editingReview, rating: val })} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Yorumunuz</label>
                        <textarea
                            rows="4"
                            value={editingReview.reviewText}
                            onChange={e => setEditingReview({ ...editingReview, reviewText: e.target.value })}
                            style={{ 
                                width: '100%', 
                                padding: '12px 16px', 
                                fontSize: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: '#fff',
                                resize: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Güncelle</button>
                        <button type="button" className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} onClick={() => setEditingReview(null)}>Vazgeç</button>
                    </div>
                </form>
            </div>
        )}
        </>
    );
};

export default Profile;
