import React, { useEffect, useState } from 'react';
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
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);

    useEffect(() => { fetchProfile(); }, [id]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/auth/profile/${id}`);
            setProfile(res.data.user);
            setLists(res.data.lists || []);
            setReviews(res.data.reviews || []);
            if (me && res.data.user?.followers) {
                const followerIds = res.data.user.followers.map((f: any) => f._id || f);
                setIsFollowing(followerIds.includes(me.id));
            }
        } catch (e) {
            console.error('Profile fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!token) {
            Alert.alert('Giriş Gerekli', 'Takip etmek için giriş yapın.', [
                { text: 'İptal' }, { text: 'Giriş Yap', onPress: () => router.push('/login') },
            ]);
            return;
        }
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await api.post(`/auth/unfollow/${profile._id}`);
                setIsFollowing(false);
                setProfile((prev: any) => ({
                    ...prev,
                    followers: prev.followers.filter((f: any) => (f._id || f) !== me!.id),
                }));
            } else {
                await api.post(`/auth/follow/${profile._id}`);
                setIsFollowing(true);
                setProfile((prev: any) => ({
                    ...prev,
                    followers: [...(prev.followers || []), { _id: me!.id, username: me!.username }],
                }));
            }
        } catch (err: any) {
            Alert.alert('Hata', err.response?.data?.message || 'İşlem başarısız.');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#E5B505" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#888' }}>Kullanıcı bulunamadı</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#E5B505' }}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isMyProfile = me?.id === (profile._id || profile.id);

    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Back Button */}
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
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

                    {/* Follow Button */}
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

                {/* Public Lists */}
                {lists.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="list" size={16} color="#E5B505" /> Listeler
                        </Text>
                        {lists.map(list => (
                            <View key={list._id} style={styles.listCard}>
                                <Text style={styles.listName}>{list.name}</Text>
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
                        ))}
                    </View>
                )}

                {/* Reviews */}
                {reviews.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="chatbubble" size={16} color="#60a5fa" /> İncelemeler
                        </Text>
                        {reviews.slice(0, 10).map(review => (
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
                                        <Text style={styles.reviewText} numberOfLines={2}>{review.reviewText}</Text>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Follow List Modal */}
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
    <View>
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
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.userListItem} 
                                    onPress={() => {
                                        onClose();
                                        router.push(`/user/${item._id}`);
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
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    backBtn: { position: 'absolute', top: 50, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    profileHeader: { alignItems: 'center', paddingTop: 80, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#000', fontSize: 32, fontWeight: '800' },
    username: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 12 },
    statsRow: { flexDirection: 'row', marginTop: 20, paddingHorizontal: 30 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { color: '#E5B505', fontSize: 20, fontWeight: '800' },
    statLabel: { color: '#888', fontSize: 11, marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
    followBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#E5B505', borderRadius: 25, paddingVertical: 10, paddingHorizontal: 24 },
    followBtnActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E5B505' },
    followBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
    followBtnTextActive: { color: '#E5B505' },
    section: { paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14 },
    listCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10 },
    listName: { color: '#fff', fontSize: 15, fontWeight: '600' },
    listCount: { color: '#666', fontSize: 12, marginTop: 2 },
    listPoster: { width: 50, height: 75, borderRadius: 6, backgroundColor: '#1a1a1a' },
    reviewCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 10 },
    reviewPoster: { width: 50, height: 75, borderRadius: 8, backgroundColor: '#1a1a1a', marginRight: 12 },
    reviewInfo: { flex: 1, justifyContent: 'center' },
    reviewTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    starsRow: { flexDirection: 'row', gap: 1, marginBottom: 4 },
    reviewText: { color: '#888', fontSize: 12, lineHeight: 16 },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#444',
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: '#E5B505',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
    },
    userListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    miniAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    miniAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5B505',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    miniAvatarLetter: {
        color: '#000',
        fontSize: 18,
        fontWeight: '800',
    },
    userListUsername: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyListText: {
        color: '#555',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
