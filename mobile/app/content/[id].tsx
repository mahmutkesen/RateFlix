import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Dimensions, Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getDetails, getImageUrl } from '../../services/tmdb';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ReviewData {
    _id: string;
    rating: number;
    reviewText: string;
    user: { _id: string; username: string; profilePic?: string };
    likes?: string[];
    createdAt: string;
}

interface ListData {
    _id: string;
    name: string;
    type: string;
}

export default function ContentDetailScreen() {
    const { id, type: rawType } = useLocalSearchParams<{ id: string; type: string }>();
    const type = rawType || 'movie';
    const { user, token } = useAuth();

    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [myRating, setMyRating] = useState(0);
    const [myReviewText, setMyReviewText] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [userLists, setUserLists] = useState<ListData[]>([]);
    const [showListModal, setShowListModal] = useState(false);
    const [addingToList, setAddingToList] = useState(false);

    // Phase 1: Load TMDB details FAST (this is the critical path)
    useEffect(() => {
        setLoading(true);
        getDetails(type, id!)
            .then(res => {
                setDetails(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id, type]);

    // Phase 2: Load reviews and lists in background (non-blocking)
    useEffect(() => {
        setReviewsLoading(true);
        api.get(`/reviews/${id}/${type}`)
            .then(res => {
                const data = res.data || [];
                setReviews(data);
                if (user) {
                    const myReview = data.find((r: ReviewData) => r.user?._id === user.id);
                    if (myReview) {
                        setMyRating(myReview.rating);
                        setMyReviewText(myReview.reviewText || '');
                        setIsEditing(true);
                    }
                }
            })
            .catch(() => {})
            .finally(() => setReviewsLoading(false));

        if (token) {
            api.get('/lists').then(res => setUserLists(res.data || [])).catch(() => {});
        }
    }, [id, type]);

    const handleRatingSubmit = async () => {
        if (myRating === 0) { Alert.alert('Hata', 'Lütfen bir puan seçin.'); return; }
        if (!token) {
            Alert.alert('Giriş Gerekli', 'İnceleme yazmak için giriş yapın.', [
                { text: 'İptal' }, { text: 'Giriş Yap', onPress: () => router.push('/login') },
            ]);
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/reviews', {
                tmdbId: id, mediaType: type, rating: myRating, reviewText: myReviewText,
                movieTitle: details.title || details.name, posterPath: details.poster_path,
            });
            Alert.alert('Başarılı', isEditing ? 'İnceleme güncellendi!' : 'İnceleme gönderildi!');
            const newReview = { ...res.data, user: { _id: user!.id, username: user!.username, profilePic: user!.profilePic } };
            if (isEditing) {
                setReviews(prev => prev.map(r => r.user?._id === user!.id ? newReview : r));
            } else {
                setReviews(prev => [newReview, ...prev]);
                setIsEditing(true);
            }
        } catch (err: any) {
            Alert.alert('Hata', err.response?.data?.message || 'İnceleme gönderilemedi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        Alert.alert('Silme Onayı', 'Bu incelemeyi silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/reviews/${reviewId}`);
                    setReviews(prev => prev.filter(r => r._id !== reviewId));
                    setMyRating(0); setMyReviewText(''); setIsEditing(false);
                } catch { Alert.alert('Hata', 'Silme başarısız.'); }
            }},
        ]);
    };

    const handleAddToList = async (listId: string, listName: string) => {
        setAddingToList(true);
        try {
            await api.post(`/lists/${listId}/items`, { tmdbId: id, mediaType: type, posterPath: details.poster_path });
            Alert.alert('Başarılı', `"${listName}" listesine eklendi!`);
            setShowListModal(false);
        } catch (err: any) {
            Alert.alert('Bilgi', err.response?.data?.message || 'Zaten bu listede.');
        } finally {
            setAddingToList(false);
        }
    };

    const handleLikeReview = async (reviewId: string) => {
        if (!token) return;
        try {
            await api.post(`/reviews/${reviewId}/like`);
            setReviews(prev => prev.map(r => {
                if (r._id === reviewId) {
                    const likes = r.likes || [];
                    const isLiked = likes.includes(user!.id);
                    return { ...r, likes: isLiked ? likes.filter(l => l !== user!.id) : [...likes, user!.id] };
                }
                return r;
            }));
        } catch { }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#E5B505" />
                <Text style={{ color: '#888', marginTop: 12 }}>Yükleniyor...</Text>
            </View>
        );
    }

    if (!details) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#888', fontSize: 16 }}>İçerik bulunamadı</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#E5B505' }}>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const rfAvg = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

    const listNameMap: Record<string, string> = { watched: 'İzlediklerim', watchlist: 'İzleyeceklerim', favorites: 'Favorilerim' };
    const listIconMap: Record<string, string> = { watched: 'checkmark-circle', watchlist: 'time', favorites: 'heart' };
    const listColorMap: Record<string, string> = { watched: '#2ecc71', watchlist: '#E5B505', favorites: '#e74c3c' };

    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Backdrop */}
                <View style={styles.backdropContainer}>
                    <Image source={{ uri: getImageUrl(details.backdrop_path, 'w780') }} style={styles.backdrop} resizeMode="cover" />
                    <View style={styles.backdropOverlay} />
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Content Info */}
                <View style={styles.contentSection}>
                    <View style={styles.posterRow}>
                        <Image source={{ uri: getImageUrl(details.poster_path, 'w342') }} style={styles.poster} />
                        <View style={styles.infoCol}>
                            <Text style={styles.title}>{details.title || details.name}</Text>
                            {details.tagline ? <Text style={styles.tagline}>{details.tagline}</Text> : null}
                            <Text style={styles.meta}>
                                {details.release_date || details.first_air_date}
                                {details.runtime ? ` • ${details.runtime} dk` : ''}
                            </Text>
                            <View style={styles.ratingsRow}>
                                <View style={styles.ratingChip}>
                                    <Text style={styles.ratingChipLabel}>⭐ TMDB</Text>
                                    <Text style={styles.ratingChipValue}>{details.vote_average?.toFixed(1)}</Text>
                                </View>
                                {rfAvg && (
                                    <View style={[styles.ratingChip, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
                                        <Text style={[styles.ratingChipLabel, { color: '#60a5fa' }]}>⭐ RF</Text>
                                        <Text style={[styles.ratingChipValue, { color: '#60a5fa' }]}>{rfAvg}/5</Text>
                                    </View>
                                )}
                            </View>
                            {details.genres && (
                                <View style={styles.genresRow}>
                                    {details.genres.slice(0, 3).map((g: any) => (
                                        <View key={g.id} style={styles.genreChip}><Text style={styles.genreText}>{g.name}</Text></View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                    <Text style={styles.overview}>{details.overview}</Text>

                    {/* Quick Actions */}
                    {token && (
                        <View style={styles.quickActions}>
                            {userLists.filter(l => ['watched', 'watchlist', 'favorites'].includes(l.type)).sort((a, b) => {
                                const order: Record<string, number> = { watched: 1, watchlist: 2, favorites: 3 };
                                return (order[a.type] || 4) - (order[b.type] || 4);
                            }).map(list => (
                                <TouchableOpacity
                                    key={list._id}
                                    style={styles.quickBtn}
                                    onPress={() => handleAddToList(list._id, listNameMap[list.type] || list.name)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={(listIconMap[list.type] || 'list') as any}
                                        size={18}
                                        color={listColorMap[list.type] || '#E5B505'}
                                    />
                                    <Text style={styles.quickBtnText}>{listNameMap[list.type] || list.name}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.quickBtn, { flex: 0.5 }]}
                                onPress={() => setShowListModal(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add-circle" size={20} color="#E5B505" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Rating Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Puan Ver ve İncele</Text>
                    {token ? (
                        <View>
                            <Text style={styles.ratingLabel}>Puanınız ({myRating}/5)</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <TouchableOpacity key={star} onPress={() => setMyRating(star)} activeOpacity={0.7}>
                                        <Ionicons name={star <= myRating ? 'star' : 'star-outline'} size={36} color="#E5B505" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.reviewInput}
                                placeholder="Düşüncelerinizi yazın..."
                                placeholderTextColor="#555"
                                value={myReviewText}
                                onChangeText={setMyReviewText}
                                multiline numberOfLines={4} textAlignVertical="top"
                            />
                            <TouchableOpacity
                                style={[styles.submitBtn, (myRating === 0 || submitting) && { opacity: 0.5 }]}
                                onPress={handleRatingSubmit}
                                disabled={myRating === 0 || submitting}
                                activeOpacity={0.8}
                            >
                                {submitting ? <ActivityIndicator color="#000" /> : (
                                    <Text style={styles.submitBtnText}>{isEditing ? 'İncelemeyi Güncelle' : 'İncelemeyi Gönder'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.loginPrompt}>
                            <Text style={styles.loginPromptText}>Puan vermek için giriş yapın</Text>
                            <TouchableOpacity style={styles.loginPromptBtn} onPress={() => router.push('/login')}>
                                <Text style={styles.loginPromptBtnText}>Giriş Yap</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Community Reviews */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                        Topluluk İncelemeleri {!reviewsLoading && `(${reviews.length})`}
                    </Text>
                    {reviewsLoading ? (
                        <ActivityIndicator color="#E5B505" style={{ marginVertical: 20 }} />
                    ) : reviews.length === 0 ? (
                        <Text style={styles.noReviews}>Henüz inceleme yok. İlk sen ol!</Text>
                    ) : (
                        reviews.map(review => (
                            <View key={review._id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <TouchableOpacity 
                                        style={styles.reviewUser}
                                        onPress={() => router.push(`/user/${review.user?._id}`)}
                                    >
                                        <View style={styles.reviewAvatar}>
                                            <Text style={styles.reviewAvatarText}>
                                                {review.user?.username?.charAt(0).toUpperCase() || '?'}
                                            </Text>
                                        </View>
                                        <Text style={styles.reviewUsername}>{review.user?.username || 'Kullanıcı'}</Text>
                                    </TouchableOpacity>
                                    <View style={styles.reviewActions}>
                                        <View style={styles.miniStars}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={14} color="#E5B505" />
                                            ))}
                                        </View>
                                        {token && (
                                            <TouchableOpacity onPress={() => handleLikeReview(review._id)} style={styles.likeBtn}>
                                                <Ionicons
                                                    name={(review.likes || []).includes(user?.id || '') ? 'heart' : 'heart-outline'}
                                                    size={18}
                                                    color={(review.likes || []).includes(user?.id || '') ? '#e74c3c' : '#666'}
                                                />
                                                <Text style={styles.likeCount}>{(review.likes || []).length}</Text>
                                            </TouchableOpacity>
                                        )}
                                        {token && (user?.id === review.user?._id || user?.role === 'admin') && (
                                            <TouchableOpacity onPress={() => handleDeleteReview(review._id)}>
                                                <Ionicons name="trash-outline" size={18} color="#ff7675" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                {review.reviewText ? <Text style={styles.reviewBody}>{review.reviewText}</Text> : null}
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* List Selection Modal */}
            <Modal visible={showListModal} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowListModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Listeye Ekle</Text>
                        {userLists.sort((a, b) => {
                            const order: Record<string, number> = { watched: 1, watchlist: 2, favorites: 3 };
                            return (order[a.type] || 4) - (order[b.type] || 4);
                        }).map(list => (
                            <TouchableOpacity
                                key={list._id} style={styles.listOption}
                                onPress={() => handleAddToList(list._id, listNameMap[list.type] || list.name)}
                                disabled={addingToList} activeOpacity={0.7}
                            >
                                <Ionicons name={(listIconMap[list.type] || 'folder-outline') as any} size={22} color={listColorMap[list.type] || '#E5B505'} />
                                <Text style={styles.listOptionText}>{listNameMap[list.type] || list.name}</Text>
                            </TouchableOpacity>
                        ))}
                        {userLists.length === 0 && <Text style={styles.noLists}>Henüz listeniz yok.</Text>}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    backdropContainer: { height: 250, position: 'relative' },
    backdrop: { width: '100%', height: '100%' },
    backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,10,0.6)' },
    backBtn: { position: 'absolute', top: 50, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    contentSection: { paddingHorizontal: 16, marginTop: -40 },
    posterRow: { flexDirection: 'row', gap: 16 },
    poster: { width: 120, height: 180, borderRadius: 12, backgroundColor: '#1a1a1a' },
    infoCol: { flex: 1, paddingTop: 44 },
    title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
    tagline: { color: '#E5B505', fontSize: 13, fontStyle: 'italic', marginBottom: 6 },
    meta: { color: '#888', fontSize: 13, marginBottom: 10 },
    ratingsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    ratingChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    ratingChipLabel: { color: '#fbbf24', fontSize: 11, fontWeight: '600' },
    ratingChipValue: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
    genresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    genreChip: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    genreText: { color: '#aaa', fontSize: 11, fontWeight: '600' },
    overview: { color: '#bbb', fontSize: 14, lineHeight: 22, marginTop: 20 },
    // Quick Actions
    quickActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
    quickBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    quickBtnText: { color: '#ccc', fontSize: 11, fontWeight: '600' },
    // Sections
    sectionCard: { marginHorizontal: 16, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
    ratingLabel: { color: '#888', fontSize: 13, marginBottom: 10 },
    starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    reviewInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },
    submitBtn: { backgroundColor: '#E5B505', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    submitBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
    loginPrompt: { alignItems: 'center', paddingVertical: 16 },
    loginPromptText: { color: '#888', fontSize: 14, marginBottom: 12 },
    loginPromptBtn: { backgroundColor: '#E5B505', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 32 },
    loginPromptBtnText: { color: '#000', fontWeight: '700' },
    noReviews: { color: '#666', fontSize: 14, fontStyle: 'italic' },
    reviewCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center' },
    reviewAvatarText: { color: '#000', fontWeight: '700', fontSize: 14 },
    reviewUsername: { color: '#fff', fontWeight: '600', fontSize: 14 },
    reviewActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    miniStars: { flexDirection: 'row', gap: 1 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    likeCount: { color: '#888', fontSize: 12 },
    reviewBody: { color: '#bbb', fontSize: 13, lineHeight: 19 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { color: '#E5B505', fontSize: 18, fontWeight: '700', marginBottom: 20 },
    listOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    listOptionText: { color: '#fff', fontSize: 16, fontWeight: '500' },
    noLists: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 10 },
});
