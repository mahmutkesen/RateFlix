import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    ActivityIndicator, FlatList, Alert, RefreshControl, Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../../services/api';
import { getImageUrl } from '../../services/tmdb';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user: me, token } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [lists, setLists] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reactionsData, setReactionsData] = useState<any>({
        likedReviews: [], dislikedReviews: [],
        likedLists: [], dislikedLists: [],
        likedComments: [], dislikedComments: []
    });
    const [activeTab, setActiveTab] = useState<'lists' | 'reviews' | 'reactions'>('lists');
    const [reactionPolarity, setReactionPolarity] = useState<'all' | 'likes' | 'dislikes'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/auth/profile/${id}`);
            setProfile(res.data.user);
            setLists(res.data.lists || []);
            setReviews(res.data.reviews || []);

            if (me && res.data.user?.followers) {
                const myId = me.id || (me as any)._id;
                const followerIds = res.data.user.followers.map((f: any) => (typeof f === 'string' ? f : (f._id || f.id)));
                setIsFollowing(followerIds.includes(myId));
            }

            // Fetch user reactions
            const reactionsRes = await api.get(`/users/${id}/reactions`).catch(() => ({ data: null }));
            if (reactionsRes.data) {
                setReactionsData(reactionsRes.data);
            }
        } catch (e) {
            console.error('Profile fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchProfile();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfile();
    };

    const handleFollow = async () => {
        if (!token) {
            Alert.alert('Giriş Gerekli', 'Kullanıcıyı takip etmek için lütfen giriş yapın.', [
                { text: 'İptal' },
                { text: 'Giriş Yap', onPress: () => router.push('/login') },
            ]);
            return;
        }

        setFollowLoading(true);
        const myId = me!.id || (me as any)._id;

        try {
            if (isFollowing) {
                await api.post(`/auth/unfollow/${profile._id || profile.id}`);
                setIsFollowing(false);
                setProfile((prev: any) => ({
                    ...prev,
                    followers: (prev.followers || []).filter((f: any) => {
                        const fid = typeof f === 'string' ? f : (f._id || f.id);
                        return fid !== myId;
                    }),
                }));
            } else {
                await api.post(`/auth/follow/${profile._id || profile.id}`);
                setIsFollowing(true);
                setProfile((prev: any) => ({
                    ...prev,
                    followers: [...(prev.followers || []), { _id: myId, username: me!.username }],
                }));
            }
        } catch (err: any) {
            Alert.alert('Hata', err.response?.data?.message || 'İşlem gerçekleştirilemedi.');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#E5B505" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
                <Text style={{ color: '#888', marginTop: 12 }}>Kullanıcı bulunamadı</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#E5B505', fontWeight: '700' }}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isMyProfile = me && (me.id === (profile._id || profile.id) || (me as any)._id === (profile._id || profile.id));

    return (
        <View style={styles.container}>
            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={26} color="#fff" />
                </TouchableOpacity>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    {profile.profilePic ? (
                        <Image source={{ uri: profile.profilePic }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarLetter}>{profile.username?.charAt(0).toUpperCase() || '?'}</Text>
                        </View>
                    )}
                    <Text style={styles.username}>{profile.username}</Text>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <TouchableOpacity style={styles.statItem} onPress={() => setShowFollowersModal(true)}>
                            <Text style={styles.statNumber}>{profile.followers?.length || 0}</Text>
                            <Text style={styles.statLabel}>Takipçi</Text>
                        </TouchableOpacity>
                        <View style={styles.statDivider} />
                        <TouchableOpacity style={styles.statItem} onPress={() => setShowFollowingModal(true)}>
                            <Text style={styles.statNumber}>{profile.following?.length || 0}</Text>
                            <Text style={styles.statLabel}>Takip</Text>
                        </TouchableOpacity>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{reviews.length}</Text>
                            <Text style={styles.statLabel}>İnceleme</Text>
                        </View>
                    </View>

                    {/* Follow / Unfollow Button */}
                    {!isMyProfile && (
                        <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                            onPress={handleFollow}
                            disabled={followLoading}
                            activeOpacity={0.7}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={isFollowing ? '#E5B505' : '#000'} />
                            ) : (
                                <>
                                    <Ionicons
                                        name={isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                                        size={16}
                                        color={isFollowing ? '#E5B505' : '#000'}
                                    />
                                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                        {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Navigation Tabs */}
                <View style={styles.navTabsRow}>
                    <TouchableOpacity
                        style={[styles.navTab, activeTab === 'lists' && styles.navTabActive]}
                        onPress={() => setActiveTab('lists')}
                    >
                        <Ionicons name="list" size={15} color={activeTab === 'lists' ? '#000' : '#888'} />
                        <Text style={[styles.navTabText, activeTab === 'lists' && styles.navTabTextActive]}>Listeler ({lists.length})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navTab, activeTab === 'reviews' && styles.navTabActive]}
                        onPress={() => setActiveTab('reviews')}
                    >
                        <Ionicons name="chatbubbles" size={15} color={activeTab === 'reviews' ? '#000' : '#888'} />
                        <Text style={[styles.navTabText, activeTab === 'reviews' && styles.navTabTextActive]}>İncelemeler ({reviews.length})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navTab, activeTab === 'reactions' && styles.navTabActive]}
                        onPress={() => setActiveTab('reactions')}
                    >
                        <Ionicons name="heart" size={15} color={activeTab === 'reactions' ? '#000' : '#888'} />
                        <Text style={[styles.navTabText, activeTab === 'reactions' && styles.navTabTextActive]}>Tepkiler</Text>
                    </TouchableOpacity>
                </View>

                {/* Section 1: Lists */}
                {activeTab === 'lists' && (
                    <View style={styles.section}>
                        {lists.length === 0 ? (
                            <Text style={styles.emptyText}>Henüz herkese açık bir liste oluşturulmamış.</Text>
                        ) : (
                            lists.map(list => (
                                <View key={list._id} style={styles.listCard}>
                                    <Text style={styles.listName}>{list.name}</Text>
                                    {list.description ? <Text style={styles.listDesc}>{list.description}</Text> : null}
                                    <Text style={styles.listCount}>{list.items?.length || 0} içerik</Text>
                                    {list.items && list.items.length > 0 && (
                                        <FlatList
                                            data={list.items.slice(0, 8)}
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            keyExtractor={(item, i) => `${item.tmdbId}-${i}`}
                                            style={{ marginTop: 10 }}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    onPress={() => router.push(`/content/${item.tmdbId}?type=${item.mediaType || 'movie'}`)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image
                                                        source={{ uri: getImageUrl(item.posterPath, 'w92') }}
                                                        style={styles.listPoster}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                            ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
                                        />
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Section 2: Reviews */}
                {activeTab === 'reviews' && (
                    <View style={styles.section}>
                        {reviews.length === 0 ? (
                            <Text style={styles.emptyText}>Henüz bir inceleme yazılmamış.</Text>
                        ) : (
                            reviews.map(review => (
                                <TouchableOpacity
                                    key={review._id}
                                    style={styles.reviewCard}
                                    onPress={() => router.push(`/content/${review.tmdbId}?type=${review.mediaType}`)}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={{ uri: getImageUrl(review.posterPath, 'w92') }}
                                        style={styles.reviewPoster}
                                    />
                                    <View style={styles.reviewInfo}>
                                        <Text style={styles.reviewTitle} numberOfLines={1}>{review.movieTitle}</Text>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Ionicons key={s} name={s <= review.rating ? 'star' : 'star-outline'} size={13} color="#E5B505" />
                                            ))}
                                        </View>
                                        {review.reviewText ? (
                                            <Text style={styles.reviewText} numberOfLines={2}>"{review.reviewText}"</Text>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {/* Section 3: Reactions */}
                {activeTab === 'reactions' && (
                    <View style={styles.section}>
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

                        <View style={{ gap: 8, marginTop: 10 }}>
                            {(reactionPolarity === 'all' || reactionPolarity === 'likes') &&
                                (reactionsData.likedReviews || []).map((r: any) => (
                                    <TouchableOpacity
                                        key={`like-${r._id}`}
                                        style={styles.reactionCard}
                                        onPress={() => router.push(`/content/${r.tmdbId}?type=${r.mediaType || 'movie'}`)}
                                    >
                                        <Text style={{ color: '#2ecc71', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>👍 Beğenilen İnceleme</Text>
                                        <Text style={styles.reactionTitle}>{r.movieTitle}</Text>
                                        {r.reviewText ? <Text style={styles.reactionSub} numberOfLines={2}>"{r.reviewText}"</Text> : null}
                                    </TouchableOpacity>
                                ))
                            }

                            {(reactionPolarity === 'all' || reactionPolarity === 'dislikes') &&
                                (reactionsData.dislikedReviews || []).map((r: any) => (
                                    <TouchableOpacity
                                        key={`dislike-${r._id}`}
                                        style={styles.reactionCard}
                                        onPress={() => router.push(`/content/${r.tmdbId}?type=${r.mediaType || 'movie'}`)}
                                    >
                                        <Text style={{ color: '#e74c3c', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>👎 Dislike Edilen İnceleme</Text>
                                        <Text style={styles.reactionTitle}>{r.movieTitle}</Text>
                                        {r.reviewText ? <Text style={styles.reactionSub} numberOfLines={2}>"{r.reviewText}"</Text> : null}
                                    </TouchableOpacity>
                                ))
                            }
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Follow List Modals */}
            <UserListModal
                visible={showFollowersModal}
                onClose={() => setShowFollowersModal(false)}
                title="Takipçiler"
                users={profile?.followers || []}
            />
            <UserListModal
                visible={showFollowingModal}
                onClose={() => setShowFollowingModal(false)}
                title="Takip Edilenler"
                users={profile?.following || []}
            />
        </View>
    );
}

const UserListModal = ({ visible, onClose, title, users }: { visible: boolean; onClose: () => void; title: string; users: any[] }) => (
    <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{title}</Text>
                {users.length === 0 ? (
                    <Text style={styles.emptyText}>Henüz kimse yok.</Text>
                ) : (
                    <FlatList
                        data={users}
                        keyExtractor={(item, i) => item._id || item.id || `${i}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.userListItem}
                                onPress={() => {
                                    onClose();
                                    router.push(`/user/${item._id || item.id}`);
                                }}
                            >
                                {item.profilePic ? (
                                    <Image source={{ uri: item.profilePic }} style={styles.miniAvatar} />
                                ) : (
                                    <View style={styles.miniAvatarPlaceholder}>
                                        <Text style={styles.miniAvatarLetter}>{item.username?.charAt(0).toUpperCase() || '?'}</Text>
                                    </View>
                                )}
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
    backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    profileHeader: { alignItems: 'center', paddingTop: 80, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#000', fontSize: 32, fontWeight: '800' },
    username: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 12 },
    statsRow: { flexDirection: 'row', marginTop: 18, paddingHorizontal: 30 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { color: '#E5B505', fontSize: 18, fontWeight: '800' },
    statLabel: { color: '#888', fontSize: 11, marginTop: 4 },
    statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
    followBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, backgroundColor: '#E5B505', borderRadius: 25, paddingVertical: 10, paddingHorizontal: 24 },
    followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E5B505' },
    followBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
    followBtnTextActive: { color: '#E5B505' },

    navTabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    navTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
    },
    navTabActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    navTabText: { color: '#888', fontSize: 12, fontWeight: '600' },
    navTabTextActive: { color: '#000', fontWeight: '700' },

    section: { paddingHorizontal: 16, paddingVertical: 14 },
    listCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10 },
    listName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    listDesc: { color: '#888', fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    listCount: { color: '#666', fontSize: 12, marginTop: 4 },
    listPoster: { width: 50, height: 75, borderRadius: 6, backgroundColor: '#1a1a1a' },

    reviewCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 10 },
    reviewPoster: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#1a1a1a', marginRight: 12 },
    reviewInfo: { flex: 1, justifyContent: 'center' },
    reviewTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    starsRow: { flexDirection: 'row', gap: 1, marginBottom: 4 },
    reviewText: { color: '#888', fontSize: 12, lineHeight: 16 },

    filterPillsRow: { flexDirection: 'row', gap: 8 },
    filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    filterPillActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    filterPillText: { color: '#888', fontSize: 12, fontWeight: '600' },
    filterPillTextActive: { color: '#000', fontWeight: '700' },

    reactionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    reactionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
    reactionSub: { color: '#aaa', fontSize: 12, fontStyle: 'italic' },
    emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { color: '#E5B505', fontSize: 18, fontWeight: '700', marginBottom: 20 },
    userListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    miniAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    miniAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    miniAvatarLetter: { color: '#000', fontSize: 18, fontWeight: '800' },
    userListUsername: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
