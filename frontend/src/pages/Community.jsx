import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import RatingStars from '../components/RatingStars';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { 
    FaUser, FaStar, FaList, FaTrash, FaClock, FaFilm, 
    FaChevronDown, FaChevronUp, FaThumbsUp, FaThumbsDown, 
    FaComment, FaPaperPlane, FaTimes, FaSearch, FaUserFriends, 
    FaHeart, FaFire, FaFilter
} from 'react-icons/fa';
import './Home.css';
import './Community.css';

const Community = () => {
    const [reviews, setReviews] = useState([]);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myUser, setMyUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null, targetId: null });
    const [editingReview, setEditingReview] = useState(null); 
    const { showToast } = useToast();
    const location = useLocation();

    // Tab and Navigation
    const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'lists' | 'friends'
    const [friendSubTab, setFriendSubTab] = useState('lists'); // 'lists' | 'comments' | 'liked'
    const [friendReactionFilter, setFriendReactionFilter] = useState('all'); // 'all' | 'likes' | 'dislikes'
    const [expandedListId, setExpandedListId] = useState(null);

    // Search and Sort states
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'most_liked' | 'most_disliked' | 'most_commented' | 'highest_rated'
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef(null);

    // Friend Activity data
    const [friendActivity, setFriendActivity] = useState({
        followingCount: 0,
        lists: [],
        comments: [],
        likedContent: []
    });
    const [loadingFriends, setLoadingFriends] = useState(false);

    // Like/Dislike local state: { [id]: { likes, dislikes, liked, disliked } }
    const [reactions, setReactions] = useState({});

    // Comment states
    const [comments, setComments] = useState({}); // { [targetId]: comments[] }
    const [expandedComments, setExpandedComments] = useState({}); // { [targetId]: boolean }
    const [commentText, setCommentText] = useState({}); // { [targetId]: string }
    const [loadingComments, setLoadingComments] = useState({}); // { [targetId]: boolean }

    // Search debounce timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const getSortLabel = (sort) => {
        switch (sort) {
            case 'oldest': return 'En Eski';
            case 'most_liked': return 'En Çok Beğenilen';
            case 'most_disliked': return 'En Çok Dislike';
            case 'most_commented': return 'En Çok Yorum';
            case 'highest_rated': return 'En Yüksek Puan';
            case 'newest':
            default: return 'En Yeni';
        }
    };

    const sortOptions = [
        { key: 'newest', label: 'En Yeni', icon: <FaClock size={12} /> },
        { key: 'oldest', label: 'En Eski', icon: <FaClock size={12} /> },
        { key: 'most_liked', label: 'En Çok Beğenilen', icon: <FaThumbsUp size={12} /> },
        { key: 'most_disliked', label: 'En Çok Dislike', icon: <FaThumbsDown size={12} /> },
        { key: 'most_commented', label: 'En Çok Yorum', icon: <FaComment size={12} /> },
        ...(activeTab === 'reviews' ? [{ key: 'highest_rated', label: 'En Yüksek Puan', icon: <FaStar size={12} /> }] : [])
    ];

    const initReactions = (items) => {
        const myId = JSON.parse(localStorage.getItem('user') || 'null')?.id;
        const map = {};
        if (!Array.isArray(items)) return map;
        items.forEach(item => {
            if (!item || !item._id) return;
            const likes = item.likes?.length || 0;
            const dislikes = item.dislikes?.length || 0;
            const liked = myId ? (item.likes || []).some(id => id === myId || id?._id === myId || id?.toString() === myId) : false;
            const disliked = myId ? (item.dislikes || []).some(id => id === myId || id?._id === myId || id?.toString() === myId) : false;
            map[item._id] = { likes, dislikes, liked, disliked };
        });
        return map;
    };

    // Fetch community reviews and lists
    const fetchCommunityData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('q', debouncedSearch);
            if (sortBy) params.append('sort', sortBy);
            const queryString = params.toString() ? `?${params.toString()}` : '';

            const [reviewsRes, listsRes] = await Promise.all([
                api.get(`/reviews/all${queryString}`),
                api.get(`/lists/public${queryString}`)
            ]);

            const revData = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
            const listData = Array.isArray(listsRes.data) ? listsRes.data : [];

            setReviews(revData);
            setLists(listData);
            setReactions(prev => ({ 
                ...prev,
                ...initReactions(revData), 
                ...initReactions(listData) 
            }));
        } catch (err) {
            console.error("Error fetching community data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommunityData();
    }, [debouncedSearch, sortBy, location.pathname]);

    // Fetch Friend Activity
    const fetchFriendActivity = async () => {
        if (!myUser) return;
        setLoadingFriends(true);
        try {
            const res = await api.get('/users/friends/activity');
            if (res.data) {
                const likedOrReacted = res.data.likedContent || res.data.reactedContent || [];
                setFriendActivity({
                    followingCount: res.data.followingCount || 0,
                    lists: Array.isArray(res.data.lists) ? res.data.lists : [],
                    comments: Array.isArray(res.data.comments) ? res.data.comments : [],
                    likedContent: Array.isArray(likedOrReacted) ? likedOrReacted : []
                });

                const allItems = [
                    ...(res.data.lists || []),
                    ...(res.data.comments || []),
                    ...(likedOrReacted || [])
                ];
                setReactions(prev => ({ ...prev, ...initReactions(allItems) }));
            }
        } catch (err) {
            console.error("Error fetching friend activity", err);
        } finally {
            setLoadingFriends(false);
        }
    };

    useEffect(() => {
        if (myUser && (activeTab === 'friends' || friendActivity.followingCount === 0)) {
            fetchFriendActivity();
        }
    }, [activeTab, myUser]);

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
                    [targetId]: (prev[targetId] || []).filter(c => c._id !== id)
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
                [targetId]: (prev[targetId] || []).map(c =>
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

    const handleUpdateReview = async (e) => {
        e.preventDefault();
        try {
            await api.post('/reviews', {
                tmdbId: editingReview.tmdbId,
                mediaType: editingReview.mediaType,
                rating: editingReview.rating,
                reviewText: editingReview.reviewText,
                movieTitle: editingReview.movieTitle,
                posterPath: editingReview.posterPath
            });
            setReviews(reviews.map(r => r._id === editingReview.id ? { ...r, rating: editingReview.rating, reviewText: editingReview.reviewText } : r));
            setEditingReview(null);
            showToast('İnceleme güncellendi.', 'success');
        } catch (error) {
            showToast('Güncelleme başarısız.', 'error');
        }
    };

    const handleReactionClick = async (e, id, type, kind) => {
        e.preventDefault();
        e.stopPropagation();
        if (!myUser) return showToast('İşlem için giriş yapmalısınız.', 'error');
        const prev = reactions[id] || { likes: 0, dislikes: 0, liked: false, disliked: false };

        let nextLikes = prev.likes;
        let nextDislikes = prev.dislikes;
        let nextLiked = prev.liked;
        let nextDisliked = prev.disliked;

        if (type === 'like') {
            if (prev.liked) {
                nextLikes = Math.max(0, prev.likes - 1);
                nextLiked = false;
            } else {
                nextLikes = prev.likes + 1;
                nextLiked = true;
                if (prev.disliked) {
                    nextDislikes = Math.max(0, prev.dislikes - 1);
                    nextDisliked = false;
                }
            }
        } else {
            if (prev.disliked) {
                nextDislikes = Math.max(0, prev.dislikes - 1);
                nextDisliked = false;
            } else {
                nextDislikes = prev.dislikes + 1;
                nextDisliked = true;
                if (prev.liked) {
                    nextLikes = Math.max(0, prev.likes - 1);
                    nextLiked = false;
                }
            }
        }

        setReactions(r => ({ ...r, [id]: { likes: nextLikes, dislikes: nextDislikes, liked: nextLiked, disliked: nextDisliked } }));

        try {
            await api.post(`/${kind}s/${id}/${type}`);
        } catch {
            setReactions(r => ({ ...r, [id]: prev }));
            showToast('İşlem kaydedilemedi.', 'error');
        }
    };

    // Render comment drawer
    const renderComments = (targetId, targetType, initialCount = 0, showToggleButton = true) => {
        const isExpanded = expandedComments[targetId];
        const itemComments = comments[targetId] || [];
        const isLoading = loadingComments[targetId];
        const displayCount = comments[targetId] ? itemComments.length : initialCount;

        if (!isExpanded && !showToggleButton) return null;

        return (
            <div className={`comment-section ${isExpanded ? 'active' : ''}`}>
                {showToggleButton && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '0.5rem' }}>
                        <button
                            onClick={() => toggleComments(targetId)}
                            className="comment-toggle-btn"
                        >
                            <FaComment size={12} /> {isExpanded ? 'Yorumları Kapat' : `Yorumlar (${displayCount})`}
                            {isExpanded ? <FaChevronUp size={10} style={{ marginLeft: '4px' }} /> : <FaChevronDown size={10} style={{ marginLeft: '4px' }} />}
                        </button>
                    </div>
                )}

                {isExpanded && (
                    <div className="comment-drawer animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FaComment size={12} color="var(--primary-color)" />
                                Yorumlar ({displayCount})
                            </span>
                            <button
                                type="button"
                                onClick={() => toggleComments(targetId)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                title="Yorumları Kapat"
                            >
                                <FaTimes size={11} /> Kapat
                            </button>
                        </div>
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
                                            <Link to={c.user?.username ? `/profile/${c.user.username}` : '#'} className="comment-avatar">
                                                {c.user?.profilePic ? (
                                                    <img src={c.user.profilePic} alt={c.user.username} />
                                                ) : (
                                                    <FaUser />
                                                )}
                                            </Link>
                                            <div className="comment-body">
                                                <div className="comment-header">
                                                    <Link to={c.user?.username ? `/profile/${c.user.username}` : '#'} style={{ textDecoration: 'none' }}>
                                                        <span className="comment-author">{c.user?.username || 'Kullanıcı'}</span>
                                                    </Link>
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

    // Helper: Client-side sorting for Friend Activity
    const sortFriendItems = (items) => {
        if (!Array.isArray(items)) return [];
        const arr = [...items];
        switch (sortBy) {
            case 'oldest':
                return arr.sort((a, b) => new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt));
            case 'most_liked':
                return arr.sort((a, b) => (b.likes?.length || b.likeCount || 0) - (a.likes?.length || a.likeCount || 0));
            case 'most_disliked':
                return arr.sort((a, b) => (b.dislikes?.length || b.dislikeCount || 0) - (a.dislikes?.length || a.dislikeCount || 0));
            case 'most_commented':
                return arr.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
            case 'highest_rated':
                return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'newest':
            default:
                return arr.sort((a, b) => new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt));
        }
    };

    // Client-side text filter helper for friend activity sub-tabs
    const filterFriendItem = (item) => {
        if (!debouncedSearch) return true;
        const q = debouncedSearch.toLowerCase().trim();
        const qTr = debouncedSearch.toLocaleLowerCase('tr-TR').trim();

        const matchText = (val) => {
            if (!val) return false;
            const str = String(val);
            const lower = str.toLowerCase();
            const lowerTr = str.toLocaleLowerCase('tr-TR');
            return lower.includes(q) || lowerTr.includes(qTr) || lower.includes(qTr) || lowerTr.includes(q);
        };

        const username = item.user?.username || '';

        // Check if any friend who liked this matches the search query
        const likedFriendMatch = (item.likedByFriends || []).some(f => 
            matchText(typeof f === 'string' ? f : f?.username)
        );

        // Check if any friend who disliked this matches the search query
        const dislikedFriendMatch = (item.dislikedByFriends || []).some(f => 
            matchText(typeof f === 'string' ? f : f?.username)
        );

        // Single actor / friend / target author match
        const actorMatch = matchText(item.actor?.username || item.friend?.username);
        const targetAuthor = item.targetInfo?.author || item.target?.user?.username || '';

        const title = item.movieTitle || item.name || item.targetInfo?.title || item.target?.title || item.title || '';
        const text = item.reviewText || item.description || item.content || '';
        
        // Also search in list item titles!
        const itemsText = (item.items || []).map(i => i.title || i.name || '').join(' ');

        return matchText(username) || 
               likedFriendMatch || 
               dislikedFriendMatch || 
               actorMatch || 
               matchText(targetAuthor) || 
               matchText(title) || 
               matchText(text) || 
               matchText(itemsText);
    };

    // Auto-switch friend subtab when search query has results in another subtab
    useEffect(() => {
        if (!debouncedSearch || activeTab !== 'friends') return;
        const listsCount = friendActivity.lists.filter(filterFriendItem).length;
        const commentsCount = friendActivity.comments.filter(filterFriendItem).length;
        const likedCount = friendActivity.likedContent.filter(filterFriendItem).length;

        if (friendSubTab === 'lists' && listsCount === 0) {
            if (likedCount > 0) {
                setFriendSubTab('liked');
            } else if (commentsCount > 0) {
                setFriendSubTab('comments');
            }
        } else if (friendSubTab === 'comments' && commentsCount === 0) {
            if (likedCount > 0) {
                setFriendSubTab('liked');
            } else if (listsCount > 0) {
                setFriendSubTab('lists');
            }
        } else if (friendSubTab === 'liked' && likedCount === 0) {
            if (likedCount === 0 && (listsCount > 0 || commentsCount > 0)) {
                if (listsCount > 0) {
                    setFriendSubTab('lists');
                } else {
                    setFriendSubTab('comments');
                }
            }
        }
    }, [debouncedSearch, activeTab, friendActivity]);


    // Helper: Render Interactive Friend Liked/Disliked Banner
    const renderFriendReactionBanner = (item) => {
        const likedBy = item.likedByFriends || [];
        const dislikedBy = item.dislikedByFriends || [];
        const isDislike = item.reactionType === 'dislike';
        const isBoth = item.reactionType === 'both';

        return (
            <div className={`friend-liked-banner ${isDislike ? 'dislike-banner' : isBoth ? 'both-banner' : ''}`}>
                {isDislike ? (
                    <FaThumbsDown size={14} style={{ color: '#ff7675' }} />
                ) : (
                    <FaHeart size={14} style={{ color: '#ff7675' }} />
                )}

                {/* Friend Avatar Stack */}
                <div className="friend-avatar-stack">
                    {[...likedBy, ...dislikedBy].slice(0, 3).map((f, i) => (
                        <Link key={i} to={`/profile/${f.username}`} title={f.username} onClick={e => e.stopPropagation()}>
                            {f.profilePic ? (
                                <img src={f.profilePic} alt={f.username} />
                            ) : (
                                <div className="avatar-fallback" style={{ background: 'var(--primary-color)', color: '#000', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {f.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>

                {/* Clickable Friend Names */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {likedBy.length > 0 && (
                        <span>
                            {likedBy.map((f, idx) => (
                                <React.Fragment key={f._id || idx}>
                                    <Link to={`/profile/${f.username}`} className="friend-name-link" onClick={e => e.stopPropagation()}>
                                        {f.username}
                                    </Link>
                                    {idx < likedBy.length - 1 ? ', ' : ''}
                                </React.Fragment>
                            ))}
                            {' bunu beğendi'}
                        </span>
                    )}
                    {isBoth && ' • '}
                    {dislikedBy.length > 0 && (
                        <span>
                            {dislikedBy.map((f, idx) => (
                                <React.Fragment key={f._id || idx}>
                                    <Link to={`/profile/${f.username}`} className="friend-name-link" onClick={e => e.stopPropagation()}>
                                        {f.username}
                                    </Link>
                                    {idx < dislikedBy.length - 1 ? ', ' : ''}
                                </React.Fragment>
                            ))}
                            {' buna dislike attı'}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    // Helper: Render Target Reference Box for a Comment
    const renderCommentTargetBox = (comment) => {
        const target = comment.target || comment.targetInfo;
        if (!target) {
            return (
                <div className="target-reference-card" style={{ opacity: 0.8 }}>
                    <div className="target-reference-thumb">
                        <FaFilm size={14} color="var(--primary-color)" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 600 }}>Topluluk İçeriği</div>
                        <div style={{ fontSize: '0.85rem', color: '#ccc' }}>Film / Liste İncelemesine Yorum</div>
                    </div>
                </div>
            );
        }

        const isReview = target.type === 'review';
        const title = target.movieTitle || target.title || target.name || (isReview ? 'Film İncelemesi' : 'Liste');
        const link = target.link || (isReview && target.tmdbId ? `/${target.mediaType || 'movie'}/${target.tmdbId}` : '/community');

        return (
            <Link to={link} className="target-reference-card">
                {target.posterPath ? (
                    <img src={getImageUrl(target.posterPath, 'w92')} alt={title} className="target-reference-thumb" />
                ) : (
                    <div className="target-reference-thumb">
                        {isReview ? <FaFilm size={14} color="var(--primary-color)" /> : <FaList size={14} color="var(--primary-color)" />}
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isReview ? '🎬 Film İncelemesine Yorum' : '📋 Listeye Yorum'}
                        {target.reviewAuthor && (
                            <span style={{ color: 'var(--text-muted)' }}>• @{target.reviewAuthor}</span>
                        )}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {title}
                    </div>
                    {target.reviewText && (
                        <div style={{ fontSize: '0.78rem', color: '#aaa', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                            "{target.reviewText}"
                        </div>
                    )}
                </div>
            </Link>
        );
    };

    return (
        <>
        <div className="community-page animate-fade-in" style={{ padding: '0 2rem' }}>
            {/* Edit Review Modal */}
            {editingReview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', zIndex: 1000,
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

            <header className="hero" style={{ width: '100%', margin: '1rem auto 2.2rem', padding: '1.8rem 2rem' }}>
                <h1>Topluluk Merkezi</h1>
                <p>RateFlix üyelerinin paylaştığı en popüler incelemeleri, listeleri ve arkadaşlarınızın aktivitelerini keşfedin.</p>
            </header>

            {/* 3 Main Tabs: Son İncelemeler | Herkese Açık Listeler | Arkadaş Aktivitesi */}
            <div className="community-tabs-container" style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setActiveTab('reviews')}
                    style={{
                        background: activeTab === 'reviews' ? 'linear-gradient(135deg, var(--primary-color), #f39c12)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.65rem 1.8rem',
                        borderRadius: '30px',
                        color: activeTab === 'reviews' ? '#000' : 'var(--text-muted)',
                        fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.3s',
                        boxShadow: activeTab === 'reviews' ? '0 4px 15px rgba(212, 175, 55, 0.4)' : 'none'
                    }}
                    className="hover-scale"
                >
                    <FaStar /> Son İncelemeler
                    {debouncedSearch && (
                        <span style={{ marginLeft: '4px', background: activeTab === 'reviews' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                            {reviews.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('lists')}
                    style={{
                        background: activeTab === 'lists' ? 'linear-gradient(135deg, var(--primary-color), #f39c12)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.65rem 1.8rem',
                        borderRadius: '30px',
                        color: activeTab === 'lists' ? '#000' : 'var(--text-muted)',
                        fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.3s',
                        boxShadow: activeTab === 'lists' ? '0 4px 15px rgba(212, 175, 55, 0.4)' : 'none'
                    }}
                    className="hover-scale"
                >
                    <FaList /> Herkese Açık Listeler
                    {debouncedSearch && (
                        <span style={{ marginLeft: '4px', background: activeTab === 'lists' ? 'rgba(0,0,0,0.2)' : 'rgba(212, 175, 55, 0.3)', color: activeTab === 'lists' ? '#000' : 'var(--primary-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {lists.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('friends')}
                    style={{
                        background: activeTab === 'friends' ? 'linear-gradient(135deg, var(--primary-color), #f39c12)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '0.65rem 1.8rem',
                        borderRadius: '30px',
                        color: activeTab === 'friends' ? '#000' : 'var(--text-muted)',
                        fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'all 0.3s',
                        boxShadow: activeTab === 'friends' ? '0 4px 15px rgba(212, 175, 55, 0.4)' : 'none'
                    }}
                    className="hover-scale"
                >
                    <FaUserFriends /> Arkadaş Aktivitesi
                </button>
            </div>

            <div style={{ maxWidth: '840px', margin: '0 auto' }}>

                {/* Search & Sort Controls Bar */}
                <div className="community-controls-bar">
                    {/* Live Debounced Search Bar */}
                    <div className="community-search-box">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder={activeTab === 'lists' ? "Liste adı, film adı veya kullanıcı ara..." : activeTab === 'friends' ? "Arkadaş, film, liste veya yorum ara..." : "Film, dizi, inceleme veya kullanıcı ara..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-btn" onClick={() => setSearchQuery('')} title="Temizle">
                                <FaTimes />
                            </button>
                        )}
                    </div>

                    {/* Filter Popover Dropdown Button next to Search Box */}
                    <div className="community-filter-wrapper" ref={filterRef}>
                        <button
                            type="button"
                            className={`community-filter-toggle-btn ${filterOpen ? 'active' : ''} ${sortBy !== 'newest' ? 'filtered' : ''}`}
                            onClick={() => setFilterOpen(prev => !prev)}
                            title="Filtreleme ve Sıralama Seçenekleri"
                        >
                            <FaFilter size={12} />
                            <span>{getSortLabel(sortBy)}</span>
                            <FaChevronDown size={10} style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>

                        {filterOpen && (
                            <div className="community-filter-menu animate-fade-in">
                                <div className="filter-menu-header">
                                    <span>Sıralama ve Filtre</span>
                                </div>
                                {sortOptions.map(opt => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        className={`filter-menu-item ${sortBy === opt.key ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSortBy(opt.key);
                                            setFilterOpen(false);
                                        }}
                                    >
                                        <span className="filter-item-icon">{opt.icon}</span>
                                        <span className="filter-item-title">{opt.label}</span>
                                        {sortBy === opt.key && <span className="filter-check">✓</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="loading-container" style={{ minHeight: '200px' }}>
                        <div className="spinner"></div>
                        <p>İçerikler yükleniyor...</p>
                    </div>
                )}

                {/* =========================================================================
                   TAB 1: SON İNCELEMELER
                   ========================================================================= */}
                {!loading && activeTab === 'reviews' && (
                    <section className="animate-fade-in">
                        {/* Search crosslink card: shown if movie matches public lists */}
                        {debouncedSearch && lists.length > 0 && (
                            <div 
                                className="community-search-crosslink-card"
                                onClick={() => setActiveTab('lists')}
                                role="button"
                                tabIndex={0}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="search-crosslink-icon">
                                        <FaList />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                                            "{debouncedSearch}" içeren {lists.length} adet liste bulundu!
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                            Bu içeriğin yer aldığı herkese açık kullanıcı listelerini görmek için tıklayın.
                                        </div>
                                    </div>
                                </div>
                                <button className="search-crosslink-btn" onClick={(e) => { e.stopPropagation(); setActiveTab('lists'); }}>
                                    Listelere Git →
                                </button>
                            </div>
                        )}

                        {reviews.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {debouncedSearch ? (
                                    <div>
                                        <p style={{ fontSize: '1rem', color: '#ccc', marginBottom: lists.length > 0 ? '1rem' : '0' }}>
                                            "{debouncedSearch}" aramasıyla eşleşen inceleme bulunamadı.
                                        </p>
                                        {lists.length > 0 && (
                                            <button
                                                onClick={() => setActiveTab('lists')}
                                                style={{
                                                    background: 'var(--primary-gradient)',
                                                    border: 'none',
                                                    color: '#000',
                                                    padding: '10px 22px',
                                                    borderRadius: '25px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <FaList /> Bu İçeriği Barındıran {lists.length} Listeyi Gör →
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    'Henüz inceleme bulunmuyor.'
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {reviews.map(review => (
                                    <div key={review._id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                        <div className="review-content-wrapper" style={{ display: 'flex', gap: '1rem' }}>
                                            {/* Poster */}
                                            <Link to={`/${review.mediaType || 'movie'}/${review.tmdbId}`} style={{ flexShrink: 0 }}>
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

                                            {/* Review Content */}
                                            <div style={{ flex: 1 }}>
                                                <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <Link to={review.user?.username ? `/profile/${review.user.username}` : '#'} style={{ textDecoration: 'none' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                <div style={{ background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.7rem', overflow: 'hidden' }}>
                                                                    {review.user?.profilePic ? <img src={review.user.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <FaUser />}
                                                                </div>
                                                                {review.user?.username || 'Kullanıcı'}
                                                            </div>
                                                        </Link>
                                                        <Link to={`/${review.mediaType || 'movie'}/${review.tmdbId}`} style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                                                            {review.movieTitle || 'İsimsiz İçerik'}
                                                        </Link>
                                                    </div>
                                                    <RatingStars rating={review.rating} readonly />
                                                </div>

                                                <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '0.95rem', margin: '0.8rem 0' }}>
                                                    "{review.reviewText || 'Sadece puan verdi.'}"
                                                </p>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <span><FaClock style={{ marginRight: '0.3rem' }} /> {new Date(review.createdAt).toLocaleDateString('tr-TR')}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={(e) => handleReactionClick(e, review._id, 'like', 'review')}
                                                            className={`list-reaction-btn ${reactions[review._id]?.liked ? 'active-like' : ''}`}
                                                            title="Beğen"
                                                        >
                                                            <FaThumbsUp size={11} /> <span>{reactions[review._id]?.likes || 0}</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleReactionClick(e, review._id, 'dislike', 'review')}
                                                            className={`list-reaction-btn ${reactions[review._id]?.disliked ? 'active-dislike' : ''}`}
                                                            title="Dislike"
                                                        >
                                                            <FaThumbsDown size={11} /> <span>{reactions[review._id]?.dislikes || 0}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleComments(review._id)}
                                                            className={`list-comment-btn ${expandedComments[review._id] ? 'active-comment' : ''}`}
                                                            title="Yorumlar ve Yorum Yap"
                                                        >
                                                            <FaComment size={11} />
                                                            <span>{comments[review._id] ? comments[review._id].length : (review.commentCount || 0)}</span>
                                                            {expandedComments[review._id] ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                                                        </button>

                                                        {myUser && (myUser.id === review.user?._id || myUser.id === review.user || myUser.role === 'admin') && (
                                                            <div style={{ display: 'flex', gap: '8px', marginLeft: '6px' }}>
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
                                                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85rem' }} 
                                                                    title="Düzenle"
                                                                >
                                                                    Düzenle
                                                                </button>
                                                                <button onClick={() => handleDeleteReview(review._id)} style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer' }} title="Sil">
                                                                    <FaTrash size={11} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {expandedComments[review._id] && (
                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                                        {renderComments(review._id, 'review', review.commentCount || 0, false)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* =========================================================================
                   TAB 2: HERKESE AÇIK LİSTELER
                   ========================================================================= */}
                {!loading && activeTab === 'lists' && (
                    <section className="animate-fade-in">
                        {lists.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {debouncedSearch ? `"${debouncedSearch}" aramasıyla eşleşen liste bulunamadı.` : 'Herkese açık liste bulunmuyor.'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {lists.map((list) => {
                                    const matchingItems = debouncedSearch ? (list.items || []).filter(item => 
                                        item.title && item.title.toLowerCase().includes(debouncedSearch.toLowerCase())
                                    ) : [];

                                    return (
                                        <div key={list._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', transition: 'all 0.3s', backgroundColor: expandedListId === list._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                                            <div
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}
                                            >
                                                <div style={{ flex: 1, minWidth: '260px' }}>
                                                    <Link to={list.user?.username ? `/profile/${list.user.username}` : '#'} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                                                        <div className="list-creator-badge">
                                                            <div className="list-creator-avatar">
                                                                {list.user?.profilePic ? <img src={list.user.profilePic} alt="" /> : <FaUser size={10} />}
                                                            </div>
                                                            <span>{list.user?.username || 'Kullanıcı'}</span>
                                                        </div>
                                                    </Link>
                                                    <h3 style={{ fontSize: '1.3rem', marginBottom: '0.3rem', color: '#fff' }}>{list.name}</h3>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{list.items?.length || 0} içerik</p>

                                                    {/* Matching Movie Highlight Badge */}
                                                    {matchingItems.length > 0 && (
                                                        <div className="list-matching-item-badge">
                                                            <FaFilm size={11} color="var(--primary-color)" />
                                                            <span>Listede eşleşti: <strong>{matchingItems.map(m => m.title).slice(0, 3).join(', ')}{matchingItems.length > 3 ? ` (+${matchingItems.length - 3})` : ''}</strong></span>
                                                        </div>
                                                    )}

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

                                                    {/* Single-Row Preview with Smooth Horizontal Overflow */}
                                                    {expandedListId !== list._id && list.items?.length > 0 && (
                                                        <div className="list-preview-scroll-row">
                                                            {list.items.slice(0, 8).map((item, i) => (
                                                                <div key={i} style={{ flexShrink: 0 }}>
                                                                    {item.posterPath ? (
                                                                        <img src={getImageUrl(item.posterPath, 'w92')} alt={item.title || ''} style={{ width: '42px', height: '62px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                    ) : (
                                                                        <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <FaFilm size={12} color="var(--text-muted)" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {list.items.length > 8 && (
                                                                <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-color)', flexShrink: 0, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                                                    +{list.items.length - 8}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons Row: Tüm Filmleri Gör + Like + Dislike + Yorum */}
                                                <div className="list-card-actions-wrapper" onClick={e => e.stopPropagation()}>
                                                    <div className="list-card-actions-row">
                                                        {list.items?.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleList(list._id)}
                                                                className={`list-action-btn ${expandedListId === list._id ? 'active' : ''}`}
                                                                title={expandedListId === list._id ? 'Filmleri Gizle' : 'Tüm Filmleri Gör'}
                                                            >
                                                                <FaFilm size={11} />
                                                                <span>{expandedListId === list._id ? 'Filmleri Gizle' : `Filmleri Gör (${list.items.length})`}</span>
                                                                {expandedListId === list._id ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                                                            </button>
                                                        )}

                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleReactionClick(e, list._id, 'like', 'list')}
                                                            className={`list-reaction-btn ${reactions[list._id]?.liked ? 'active-like' : ''}`}
                                                            title="Beğen"
                                                        >
                                                            <FaThumbsUp size={11} />
                                                            <span>{reactions[list._id]?.likes || 0}</span>
                                                        </button>

                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleReactionClick(e, list._id, 'dislike', 'list')}
                                                            className={`list-reaction-btn ${reactions[list._id]?.disliked ? 'active-dislike' : ''}`}
                                                            title="Dislike"
                                                        >
                                                            <FaThumbsDown size={11} />
                                                            <span>{reactions[list._id]?.dislikes || 0}</span>
                                                        </button>

                                                        <button 
                                                            type="button"
                                                            onClick={() => toggleComments(list._id)}
                                                            className={`list-comment-btn ${expandedComments[list._id] ? 'active-comment' : ''}`}
                                                            title="Yorumlar ve Yorum Yap"
                                                        >
                                                            <FaComment size={11} />
                                                            <span>{comments[list._id] ? comments[list._id].length : (list.commentCount || 0)}</span>
                                                            {expandedComments[list._id] ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Content View (Grid) */}
                                            {expandedListId === list._id && (
                                                <>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '0.8rem', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                        {list.items?.length > 0 ? (
                                                            list.items.map(item => (
                                                                <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} key={item.tmdbId} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }} className="hover-scale">
                                                                    {item.posterPath ? (
                                                                        <img src={getImageUrl(item.posterPath, 'w200')} alt={item.title || ''} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.4rem' }} />
                                                                    ) : (
                                                                        <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                                                                            <FaFilm />
                                                                        </div>
                                                                    )}
                                                                    <div style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                                                </Link>
                                                            ))
                                                        ) : (
                                                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
                                                                Bu listede henüz içerik yok.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button className="list-expand-btn" style={{ marginTop: '1rem' }} onClick={() => toggleList(list._id)}>
                                                        <FaChevronUp size={10} /> Filmleri Gizle
                                                    </button>
                                                </>
                                            )}

                                            {/* Comments Section (Toggled by Comment button next to like/dislike) */}
                                            {expandedComments[list._id] && (
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '1rem', paddingTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                                    {renderComments(list._id, 'list', list.commentCount || 0, false)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* =========================================================================
                   TAB 3: ARKADAŞ AKTİVİTESİ
                   ========================================================================= */}
                {!loading && activeTab === 'friends' && (
                    <section className="animate-fade-in">
                        {!myUser ? (
                            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                                <FaUserFriends size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem', opacity: 0.8 }} />
                                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Arkadaş Aktiviteleri</h3>
                                <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
                                    Takip ettiğiniz arkadaşlarınızın paylaştığı listeleri, yaptığı yorumları ve beğendiği içerikleri görmek için giriş yapmalısınız.
                                </p>
                                <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '10px 28px', textDecoration: 'none', borderRadius: '25px', fontWeight: 600 }}>
                                    Giriş Yap
                                </Link>
                            </div>
                        ) : friendActivity.followingCount === 0 ? (
                            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                                <FaUserFriends size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem', opacity: 0.8 }} />
                                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Henüz Kimseyi Takip Etmiyorsunuz</h3>
                                <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                                    Diğer RateFlix üyelerini ve sinemaseverleri profillerinden takip ederek burada en son paylaştıkları listeleri, yorumları ve beğendikleri filmleri takip edebilirsiniz.
                                </p>
                                <button onClick={() => setActiveTab('reviews')} className="btn-secondary" style={{ padding: '10px 24px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                    Topluluğu Keşfet
                                </button>
                            </div>
                        ) : loadingFriends ? (
                            <div className="loading-container" style={{ minHeight: '200px' }}>
                                <div className="spinner"></div>
                                <p>Arkadaş aktiviteleri yükleniyor...</p>
                            </div>
                        ) : (
                            <div>
                                {/* Sub-Tabs Bar: Paylaşılan Listeler | Yorumlar | Beğendiği/Beğenmediği İçerikler */}
                                <div className="friend-subtabs-bar">
                                    <button
                                        className={`friend-subtab-btn ${friendSubTab === 'lists' ? 'active' : ''}`}
                                        onClick={() => setFriendSubTab('lists')}
                                    >
                                        <FaList size={13} /> Paylaşılan Listeler ({debouncedSearch ? sortFriendItems(friendActivity.lists).filter(filterFriendItem).length : friendActivity.lists.length})
                                    </button>
                                    <button
                                        className={`friend-subtab-btn ${friendSubTab === 'comments' ? 'active' : ''}`}
                                        onClick={() => setFriendSubTab('comments')}
                                    >
                                        <FaComment size={13} /> Yorumlar ve İncelemeler ({debouncedSearch ? sortFriendItems(friendActivity.comments).filter(filterFriendItem).length : friendActivity.comments.length})
                                    </button>
                                    <button
                                        className={`friend-subtab-btn ${friendSubTab === 'liked' ? 'active' : ''}`}
                                        onClick={() => setFriendSubTab('liked')}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <FaThumbsUp size={11} style={{ color: '#2ed573' }} />
                                            <FaThumbsDown size={11} style={{ color: '#ff7675' }} />
                                        </span>
                                        Beğendiği & Dislike Attığı ({debouncedSearch ? sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length : friendActivity.likedContent.length})
                                    </button>
                                </div>

                                {/* 1. Sub-section: Paylaşılan Listeler */}
                                {friendSubTab === 'lists' && (
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {sortFriendItems(friendActivity.lists).filter(filterFriendItem).length === 0 ? (
                                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <p>Arkadaşlarınızın paylaştığı liste bulunmuyor.</p>
                                                {debouncedSearch && sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length > 0 && (
                                                    <div style={{ marginTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                                                        <p style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                                                            "{debouncedSearch}" araması için tepkiler sekmesinde hareket bulundu:
                                                        </p>
                                                        <button
                                                            className="btn-primary hover-scale"
                                                            style={{ fontSize: '0.85rem', padding: '6px 18px', borderRadius: '20px', cursor: 'pointer' }}
                                                            onClick={() => setFriendSubTab('liked')}
                                                        >
                                                            <FaThumbsUp size={11} /> Beğendiği & Dislike Attığı ({sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length})
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            sortFriendItems(friendActivity.lists).filter(filterFriendItem).map((list) => {
                                                const matchingItems = debouncedSearch ? (list.items || []).filter(item => 
                                                    item.title && item.title.toLowerCase().includes(debouncedSearch.toLowerCase())
                                                ) : [];

                                                return (
                                                    <div key={list._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', transition: 'all 0.3s', backgroundColor: expandedListId === list._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                                                        <div
                                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}
                                                        >
                                                            <div style={{ flex: 1, minWidth: '260px' }}>
                                                                <Link to={list.user?.username ? `/profile/${list.user.username}` : '#'} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                                                                    <div className="list-creator-badge">
                                                                        <div className="list-creator-avatar">
                                                                            {list.user?.profilePic ? <img src={list.user.profilePic} alt="" /> : <FaUser size={10} />}
                                                                        </div>
                                                                        <span>{list.user?.username || 'Kullanıcı'}</span>
                                                                    </div>
                                                                </Link>
                                                                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.3rem', color: '#fff' }}>{list.name}</h3>
                                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{list.items?.length || 0} içerik</p>

                                                                {/* Matching Movie Highlight Badge */}
                                                                {matchingItems.length > 0 && (
                                                                    <div className="list-matching-item-badge">
                                                                        <FaFilm size={11} color="var(--primary-color)" />
                                                                        <span>Listede eşleşti: <strong>{matchingItems.map(m => m.title).slice(0, 3).join(', ')}{matchingItems.length > 3 ? ` (+${matchingItems.length - 3})` : ''}</strong></span>
                                                                    </div>
                                                                )}

                                                                {list.description && (
                                                                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.4rem', fontStyle: 'italic' }}>{list.description}</p>
                                                                )}

                                                                {/* Unexpanded Preview Row: Horizontal scroll */}
                                                                {expandedListId !== list._id && list.items?.length > 0 && (
                                                                    <div className="list-preview-scroll-row">
                                                                        {list.items.slice(0, 8).map((item, i) => (
                                                                            <div key={i} style={{ flexShrink: 0 }}>
                                                                                {item.posterPath ? (
                                                                                    <img src={getImageUrl(item.posterPath, 'w92')} alt={item.title || ''} style={{ width: '42px', height: '62px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                                ) : (
                                                                                    <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                        <FaFilm size={12} color="var(--text-muted)" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                        {list.items.length > 8 && (
                                                                            <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-color)', flexShrink: 0, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                                                                +{list.items.length - 8}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions Row: Filmleri Gör + Like + Dislike + Yorum */}
                                                            <div className="list-card-actions-wrapper" onClick={e => e.stopPropagation()}>
                                                                <div className="list-card-actions-row">
                                                                    {list.items?.length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleList(list._id)}
                                                                            className={`list-action-btn ${expandedListId === list._id ? 'active' : ''}`}
                                                                            title={expandedListId === list._id ? 'Filmleri Gizle' : 'Tüm Filmleri Gör'}
                                                                        >
                                                                            <FaFilm size={11} />
                                                                            <span>{expandedListId === list._id ? 'Filmleri Gizle' : `Filmleri Gör (${list.items.length})`}</span>
                                                                            {expandedListId === list._id ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                                                                        </button>
                                                                    )}

                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => handleReactionClick(e, list._id, 'like', 'list')}
                                                                        className={`list-reaction-btn ${reactions[list._id]?.liked ? 'active-like' : ''}`}
                                                                        title="Beğen"
                                                                    >
                                                                        <FaThumbsUp size={11} />
                                                                        <span>{reactions[list._id]?.likes || 0}</span>
                                                                    </button>

                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => handleReactionClick(e, list._id, 'dislike', 'list')}
                                                                        className={`list-reaction-btn ${reactions[list._id]?.disliked ? 'active-dislike' : ''}`}
                                                                        title="Dislike"
                                                                    >
                                                                        <FaThumbsDown size={11} />
                                                                        <span>{reactions[list._id]?.dislikes || 0}</span>
                                                                    </button>

                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => toggleComments(list._id)}
                                                                        className={`list-comment-btn ${expandedComments[list._id] ? 'active-comment' : ''}`}
                                                                        title="Yorumlar ve Yorum Yap"
                                                                    >
                                                                        <FaComment size={11} />
                                                                        <span>{comments[list._id] ? comments[list._id].length : (list.commentCount || 0)}</span>
                                                                        {expandedComments[list._id] ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Items (Grid) */}
                                                        {expandedListId === list._id && (
                                                            <>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '0.8rem', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                                    {list.items?.length > 0 ? (
                                                                        list.items.map(item => (
                                                                            <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} key={item.tmdbId} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }} className="hover-scale">
                                                                                {item.posterPath ? (
                                                                                    <img src={getImageUrl(item.posterPath, 'w200')} alt={item.title || ''} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.4rem' }} />
                                                                                ) : (
                                                                                    <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                                                                                        <FaFilm />
                                                                                    </div>
                                                                                )}
                                                                                <div style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                                                            </Link>
                                                                        ))
                                                                    ) : (
                                                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
                                                                            Bu listede henüz içerik yok.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button className="list-expand-btn" style={{ marginTop: '1rem' }} onClick={() => toggleList(list._id)}>
                                                                    <FaChevronUp size={10} /> Filmleri Gizle
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Comments Section */}
                                                        {expandedComments[list._id] && (
                                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '1rem', paddingTop: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                                                {renderComments(list._id, 'list', list.commentCount || 0, false)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* 2. Sub-section: Yorumlar ve İncelemeler */}
                                {friendSubTab === 'comments' && (
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {sortFriendItems(friendActivity.comments).filter(filterFriendItem).length === 0 ? (
                                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <p>Arkadaşlarınızın paylaştığı inceleme veya yorum bulunmuyor.</p>
                                                {debouncedSearch && sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length > 0 && (
                                                    <div style={{ marginTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                                                        <p style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                                                            "{debouncedSearch}" araması için tepkiler sekmesinde hareket bulundu:
                                                        </p>
                                                        <button
                                                            className="btn-primary hover-scale"
                                                            style={{ fontSize: '0.85rem', padding: '6px 18px', borderRadius: '20px', cursor: 'pointer' }}
                                                            onClick={() => setFriendSubTab('liked')}
                                                        >
                                                            <FaThumbsUp size={11} /> Beğendiği & Dislike Attığı ({sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length})
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            sortFriendItems(friendActivity.comments).filter(filterFriendItem).map(item => {
                                                const isReview = item.activityType === 'review' || item.rating !== undefined;
                                                if (isReview) {
                                                    return (
                                                        <div key={item._id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                                            <div className="review-content-wrapper" style={{ display: 'flex', gap: '1rem' }}>
                                                                <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} style={{ flexShrink: 0 }}>
                                                                    {item.posterPath ? (
                                                                        <img src={getImageUrl(item.posterPath, 'w200')} alt={item.movieTitle} style={{ width: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <div style={{ width: '80px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <FaFilm style={{ color: 'var(--text-muted)' }} />
                                                                        </div>
                                                                    )}
                                                                </Link>
                                                                <div style={{ flex: 1 }}>
                                                                    <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                                        <div>
                                                                            <Link to={item.user?.username ? `/profile/${item.user.username}` : '#'} style={{ textDecoration: 'none' }}>
                                                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                                    <div style={{ background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.7rem', overflow: 'hidden' }}>
                                                                                        {item.user?.profilePic ? <img src={item.user.profilePic} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <FaUser />}
                                                                                    </div>
                                                                                    {item.user?.username || 'Kullanıcı'}
                                                                                </div>
                                                                            </Link>
                                                                            <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                                                                                {item.movieTitle || 'İsimsiz İçerik'}
                                                                            </Link>
                                                                        </div>
                                                                        <RatingStars rating={item.rating} readonly />
                                                                    </div>
                                                                    <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '0.95rem', margin: '0.8rem 0' }}>
                                                                        "{item.reviewText || 'Sadece puan verdi.'}"
                                                                    </p>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                        <span><FaClock style={{ marginRight: '0.3rem' }} /> {new Date(item.createdAt).toLocaleDateString('tr-TR')}</span>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            <button onClick={(e) => handleReactionClick(e, item._id, 'like', 'review')} style={{ background: reactions[item._id]?.liked ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[item._id]?.liked ? '#2ed573' : 'rgba(255,255,255,0.1)'}`, color: reactions[item._id]?.liked ? '#2ed573' : 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                                                <FaThumbsUp size={11} /> {reactions[item._id]?.likes || 0}
                                                                            </button>
                                                                            <button onClick={(e) => handleReactionClick(e, item._id, 'dislike', 'review')} style={{ background: reactions[item._id]?.disliked ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[item._id]?.disliked ? '#ff7675' : 'rgba(255,255,255,0.1)'}`, color: reactions[item._id]?.disliked ? '#ff7675' : 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                                                <FaThumbsDown size={11} /> {reactions[item._id]?.dislikes || 0}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                                                                        {renderComments(item._id, 'review', item.commentCount || 0)}
                                                                    </div>
                                                                </div>
                             
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Regular Comment item with Target Information
                                                return (
                                                    <div key={item._id} className="glass-panel" style={{ padding: '1.4rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                                            <Link to={item.user?.username ? `/profile/${item.user.username}` : '#'} style={{ textDecoration: 'none' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                                                                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.75rem', overflow: 'hidden' }}>
                                                                        {item.user?.profilePic ? <img src={item.user.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaUser />}
                                                                    </div>
                                                                    {item.user?.username || 'Kullanıcı'}
                                                                </div>
                                                            </Link>
                                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                <FaClock style={{ marginRight: '0.3rem' }} /> {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                                                            </span>
                                                        </div>

                                                        {/* Target reference card: Always rendered and shows what movie/list was commented on */}
                                                        {renderCommentTargetBox(item)}

                                                        <p style={{ color: '#eee', fontSize: '0.95rem', margin: '0.6rem 0 1rem', lineHeight: 1.5 }}>
                                                            {item.content}
                                                        </p>

                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                            <button 
                                                                onClick={() => handleCommentReaction(item._id, 'like', item.targetId)}
                                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                                                            >
                                                                <FaThumbsUp size={11} /> {item.likes?.length || 0}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCommentReaction(item._id, 'dislike', item.targetId)}
                                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                                                            >
                                                                <FaThumbsDown size={11} /> {item.dislikes?.length || 0}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* 3. Sub-section: Beğendiği & Beğenmediği İçerikler */}
                                {friendSubTab === 'liked' && (
                                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Sub-filter pills for Likes vs Dislikes */}
                                        <div className="filter-pills-bar" style={{ marginBottom: '0.5rem' }}>
                                            <button
                                                className={`filter-pill-btn ${friendReactionFilter === 'all' ? 'active' : ''}`}
                                                onClick={() => setFriendReactionFilter('all')}
                                            >
                                                Tümü ({debouncedSearch ? sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length : friendActivity.likedContent.length})
                                            </button>
                                            <button
                                                className={`filter-pill-btn ${friendReactionFilter === 'likes' ? 'active' : ''}`}
                                                onClick={() => setFriendReactionFilter('likes')}
                                            >
                                                <FaThumbsUp size={11} style={{ color: '#2ed573' }} /> Beğenilenler ({sortFriendItems(friendActivity.likedContent).filter(i => (i.likedByFriends || []).length > 0).filter(filterFriendItem).length})
                                            </button>
                                            <button
                                                className={`filter-pill-btn ${friendReactionFilter === 'dislikes' ? 'active' : ''}`}
                                                onClick={() => setFriendReactionFilter('dislikes')}
                                            >
                                                <FaThumbsDown size={11} style={{ color: '#ff7675' }} /> Dislike Atılanlar ({sortFriendItems(friendActivity.likedContent).filter(i => (i.dislikedByFriends || []).length > 0).filter(filterFriendItem).length})
                                            </button>
                                        </div>

                                        {sortFriendItems(friendActivity.likedContent)
                                            .filter(item => {
                                                if (friendReactionFilter === 'likes') return (item.likedByFriends || []).length > 0;
                                                if (friendReactionFilter === 'dislikes') return (item.dislikedByFriends || []).length > 0;
                                                return true;
                                            })
                                            .filter(filterFriendItem).length === 0 ? (
                                            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <p>Arkadaşlarınızın bu kategoride bir tepkisi bulunmuyor.</p>
                                                {debouncedSearch && friendReactionFilter !== 'all' && (
                                                    <button
                                                        className="btn-secondary hover-scale"
                                                        style={{ marginTop: '0.8rem', fontSize: '0.85rem', padding: '6px 18px', borderRadius: '20px', cursor: 'pointer' }}
                                                        onClick={() => setFriendReactionFilter('all')}
                                                    >
                                                        Tüm Tepkileri Göster ({sortFriendItems(friendActivity.likedContent).filter(filterFriendItem).length})
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            sortFriendItems(friendActivity.likedContent)
                                                .filter(item => {
                                                    if (friendReactionFilter === 'likes') return (item.likedByFriends || []).length > 0;
                                                    if (friendReactionFilter === 'dislikes') return (item.dislikedByFriends || []).length > 0;
                                                    return true;
                                                })
                                                .filter(filterFriendItem)
                                                .map(item => (
                                                    <div key={item._id} className="glass-panel" style={{ padding: '1.5rem' }}>
                                                        {/* Clickable Friend Names & Avatars Reaction Banner */}
                                                        {renderFriendReactionBanner(item)}

                                                        {/* Review Item */}
                                                        {item.activityType === 'liked_review' && (
                                                            <div className="review-content-wrapper" style={{ display: 'flex', gap: '1rem' }}>
                                                                <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} style={{ flexShrink: 0 }}>
                                                                    {item.posterPath ? (
                                                                        <img src={getImageUrl(item.posterPath, 'w200')} alt={item.movieTitle} style={{ width: '70px', borderRadius: '8px', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <div style={{ width: '70px', height: '105px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <FaFilm style={{ color: 'var(--text-muted)' }} />
                                                                        </div>
                                                                    )}
                                                                </Link>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                                                        <div>
                                                                            <Link to={item.user?.username ? `/profile/${item.user.username}` : '#'} style={{ textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                                                                                {item.user?.username || 'Kullanıcı'}
                                                                            </Link>
                                                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                                                {item.movieTitle}
                                                                            </div>
                                                                        </div>
                                                                        <RatingStars rating={item.rating} readonly />
                                                                    </div>
                                                                    <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                                                                        "{item.reviewText || 'Sadece puan verdi.'}"
                                                                    </p>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                        <span><FaClock style={{ marginRight: '0.3rem' }} /> {new Date(item.createdAt).toLocaleDateString('tr-TR')}</span>
                                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                            <button onClick={(e) => handleReactionClick(e, item._id, 'like', 'review')} style={{ background: reactions[item._id]?.liked ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[item._id]?.liked ? '#2ed573' : 'rgba(255,255,255,0.1)'}`, color: reactions[item._id]?.liked ? '#2ed573' : 'var(--text-muted)', borderRadius: '20px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                                <FaThumbsUp size={10} /> {reactions[item._id]?.likes || 0}
                                                                            </button>
                                                                            <button onClick={(e) => handleReactionClick(e, item._id, 'dislike', 'review')} style={{ background: reactions[item._id]?.disliked ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[item._id]?.disliked ? '#ff7675' : 'rgba(255,255,255,0.1)'}`, color: reactions[item._id]?.disliked ? '#ff7675' : 'var(--text-muted)', borderRadius: '20px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                                <FaThumbsDown size={10} /> {reactions[item._id]?.dislikes || 0}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* List Item */}
                                                        {item.activityType === 'liked_list' && (
                                                            <div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <Link to={item.user?.username ? `/profile/${item.user.username}` : '#'} style={{ textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                                                                            {item.user?.username || 'Kullanıcı'}
                                                                        </Link>
                                                                        <h4 style={{ fontSize: '1.2rem', margin: '0.3rem 0', color: '#fff' }}>{item.name}</h4>
                                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.items?.length || 0} içerik</p>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                                        <button onClick={(e) => handleReactionClick(e, item._id, 'like', 'list')} style={{ background: reactions[item._id]?.liked ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[item._id]?.liked ? '#2ed573' : 'rgba(255,255,255,0.1)'}`, color: reactions[item._id]?.liked ? '#2ed573' : 'var(--text-muted)', borderRadius: '20px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                            <FaThumbsUp size={10} /> {reactions[item._id]?.likes || 0}
                                                                        </button>
                                                                        <button onClick={(e) => handleReactionClick(e, item._id, 'dislike', 'list')} style={{ background: reactions[item._id]?.disliked ? 'rgba(255, 118, 117, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reactions[item._id]?.disliked ? '#ff7675' : 'rgba(255,255,255,0.1)'}`, color: reactions[item._id]?.disliked ? '#ff7675' : 'var(--text-muted)', borderRadius: '20px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                            <FaThumbsDown size={10} /> {reactions[item._id]?.dislikes || 0}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Cover row preview: Single-row horizontal scroll */}
                                                                {item.items?.length > 0 && (
                                                                    <div>
                                                                        <div className="list-preview-scroll-row">
                                                                            {item.items.slice(0, 8).map((subItem, i) => (
                                                                                <Link to={`/${subItem.mediaType || 'movie'}/${subItem.tmdbId}`} key={i} style={{ flexShrink: 0 }}>
                                                                                    {subItem.posterPath ? (
                                                                                        <img src={getImageUrl(subItem.posterPath, 'w92')} alt={subItem.title} style={{ width: '42px', height: '62px', objectFit: 'cover', borderRadius: '6px' }} />
                                                                                    ) : (
                                                                                        <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                            <FaFilm size={12} color="var(--text-muted)" />
                                                                                        </div>
                                                                                    )}
                                                                                </Link>
                                                                            ))}
                                                                            {item.items.length > 8 && (
                                                                                <div style={{ width: '42px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-color)', flexShrink: 0, border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                                                                                    +{item.items.length - 8}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <button className="list-expand-btn" onClick={() => toggleList(item._id)}>
                                                                            {expandedListId === item._id ? <><FaChevronUp size={10} /> Listeyi Kapat</> : <><FaChevronDown size={10} /> Tümünü Göster ({item.items.length})</>}
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Expanded Grid for Liked List */}
                                                                {expandedListId === item._id && item.items?.length > 0 && (
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '0.8rem', marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                                        {item.items.map(subItem => (
                                                                            <Link to={`/${subItem.mediaType || 'movie'}/${subItem.tmdbId}`} key={subItem.tmdbId} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }} className="hover-scale">
                                                                                {subItem.posterPath ? (
                                                                                    <img src={getImageUrl(subItem.posterPath, 'w200')} alt={subItem.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.4rem' }} />
                                                                                ) : (
                                                                                    <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                                                                                        <FaFilm />
                                                                                    </div>
                                                                                )}
                                                                                <div style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subItem.title}</div>
                                                                            </Link>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Comment Item */}
                                                        {item.activityType === 'liked_comment' && (
                                                            <div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                                                    <Link to={item.user?.username ? `/profile/${item.user.username}` : '#'} style={{ textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                                                                        {item.user?.username || 'Kullanıcı'}
                                                                    </Link>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                        <FaClock style={{ marginRight: '0.3rem' }} /> {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                                                                    </span>
                                                                </div>

                                                                {/* Rich Target Reference Box for Liked Comment */}
                                                                {renderCommentTargetBox(item)}

                                                                <p style={{ color: '#eee', fontSize: '0.92rem', margin: '0.5rem 0' }}>
                                                                    {item.content}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                )}
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
        </>
    );
};

export default Community;
