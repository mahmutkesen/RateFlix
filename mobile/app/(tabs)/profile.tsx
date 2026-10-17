import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, FlatList, Alert, RefreshControl, Dimensions, Modal, TextInput, Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getImageUrl } from '../../services/tmdb';
import { Ionicons } from '@expo/vector-icons';

interface ListItem {
    _id: string;
    name: string;
    type: string;
    description?: string;
    items: any[];
    isPublic?: boolean;
}

interface Review {
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
}

export default function ProfileScreen() {
    const { user, token, logout } = useAuth();
    const [activeSection, setActiveSection] = useState<'lists' | 'reviews' | 'reactions'>('lists');
    const [lists, setLists] = useState<ListItem[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ watched: 0, watchlist: 0, favorites: 0, reviews: 0, followers: 0, following: 0 });
    const [fullUser, setFullUser] = useState<any>(null);

    // Modals
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDesc, setNewListDesc] = useState('');
    const [newListPublic, setNewListPublic] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    // Edit Review Modal
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [editRating, setEditRating] = useState(5);
    const [editText, setEditText] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Reactions (Liked / Disliked items)
    const [reactionsData, setReactionsData] = useState<{
        likedReviews: any[];
        dislikedReviews: any[];
        likedLists: any[];
        dislikedLists: any[];
        likedComments: any[];
        dislikedComments: any[];
    }>({
        likedReviews: [],
        dislikedReviews: [],
        likedLists: [],
        dislikedLists: [],
        likedComments: [],
        dislikedComments: []
    });
    const [loadingReactions, setLoadingReactions] = useState(false);
    const [reactionPolarity, setReactionPolarity] = useState<'all' | 'likes' | 'dislikes'>('all');
    const [reactionType, setReactionType] = useState<'all' | 'reviews' | 'lists' | 'comments'>('all');

    const fetchData = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const [listsRes, reviewsRes, meRes] = await Promise.all([
                api.get('/lists').catch(() => ({ data: [] })),
                api.get('/reviews/user').catch(() => ({ data: [] })),
                api.get('/auth/me').catch(() => ({ data: null })),
            ]);
            setLists(listsRes.data || []);
            setReviews(reviewsRes.data || []);
            setFullUser(meRes.data);

            const listsData = listsRes.data || [];
            const watched = listsData.find((l: ListItem) => l.type === 'watched');
            const watchlist = listsData.find((l: ListItem) => l.type === 'watchlist');
            const favorites = listsData.find((l: ListItem) => l.type === 'favorites');
            setStats({
                watched: watched?.items?.length || 0,
                watchlist: watchlist?.items?.length || 0,
                favorites: favorites?.items?.length || 0,
                reviews: (reviewsRes.data || []).length,
                followers: meRes.data?.followers?.length || 0,
                following: meRes.data?.following?.length || 0,
            });

            // Fetch user reactions
            const myId = user?.id || meRes.data?._id;
            if (myId) {
                fetchReactions(myId);
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchReactions = async (userId: string) => {
        setLoadingReactions(true);
        try {
            const res = await api.get(`/users/${userId}/reactions`);
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

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [token])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const performLogout = () => {
        Alert.alert('Çıkış', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
        ]);
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) return;
        setCreateLoading(true);
        try {
            await api.post('/lists', {
                name: newListName.trim(),
                description: newListDesc.trim(),
                isPublic: newListPublic
            });
            setShowCreateModal(false);
            setNewListName('');
            setNewListDesc('');
            fetchData();
        } catch (e: any) {
            Alert.alert('Hata', e.response?.data?.message || 'Liste oluşturulamadı.');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleTogglePublic = async (listId: string, currentStatus: boolean) => {
        try {
            await api.put(`/lists/${listId}`, { isPublic: !currentStatus });
            fetchData();
        } catch {
            Alert.alert('Hata', 'Gizlilik ayarı değiştirilemedi.');
        }
    };

    const handleDeleteList = (listId: string, listName: string) => {
        Alert.alert('Listeyi Sil', `"${listName}" listesini silmek istediğinize emin misiniz?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/lists/${listId}`);
                        fetchData();
                    } catch { Alert.alert('Hata', 'Liste silinemedi.'); }
                }
            },
        ]);
    };

    const handleOpenEditReview = (review: Review) => {
        setEditingReview(review);
        setEditRating(review.rating);
        setEditText(review.reviewText || '');
    };

    const handleSaveEditReview = async () => {
        if (!editingReview) return;
        setEditLoading(true);
        try {
            await api.post('/reviews', {
                tmdbId: editingReview.tmdbId,
                mediaType: editingReview.mediaType,
                rating: editRating,
                reviewText: editText.trim(),
                movieTitle: editingReview.movieTitle,
                posterPath: editingReview.posterPath
            });
            setEditingReview(null);
            fetchData();
            Alert.alert('Başarılı', 'İnceleme güncellendi.');
        } catch {
            Alert.alert('Hata', 'İnceleme güncellenemedi.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        Alert.alert('İncelemeyi Sil', 'Bu incelemeyi silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/reviews/${reviewId}`);
                        fetchData();
                    } catch { Alert.alert('Hata', 'İnceleme silinemedi.'); }
                }
            },
        ]);
    };

    const handleRemoveFromList = (listId: string, tmdbId: string) => {
        Alert.alert('Listeden Kaldır', `Bu içerik listeden çıkarılsın mı?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Kaldır', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/lists/${listId}/items/${tmdbId}`);
                        fetchData();
                    } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
                }
            },
        ]);
    };

    if (!token || !user) {
        return (
            <View style={styles.container}>
                <View style={styles.notLoggedIn}>
                    <View style={styles.avatarLarge}>
                        <Ionicons name="person" size={48} color="#555" />
                    </View>
                    <Text style={styles.notLoggedTitle}>RateFlix'e Hoş Geldiniz</Text>
                    <Text style={styles.notLoggedSubtitle}>İzlediklerinizi kaydedin, puan verin ve toplulukla etkileşime girin</Text>
                    <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
                        <Text style={styles.loginBtnText}>Giriş Yap</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/register')}>
                        <Text style={styles.registerBtnText}>Kayıt Ol</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#E5B505" />
            </View>
        );
    }

    const renderListPosters = (list: ListItem | undefined) => {
        if (!list || !list.items || list.items.length === 0) {
            return <Text style={styles.emptyListText}>Henüz içerik eklenmemiş</Text>;
        }
        return (
            <FlatList
                data={list.items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => `${item.tmdbId}-${index}`}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => router.push(`/content/${item.tmdbId}?type=${item.mediaType || 'movie'}`)}
                        onLongPress={() => handleRemoveFromList(list._id, item.tmdbId)}
                        activeOpacity={0.7}
                    >
                        <Image source={{ uri: getImageUrl(item.posterPath, 'w185') }} style={styles.listPoster} />
                        <View style={styles.removeHint}><Ionicons name="trash" size={10} color="rgba(255,255,255,0.6)" /></View>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            />
        );
    };

    // Render Reactions Tab
    const renderReactionsView = () => {
        const {
            likedReviews, dislikedReviews,
            likedLists, dislikedLists,
            likedComments, dislikedComments
        } = reactionsData;

        const showLikes = reactionPolarity === 'all' || reactionPolarity === 'likes';
        const showDislikes = reactionPolarity === 'all' || reactionPolarity === 'dislikes';

        const showReviews = reactionType === 'all' || reactionType === 'reviews';
        const showLists = reactionType === 'all' || reactionType === 'lists';
        const showComments = reactionType === 'all' || reactionType === 'comments';

        return (
            <View style={{ paddingHorizontal: 16 }}>
                {/* Polarity Pills */}
                <View style={styles.filterPillsRow}>
                    <TouchableOpacity
                        style={[styles.filterPill, reactionPolarity === 'all' && styles.filterPillActive]}
                        onPress={() => setReactionPolarity('all')}
                    >
                        <Text style={[styles.filterPillText, reactionPolarity === 'all' && styles.filterPillTextActive]}>Tümü</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, reactionPolarity === 'likes' && styles.filterPillActive]}
                        onPress={() => setReactionPolarity('likes')}
                    >
                        <Text style={[styles.filterPillText, reactionPolarity === 'likes' && styles.filterPillTextActive]}>👍 Beğeniler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterPill, reactionPolarity === 'dislikes' && styles.filterPillActive]}
                        onPress={() => setReactionPolarity('dislikes')}
                    >
                        <Text style={[styles.filterPillText, reactionPolarity === 'dislikes' && styles.filterPillTextActive]}>👎 Dislike'lar</Text>
                    </TouchableOpacity>
                </View>

                {/* Type Filter Pills */}
                <View style={[styles.filterPillsRow, { marginBottom: 14 }]}>
                    <TouchableOpacity
                        style={[styles.miniTypePill, reactionType === 'all' && styles.miniTypePillActive]}
                        onPress={() => setReactionType('all')}
                    >
                        <Text style={[styles.miniTypePillText, reactionType === 'all' && styles.miniTypePillTextActive]}>Tümü</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.miniTypePill, reactionType === 'reviews' && styles.miniTypePillActive]}
                        onPress={() => setReactionType('reviews')}
                    >
                        <Text style={[styles.miniTypePillText, reactionType === 'reviews' && styles.miniTypePillTextActive]}>İncelemeler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.miniTypePill, reactionType === 'lists' && styles.miniTypePillActive]}
                        onPress={() => setReactionType('lists')}
                    >
                        <Text style={[styles.miniTypePillText, reactionType === 'lists' && styles.miniTypePillTextActive]}>Listeler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.miniTypePill, reactionType === 'comments' && styles.miniTypePillActive]}
                        onPress={() => setReactionType('comments')}
                    >
                        <Text style={[styles.miniTypePillText, reactionType === 'comments' && styles.miniTypePillTextActive]}>Yorumlar</Text>
                    </TouchableOpacity>
                </View>

                {loadingReactions ? (
                    <ActivityIndicator size="small" color="#E5B505" style={{ marginVertical: 20 }} />
                ) : (
                    <View style={{ gap: 10 }}>
                        {/* Liked Reviews */}
                        {showLikes && showReviews && likedReviews.map(r => (
                            <TouchableOpacity
                                key={`like-rev-${r._id}`}
                                style={styles.reactionCard}
                                onPress={() => router.push(`/content/${r.tmdbId}?type=${r.mediaType || 'movie'}`)}
                            >
                                <View style={styles.reactionBadgeLiked}>
                                    <Ionicons name="thumbs-up" size={12} color="#2ecc71" />
                                    <Text style={styles.reactionBadgeTextLiked}>Beğenilen İnceleme</Text>
                                </View>
                                <Text style={styles.reactionTitle}>{r.movieTitle}</Text>
                                {r.reviewText ? <Text style={styles.reactionSub} numberOfLines={2}>"{r.reviewText}"</Text> : null}
                            </TouchableOpacity>
                        ))}

                        {/* Disliked Reviews */}
                        {showDislikes && showReviews && dislikedReviews.map(r => (
                            <TouchableOpacity
                                key={`dislike-rev-${r._id}`}
                                style={styles.reactionCard}
                                onPress={() => router.push(`/content/${r.tmdbId}?type=${r.mediaType || 'movie'}`)}
                            >
                                <View style={styles.reactionBadgeDisliked}>
                                    <Ionicons name="thumbs-down" size={12} color="#e74c3c" />
                                    <Text style={styles.reactionBadgeTextDisliked}>Dislike Edilen İnceleme</Text>
                                </View>
                                <Text style={styles.reactionTitle}>{r.movieTitle}</Text>
                                {r.reviewText ? <Text style={styles.reactionSub} numberOfLines={2}>"{r.reviewText}"</Text> : null}
                            </TouchableOpacity>
                        ))}

                        {/* Liked Lists */}
                        {showLikes && showLists && likedLists.map(l => (
                            <View key={`like-list-${l._id}`} style={styles.reactionCard}>
                                <View style={styles.reactionBadgeLiked}>
                                    <Ionicons name="thumbs-up" size={12} color="#2ecc71" />
                                    <Text style={styles.reactionBadgeTextLiked}>Beğenilen Liste</Text>
                                </View>
                                <Text style={styles.reactionTitle}>{l.name}</Text>
                                {l.description ? <Text style={styles.reactionSub}>{l.description}</Text> : null}
                            </View>
                        ))}

                        {/* Disliked Lists */}
                        {showDislikes && showLists && dislikedLists.map(l => (
                            <View key={`dislike-list-${l._id}`} style={styles.reactionCard}>
                                <View style={styles.reactionBadgeDisliked}>
                                    <Ionicons name="thumbs-down" size={12} color="#e74c3c" />
                                    <Text style={styles.reactionBadgeTextDisliked}>Dislike Edilen Liste</Text>
                                </View>
                                <Text style={styles.reactionTitle}>{l.name}</Text>
                                {l.description ? <Text style={styles.reactionSub}>{l.description}</Text> : null}
                            </View>
                        ))}

                        {/* Liked Comments */}
                        {showLikes && showComments && likedComments.map(c => (
                            <View key={`like-c-${c._id}`} style={styles.reactionCard}>
                                <View style={styles.reactionBadgeLiked}>
                                    <Ionicons name="thumbs-up" size={12} color="#2ecc71" />
                                    <Text style={styles.reactionBadgeTextLiked}>Beğenilen Yorum</Text>
                                </View>
                                <Text style={styles.reactionSub}>{c.content}</Text>
                            </View>
                        ))}

                        {/* Disliked Comments */}
                        {showDislikes && showComments && dislikedComments.map(c => (
                            <View key={`dislike-c-${c._id}`} style={styles.reactionCard}>
                                <View style={styles.reactionBadgeDisliked}>
                                    <Ionicons name="thumbs-down" size={12} color="#e74c3c" />
                                    <Text style={styles.reactionBadgeTextDisliked}>Dislike Edilen Yorum</Text>
                                </View>
                                <Text style={styles.reactionSub}>{c.content}</Text>
                            </View>
                        ))}

                        {likedReviews.length === 0 && dislikedReviews.length === 0 &&
                            likedLists.length === 0 && dislikedLists.length === 0 &&
                            likedComments.length === 0 && dislikedComments.length === 0 && (
                                <Text style={styles.emptyListText}>Henüz bir tepki vermemişsiniz.</Text>
                            )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    {user.profilePic ? (
                        <Image source={{ uri: user.profilePic }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarLetter}>{user.username?.charAt(0).toUpperCase() || '?'}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.email}>{user.email}</Text>

                {user.role === 'admin' && (
                    <TouchableOpacity
                        style={styles.adminEntryBtn}
                        onPress={() => router.push('/admin/dashboard')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="shield-checkmark" size={16} color="#E5B505" />
                        <Text style={styles.adminEntryText}>Yönetici Paneli</Text>
                    </TouchableOpacity>
                )}

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}><Text style={styles.statNumber}>{stats.watched}</Text><Text style={styles.statLabel}>İzlendi</Text></View>
                    <View style={styles.statDivider} />
                    <TouchableOpacity style={styles.statItem} onPress={() => setShowFollowersModal(true)}><Text style={styles.statNumber}>{stats.followers}</Text><Text style={styles.statLabel}>Takipçi</Text></TouchableOpacity>
                    <View style={styles.statDivider} />
                    <TouchableOpacity style={styles.statItem} onPress={() => setShowFollowingModal(true)}><Text style={styles.statNumber}>{stats.following}</Text><Text style={styles.statLabel}>Takip</Text></TouchableOpacity>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}><Text style={styles.statNumber}>{stats.reviews}</Text><Text style={styles.statLabel}>İnceleme</Text></View>
                </View>
            </View>

            {/* Profile Navigation Tabs */}
            <View style={styles.navTabsRow}>
                <TouchableOpacity
                    style={[styles.navTab, activeSection === 'lists' && styles.navTabActive]}
                    onPress={() => setActiveSection('lists')}
                >
                    <Ionicons name="folder-open" size={15} color={activeSection === 'lists' ? '#000' : '#888'} />
                    <Text style={[styles.navTabText, activeSection === 'lists' && styles.navTabTextActive]}>Listelerim</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.navTab, activeSection === 'reviews' && styles.navTabActive]}
                    onPress={() => setActiveSection('reviews')}
                >
                    <Ionicons name="chatbubbles" size={15} color={activeSection === 'reviews' ? '#000' : '#888'} />
                    <Text style={[styles.navTabText, activeSection === 'reviews' && styles.navTabTextActive]}>İncelemelerim</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.navTab, activeSection === 'reactions' && styles.navTabActive]}
                    onPress={() => setActiveSection('reactions')}
                >
                    <Ionicons name="heart-circle" size={15} color={activeSection === 'reactions' ? '#000' : '#888'} />
                    <Text style={[styles.navTabText, activeSection === 'reactions' && styles.navTabTextActive]}>Tepkilerim</Text>
                </TouchableOpacity>
            </View>

            {/* Section 1: Lists */}
            {activeSection === 'lists' && (
                <View>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Ionicons name="eye" size={18} color="#2ecc71" /><Text style={styles.sectionTitle}>İzlediklerim</Text></View>
                        {renderListPosters(lists.find(l => l.type === 'watched'))}
                    </View>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Ionicons name="time" size={18} color="#E5B505" /><Text style={styles.sectionTitle}>İzleyeceklerim</Text></View>
                        {renderListPosters(lists.find(l => l.type === 'watchlist'))}
                    </View>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}><Ionicons name="heart" size={18} color="#e74c3c" /><Text style={styles.sectionTitle}>Favorilerim</Text></View>
                        {renderListPosters(lists.find(l => l.type === 'favorites'))}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="albums" size={18} color="#a29bfe" />
                            <Text style={styles.sectionTitle}>Özel Listelerim</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(true)}>
                                <Ionicons name="add-circle" size={24} color="#E5B505" />
                            </TouchableOpacity>
                        </View>
                        {lists.filter(l => !['watched', 'watchlist', 'favorites'].includes(l.type)).length === 0 ? (
                            <Text style={styles.emptyListText}>Henüz özel bir liste oluşturmamışsınız.</Text>
                        ) : (
                            lists.filter(l => !['watched', 'watchlist', 'favorites'].includes(l.type)).map(list => (
                                <View key={list._id} style={styles.customListRow}>
                                    <View style={styles.listTitleRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.customListName}>{list.name}</Text>
                                            <TouchableOpacity onPress={() => handleTogglePublic(list._id, !!list.isPublic)} style={[styles.publicBadge, list.isPublic && styles.publicBadgeActive, { alignSelf: 'flex-start', marginTop: 4 }]}>
                                                <Ionicons name={list.isPublic ? 'globe' : 'lock-closed'} size={10} color={list.isPublic ? '#000' : '#888'} />
                                                <Text style={[styles.publicBadgeText, list.isPublic && { color: '#000' }]}>{list.isPublic ? 'Toplulukta Paylaşılıyor' : 'Gizli'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteList(list._id, list.name)} style={{ padding: 8 }}>
                                            <Ionicons name="trash-outline" size={20} color="#ff7675" />
                                        </TouchableOpacity>
                                    </View>
                                    {renderListPosters(list)}
                                </View>
                            ))
                        )}
                    </View>
                </View>
            )}

            {/* Section 2: Reviews */}
            {activeSection === 'reviews' && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}><Ionicons name="chatbubble" size={18} color="#60a5fa" /><Text style={styles.sectionTitle}>Tüm İncelemelerim ({reviews.length})</Text></View>
                    {reviews.length === 0 ? (
                        <Text style={styles.emptyListText}>Henüz bir filme veya diziye inceleme yazmadınız.</Text>
                    ) : (
                        reviews.map(review => (
                            <View key={review._id} style={styles.reviewCard}>
                                <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/content/${review.tmdbId}?type=${review.mediaType}`)}>
                                    <View style={{ flexDirection: 'row' }}>
                                        <Image source={{ uri: getImageUrl(review.posterPath, 'w92') }} style={styles.reviewPoster} />
                                        <View style={styles.reviewInfo}>
                                            <Text style={styles.reviewTitle} numberOfLines={1}>{review.movieTitle}</Text>
                                            <View style={styles.reviewStars}>{[1, 2, 3, 4, 5].map(s => <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={14} color="#E5B505" />)}</View>
                                            <Text style={styles.reviewText} numberOfLines={2}>{review.reviewText}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.reviewActionCol}>
                                    <TouchableOpacity onPress={() => handleOpenEditReview(review)} style={styles.reviewActionBtn}>
                                        <Ionicons name="create-outline" size={18} color="#E5B505" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteReview(review._id)} style={styles.reviewActionBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#ff7675" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Section 3: Reactions */}
            {activeSection === 'reactions' && renderReactionsView()}

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={performLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ff7675" />
                <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />

            {/* Followers / Following Modals */}
            <UserListModal visible={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Takipçiler" users={fullUser?.followers || []} />
            <UserListModal visible={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Takip Edilenler" users={fullUser?.following || []} />

            {/* Create Custom List Modal */}
            <Modal visible={showCreateModal} transparent animationType="fade">
                <View style={styles.fullOverlay}>
                    <View style={styles.createModalContent}>
                        <Text style={styles.createModalTitle}>Yeni Liste Oluştur</Text>
                        <TextInput style={styles.modalInput} placeholder="Liste Adı" placeholderTextColor="#555" value={newListName} onChangeText={setNewListName} />
                        <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Açıklama" placeholderTextColor="#555" multiline value={newListDesc} onChangeText={setNewListDesc} />
                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}><Text style={styles.switchTitle}>Toplulukta Paylaş</Text></View>
                            <Switch value={newListPublic} onValueChange={setNewListPublic} trackColor={{ false: '#333', true: '#E5B505' }} />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}><Text style={styles.modalCancelText}>Vazgeç</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateList} disabled={createLoading || !newListName.trim()}><Text style={styles.modalSubmitText}>Oluştur</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Review Modal */}
            <Modal visible={!!editingReview} transparent animationType="slide">
                <View style={styles.fullOverlay}>
                    <View style={styles.createModalContent}>
                        <Text style={styles.createModalTitle}>İncelemeyi Düzenle</Text>
                        <Text style={{ color: '#E5B505', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>{editingReview?.movieTitle}</Text>

                        {/* Stars */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <TouchableOpacity key={star} onPress={() => setEditRating(star)}>
                                    <Ionicons name={star <= editRating ? 'star' : 'star-outline'} size={32} color="#E5B505" />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
                            placeholder="Yorumunuz..."
                            placeholderTextColor="#555"
                            multiline
                            value={editText}
                            onChangeText={setEditText}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setEditingReview(null)}><Text style={styles.modalCancelText}>Vazgeç</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveEditReview} disabled={editLoading}>
                                {editLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSubmitText}>Güncelle</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const UserListModal = ({ visible, onClose, title, users }: any) => (
    <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{title}</Text>
                {users.length === 0 ? (
                    <Text style={styles.emptyListText}>Henüz kimse yok.</Text>
                ) : (
                    <FlatList
                        data={users}
                        keyExtractor={(item: any, i) => item._id || item.id || `${i}`}
                        renderItem={({ item }: any) => (
                            <TouchableOpacity
                                style={styles.userListItem}
                                onPress={() => { onClose(); router.push(`/user/${item._id || item.id}`); }}
                            >
                                <View style={styles.miniAvatarPlaceholder}>
                                    <Text style={styles.miniAvatarLetter}>{item.username?.charAt(0).toUpperCase() || '?'}</Text>
                                </View>
                                <Text style={styles.userListUsername}>{item.username}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </TouchableOpacity>
    </Modal>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    notLoggedIn: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    avatarLarge: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    notLoggedTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
    notLoggedSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 32 },
    loginBtn: { backgroundColor: '#E5B505', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 12 },
    loginBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
    registerBtn: { borderRadius: 12, borderWidth: 1, borderColor: '#E5B505', paddingVertical: 14, width: '100%', alignItems: 'center' },
    registerBtnText: { color: '#E5B505', fontSize: 16, fontWeight: '700' },
    profileHeader: { alignItems: 'center', paddingTop: 64, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    avatarContainer: { marginBottom: 12 },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#000', fontSize: 32, fontWeight: '800' },
    username: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
    email: { color: '#888', fontSize: 13, marginBottom: 12 },
    adminEntryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(229,181,5,0.1)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(229,181,5,0.2)',
        marginBottom: 16
    },
    adminEntryText: { color: '#E5B505', fontSize: 13, fontWeight: '700' },
    statsRow: { flexDirection: 'row', marginTop: 18, paddingHorizontal: 20 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { color: '#E5B505', fontSize: 18, fontWeight: '800' },
    statLabel: { color: '#888', fontSize: 11, marginTop: 4 },
    statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

    // Nav Tabs
    navTabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    navTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
    },
    navTabActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    navTabText: { color: '#888', fontSize: 12, fontWeight: '600' },
    navTabTextActive: { color: '#000', fontWeight: '700' },

    // Sections
    section: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
    emptyListText: { color: '#555', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
    listPoster: { width: 65, height: 97, borderRadius: 8, backgroundColor: '#1a1a1a' },
    removeHint: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 3 },
    reviewCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 10 },
    reviewActionCol: { justifyContent: 'center', gap: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' },
    reviewActionBtn: { padding: 4 },
    reviewPoster: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#1a1a1a', marginRight: 12 },
    reviewInfo: { flex: 1, justifyContent: 'center' },
    reviewTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    reviewStars: { flexDirection: 'row', gap: 2, marginBottom: 4 },
    reviewText: { color: '#888', fontSize: 12, lineHeight: 16 },

    // Reactions View
    filterPillsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
    filterPill: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
    },
    filterPillActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    filterPillText: { color: '#888', fontSize: 12, fontWeight: '600' },
    filterPillTextActive: { color: '#000', fontWeight: '700' },
    miniTypePill: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    miniTypePillActive: { backgroundColor: 'rgba(229,181,5,0.15)', borderColor: '#E5B505' },
    miniTypePillText: { color: '#777', fontSize: 11 },
    miniTypePillTextActive: { color: '#E5B505', fontWeight: '700' },

    reactionCard: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    reactionBadgeLiked: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    reactionBadgeTextLiked: { color: '#2ecc71', fontSize: 11, fontWeight: '700' },
    reactionBadgeDisliked: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    reactionBadgeTextDisliked: { color: '#e74c3c', fontSize: 11, fontWeight: '700' },
    reactionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
    reactionSub: { color: '#aaa', fontSize: 12, fontStyle: 'italic' },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255, 118, 117, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 118, 117, 0.2)' },
    logoutText: { color: '#ff7675', fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { color: '#E5B505', fontSize: 18, fontWeight: '700', marginBottom: 20 },
    userListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    miniAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    miniAvatarLetter: { color: '#000', fontSize: 18, fontWeight: '800' },
    userListUsername: { color: '#fff', fontSize: 16, fontWeight: '600' },
    customListRow: { marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 10 },
    listTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    customListName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    publicBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    publicBadgeActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    publicBadgeText: { color: '#888', fontSize: 10, fontWeight: '700' },
    fullOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
    createModalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    createModalTitle: { color: '#E5B505', fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, color: '#fff', padding: 14, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
    switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 },
    switchTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
    modalCancelText: { color: '#888', fontSize: 15, fontWeight: '600', padding: 10 },
    modalSubmitBtn: { backgroundColor: '#E5B505', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
    modalSubmitText: { color: '#000', fontSize: 15, fontWeight: '700' },
});
