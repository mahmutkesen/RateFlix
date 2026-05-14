import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, FlatList,
    TouchableOpacity, Image, Dimensions, ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { getTrending, getTopRated, getImageUrl, getDetails } from '../../services/tmdb';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

interface MovieItem {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
}

// Batch-fetch RateFlix ratings for a list of items
const rfCache: Record<string, { avg: number; count: number }> = {};

const MovieCard = ({ item, type, userLists, token, onAddPress }: {
    item: MovieItem; type: string;
    userLists: any[]; token: string | null;
    onAddPress: (item: MovieItem, type: string) => void;
}) => {
    const [rfData, setRfData] = useState(rfCache[`${item.id}-${type}`] || null);

    useEffect(() => {
        const key = `${item.id}-${type}`;
        if (rfCache[key]) { setRfData(rfCache[key]); return; }
        api.get(`/reviews/average/${item.id}/${type}`)
            .then(res => {
                const d = { avg: res.data?.average || 0, count: res.data?.count || 0 };
                rfCache[key] = d;
                setRfData(d);
            })
            .catch(() => { rfCache[key] = { avg: 0, count: 0 }; });
    }, [item.id, type]);



    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push(`/content/${item.id}?type=${type}`)}
        >
            <View style={styles.cardImageWrapper}>
                <Image
                    source={{ uri: getImageUrl(item.poster_path, 'w342') }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
                {/* Rating badges */}
                <View style={styles.badgesCol}>
                    <View style={styles.tmdbBadge}>
                        <Ionicons name="star" size={9} color="#FFC107" />
                        <Text style={styles.tmdbText}>{item.vote_average?.toFixed(1)}</Text>
                    </View>
                    {rfData && rfData.count > 0 && (
                        <View style={styles.rfBadge}>
                            <Text style={styles.rfLogo}>RF</Text>
                            <Text style={styles.rfText}>{rfData.avg.toFixed(1)}</Text>
                        </View>
                    )}
                </View>

                {/* Add to List button */}
                {token && (
                    <TouchableOpacity
                        style={styles.bookmarkBtn}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            onAddPress(item, type);
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add-circle" size={20} color="#E5B505" />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title || item.name}
            </Text>
            <Text style={styles.cardYear}>
                {(item.release_date || item.first_air_date || '').split('-')[0]}
            </Text>
        </TouchableOpacity>
    );
};

const HorizontalSlider = ({ title, items, type, userLists, token, onAddPress }: {
    title: string; items: MovieItem[]; type: string;
    userLists: any[]; token: string | null;
    onAddPress: (item: MovieItem, type: string) => void;
}) => {
    if (!items || items.length === 0) return null;
    return (
        <View style={styles.sliderSection}>
            <Text style={styles.sliderTitle}>{title}</Text>
            <FlatList
                data={items}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                    <MovieCard item={item} type={type} userLists={userLists} token={token} onAddPress={onAddPress} />
                )}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
            />
        </View>
    );
};

