import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl, TextInput, Alert
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
    user: { _id: string; username: string };
    likes?: string[];
    dislikes?: string[];
}

export default function CommunityScreen() {
    const { user, token } = useAuth();
    const [activeTab, setActiveTab] = useState<'reviews' | 'lists'>('reviews');
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [lists, setLists] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);

    // Comment states
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [comments, setComments] = useState<Record<string, any[]>>({});
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

    const fetchData = async () => {
        setError(false);
        try {
            const [reviewsRes, listsRes] = await Promise.all([
                api.get('/reviews/all', { timeout: 10000 }).catch(() => ({ data: [] })),
                api.get('/lists/public', { timeout: 10000 }).catch(() => ({ data: [] })),
            ]);
            setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
            setLists(Array.isArray(listsRes.data) ? listsRes.data : []);
        } catch (e) {
            console.error('Community fetch error:', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleLike = async (id: string, type: 'review' | 'list') => {
        if (!token) return;
        const endpoint = type === 'review' ? `/reviews/${id}/like` : `/lists/${id}/like`;
        try {
            await api.post(endpoint);
            if (type === 'review') {
                setReviews(prev => prev.map(r => {
                    if (r._id === id) {
                        const liked = (r.likes || []).includes(user!.id);
                        return { ...r, likes: liked ? (r.likes || []).filter(l => l !== user!.id) : [...(r.likes || []), user!.id] };
                    }
                    return r;
                }));
            } else {
                setLists(prev => prev.map(l => {
                    if (l._id === id) {
                        const liked = (l.likes || []).includes(user!.id);
                        return { ...l, likes: liked ? (l.likes || []).filter(x => x !== user!.id) : [...(l.likes || []), user!.id] };
                    }
                    return l;
                }));
            }
        } catch { }
    };

    const toggleComments = async (targetId: string) => {
        const isExpanded = !expandedComments[targetId];
        setExpandedComments(prev => ({ ...prev, [targetId]: isExpanded }));
        if (isExpanded && !comments[targetId]) {
            fetchComments(targetId);
        }
    };

    const fetchComments = async (targetId: string) => {
        setLoadingComments(prev => ({ ...prev, [targetId]: true }));
        try {
            const res = await api.get(`/comments/${targetId}`);
            setComments(prev => ({ ...prev, [targetId]: res.data || [] }));
        } catch (err) {
            console.error("Comment fetch error", err);
        } finally {
            setLoadingComments(prev => ({ ...prev, [targetId]: false }));
        }
    };

    const handleCommentSubmit = async (targetId: string, targetType: 'review' | 'list') => {
        const text = commentText[targetId];
        if (!text || !text.trim()) return;
        if (!token) return Alert.alert('Hata', 'Yorum yapmak için giriş yapmalısınız.');

        try {
            const res = await api.post('/comments', {
                content: text,
                targetId,
                targetType
            });
            setComments(prev => ({ ...prev, [targetId]: [res.data, ...(prev[targetId] || [])] }));
            setCommentText(prev => ({ ...prev, [targetId]: '' }));
        } catch (err) {
            Alert.alert('Hata', 'Yorum eklenemedi.');
        }
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

    const renderReview = ({ item }: { item: ReviewItem }) => {
        const isLiked = user ? (item.likes || []).includes(user.id) : false;
        return (
            <TouchableOpacity
                style={styles.reviewCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/content/${item.tmdbId}?type=${item.mediaType}`)}
            >
                <View style={styles.reviewRow}>
                    <Image source={{ uri: getImageUrl(item.posterPath, 'w185') }} style={styles.reviewPoster} />
                    <View style={styles.reviewContent}>
                        <TouchableOpacity style={styles.userRow} activeOpacity={0.7} onPress={() => router.push(`/user/${item.user?._id}`)}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>
                                    {item.user?.username?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                            <Text style={styles.userName}>{item.user?.username || 'Kullanıcı'}</Text>
                            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                        </TouchableOpacity>
                        <Text style={styles.movieTitle} numberOfLines={1}>{item.movieTitle}</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <Ionicons key={s} name={s <= item.rating ? 'star' : 'star-outline'} size={14} color="#E5B505" />
                            ))}
                        </View>
                        {item.reviewText ? (
                            <Text style={styles.reviewText} numberOfLines={3}>"{item.reviewText}"</Text>
                        ) : (
                            <Text style={styles.reviewTextEmpty}>Sadece puan verdi.</Text>
                        )}
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, isLiked ? styles.actionBtnActive : {}]}
                                onPress={() => handleLike(item._id, 'review')}
                            >
                                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={14} color={isLiked ? '#e74c3c' : '#666'} />
                                <Text style={[styles.actionText, isLiked && { color: '#e74c3c' }]}>{(item.likes || []).length}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, expandedComments[item._id] ? styles.actionBtnActive : {}]}
                                onPress={() => toggleComments(item._id)}
                            >
                                <Ionicons name="chatbubble-outline" size={14} color={expandedComments[item._id] ? '#E5B505' : '#666'} />
                                <Text style={styles.actionText}>{comments[item._id]?.length || 0}</Text>
                            </TouchableOpacity>
                        </View>
                        {expandedComments[item._id] && renderCommentSection(item._id, 'review')}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderList = ({ item, index }: { item: ListItem; index: number }) => {
        const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];
        const color = colors[index % colors.length];
        const isLiked = user ? (item.likes || []).includes(user.id) : false;
        return (
            <View style={styles.listCard}>
                <TouchableOpacity style={[styles.userBadge, { backgroundColor: color + '22', borderColor: color + '44' }]} activeOpacity={0.7} onPress={() => router.push(`/user/${item.user?._id}`)}>
                    <Text style={[styles.userBadgeText, { color }]}>{item.user?.username || 'Kullanıcı'}</Text>
                </TouchableOpacity>
                <Text style={styles.listName}>{item.name}</Text>
                {item.description ? <Text style={styles.listDesc}>{item.description}</Text> : null}
                <Text style={styles.listCount}>{item.items?.length || 0} içerik</Text>
                {item.items && item.items.length > 0 && (
                    <FlatList
                        data={item.items.slice(0, 6)}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(it, i) => `${it.tmdbId}-${i}`}
                        style={{ marginTop: 12 }}
                        renderItem={({ item: listItem }) => (
                            <TouchableOpacity
                                onPress={() => router.push(`/content/${listItem.tmdbId}?type=${listItem.mediaType || 'movie'}`)}
                                activeOpacity={0.8}
                            >
                                <Image source={{ uri: getImageUrl(listItem.posterPath, 'w92') }} style={styles.listPoster} />
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
                    />
                )}
                <View style={styles.listActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, isLiked ? styles.actionBtnActive : {}]}
                        onPress={() => handleLike(item._id, 'list')}
                    >
                        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={14} color={isLiked ? '#e74c3c' : '#666'} />
                        <Text style={[styles.actionText, isLiked && { color: '#e74c3c' }]}>{(item.likes || []).length}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, expandedComments[item._id] ? styles.actionBtnActive : {}]}
                        onPress={() => toggleComments(item._id)}
                    >
                        <Ionicons name="chatbubble-outline" size={14} color={expandedComments[item._id] ? '#E5B505' : '#666'} />
                        <Text style={styles.actionText}>{comments[item._id]?.length || 0}</Text>
                    </TouchableOpacity>
                </View>
                {expandedComments[item._id] && renderCommentSection(item._id, 'list')}
            </View>
        );
    };

    const renderCommentSection = (targetId: string, targetType: 'review' | 'list') => {
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
                        <Ionicons name="send" size={16} color="#E5B505" />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="small" color="#E5B505" style={{ marginVertical: 10 }} />
                ) : (
                    itemComments.filter(c => c && c.user).map(c => (
                        <View key={c._id} style={styles.commentCard}>
                            <View style={styles.commentUserRow}>
                                <View style={styles.commentAvatar}>
                                    <Text style={styles.commentAvatarText}>{c.user?.username?.charAt(0).toUpperCase() || '?'}</Text>
                                </View>
                                <Text style={styles.commentUsername}>{c.user?.username}</Text>
                                <TouchableOpacity onPress={() => setCommentText(prev => ({ ...prev, [targetId]: `@${c.user?.username} ` }))}>
                                    <Text style={styles.replyText}>Yanıtla</Text>
                                </TouchableOpacity>
                                <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                            </View>
                            <Text style={styles.commentContent}>{c.content}</Text>
                        </View>
                    ))
                )}
            </View>
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
                <Text style={{ color: '#555', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                    Backend sunucusunun çalıştığından emin olun
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
                <Text style={styles.headerSubtitle}>Diğer RateFlix üyelerinin incelemeleri ve listelerini keşfedin</Text>
            </View>

            <View style={styles.tabsRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
                    onPress={() => setActiveTab('reviews')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="star" size={16} color={activeTab === 'reviews' ? '#000' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>İncelemeler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'lists' && styles.tabActive]}
                    onPress={() => setActiveTab('lists')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="list" size={16} color={activeTab === 'lists' ? '#000' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'lists' && styles.tabTextActive]}>Listeler</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'reviews' ? (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item._id}
                    renderItem={renderReview}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#333" />
                            <Text style={styles.emptyText}>Henüz inceleme bulunmuyor</Text>
                            <Text style={styles.emptySubText}>İlk incelemeyi siz yapın!</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={lists}
                    keyExtractor={(item) => item._id}
                    renderItem={renderList}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="albums-outline" size={48} color="#333" />
                            <Text style={styles.emptyText}>Herkese açık liste bulunmuyor</Text>
                            <Text style={styles.emptySubText}>Listelerinizi herkese açık yaparak paylaşın!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
    headerSubtitle: { color: '#888', fontSize: 13, lineHeight: 18 },
    tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    tabActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
    tabTextActive: { color: '#000' },
    reviewCard: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    reviewRow: { flexDirection: 'row', gap: 12 },
    reviewPoster: { width: 65, height: 97, borderRadius: 8, backgroundColor: '#1a1a1a' },
    reviewContent: { flex: 1 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    userAvatar: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5B505',
        alignItems: 'center', justifyContent: 'center',
    },
    userAvatarText: { color: '#000', fontSize: 11, fontWeight: '800' },
    userName: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
    timeText: { color: '#555', fontSize: 11 },
    movieTitle: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 4 },
    starsRow: { flexDirection: 'row', gap: 1, marginBottom: 6 },
    reviewText: { color: '#bbb', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
    reviewTextEmpty: { color: '#555', fontSize: 12, fontStyle: 'italic' },
    actionsRow: { flexDirection: 'row', marginTop: 8, gap: 10 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    actionBtnActive: { backgroundColor: 'rgba(229,181,5,0.1)', borderColor: 'rgba(229,181,5,0.2)' },
    actionText: { color: '#666', fontSize: 12, fontWeight: '700' },
    commentSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    commentInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    commentInput: { flex: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingHorizontal: 16, color: '#fff', fontSize: 13 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(229,181,5,0.1)', alignItems: 'center', justifyContent: 'center' },
    commentCard: { marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10 },
    commentUserRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    commentAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center' },
    commentAvatarText: { color: '#000', fontSize: 10, fontWeight: '800' },
    commentUsername: { color: '#fff', fontSize: 12, fontWeight: '600' },
    replyText: { color: '#E5B505', fontSize: 10, fontWeight: '700', marginLeft: 4 },
    commentTime: { color: '#555', fontSize: 10, flex: 1, textAlign: 'right' },
    commentContent: { color: '#aaa', fontSize: 12, lineHeight: 18 },
    listCard: {
        backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    userBadge: {
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, marginBottom: 10,
    },
    userBadgeText: { fontSize: 12, fontWeight: '700' },
    listName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    listDesc: { color: '#888', fontSize: 13, fontStyle: 'italic', marginBottom: 4 },
    listCount: { color: '#666', fontSize: 12 },
    listPoster: { width: 50, height: 75, borderRadius: 6, backgroundColor: '#1a1a1a' },
    listActions: { flexDirection: 'row', marginTop: 12, gap: 10 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyText: { color: '#888', fontSize: 16, fontWeight: '600', marginTop: 12 },
    emptySubText: { color: '#555', fontSize: 13, marginTop: 6 },
});
