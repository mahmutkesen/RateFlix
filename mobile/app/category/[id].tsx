import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, Dimensions, SafeAreaView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { discoverContent, getImageUrl, UNIFIED_CATEGORIES } from '../../services/tmdb';
import api from '../../services/api';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

export default function CategoryScreen() {
    const { id, type } = useLocalSearchParams<{ id: string, type: 'movie' | 'tv' }>();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [categoryName, setCategoryName] = useState('');

    const fetchItems = async (p: number) => {
        const cat = UNIFIED_CATEGORIES.find(c => c.id === id);
        if (!cat) return;
        setCategoryName(cat.name);
        const tmdbGenreId = type === 'movie' ? cat.movie : cat.tv;

        try {
            const res = await discoverContent(type || 'movie', tmdbGenreId, p);
            const results = res.data.results || [];
            if (results.length === 0) {
                setHasMore(false);
            } else {
                setItems(prev => p === 1 ? results : [...prev, ...results]);
            }
        } catch (e) {
            console.error('Error discovery:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems(1);
    }, [id, type]);

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchItems(nextPage);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/content/${item.id}?type=${type}`)}
            activeOpacity={0.8}
        >
            <Image 
                source={{ uri: getImageUrl(item.poster_path, 'w185') }} 
                style={styles.poster} 
            />
            <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color="#FFC107" />
                <Text style={styles.ratingText}>{item.vote_average?.toFixed(1)}</Text>
            </View>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title || item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>{categoryName}</Text>
                    <Text style={styles.subtitle}>{type === 'movie' ? 'Filmler' : 'Diziler'}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading && page === 1 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#E5B505" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item) => `${item.id}`}
                    renderItem={renderItem}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.grid}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={hasMore ? <ActivityIndicator color="#E5B505" style={{ marginVertical: 20 }} /> : null}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerContent: { flex: 1, alignItems: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '700' },
    subtitle: { color: '#E5B505', fontSize: 12, fontWeight: '600', marginTop: 2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    grid: { padding: 10 },
    card: { width: ITEM_WIDTH, margin: 5, marginBottom: 15 },
    poster: { width: '100%', height: ITEM_WIDTH * 1.5, borderRadius: 10, backgroundColor: '#1a1a1a' },
    ratingBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 3 },
    ratingText: { color: '#FFC107', fontSize: 10, fontWeight: '700' },
    itemTitle: { color: '#bbb', fontSize: 12, fontWeight: '600', marginTop: 6, paddingHorizontal: 2 }
});
