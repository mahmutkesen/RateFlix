import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl, TextInput, Alert, Modal, ScrollView
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getImageUrl } from '../../services/tmdb';
import { Ionicons } from '@expo/vector-icons';

interface ReviewItem {
    _id: string;
    tmdbId: string;
    mediaType: string;
    rating: number;
    reviewText: string;
    movieTitle: string;
    posterPath: string;
    createdAt: string;
    likes?: string[];
    dislikes?: string[];
    user: { _id: string; username: string; profilePic?: string };
}

interface ListItem {
    _id: string;
    name: string;
    type: string;
    description?: string;
    items: any[];
    user: { _id: string; username: string; profilePic?: string };
    likes?: string[];
    dislikes?: string[];
    createdAt?: string;
}

interface FriendActivity {
    followingCount: number;
    lists: any[];
    comments: any[];
    likedContent: any[];
}

export default function CommunityScreen() {
    const { user, token } = useAuth();
    const [activeTab, setActiveTab] = useState<'reviews' | 'lists' | 'friends'>('reviews');
    const [friendSubTab, setFriendSubTab] = useState<'lists' | 'comments' | 'reactions'>('lists');
    const [friendReactionFilter, setFriendReactionFilter] = useState<'all' | 'likes' | 'dislikes'>('all');

    // Search and Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_liked' | 'most_disliked' | 'most_commented' | 'highest_rated'>('newest');
    const [showSortModal, setShowSortModal] = useState(false);

    // Data states
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [lists, setLists] = useState<ListItem[]>([]);
    const [friendActivity, setFriendActivity] = useState<FriendActivity>({
        followingCount: 0,
        lists: [],
        comments: [],
        likedContent: []
    });

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [error, setError] = useState(false);

    // Comment states
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [comments, setComments] = useState<Record<string, any[]>>({});
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

    // Review Edit Modal state
    const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
    const [editRating, setEditRating] = useState(5);
    const [editText, setEditText] = useState('');
    const [submittingEdit, setSubmittingEdit] = useState(false);

    // Expanded list items
    const [expandedListId, setExpandedListId] = useState<string | null>(null);

    const fetchData = async () => {
        setError(false);
        try {
            const [reviewsRes, listsRes] = await Promise.all([
                api.get('/reviews/all', { timeout: 10000 }).catch(() => ({ data: [] })),
                api.get('/lists/public', { timeout: 10000 }).catch(() => ({ data: [] })),
            ]);
            setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
            setLists(Array.isArray(listsRes.data) ? listsRes.data : []);

            if (token && user) {
                fetchFriendActivity();
            }
        } catch (e) {
            console.error('Community fetch error:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchFriendActivity = async () => {
        if (!token) return;
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
            }
        } catch (err) {
            console.error('Error fetching friend activity:', err);
        } finally {
            setLoadingFriends(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [token])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Filter and Sort reviews
    const filteredReviews = useMemo(() => {
        let list = [...reviews];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(r =>
                r.movieTitle?.toLowerCase().includes(q) ||
                r.reviewText?.toLowerCase().includes(q) ||
                r.user?.username?.toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'oldest') {
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            }
            if (sortBy === 'most_liked') {
                return (b.likes?.length || 0) - (a.likes?.length || 0);
            }
            if (sortBy === 'most_disliked') {
                return (b.dislikes?.length || 0) - (a.dislikes?.length || 0);
            }
            if (sortBy === 'most_commented') {
                const aCount = comments[a._id]?.length || 0;
                const bCount = comments[b._id]?.length || 0;
                return bCount - aCount;
            }
            if (sortBy === 'highest_rated') {
                return (b.rating || 0) - (a.rating || 0);
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        return list;
    }, [reviews, searchQuery, sortBy, comments]);

    // Filter and Sort lists
    const filteredLists = useMemo(() => {
        let list = [...lists];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(l =>
                l.name?.toLowerCase().includes(q) ||
                l.description?.toLowerCase().includes(q) ||
                l.user?.username?.toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'oldest') {
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            }
            if (sortBy === 'most_liked') {
                return (b.likes?.length || 0) - (a.likes?.length || 0);
            }
            if (sortBy === 'most_disliked') {
                return (b.dislikes?.length || 0) - (a.dislikes?.length || 0);
            }
            if (sortBy === 'most_commented') {
                const aCount = comments[a._id]?.length || 0;
                const bCount = comments[b._id]?.length || 0;
                return bCount - aCount;
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        return list;
    }, [lists, searchQuery, sortBy, comments]);

    // Likes & Dislikes handling
    const handleReaction = async (id: string, type: 'review' | 'list', action: 'like' | 'dislike') => {
        if (!token || !user) {
            Alert.alert('Giriş Gerekli', 'Bu işlemi gerçekleştirmek için lütfen giriş yapın.', [
                { text: 'İptal' },
                { text: 'Giriş Yap', onPress: () => router.push('/login') }
            ]);
            return;
        }

        const endpoint = type === 'review' ? `/reviews/${id}/${action}` : `/lists/${id}/${action}`;

        if (type === 'review') {
            setReviews(prev => prev.map(r => {
                if (r._id !== id) return r;
                let likes = [...(r.likes || [])];
                let dislikes = [...(r.dislikes || [])];
                const userId = user.id;

                if (action === 'like') {
                    if (likes.includes(userId)) {
                        likes = likes.filter(l => l !== userId);
                    } else {
                        likes.push(userId);
                        dislikes = dislikes.filter(d => d !== userId);
                    }
                } else {
                    if (dislikes.includes(userId)) {
                        dislikes = dislikes.filter(d => d !== userId);
                    } else {
                        dislikes.push(userId);
                        likes = likes.filter(l => l !== userId);
                    }
                }
                return { ...r, likes, dislikes };
            }));
        } else {
            setLists(prev => prev.map(l => {
                if (l._id !== id) return l;
                let likes = [...(l.likes || [])];
                let dislikes = [...(l.dislikes || [])];
                const userId = user.id;

                if (action === 'like') {
                    if (likes.includes(userId)) {
                        likes = likes.filter(x => x !== userId);
                    } else {
                        likes.push(userId);
                        dislikes = dislikes.filter(x => x !== userId);
                    }
                } else {
                    if (dislikes.includes(userId)) {
                        dislikes = dislikes.filter(x => x !== userId);
                    } else {
                        dislikes.push(userId);
                        likes = likes.filter(x => x !== userId);
                    }
                }
                return { ...l, likes, dislikes };
            }));
        }

        try {
            await api.post(endpoint);
        } catch {
            fetchData();
        }
    };

    // Comments
    const toggleComments = async (targetId: string) => {
        const isExpanded = !expandedComments[targetId];
        setExpandedComments(prev => ({ ...prev, [targetId]: isExpanded }));
        if (isExpanded && (!comments[targetId] || comments[targetId].length === 0)) {
            fetchComments(targetId);
        }
    };

    const fetchComments = async (targetId: string) => {
        setLoadingComments(prev => ({ ...prev, [targetId]: true }));
        try {
            const res = await api.get(`/comments/${targetId}`);
            setComments(prev => ({ ...prev, [targetId]: res.data || [] }));
        } catch (err) {
            console.error('Comment fetch error', err);
        } finally {
            setLoadingComments(prev => ({ ...prev, [targetId]: false }));
        }
    };

    const handleCommentSubmit = async (targetId: string, targetType: 'Review' | 'List') => {
        const text = commentText[targetId];
        if (!text || !text.trim()) return;
        if (!token) {
            Alert.alert('Giriş Gerekli', 'Yorum yapmak için giriş yapmalısınız.');
            return;
        }

        try {
            const res = await api.post('/comments', {
                content: text.trim(),
                targetId,
                targetType
            });
            setComments(prev => ({ ...prev, [targetId]: [res.data, ...(prev[targetId] || [])] }));
            setCommentText(prev => ({ ...prev, [targetId]: '' }));
        } catch {
            Alert.alert('Hata', 'Yorum eklenemedi.');
        }
    };

    const handleCommentReaction = async (commentId: string, targetId: string, action: 'like' | 'dislike') => {
        if (!token || !user) {
            Alert.alert('Giriş Gerekli', 'Yorumları oylamak için giriş yapın.');
            return;
        }
        try {
            await api.post(`/comments/${commentId}/${action}`);
            fetchComments(targetId);
        } catch { }
    };

    const handleDeleteComment = (commentId: string, targetId: string) => {
        Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/comments/${commentId}`);
                        setComments(prev => ({
                            ...prev,
                            [targetId]: (prev[targetId] || []).filter(c => c._id !== commentId)
                        }));
                    } catch {
                        Alert.alert('Hata', 'Yorum silinemedi.');
                    }
                }
            }
        ]);
    };

    // Review Edit & Delete
    const openEditModal = (review: ReviewItem) => {
        setEditingReview(review);
        setEditRating(review.rating || 5);
        setEditText(review.reviewText || '');
    };

    const handleSaveEditReview = async () => {
        if (!editingReview) return;
        setSubmittingEdit(true);
        try {
            await api.post('/reviews', {
                tmdbId: editingReview.tmdbId,
                mediaType: editingReview.mediaType,
                rating: editRating,
                reviewText: editText.trim(),
                movieTitle: editingReview.movieTitle,
                posterPath: editingReview.posterPath
            });
            setReviews(prev => prev.map(r => r._id === editingReview._id ? { ...r, rating: editRating, reviewText: editText.trim() } : r));
            setEditingReview(null);
            Alert.alert('Başarılı', 'İnceleme güncellendi.');
        } catch {
            Alert.alert('Hata', 'İnceleme güncellenemedi.');
        } finally {
            setSubmittingEdit(false);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        Alert.alert('İncelemeyi Sil', 'Bu incelemeyi silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/reviews/${reviewId}`);
                        setReviews(prev => prev.filter(r => r._id !== reviewId));
                    } catch {
                        Alert.alert('Hata', 'Silme işlemi başarısız.');
                    }
                }
            }
        ]);
    };

    const handleDeleteList = (listId: string, listName: string) => {
        Alert.alert('Listeyi Sil', `"${listName}" listesini silmek istediğinize emin misiniz?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/lists/${listId}`);
                        setLists(prev => prev.filter(l => l._id !== listId));
                    } catch {
                        Alert.alert('Hata', 'Liste silinemedi.');
                    }
                }
            }
        ]);
    };

    const timeAgo = (date: string) => {
        if (!date) return '...';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '...';
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Az önce';
        if (mins < 60) return `${mins} dk`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} sa`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} gün`;
        return d.toLocaleDateString('tr-TR');
    };

    const getSortTitle = (s: string) => {
        switch (s) {
            case 'oldest': return 'En Eski';
            case 'most_liked': return 'En Çok Beğenilen';
            case 'most_disliked': return 'En Çok Dislike';
            case 'most_commented': return 'En Çok Yorum';
            case 'highest_rated': return 'En Yüksek Puan';
            default: return 'En Yeni';
        }
    };

    // Render Review Item
    const renderReview = ({ item }: { item: ReviewItem }) => {
        const isLiked = user ? (item.likes || []).includes(user.id) : false;
        const isDisliked = user ? (item.dislikes || []).includes(user.id) : false;
        const isMyReview = user && (item.user?._id === user.id || item.user?._id === (user as any)._id);

        return (
            <View style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => router.push(`/content/${item.tmdbId}?type=${item.mediaType}`)}
                    >
                        <Image source={{ uri: getImageUrl(item.posterPath, 'w185') }} style={styles.reviewPoster} />
                    </TouchableOpacity>
                    <View style={styles.reviewContent}>
                        <View style={styles.reviewTopRow}>
                            <TouchableOpacity
                                style={styles.userRow}
                                activeOpacity={0.7}
                                onPress={() => router.push(`/user/${item.user?._id}`)}
                            >
                                <View style={styles.userAvatar}>
                                    <Text style={styles.userAvatarText}>
                                        {item.user?.username?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <Text style={styles.userName} numberOfLines={1}>{item.user?.username || 'Kullanıcı'}</Text>
                            </TouchableOpacity>
                            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => router.push(`/content/${item.tmdbId}?type=${item.mediaType}`)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.movieTitle} numberOfLines={1}>{item.movieTitle}</Text>
                        </TouchableOpacity>

                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <Ionicons key={s} name={s <= item.rating ? 'star' : 'star-outline'} size={14} color="#E5B505" />
                            ))}
                        </View>

                        {item.reviewText ? (
                            <Text style={styles.reviewText}>"{item.reviewText}"</Text>
                        ) : (
                            <Text style={styles.reviewTextEmpty}>Sadece puan verdi.</Text>
                        )}

                        <View style={styles.actionsRow}>
                            {/* Like Button */}
                            <TouchableOpacity
                                style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
                                onPress={() => handleReaction(item._id, 'review', 'like')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'} size={13} color={isLiked ? '#2ecc71' : '#888'} />
                                <Text style={[styles.actionText, isLiked && { color: '#2ecc71' }]}>{(item.likes || []).length}</Text>
                            </TouchableOpacity>

                            {/* Dislike Button */}
                            <TouchableOpacity
                                style={[styles.actionBtn, isDisliked && styles.actionBtnDisliked]}
                                onPress={() => handleReaction(item._id, 'review', 'dislike')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name={isDisliked ? 'thumbs-down' : 'thumbs-down-outline'} size={13} color={isDisliked ? '#e74c3c' : '#888'} />
                                <Text style={[styles.actionText, isDisliked && { color: '#e74c3c' }]}>{(item.dislikes || []).length}</Text>
                            </TouchableOpacity>

                            {/* Comment Toggle */}
                            <TouchableOpacity
                                style={[styles.actionBtn, expandedComments[item._id] && styles.actionBtnActive]}
                                onPress={() => toggleComments(item._id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chatbubble-outline" size={13} color={expandedComments[item._id] ? '#E5B505' : '#888'} />
                                <Text style={[styles.actionText, expandedComments[item._id] && { color: '#E5B505' }]}>
                                    {comments[item._id]?.length || 0}
                                </Text>
                            </TouchableOpacity>

                            {/* Owner / Admin Actions */}
                            {isMyReview && (
                                <View style={styles.ownerActions}>
                                    <TouchableOpacity style={styles.iconMiniBtn} onPress={() => openEditModal(item)}>
                                        <Ionicons name="create-outline" size={16} color="#E5B505" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconMiniBtn} onPress={() => handleDeleteReview(item._id)}>
                                        <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {expandedComments[item._id] && renderCommentSection(item._id, 'Review')}
            </View>
        );
    };

    // Render List Item
    const renderList = ({ item, index }: { item: ListItem; index: number }) => {
        const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];
        const color = colors[index % colors.length];
        const isLiked = user ? (item.likes || []).includes(user.id) : false;
        const isDisliked = user ? (item.dislikes || []).includes(user.id) : false;
        const isMyList = user && (item.user?._id === user.id || item.user?._id === (user as any)._id);
        const isExpanded = expandedListId === item._id;
        const displayItems = isExpanded ? (item.items || []) : (item.items || []).slice(0, 6);

        return (
            <View style={styles.listCard}>
                <View style={styles.listHeaderRow}>
                    <TouchableOpacity
                        style={[styles.userBadge, { backgroundColor: color + '22', borderColor: color + '44' }]}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/user/${item.user?._id}`)}
                    >
                        <Text style={[styles.userBadgeText, { color }]}>{item.user?.username || 'Kullanıcı'}</Text>
                    </TouchableOpacity>
                    {isMyList && (
                        <TouchableOpacity onPress={() => handleDeleteList(item._id, item.name)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.listName}>{item.name}</Text>
                {item.description ? <Text style={styles.listDesc}>{item.description}</Text> : null}
                <Text style={styles.listCount}>{item.items?.length || 0} içerik</Text>

                {item.items && item.items.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                        <FlatList
                            data={displayItems}
                            horizontal={!isExpanded}
                            numColumns={isExpanded ? 3 : 1}
                            key={isExpanded ? 'grid-3' : 'scroll-h'}
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(it, i) => `${it.tmdbId}-${i}`}
                            renderItem={({ item: listItem }) => (
                                <TouchableOpacity
                                    onPress={() => router.push(`/content/${listItem.tmdbId}?type=${listItem.mediaType || 'movie'}`)}
                                    activeOpacity={0.8}
                                    style={isExpanded ? { margin: 4 } : { marginRight: 6 }}
                                >
                                    <Image source={{ uri: getImageUrl(listItem.posterPath, 'w92') }} style={styles.listPoster} />
                                </TouchableOpacity>
                            )}
                        />
                        {item.items.length > 6 && (
                            <TouchableOpacity
                                style={styles.expandListBtn}
                                onPress={() => setExpandedListId(isExpanded ? null : item._id)}
                            >
                                <Text style={styles.expandListText}>
                                    {isExpanded ? 'Daha Az Göster' : `Tümünü Gör (+${item.items.length - 6})`}
                                </Text>
                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#E5B505" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.listActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
                        onPress={() => handleReaction(item._id, 'list', 'like')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'} size={13} color={isLiked ? '#2ecc71' : '#888'} />
                        <Text style={[styles.actionText, isLiked && { color: '#2ecc71' }]}>{(item.likes || []).length}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, isDisliked && styles.actionBtnDisliked]}
                        onPress={() => handleReaction(item._id, 'list', 'dislike')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={isDisliked ? 'thumbs-down' : 'thumbs-down-outline'} size={13} color={isDisliked ? '#e74c3c' : '#888'} />
                        <Text style={[styles.actionText, isDisliked && { color: '#e74c3c' }]}>{(item.dislikes || []).length}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, expandedComments[item._id] && styles.actionBtnActive]}
                        onPress={() => toggleComments(item._id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chatbubble-outline" size={13} color={expandedComments[item._id] ? '#E5B505' : '#888'} />
                        <Text style={[styles.actionText, expandedComments[item._id] && { color: '#E5B505' }]}>
                            {comments[item._id]?.length || 0}
                        </Text>
                    </TouchableOpacity>
                </View>

                {expandedComments[item._id] && renderCommentSection(item._id, 'List')}
            </View>
        );
    };

    // Render Comment Section
    const renderCommentSection = (targetId: string, targetType: 'Review' | 'List') => {
        const itemComments = comments[targetId] || [];
        const isLoading = loadingComments[targetId];

        return (
            <View style={styles.commentSection}>
                <View style={styles.commentInputRow}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Yorum ekle..."
                        placeholderTextColor="#555"
                        value={commentText[targetId] || ''}
                        onChangeText={(txt) => setCommentText(prev => ({ ...prev, [targetId]: txt }))}
                    />
                    <TouchableOpacity
                        style={styles.sendBtn}
                        onPress={() => handleCommentSubmit(targetId, targetType)}
                    >
                        <Ionicons name="send" size={15} color="#000" />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="small" color="#E5B505" style={{ marginVertical: 10 }} />
                ) : itemComments.length === 0 ? (
                    <Text style={styles.noCommentsText}>İlk yorumu sen yaz!</Text>
                ) : (
                    itemComments.filter(c => c && c.user).map(c => {
                        const isMyComment = user && (c.user?._id === user.id || user.role === 'admin');
                        const isLiked = user && (c.likes || []).includes(user.id);
                        const isDisliked = user && (c.dislikes || []).includes(user.id);

                        return (
                            <View key={c._id} style={styles.commentCard}>
                                <View style={styles.commentUserRow}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                        onPress={() => router.push(`/user/${c.user?._id}`)}
                                    >
                                        <View style={styles.commentAvatar}>
                                            <Text style={styles.commentAvatarText}>
                                                {c.user?.username?.charAt(0).toUpperCase() || '?'}
                                            </Text>
                                        </View>
                                        <Text style={styles.commentUsername}>{c.user?.username}</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                                </View>

                                <Text style={styles.commentContent}>{c.content}</Text>

                                <View style={styles.commentActionsRow}>
                                    <TouchableOpacity
                                        style={styles.commentVoteBtn}
                                        onPress={() => handleCommentReaction(c._id, targetId, 'like')}
                                    >
                                        <Ionicons name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'} size={12} color={isLiked ? '#2ecc71' : '#777'} />
                                        <Text style={[styles.commentVoteText, isLiked && { color: '#2ecc71' }]}>{(c.likes || []).length || 0}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.commentVoteBtn}
                                        onPress={() => handleCommentReaction(c._id, targetId, 'dislike')}
                                    >
                                        <Ionicons name={isDisliked ? 'thumbs-down' : 'thumbs-down-outline'} size={12} color={isDisliked ? '#e74c3c' : '#777'} />
                                        <Text style={[styles.commentVoteText, isDisliked && { color: '#e74c3c' }]}>{(c.dislikes || []).length || 0}</Text>
                                    </TouchableOpacity>

                                    {isMyComment && (
                                        <TouchableOpacity
                                            style={{ marginLeft: 'auto', padding: 2 }}
                                            onPress={() => handleDeleteComment(c._id, targetId)}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#e74c3c" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        );
    };

    // Client-side text filter helper for friend activity sub-tabs in mobile
    const filterFriendItem = (item: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        const qTr = searchQuery.toLocaleLowerCase('tr-TR').trim();

        const matchText = (val: any) => {
            if (!val) return false;
            const str = String(val);
            const lower = str.toLowerCase();
            const lowerTr = str.toLocaleLowerCase('tr-TR');
            return lower.includes(q) || lowerTr.includes(qTr) || lower.includes(qTr) || lowerTr.includes(q);
        };

        const username = item.user?.username || '';
        const likedFriendMatch = (item.likedByFriends || []).some((f: any) => 
            matchText(typeof f === 'string' ? f : f?.username)
        );
        const dislikedFriendMatch = (item.dislikedByFriends || []).some((f: any) => 
            matchText(typeof f === 'string' ? f : f?.username)
        );
        const actorMatch = matchText(item.actor?.username || item.friend?.username);
        const title = item.movieTitle || item.name || item.title || '';
        const text = item.reviewText || item.description || item.content || '';
        const itemsText = (item.items || []).map((i: any) => i.title || i.name || '').join(' ');

        return matchText(username) || 
               likedFriendMatch || 
               dislikedFriendMatch || 
               actorMatch || 
               matchText(title) || 
               matchText(text) || 
               matchText(itemsText);
    };

    // Auto-switch friend subtab when search query has results in another subtab on mobile
    useEffect(() => {
        if (!searchQuery || activeTab !== 'friends') return;
        const listsCount = friendActivity.lists.filter(filterFriendItem).length;
        const commentsCount = friendActivity.comments.filter(filterFriendItem).length;
        const likedCount = friendActivity.likedContent.filter(filterFriendItem).length;

        if (friendSubTab === 'lists' && listsCount === 0) {
            if (likedCount > 0) {
                setFriendSubTab('reactions');
            } else if (commentsCount > 0) {
                setFriendSubTab('comments');
            }
        } else if (friendSubTab === 'comments' && commentsCount === 0) {
            if (likedCount > 0) {
                setFriendSubTab('reactions');
            } else if (listsCount > 0) {
                setFriendSubTab('lists');
            }
        } else if (friendSubTab === 'reactions' && likedCount === 0) {
            if (listsCount > 0) {
                setFriendSubTab('lists');
            } else if (commentsCount > 0) {
                setFriendSubTab('comments');
            }
        }
    }, [searchQuery, activeTab, friendActivity]);

    const renderFriendActivity = () => {
        if (!token) {
            return (
                <View style={styles.empty}>
                    <Ionicons name="people-outline" size={48} color="#444" />
                    <Text style={styles.emptyText}>Arkadaş hareketlerini görmek için giriş yapın</Text>
                    <TouchableOpacity style={styles.loginBtnInline} onPress={() => router.push('/login')}>
                        <Text style={styles.loginBtnText}>Giriş Yap</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (loadingFriends) {
            return (
                <View style={styles.empty}>
                    <ActivityIndicator size="large" color="#E5B505" />
                    <Text style={[styles.emptySubText, { marginTop: 12 }]}>Hareketler yükleniyor...</Text>
                </View>
            );
        }

        if (friendActivity.followingCount === 0) {
            return (
                <View style={styles.empty}>
                    <Ionicons name="person-add-outline" size={48} color="#444" />
                    <Text style={styles.emptyText}>Henüz kimseyi takip etmiyorsunuz</Text>
                    <Text style={styles.emptySubText}>Topluluk sekmesindeki kullanıcıları takip ederek aktivitelerini burada görebilirsiniz.</Text>
                </View>
            );
        }

        const filteredLists = friendActivity.lists.filter(filterFriendItem);
        const filteredComments = friendActivity.comments.filter(filterFriendItem);
        const filteredReactions = friendActivity.likedContent.filter(filterFriendItem);

        return (
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            >
                {/* Subtabs for Friend Activity */}
                <View style={styles.friendSubTabs}>
                    <TouchableOpacity
                        style={[styles.friendSubTab, friendSubTab === 'lists' && styles.friendSubTabActive]}
                        onPress={() => setFriendSubTab('lists')}
                    >
                        <Text style={[styles.friendSubTabText, friendSubTab === 'lists' && styles.friendSubTabTextActive]}>
                            Listeler ({filteredLists.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.friendSubTab, friendSubTab === 'comments' && styles.friendSubTabActive]}
                        onPress={() => setFriendSubTab('comments')}
                    >
                        <Text style={[styles.friendSubTabText, friendSubTab === 'comments' && styles.friendSubTabTextActive]}>
                            Yorumlar ({filteredComments.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.friendSubTab, friendSubTab === 'reactions' && styles.friendSubTabActive]}
                        onPress={() => setFriendSubTab('reactions')}
                    >
                        <Text style={[styles.friendSubTabText, friendSubTab === 'reactions' && styles.friendSubTabTextActive]}>
                            Tepkiler ({filteredReactions.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {friendSubTab === 'reactions' && (
                    <View style={styles.polarityFilterRow}>
                        <TouchableOpacity
                            style={[styles.pillBtn, friendReactionFilter === 'all' && styles.pillBtnActive]}
                            onPress={() => setFriendReactionFilter('all')}
                        >
                            <Text style={[styles.pillBtnText, friendReactionFilter === 'all' && styles.pillBtnTextActive]}>
                                Tümü ({filteredReactions.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pillBtn, friendReactionFilter === 'likes' && styles.pillBtnActive]}
                            onPress={() => setFriendReactionFilter('likes')}
                        >
                            <Text style={[styles.pillBtnText, friendReactionFilter === 'likes' && styles.pillBtnTextActive]}>
                                👍 Beğeniler ({filteredReactions.filter((i: any) => (i.likedByFriends || []).length > 0).length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.pillBtn, friendReactionFilter === 'dislikes' && styles.pillBtnActive]}
                            onPress={() => setFriendReactionFilter('dislikes')}
                        >
                            <Text style={[styles.pillBtnText, friendReactionFilter === 'dislikes' && styles.pillBtnTextActive]}>
                                👎 Dislike'lar ({filteredReactions.filter((i: any) => (i.dislikedByFriends || []).length > 0).length})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Subtab Contents */}
                {friendSubTab === 'lists' && (
                    filteredLists.length === 0 ? (
                        <Text style={styles.emptyFeedText}>Takip ettikleriniz henüz bir liste oluşturmamış.</Text>
                    ) : (
                        filteredLists.map((l: any, idx: number) => renderList({ item: l, index: idx }))
                    )
                )}

                {friendSubTab === 'comments' && (
                    filteredComments.length === 0 ? (
                        <Text style={styles.emptyFeedText}>Takip ettikleriniz henüz bir yorum yapmamış.</Text>
                    ) : (
                        filteredComments.map((c: any) => (
                            <View key={c._id} style={styles.feedCard}>
                                <TouchableOpacity
                                    style={styles.feedActorRow}
                                    onPress={() => router.push(`/user/${c.user?._id}`)}
                                >
                                    <View style={styles.userAvatar}>
                                        <Text style={styles.userAvatarText}>{c.user?.username?.charAt(0).toUpperCase() || '?'}</Text>
                                    </View>
                                    <Text style={styles.feedActorName}>{c.user?.username}</Text>
                                    <Text style={styles.feedActionText}>bir yorum yaptı</Text>
                                    <Text style={styles.timeText}>{timeAgo(c.createdAt)}</Text>
                                </TouchableOpacity>
                                <Text style={styles.commentContent}>{c.content}</Text>
                            </View>
                        ))
                    )
                )}

                {friendSubTab === 'reactions' && (
                    filteredReactions
                        .filter((item: any) => {
                            if (friendReactionFilter === 'likes') return (item.likedByFriends || []).length > 0;
                            if (friendReactionFilter === 'dislikes') return (item.dislikedByFriends || []).length > 0;
                            return true;
                        })
                        .map((item: any, i: number) => {
                            const actingFriend = item.likedByFriends?.[0] || item.dislikedByFriends?.[0] || item.actor || item.user;
                            const isDislike = (item.dislikedByFriends || []).length > 0;
                            const isLike = (item.likedByFriends || []).length > 0;
                            return (
                                <View key={item._id || i} style={styles.feedCard}>
                                    <View style={styles.feedActorRow}>
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                            onPress={() => router.push(`/user/${actingFriend?._id || actingFriend?.id}`)}
                                        >
                                            <View style={styles.userAvatar}>
                                                <Text style={styles.userAvatarText}>
                                                    {actingFriend?.username?.charAt(0).toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                            <Text style={styles.feedActorName}>{actingFriend?.username}</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.feedActionText}>
                                            {isDislike && isLike
                                                ? 'buna tepki verdi'
                                                : isDislike
                                                ? 'bunu beğenmedi (dislike)'
                                                : 'bunu beğendi'}
                                        </Text>
                                        <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                                    </View>
                                    {item.movieTitle ? (
                                        <TouchableOpacity
                                            onPress={() => router.push(`/content/${item.tmdbId}?type=${item.mediaType || 'movie'}`)}
                                            style={{ marginTop: 6 }}
                                        >
                                            <Text style={styles.movieTitle}>{item.movieTitle}</Text>
                                            {item.reviewText ? <Text style={styles.reviewText}>"{item.reviewText}"</Text> : null}
                                        </TouchableOpacity>
                                    ) : item.name ? (
                                        <Text style={styles.listName}>{item.name}</Text>
                                    ) : (
                                        <Text style={styles.commentContent}>{item.content}</Text>
                                    )}
                                </View>
                            );
                        })
                )}
            </ScrollView>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#E5B505" />
                <Text style={{ color: '#888', marginTop: 12 }}>Topluluk yükleniyor...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
                <Ionicons name="cloud-offline-outline" size={64} color="#333" />
                <Text style={{ color: '#888', fontSize: 16, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
                    Sunucuya bağlanılamadı
                </Text>
                <TouchableOpacity
                    style={{ backgroundColor: '#E5B505', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 20 }}
                    onPress={() => { setLoading(true); fetchData(); }}
                >
                    <Text style={{ color: '#000', fontWeight: '700' }}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Topluluk Merkezi</Text>
                <Text style={styles.headerSubtitle}>İncelemeler, özel listeler ve arkadaş hareketleri</Text>
            </View>

            {/* 3 Main Tabs */}
            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
                    onPress={() => setActiveTab('reviews')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="star" size={15} color={activeTab === 'reviews' ? '#000' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>İncelemeler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'lists' && styles.tabActive]}
                    onPress={() => setActiveTab('lists')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="list" size={15} color={activeTab === 'lists' ? '#000' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'lists' && styles.tabTextActive]}>Listeler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
                    onPress={() => setActiveTab('friends')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="people" size={15} color={activeTab === 'friends' ? '#000' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Takip Edilenler</Text>
                </TouchableOpacity>
            </View>

            {/* Search and Sort Toolbar (Available on Reviews & Lists) */}
            {activeTab !== 'friends' && (
                <View style={styles.toolbarRow}>
                    <View style={styles.searchWrapper}>
                        <Ionicons name="search" size={16} color="#777" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={activeTab === 'reviews' ? 'Film, inceleme veya kullanıcı ara...' : 'Liste veya kullanıcı ara...'}
                            placeholderTextColor="#555"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={16} color="#777" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.sortBtn}
                        onPress={() => setShowSortModal(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="funnel-outline" size={16} color="#E5B505" />
                        <Text style={styles.sortBtnText}>{getSortTitle(sortBy)}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Tab Contents */}
            {activeTab === 'reviews' ? (
                <FlatList
                    data={filteredReviews}
                    keyExtractor={(item) => item._id}
                    renderItem={renderReview}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#333" />
                            <Text style={styles.emptyText}>İnceleme bulunamadı</Text>
                            <Text style={styles.emptySubText}>Arama kriterlerinizi değiştirmeyi deneyin</Text>
                        </View>
                    }
                />
            ) : activeTab === 'lists' ? (
                <FlatList
                    data={filteredLists}
                    keyExtractor={(item) => item._id}
                    renderItem={renderList}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="albums-outline" size={48} color="#333" />
                            <Text style={styles.emptyText}>Liste bulunamadı</Text>
                            <Text style={styles.emptySubText}>Arama kriterlerinizi değiştirmeyi deneyin</Text>
                        </View>
                    }
                />
            ) : (
                renderFriendActivity()
            )}

            {/* Sort Selection Modal */}
            <Modal visible={showSortModal} transparent animationType="fade">
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSortModal(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalSheetTitle}>Sıralama Seçin</Text>
                        {[
                            { key: 'newest', title: 'En Yeni' },
                            { key: 'oldest', title: 'En Eski' },
                            { key: 'most_liked', title: 'En Çok Beğenilen' },
                            { key: 'most_disliked', title: 'En Çok Dislike' },
                            { key: 'most_commented', title: 'En Çok Yorum' },
                            ...(activeTab === 'reviews' ? [{ key: 'highest_rated', title: 'En Yüksek Puan' }] : [])
                        ].map((opt) => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.sortOption, sortBy === opt.key && styles.sortOptionSelected]}
                                onPress={() => { setSortBy(opt.key as any); setShowSortModal(false); }}
                            >
                                <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextSelected]}>
                                    {opt.title}
                                </Text>
                                {sortBy === opt.key && <Ionicons name="checkmark" size={18} color="#E5B505" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Review Edit Modal */}
            <Modal visible={!!editingReview} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.editReviewModal}>
                        <Text style={styles.modalSheetTitle}>İncelemeyi Düzenle</Text>
                        <Text style={styles.editMovieTitle}>{editingReview?.movieTitle}</Text>

                        {/* Stars */}
                        <View style={styles.editStarsRow}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <TouchableOpacity key={star} onPress={() => setEditRating(star)}>
                                    <Ionicons name={star <= editRating ? 'star' : 'star-outline'} size={32} color="#E5B505" />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Text */}
                        <TextInput
                            style={styles.editTextInput}
                            multiline
                            numberOfLines={4}
                            value={editText}
                            onChangeText={setEditText}
                            placeholder="Yorumunuzu güncelleyin..."
                            placeholderTextColor="#555"
                        />

                        {/* Actions */}
                        <View style={styles.editModalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setEditingReview(null)}
                            >
                                <Text style={styles.cancelBtnText}>Vazgeç</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveEditReview}
                                disabled={submittingEdit}
                            >
                                {submittingEdit ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Kaydet</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
    headerSubtitle: { color: '#888', fontSize: 13, lineHeight: 18 },

    // Tabs
    tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    tabActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    tabText: { color: '#888', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#000', fontWeight: '700' },

    // Toolbar
    toolbarRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 10, alignItems: 'center' },
    searchWrapper: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
        paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 13, padding: 0 },
    sortBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(229,181,5,0.1)', borderWidth: 1, borderColor: 'rgba(229,181,5,0.2)'
    },
    sortBtnText: { color: '#E5B505', fontSize: 12, fontWeight: '700' },

    // Review Card
    reviewCard: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    reviewRow: { flexDirection: 'row', gap: 12 },
    reviewPoster: { width: 68, height: 102, borderRadius: 8, backgroundColor: '#1a1a1a' },
    reviewContent: { flex: 1 },
    reviewTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    userAvatar: {
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5B505',
        alignItems: 'center', justifyContent: 'center',
    },
    userAvatarText: { color: '#000', fontSize: 10, fontWeight: '800' },
    userName: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    timeText: { color: '#666', fontSize: 11 },
    movieTitle: { color: '#E5B505', fontSize: 14, fontWeight: '700', marginBottom: 4 },
    starsRow: { flexDirection: 'row', gap: 1, marginBottom: 6 },
    reviewText: { color: '#ccc', fontSize: 13, lineHeight: 18, marginBottom: 6 },
    reviewTextEmpty: { color: '#666', fontSize: 12, fontStyle: 'italic', marginBottom: 6 },

    // Actions
    actionsRow: { flexDirection: 'row', marginTop: 4, gap: 8, alignItems: 'center' },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    actionBtnLiked: { backgroundColor: 'rgba(46, 204, 113, 0.1)', borderColor: 'rgba(46, 204, 113, 0.3)' },
    actionBtnDisliked: { backgroundColor: 'rgba(231, 76, 60, 0.1)', borderColor: 'rgba(231, 76, 60, 0.3)' },
    actionBtnActive: { backgroundColor: 'rgba(229,181,5,0.1)', borderColor: 'rgba(229,181,5,0.3)' },
    actionText: { color: '#888', fontSize: 12, fontWeight: '700' },
    ownerActions: { flexDirection: 'row', marginLeft: 'auto', gap: 8 },
    iconMiniBtn: { padding: 4 },

    // Comments Section
    commentSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 },
    commentInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    commentInput: {
        flex: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18,
        paddingHorizontal: 14, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
    },
    sendBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5B505',
        alignItems: 'center', justifyContent: 'center'
    },
    noCommentsText: { color: '#666', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginVertical: 6 },
    commentCard: {
        marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)'
    },
    commentUserRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    commentAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center' },
    commentAvatarText: { color: '#000', fontSize: 9, fontWeight: '800' },
    commentUsername: { color: '#fff', fontSize: 12, fontWeight: '600' },
    commentTime: { color: '#555', fontSize: 10 },
    commentContent: { color: '#ccc', fontSize: 12, lineHeight: 17, marginBottom: 4 },
    commentActionsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    commentVoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    commentVoteText: { color: '#777', fontSize: 10, fontWeight: '700' },

    // List Card
    listCard: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    userBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, borderWidth: 1,
    },
    userBadgeText: { fontSize: 11, fontWeight: '700' },
    listName: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
    listDesc: { color: '#888', fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
    listCount: { color: '#666', fontSize: 12 },
    listPoster: { width: 60, height: 90, borderRadius: 6, backgroundColor: '#1a1a1a' },
    expandListBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, marginTop: 6, gap: 4
    },
    expandListText: { color: '#E5B505', fontSize: 12, fontWeight: '700' },
    listActions: { flexDirection: 'row', marginTop: 12, gap: 8 },

    // Friend Feed
    friendSubTabs: { flexDirection: 'row', gap: 8, marginVertical: 12 },
    friendSubTab: {
        flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    friendSubTabActive: { backgroundColor: 'rgba(229,181,5,0.15)', borderColor: '#E5B505' },
    friendSubTabText: { color: '#888', fontSize: 12, fontWeight: '600' },
    friendSubTabTextActive: { color: '#E5B505', fontWeight: '700' },
    polarityFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    pillBtn: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
    },
    pillBtnActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    pillBtnText: { color: '#888', fontSize: 12, fontWeight: '600' },
    pillBtnTextActive: { color: '#000', fontWeight: '700' },
    feedCard: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    feedActorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    feedActorName: { color: '#fff', fontSize: 13, fontWeight: '700' },
    feedActionText: { color: '#888', fontSize: 12, flex: 1 },
    emptyFeedText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

    // Empty State
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
    emptyText: { color: '#888', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' },
    emptySubText: { color: '#555', fontSize: 12, marginTop: 4, textAlign: 'center' },
    loginBtnInline: { backgroundColor: '#E5B505', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 16 },
    loginBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

    // Modals
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
    modalSheet: { backgroundColor: '#181818', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    modalSheetTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
    sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    sortOptionSelected: { backgroundColor: 'rgba(229,181,5,0.05)', borderRadius: 8, paddingHorizontal: 8 },
    sortOptionText: { color: '#bbb', fontSize: 14 },
    sortOptionTextSelected: { color: '#E5B505', fontWeight: '700' },

    editReviewModal: { backgroundColor: '#181818', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    editMovieTitle: { color: '#E5B505', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
    editStarsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
    editTextInput: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12,
        color: '#fff', fontSize: 14, minHeight: 90, textAlignVertical: 'top',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16
    },
    editModalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
    cancelBtnText: { color: '#888', fontWeight: '600' },
    saveBtn: { backgroundColor: '#E5B505', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    saveBtnText: { color: '#000', fontWeight: '700' }
});
