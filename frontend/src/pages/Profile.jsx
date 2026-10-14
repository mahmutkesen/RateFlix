import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import RatingStars from '../components/RatingStars';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { 
    FaUser, FaStar, FaList, FaTrash, FaUserPlus, FaUserMinus, 
    FaFilm, FaClock, FaThumbsUp, FaThumbsDown, FaHeart, FaChevronDown, FaChevronUp, FaComment,
    FaTimes, FaUserFriends, FaChevronRight, FaEdit
} from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
    const { userId, username } = useParams();
    const profileIdentifier = userId || username;
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myUser, setMyUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null });
    const [editingReview, setEditingReview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    // 3 Main Tabs: 'reviews' | 'lists' | 'reactions'
    const [activeTab, setActiveTab] = useState('reviews');
    // Reaction filter state
    const [reactionPolarityFilter, setReactionPolarityFilter] = useState('all'); // 'all' | 'likes' | 'dislikes'
    const [reactionTypeFilter, setReactionTypeFilter] = useState('all'); // 'all' | 'reviews' | 'lists' | 'comments'
    const [expandedListId, setExpandedListId] = useState(null);

    // Likes & Dislikes fetched data
    const [reactionsData, setReactionsData] = useState({
        likedReviews: [],
        dislikedReviews: [],
        likedLists: [],
        dislikedLists: [],
        likedComments: [],
        dislikedComments: []
    });
    const [loadingReactions, setLoadingReactions] = useState(false);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const currentStoredUser = JSON.parse(localStorage.getItem('user') || 'null');
            setMyUser(currentStoredUser);

            const targetId = profileIdentifier || currentStoredUser?.username || currentStoredUser?.id || currentStoredUser?._id;
            if (!targetId) {
                setLoading(false);
                return;
            }
            const res = await api.get(`/auth/profile/${targetId}`);
            setProfileData(res.data);
            setFollowersCount(res.data.user.followers?.length || 0);

            if (currentStoredUser && res.data.user.followers) {
                const myIdStr = (currentStoredUser.id || currentStoredUser._id)?.toString();
                const myUsername = currentStoredUser.username?.toLowerCase();
                const following = res.data.user.followers.some(f => {
                    if (!f) return false;
                    if (typeof f === 'string') return f === myIdStr;
                    const fId = (f._id || f.id)?.toString();
                    const fUname = f.username?.toLowerCase();
                    return (myIdStr && fId === myIdStr) || (myUsername && fUname === myUsername);
                });
                setIsFollowing(following);
            } else {
                setIsFollowing(false);
            }

            // Also fetch user reactions
            fetchReactions(res.data.user._id || res.data.user.username);
        } catch (err) {
            console.error(err);
            setProfileData(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchReactions = async (userIdToFetch) => {
        setLoadingReactions(true);
        try {
            const res = await api.get(`/users/${userIdToFetch}/reactions`);
            if (res.data) {
                setReactionsData({
                    likedReviews: res.data.likedReviews || [],
                    dislikedReviews: res.data.dislikedReviews || [],
                    likedLists: res.data.likedLists || [],
                    dislikedLists: res.data.dislikedLists || [],
                    likedComments: res.data.likedComments || [],
                    dislikedComments: res.data.dislikedComments || []
                });
            }
        } catch (err) {
            console.error('Error fetching reactions:', err);
        } finally {
            setLoadingReactions(false);
        }
    };

    useEffect(() => {
        setShowFollowers(false);
        setShowFollowing(false);
        setActiveTab('reviews');
        fetchProfile();
    }, [profileIdentifier]);

    const handleFollow = async () => {
        if (!myUser) return showToast('Takip etmek için giriş yapmalısınız.', 'error');
        try {
            if (isFollowing) {
                await api.post(`/auth/unfollow/${profileData.user._id}`);
                setIsFollowing(false);
                setFollowersCount(prev => Math.max(0, prev - 1));
                showToast('Takipten çıkıldı.', 'success');
            } else {
                await api.post(`/auth/follow/${profileData.user._id}`);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
                showToast('Takip edildi.', 'success');
            }
        } catch (err) {
            showToast('İşlem başarısız.', 'error');
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
    const isMyProfile = Boolean(myUser && user && (
        (myUser.id && user._id && myUser.id.toString() === user._id.toString()) ||
        (myUser._id && user._id && myUser._id.toString() === user._id.toString()) ||
        (myUser.username && user.username && myUser.username.toLowerCase() === user.username.toLowerCase())
    ));

    // Reaction counts
    const likedReviews = reactionsData.likedReviews || [];
    const dislikedReviews = reactionsData.dislikedReviews || [];
    const likedLists = reactionsData.likedLists || [];
    const dislikedLists = reactionsData.dislikedLists || [];
    const likedComments = reactionsData.likedComments || [];
    const dislikedComments = reactionsData.dislikedComments || [];

    const totalLikes = likedReviews.length + likedLists.length + likedComments.length;
    const totalDislikes = dislikedReviews.length + dislikedLists.length + dislikedComments.length;
    const totalReactions = totalLikes + totalDislikes;

    // Helper: Render Review Item
    const renderReviewCard = (review, allowEdit = false, reactionBadge = null) => {
        const reviewAuthor = review.user;
        const authorName = reviewAuthor?.username || user.username || 'Kullanıcı';
        const authorLink = reviewAuthor?.username ? `/profile/${reviewAuthor.username}` : `/profile/${user.username}`;
        const authorPic = reviewAuthor?.profilePic || (reviewAuthor === user._id ? user.profilePic : '');

        // Only show author if this is in a reaction context or the review is by someone else
        const isDifferentAuthor = reviewAuthor && (
            (typeof reviewAuthor === 'object' && reviewAuthor.username && reviewAuthor.username !== user.username) ||
            (typeof reviewAuthor === 'string' && reviewAuthor !== user._id && reviewAuthor !== user.username)
        );
        const showAuthor = Boolean(reactionBadge || isDifferentAuthor);

        return (
            <div key={review._id} className="glass-panel profile-review-card">
                <Link to={`/${review.mediaType || 'movie'}/${review.tmdbId}`} className="profile-review-poster-link">
                    {review.posterPath ? (
                        <img 
                            src={getImageUrl(review.posterPath, 'w92')} 
                            alt={review.movieTitle} 
                            className="profile-review-poster" 
                        />
                    ) : (
                        <div className="profile-review-poster-placeholder">
                            <FaFilm color="var(--text-muted)" />
                        </div>
                    )}
                </Link>
                <div className="profile-review-content">
                    <div className="profile-review-header">
                        <div className="profile-review-title-group">
                            {showAuthor && (
                                <div className="profile-review-author-wrap">
                                    <Link to={authorLink} className="profile-review-author-link">
                                        <div className="profile-review-author-avatar">
                                            {authorPic ? <img src={authorPic} alt="" /> : <FaUser />}
                                        </div>
                                        <span>{authorName}</span>
                                    </Link>
                                    {reactionBadge}
                                </div>
                            )}
                            <Link to={`/${review.mediaType || 'movie'}/${review.tmdbId}`} className="profile-review-movie-title hover-text-primary">
                                {review.movieTitle || 'İsimsiz İçerik'}
                            </Link>
                        </div>
                        <div className="profile-review-stars-wrap">
                            <RatingStars rating={review.rating} readonly size={17} />
                        </div>
                    </div>

                    {review.reviewText ? (
                        <p className="profile-review-comment">
                            "{review.reviewText}"
                        </p>
                    ) : (
                        <p className="profile-review-comment empty">
                            <span className="empty-review-badge">Yalnızca puanlandı</span>
                        </p>
                    )}

                    <div className="profile-review-footer">
                        <span className="profile-review-date">
                            <FaClock style={{ marginRight: '0.35rem' }} /> {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                        <div className="profile-review-meta-actions">
                            <div className="profile-review-reactions-count">
                                <span className="reaction-badge-count like" title="Beğeni">
                                    <FaThumbsUp size={11} /> {review.likes?.length || 0}
                                </span>
                                <span className="reaction-badge-count dislike" title="Dislike">
                                    <FaThumbsDown size={11} /> {review.dislikes?.length || 0}
                                </span>
                            </div>

                            {allowEdit && (isMyProfile || myUser?.role === 'admin') && (
                                <div className="profile-review-action-btns">
                                    <button 
                                        type="button"
                                        onClick={() => setEditingReview({ 
                                            id: review._id, 
                                            tmdbId: review.tmdbId, 
                                            mediaType: review.mediaType, 
                                            rating: review.rating, 
                                            reviewText: review.reviewText, 
                                            movieTitle: review.movieTitle, 
                                            posterPath: review.posterPath 
                                        })} 
                                        className="review-action-btn edit"
                                        title="İncelemeyi Düzenle"
                                    >
                                        <FaEdit size={11} />
                                        <span>Düzenle</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleDeleteReview(review._id)} 
                                        className="review-action-btn delete" 
                                        title="İncelemeyi Sil"
                                    >
                                        <FaTrash size={11} />
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
    const renderListCard = (list, allowEdit = false, reactionBadge = null) => {
        const listOwner = list.user;
        const ownerName = listOwner?.username || user.username || 'Kullanıcı';
        const ownerLink = listOwner?.username ? `/profile/${listOwner.username}` : `/profile/${user.username}`;
        const ownerPic = listOwner?.profilePic || (listOwner === user._id ? user.profilePic : '');

        // Only show owner badge if in reaction context or list belongs to another user
        const isDifferentOwner = listOwner && (
            (typeof listOwner === 'object' && listOwner.username && listOwner.username !== user.username) ||
            (typeof listOwner === 'string' && listOwner !== user._id && listOwner !== user.username)
        );
        const showOwner = Boolean(reactionBadge || isDifferentOwner);

        return (
            <div key={list._id} className="glass-panel profile-list-card" style={{ padding: '1.5rem', borderRadius: '14px', transition: 'all 0.3s', backgroundColor: expandedListId === list._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => toggleList(list._id)}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                        {showOwner && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                                <Link to={ownerLink} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                                    <div style={{
                                        background: 'rgba(212, 175, 55, 0.12)',
                                        border: '1px solid rgba(212, 175, 55, 0.25)',
                                        borderRadius: '8px',
                                        padding: '0.35rem 0.65rem',
                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                        fontSize: '0.8rem', fontWeight: 700,
                                        color: 'var(--primary-color)'
                                    }}>
                                        {ownerPic ? <img src={ownerPic} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%' }} /> : <FaUser style={{ fontSize: '0.7rem' }} />}
                                        {ownerName}
                                    </div>
                                </Link>
                                {reactionBadge}
                            </div>
                        )}
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: '#fff' }}>{list.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{list.items?.length || 0} içerik</p>
                        {list.description && (
                            <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.3rem', fontStyle: 'italic' }}>{list.description}</p>
                        )}

                        {/* Unexpanded Preview Row: fits nicely on single line */}
                        {expandedListId !== list._id && list.items?.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
                                {list.items.slice(0, 6).map((item, i) => (
                                    <div key={i} style={{ flexShrink: 0 }}>
                                        {item.posterPath ? (
                                            <img src={getImageUrl(item.posterPath, 'w92')} alt={item.title} style={{ width: '42px', height: '62px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        ) : (
                                            <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FaFilm size={12} color="var(--text-muted)" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {list.items.length > 6 && (
                                    <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-color)', flexShrink: 0, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                        +{list.items.length - 6}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        {allowEdit && isMyProfile && !['favorites', 'watchlist', 'watched'].includes(list.type) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteList(list._id); }}
                                style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', padding: '6px' }}
                                title="Listeyi Sil"
                            >
                                <FaTrash size={14} />
                            </button>
                        )}
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                            {expandedListId === list._id ? <FaChevronUp /> : <FaChevronDown />}
                        </span>
                    </div>
                </div>

                {/* Expanded Grid View */}
                {expandedListId === list._id && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '0.8rem', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
    const renderCommentCard = (comment, reactionBadge = null) => {
        const commentAuthor = comment.user;
        const authorName = commentAuthor?.username || user.username || 'Kullanıcı';
        const authorLink = commentAuthor?.username ? `/profile/${commentAuthor.username}` : `/profile/${user.username}`;
        const authorPic = commentAuthor?.profilePic || (commentAuthor === user._id ? user.profilePic : '');
        const target = comment.target || comment.targetInfo;

        return (
            <div key={comment._id} className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Link to={authorLink} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: '#fff' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden' }}>
                                {authorPic ? <img src={authorPic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaUser />}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{authorName}</span>
                        </Link>
                        {reactionBadge}
                    </div>
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
                            <Link to={target.link || `/${target.mediaType || 'movie'}/${target.tmdbId}`} className="comment-target-badge">
                                <FaFilm size={11} /> 🎬 Film: {target.movieTitle || target.title || 'İnceleme'}
                            </Link>
                        ) : (
                            <Link to="/community" className="comment-target-badge">
                                <FaList size={11} /> 📋 Liste: {target.name || target.title || 'Liste'}
                            </Link>
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

            {/* Profile Navigation Tabs: 3 Main Tabs */}
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
                    onClick={() => setActiveTab('reactions')}
                    className={`profile-tab-btn ${activeTab === 'reactions' ? 'active' : ''}`}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FaThumbsUp style={{ color: '#2ed573' }} size={13} />
                        <FaThumbsDown style={{ color: '#ff7675' }} size={13} />
                    </span>
                    Tepkiler ({totalReactions})
                </button>
            </div>

            {/* Sub-filter pills for Unified Reactions Tab */}
            {activeTab === 'reactions' && (
                <div style={{ marginBottom: '2rem' }}>
                    {/* Polarity Filter (Tümü / Beğenilenler / Dislike Atılanlar) */}
                    <div className="filter-pills-bar animate-fade-in" style={{ marginBottom: '0.8rem' }}>
                        <button
                            onClick={() => setReactionPolarityFilter('all')}
                            className={`filter-pill-btn ${reactionPolarityFilter === 'all' ? 'active' : ''}`}
                        >
                            Tüm Tepkiler ({totalReactions})
                        </button>
                        <button
                            onClick={() => setReactionPolarityFilter('likes')}
                            className={`filter-pill-btn ${reactionPolarityFilter === 'likes' ? 'active' : ''}`}
                        >
                            <FaThumbsUp size={11} style={{ color: '#2ed573' }} /> Beğenilenler ({totalLikes})
                        </button>
                        <button
                            onClick={() => setReactionPolarityFilter('dislikes')}
                            className={`filter-pill-btn ${reactionPolarityFilter === 'dislikes' ? 'active' : ''}`}
                        >
                            <FaThumbsDown size={11} style={{ color: '#ff7675' }} /> Dislike Atılanlar ({totalDislikes})
                        </button>
                    </div>

                    {/* Content Type Filter (Tümü / İncelemeler / Listeler / Yorumlar) */}
                    <div className="filter-pills-bar animate-fade-in" style={{ opacity: 0.9 }}>
                        <button
                            onClick={() => setReactionTypeFilter('all')}
                            className={`filter-pill-btn ${reactionTypeFilter === 'all' ? 'active' : ''}`}
                        >
                            Tümü
                        </button>
                        <button
                            onClick={() => setReactionTypeFilter('reviews')}
                            className={`filter-pill-btn ${reactionTypeFilter === 'reviews' ? 'active' : ''}`}
                        >
                            🎬 İncelemeler ({
                                reactionPolarityFilter === 'likes' ? likedReviews.length :
                                reactionPolarityFilter === 'dislikes' ? dislikedReviews.length :
                                likedReviews.length + dislikedReviews.length
                            })
                        </button>
                        <button
                            onClick={() => setReactionTypeFilter('lists')}
                            className={`filter-pill-btn ${reactionTypeFilter === 'lists' ? 'active' : ''}`}
                        >
                            📋 Listeler ({
                                reactionPolarityFilter === 'likes' ? likedLists.length :
                                reactionPolarityFilter === 'dislikes' ? dislikedLists.length :
                                likedLists.length + dislikedLists.length
                            })
                        </button>
                        <button
                            onClick={() => setReactionTypeFilter('comments')}
                            className={`filter-pill-btn ${reactionTypeFilter === 'comments' ? 'active' : ''}`}
                        >
                            💬 Yorumlar ({
                                reactionPolarityFilter === 'likes' ? likedComments.length :
                                reactionPolarityFilter === 'dislikes' ? dislikedComments.length :
                                likedComments.length + dislikedComments.length
                            })
                        </button>
                    </div>
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

                {/* 3. Unified Reactions Tab (Beğeni & Dislike Tek Bölmede) */}
                {activeTab === 'reactions' && (
                    <section className="animate-fade-in">
                        {loadingReactions ? (
                            <div className="loading-container" style={{ minHeight: '160px' }}>
                                <div className="spinner"></div>
                                <p>Tepkiler yükleniyor...</p>
                            </div>
                        ) : totalReactions === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Henüz beğendiğiniz veya dislike attığınız bir içerik bulunmuyor.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {/* Liked Reviews */}
                                {(reactionPolarityFilter === 'all' || reactionPolarityFilter === 'likes') &&
                                 (reactionTypeFilter === 'all' || reactionTypeFilter === 'reviews') &&
                                 likedReviews.map(review => renderReviewCard(
                                     review, 
                                     false, 
                                     <span className="reaction-badge like-badge"><FaThumbsUp size={11} /> Beğenildi</span>
                                 ))}

                                {/* Disliked Reviews */}
                                {(reactionPolarityFilter === 'all' || reactionPolarityFilter === 'dislikes') &&
                                 (reactionTypeFilter === 'all' || reactionTypeFilter === 'reviews') &&
                                 dislikedReviews.map(review => renderReviewCard(
                                     review, 
                                     false, 
                                     <span className="reaction-badge dislike-badge"><FaThumbsDown size={11} /> Dislike Atıldı</span>
                                 ))}

                                {/* Liked Lists */}
                                {(reactionPolarityFilter === 'all' || reactionPolarityFilter === 'likes') &&
                                 (reactionTypeFilter === 'all' || reactionTypeFilter === 'lists') &&
                                 likedLists.map(list => renderListCard(
                                     list, 
                                     false, 
                                     <span className="reaction-badge like-badge"><FaThumbsUp size={11} /> Beğenildi</span>
                                 ))}

                                {/* Disliked Lists */}
                                {(reactionPolarityFilter === 'all' || reactionPolarityFilter === 'dislikes') &&
                                 (reactionTypeFilter === 'all' || reactionTypeFilter === 'lists') &&
                                 dislikedLists.map(list => renderListCard(
                                     list, 
                                     false, 
                                     <span className="reaction-badge dislike-badge"><FaThumbsDown size={11} /> Dislike Atıldı</span>
                                 ))}

                                {/* Liked Comments */}
                                {(reactionPolarityFilter === 'all' || reactionPolarityFilter === 'likes') &&
                                 (reactionTypeFilter === 'all' || reactionTypeFilter === 'comments') &&
                                 likedComments.map(comment => renderCommentCard(
                                     comment, 
                                     <span className="reaction-badge like-badge"><FaThumbsUp size={11} /> Beğenildi</span>
                                 ))}

                                {/* Disliked Comments */}
                                {(reactionPolarityFilter === 'all' || reactionPolarityFilter === 'dislikes') &&
                                 (reactionTypeFilter === 'all' || reactionTypeFilter === 'comments') &&
                                 dislikedComments.map(comment => renderCommentCard(
                                     comment, 
                                     <span className="reaction-badge dislike-badge"><FaThumbsDown size={11} /> Dislike Atıldı</span>
                                 ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* Followers Modal */}
            {showFollowers && (
                <div className="modal-overlay profile-modal-overlay" onClick={() => setShowFollowers(false)}>
                    <div className="modal-content profile-modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-wrap">
                                <FaUserFriends className="modal-header-icon" />
                                <h3>Takipçiler</h3>
                                <span className="modal-count-badge">{followersCount}</span>
                            </div>
                            <button className="modal-close" onClick={() => setShowFollowers(false)} aria-label="Kapat">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="users-list">
                            {!user.followers || user.followers.length === 0 ? (
                                <div className="users-empty">
                                    <FaUserFriends className="users-empty-icon" />
                                    <p>Henüz takipçi yok.</p>
                                </div>
                            ) : (
                                user.followers.map(f => {
                                    const uname = (typeof f === 'object' ? f.username : null) || 'Kullanıcı';
                                    const fId = typeof f === 'object' ? f._id : f;
                                    const fPic = typeof f === 'object' ? f.profilePic : null;
                                    return (
                                        <Link key={fId} to={`/profile/${uname}`} className="user-item" onClick={() => setShowFollowers(false)}>
                                            <div className="user-item-left">
                                                <div className="user-item-avatar">
                                                    {fPic ? <img src={fPic} alt={uname} /> : uname.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="user-item-info">
                                                    <span className="user-item-name">{uname}</span>
                                                    <span className="user-item-sub">Profili İncele</span>
                                                </div>
                                            </div>
                                            <FaChevronRight className="user-item-arrow" />
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Modal */}
            {showFollowing && (
                <div className="modal-overlay profile-modal-overlay" onClick={() => setShowFollowing(false)}>
                    <div className="modal-content profile-modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-wrap">
                                <FaUserFriends className="modal-header-icon" />
                                <h3>Takip Edilenler</h3>
                                <span className="modal-count-badge">{user.following?.length || 0}</span>
                            </div>
                            <button className="modal-close" onClick={() => setShowFollowing(false)} aria-label="Kapat">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="users-list">
                            {!user.following || user.following.length === 0 ? (
                                <div className="users-empty">
                                    <FaUserFriends className="users-empty-icon" />
                                    <p>Henüz kimse takip edilmiyor.</p>
                                </div>
                            ) : (
                                user.following.map(f => {
                                    const uname = (typeof f === 'object' ? f.username : null) || 'Kullanıcı';
                                    const fId = typeof f === 'object' ? f._id : f;
                                    const fPic = typeof f === 'object' ? f.profilePic : null;
                                    return (
                                        <Link key={fId} to={`/profile/${uname}`} className="user-item" onClick={() => setShowFollowing(false)}>
                                            <div className="user-item-left">
                                                <div className="user-item-avatar">
                                                    {fPic ? <img src={fPic} alt={uname} /> : uname.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="user-item-info">
                                                    <span className="user-item-name">{uname}</span>
                                                    <span className="user-item-sub">Profili İncele</span>
                                                </div>
                                            </div>
                                            <FaChevronRight className="user-item-arrow" />
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Review Modal */}
            {editingReview && (
                <div className="modal-overlay profile-modal-overlay" onClick={() => setEditingReview(null)}>
                    <form 
                        onSubmit={handleUpdateReview}
                        className="modal-content profile-edit-modal glass-panel animate-scale-up" 
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="profile-edit-modal-title">İncelemeyi Düzenle</h2>
                        
                        <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Puanınız</label>
                            <RatingStars 
                                rating={editingReview.rating} 
                                onChange={(val) => setEditingReview({...editingReview, rating: val})} 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Yorumunuz</label>
                            <textarea
                                rows="4"
                                value={editingReview.reviewText}
                                onChange={e => setEditingReview({...editingReview, reviewText: e.target.value})}
                                className="profile-edit-textarea"
                                placeholder="Düşüncelerinizi paylaşın..."
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700 }} disabled={isSubmitting}>Güncelle</button>
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
                                onClick={() => setEditingReview(null)}
                            >
                                Vazgeç
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={confirmDelete.type === 'review' ? "İncelemeyi Sil" : "Listeyi Sil"}
                message="Bunu kalıcı olarak silmek istediğinize emin misiniz?"
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete({ isOpen: false, type: null, id: null })}
            />
        </div>
        </>
    );
};

export default Profile;
