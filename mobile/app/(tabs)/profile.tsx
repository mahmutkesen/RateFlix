import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, FlatList, Alert, RefreshControl, Dimensions, Modal, TextInput, Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getImageUrl } from '../../services/tmdb';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ListItem {
    _id: string;
    name: string;
    type: string;
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
}

export default function ProfileScreen() {
    const { user, token, logout } = useAuth();
    const [lists, setLists] = useState<ListItem[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ watched: 0, watchlist: 0, favorites: 0, reviews: 0, followers: 0, following: 0 });
    const [fullUser, setFullUser] = useState<any>(null);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDesc, setNewListDesc] = useState('');
    const [newListPublic, setNewListPublic] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

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
        } catch (e) {
            console.error('Error fetching profile:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
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
                name: newListName,
                description: newListDesc,
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
            { text: 'Sil', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/lists/${listId}`);
                    fetchData();
                } catch { Alert.alert('Hata', 'Liste silinemedi.'); }
            }},
        ]);
    };

    const handleDeleteReview = (reviewId: string) => {
        Alert.alert('İncelemeyi Sil', 'Bu incelemeyi silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/reviews/${reviewId}`);
                    fetchData();
                } catch { Alert.alert('Hata', 'İnceleme silinemedi.'); }
            }},
        ]);
    };
    const handleRemoveFromList = (listId: string, tmdbId: string) => {
        Alert.alert('Listeden Kaldır', `Bu içerik listeden çıkarılsın mı?`, [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Kaldır', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/lists/${listId}/items/${tmdbId}`);
                    fetchData();
                } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
            }},
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
                        <View style={styles.removeHint}><Ionicons name="trash" size={10} color="rgba(255,255,255,0.5)" /></View>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            />
        );
    };

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}>
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
                    <Ionicons name="folder-open" size={18} color="#a29bfe" />
                    <Text style={styles.sectionTitle}>Özel Listelerim</Text>
                    <TouchableOpacity onPress={() => setShowCreateModal(true)}><Ionicons name="add-circle" size={24} color="#E5B505" /></TouchableOpacity>
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

            {reviews.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}><Ionicons name="chatbubble" size={18} color="#60a5fa" /><Text style={styles.sectionTitle}>Son İncelemelerim</Text></View>
                    {reviews.slice(0, 10).map(review => (
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
                                <TouchableOpacity onPress={() => router.push(`/content/${review.tmdbId}?type=${review.mediaType}`)} style={styles.reviewActionBtn}>
                                    <Ionicons name="create-outline" size={20} color="#E5B505" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteReview(review._id)} style={styles.reviewActionBtn}>
                                    <Ionicons name="trash-outline" size={20} color="#ff7675" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <TouchableOpacity style={styles.logoutBtn} onPress={performLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ff7675" />
                <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />

            <UserListModal visible={showFollowersModal} onClose={() => setShowFollowersModal(false)} title="Takipçiler" users={fullUser?.followers || []} />
            <UserListModal visible={showFollowingModal} onClose={() => setShowFollowingModal(false)} title="Takip Edilenler" users={fullUser?.following || []} />

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
        </ScrollView>
    );
}

const UserListModal = ({ visible, onClose, title, users }: any) => (
    <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{title}</Text>
                <FlatList
                    data={users}
                    keyExtractor={(item: any) => item._id}
                    renderItem={({ item }: any) => (
                        <TouchableOpacity style={styles.userListItem} onPress={() => { onClose(); router.push(`/user/${item._id}`); }}>
                            <View style={styles.miniAvatarPlaceholder}><Text style={styles.miniAvatarLetter}>{item.username?.charAt(0).toUpperCase() || '?'}</Text></View>
                            <Text style={styles.userListUsername}>{item.username}</Text>
                        </TouchableOpacity>
                    )}
                />
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
    profileHeader: { alignItems: 'center', paddingTop: 64, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    avatarContainer: { marginBottom: 14 },
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
    statsRow: { flexDirection: 'row', marginTop: 24, paddingHorizontal: 20 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { color: '#E5B505', fontSize: 20, fontWeight: '800' },
    statLabel: { color: '#888', fontSize: 11, marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
    section: { paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
    emptyListText: { color: '#555', fontSize: 13, fontStyle: 'italic' },
    listPoster: { width: 65, height: 97, borderRadius: 8, backgroundColor: '#1a1a1a' },
    removeHint: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: 2 },
    reviewCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 10 },
    reviewActionCol: { justifyContent: 'center', gap: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.06)' },
    reviewActionBtn: { padding: 4 },
    reviewPoster: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#1a1a1a', marginRight: 12 },
    reviewInfo: { flex: 1, justifyContent: 'center' },
    reviewTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    reviewStars: { flexDirection: 'row', gap: 2, marginBottom: 4 },
    reviewText: { color: '#888', fontSize: 12, lineHeight: 16 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255, 118, 117, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 118, 117, 0.2)' },
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
    createModalTitle: { color: '#E5B505', fontSize: 22, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
    modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, color: '#fff', padding: 14, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
    switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 },
    switchTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
    modalCancelText: { color: '#888', fontSize: 16, fontWeight: '600', padding: 10 },
    modalSubmitBtn: { backgroundColor: '#E5B505', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
    modalSubmitText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