export default function HomeScreen() {
    const { token } = useAuth();
    const [trendingMovies, setTrendingMovies] = useState<MovieItem[]>([]);
    const [trendingSeries, setTrendingSeries] = useState<MovieItem[]>([]);
    const [topRatedMovies, setTopRatedMovies] = useState<MovieItem[]>([]);
    const [topRatedSeries, setTopRatedSeries] = useState<MovieItem[]>([]);
    const [rfTopMovies, setRfTopMovies] = useState<MovieItem[]>([]);
    const [rfTopSeries, setRfTopSeries] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userLists, setUserLists] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<{ item: MovieItem; type: string } | null>(null);
    const [addingToList, setAddingToList] = useState(false);

    const fetchRfTopRated = async (type: string): Promise<MovieItem[]> => {
        try {
            const res = await api.get(`/reviews/top-rated?type=${type}`, { timeout: 8000 });
            const items = res.data || [];
            if (items.length === 0) return [];
            // Fetch TMDB details for each top-rated item (max 10)
            const details = await Promise.all(
                items.slice(0, 10).map((item: any) =>
                    getDetails(item.mediaType || type, item.tmdbId)
                        .then(d => ({ ...d.data, _rfAvg: item.average, _rfCount: item.count }))
                        .catch(() => null)
                )
            );
            return details.filter(Boolean) as MovieItem[];
        } catch {
            return [];
        }
    };

    const fetchAll = async () => {
        try {
            const [trM, trS, topM, topS] = await Promise.all([
                getTrending('movie', 'week', 1).catch(() => ({ data: { results: [] } })),
                getTrending('tv', 'week', 1).catch(() => ({ data: { results: [] } })),
                getTopRated('movie', 1).catch(() => ({ data: { results: [] } })),
                getTopRated('tv', 1).catch(() => ({ data: { results: [] } })),
            ]);
            setTrendingMovies(trM.data.results || []);
            setTrendingSeries(trS.data.results || []);
            setTopRatedMovies(topM.data.results || []);
            setTopRatedSeries(topS.data.results || []);

            // Fetch RF top-rated in background
            const [rfM, rfS] = await Promise.all([
                fetchRfTopRated('movie'),
                fetchRfTopRated('tv')
            ]);
            setRfTopMovies(rfM);
            setRfTopSeries(rfS);
        } catch (e) {
            console.error('Error fetching content:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch user lists for quick-add
    useEffect(() => {
        if (token) {
            api.get('/lists').then(res => setUserLists(res.data || [])).catch(() => {});
        }
    }, [token]);

    useEffect(() => { fetchAll(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchAll(); };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E5B505" />
                <Text style={styles.loadingText}>Sinematik deneyiminiz hazırlanıyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
        >
            <View style={styles.hero}>
                <View style={styles.heroTop}>
                    <Text style={styles.heroTitle}>Keşfetmenin{'\n'}Yeni Yolu</Text>
                    {token && (
                        <TouchableOpacity 
                            style={styles.notifBtn} 
                            onPress={() => router.push('/notifications')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="notifications-outline" size={28} color="#E5B505" />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.heroSubtitle}>
                    Sinema yolculuğunuzu takip edin. RateFlix topluluğunda trend olanları keşfedin, puan verin ve inceleyin.
                </Text>
            </View>

            <HorizontalSlider title="🔥 Trend Filmler" items={trendingMovies} type="movie" userLists={userLists} token={token} onAddPress={(item, type) => setSelectedItem({ item, type })} />
            <HorizontalSlider title="📺 Trend Diziler" items={trendingSeries} type="tv" userLists={userLists} token={token} onAddPress={(item, type) => setSelectedItem({ item, type })} />
            
            {/* Merged Top Rated Movies */}
            <HorizontalSlider 
                title="⭐ En Çok Oylanan Filmler" 
                items={[
                    ...rfTopMovies, 
                    ...topRatedMovies.filter(tm => !rfTopMovies.some(rm => String(rm.id) === String(tm.id)))
                ]} 
                type="movie" 
                userLists={userLists} 
                token={token} 
                onAddPress={(item, type) => setSelectedItem({ item, type })}
            />

            {/* Merged Top Rated Series */}
            <HorizontalSlider 
                title="🏆 En Çok Oylanan Diziler" 
                items={[
                    ...rfTopSeries, 
                    ...topRatedSeries.filter(ts => !rfTopSeries.some(rs => String(rs.id) === String(ts.id)))
                ]} 
                type="tv" 
                userLists={userLists} 
                token={token} 
                onAddPress={(item, type) => setSelectedItem({ item, type })}
            />

            <View style={{ height: 40 }} />

            {/* List Selection Modal */}
            <Modal visible={!!selectedItem} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedItem(null)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Listeye Ekle</Text>
                        <Text style={styles.modalSubtitle}>{selectedItem?.item.title || selectedItem?.item.name}</Text>
                        
                        {userLists.map(list => (
                            <TouchableOpacity 
                                key={list._id} 
                                style={styles.listItem}
                                onPress={async () => {
                                    if (addingToList || !selectedItem) return;
                                    setAddingToList(true);
                                    try {
                                        await api.post(`/lists/${list._id}/items`, {
                                            tmdbId: String(selectedItem.item.id),
                                            mediaType: selectedItem.type,
                                            posterPath: selectedItem.item.poster_path,
                                            movieTitle: selectedItem.item.title || selectedItem.item.name
                                        });
                                        Alert.alert('Başarılı', 'Listeye eklendi.');
                                        setSelectedItem(null);
                                    } catch (e: any) {
                                        Alert.alert('Hata', e.response?.data?.message || 'Zaten listede olabilir.');
                                    } finally {
                                        setAddingToList(false);
                                    }
                                }}
                            >
                                <Ionicons 
                                    name={list.type === 'watched' ? 'eye' : list.type === 'watchlist' ? 'time' : list.type === 'favorites' ? 'heart' : 'folder-outline'} 
                                    size={18} 
                                    color="#E5B505" 
                                />
                                <Text style={styles.listItemText}>{list.name}</Text>
                            </TouchableOpacity>
                        ))}
                        
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedItem(null)}>
                            <Text style={styles.modalCloseText}>Vazgeç</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    loadingContainer: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#888', marginTop: 16, fontSize: 14 },
    hero: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroTitle: { fontSize: 34, fontWeight: '900', color: '#E5B505', marginBottom: 10, letterSpacing: -0.5, maxWidth: '80%' },
    notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    heroSubtitle: { color: '#999', fontSize: 15, lineHeight: 22 },
    sliderSection: { marginBottom: 28 },
    sliderTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 14, paddingHorizontal: 16 },
    card: { width: CARD_WIDTH },
    cardImageWrapper: {
        width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a',
    },
    cardImage: { width: '100%', height: '100%' },
    badgesCol: { position: 'absolute', top: 6, left: 6, gap: 4 },
    tmdbBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 3,
    },
    tmdbText: { color: '#FFC107', fontSize: 11, fontWeight: '700' },
    rfBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(229,181,5,0.9)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 3,
    },
    rfLogo: { color: '#000', fontSize: 9, fontWeight: '900' },
    rfText: { color: '#000', fontSize: 11, fontWeight: '700' },
    bookmarkBtn: {
        position: 'absolute', top: 6, right: 6,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 8, paddingHorizontal: 2 },
    cardYear: { color: '#666', fontSize: 11, paddingHorizontal: 2, marginTop: 2 },
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
        marginBottom: 8,
    },
    modalSubtitle: {
        color: '#888',
        fontSize: 14,
        marginBottom: 24,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        gap: 12,
    },
    listItemText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalCloseBtn: {
        marginTop: 24,
        alignItems: 'center',
        paddingVertical: 12,
    },
    modalCloseText: {
        color: '#888',
        fontSize: 15,
        fontWeight: '600',
    },
});
