import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, FlatList,
    TouchableOpacity, Image, ActivityIndicator, Dimensions, Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { searchMulti, getImageUrl, UNIFIED_CATEGORIES, discoverContent } from '../../services/tmdb';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const CARD_WIDTH = (width - 48 - 20) / NUM_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
    action: { emoji: '💥', color: '#e74c3c' },
    comedy: { emoji: '😂', color: '#f39c12' },
    horror: { emoji: '👻', color: '#2c3e50' },
    scifi: { emoji: '🚀', color: '#3498db' },
    drama: { emoji: '🎭', color: '#9b59b6' },
    animation: { emoji: '✨', color: '#1abc9c' },
    crime: { emoji: '🔍', color: '#e74c3c' },
    documentary: { emoji: '📹', color: '#27ae60' },
    romance: { emoji: '💕', color: '#fd79a8' },
    mystery: { emoji: '🕵️', color: '#636e72' },
};

const CAT_COLS = 2;
const CAT_GAP = 10;
const CAT_WIDTH = (width - 32 - CAT_GAP) / CAT_COLS;

interface SearchItem {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    vote_average: number;
    media_type?: string;
}

interface UserItem {
    _id: string;
    username: string;
    profilePic?: string;
    role?: string;
}

export default function SearchScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchItem[]>([]);
    const [userResults, setUserResults] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categoryResults, setCategoryResults] = useState<SearchItem[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [activeSearchTab, setActiveSearchTab] = useState<'content' | 'users'>('content');

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setUserResults([]);
            setSearched(false);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            setSearched(true);
            setSelectedCategory(null);
            try {
                // Parallel: TMDB search + User search
                const [tmdbRes, usersRes] = await Promise.all([
                    searchMulti(query).catch(() => ({ data: { results: [] } })),
                    api.get(`/auth/search?q=${encodeURIComponent(query)}`).catch(() => ({ data: [] })),
                ]);
                const filtered = (tmdbRes.data.results || []).filter(
                    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
                );
                setResults(filtered);
                setUserResults(Array.isArray(usersRes.data) ? usersRes.data : []);
            } catch {
                setResults([]);
                setUserResults([]);
            } finally {
                setLoading(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);



    const renderContentItem = ({ item }: { item: SearchItem }) => (
        <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/content/${item.id}?type=${item.media_type || 'movie'}`)}
        >
            <View style={styles.gridImageWrapper}>
                <Image source={{ uri: getImageUrl(item.poster_path, 'w342') }} style={styles.gridImage} resizeMode="cover" />
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={8} color="#FFC107" />
                    <Text style={styles.ratingText}>{item.vote_average?.toFixed(1)}</Text>
                </View>
            </View>
            <Text style={styles.gridTitle} numberOfLines={1}>{item.title || item.name}</Text>
        </TouchableOpacity>
    );

    const renderUserItem = ({ item }: { item: UserItem }) => (
        <TouchableOpacity
            style={styles.userCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/user/${item._id}`)}
        >
            {item.profilePic ? (
                <Image source={{ uri: item.profilePic }} style={styles.userAvatar} />
            ) : (
                <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarLetter}>{item.username?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
            )}
            <View style={styles.userInfo}>
                <Text style={styles.userUsername}>{item.username}</Text>
                {item.role === 'admin' && (
                    <View style={styles.adminBadge}><Text style={styles.adminText}>Admin</Text></View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>
    );

    const renderCategoryCard = ({ item }: { item: typeof UNIFIED_CATEGORIES[0] }) => {
        const config = CATEGORY_CONFIG[item.id] || { emoji: '🎬', color: '#555' };
        const isSelected = selectedCategory === item.id;
        return (
            <TouchableOpacity
                style={[styles.catCard, { backgroundColor: isSelected ? config.color : config.color + '22' }, isSelected ? { borderColor: config.color, borderWidth: 2 } : {}]}
                onPress={() => router.push(`/category/${item.id}?type=movie`)}
                activeOpacity={0.7}
            >
                <Text style={styles.catEmoji}>{config.emoji}</Text>
                <Text style={[styles.catName, isSelected && { color: '#fff' }]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const displayData = results;
    const showContentGrid = searched && results.length > 0 && activeSearchTab === 'content';
    const showUsers = searched && activeSearchTab === 'users';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Keşfet</Text>
                <Text style={styles.headerSubtitle}>Film, dizi veya kullanıcı arayın</Text>
            </View>

            <View style={styles.searchWrapper}>
                <Ionicons name="search" size={20} color="#E5B505" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Film, dizi veya kullanıcı ara..."
                    placeholderTextColor="#555"
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={20} color="#555" />
                    </TouchableOpacity>
                )}
            </View>

            {searched && !loading && (
                <View style={styles.searchTabs}>
                    <TouchableOpacity
                        style={[styles.searchTab, activeSearchTab === 'content' && styles.searchTabActive]}
                        onPress={() => setActiveSearchTab('content')}
                    >
                        <Ionicons name="film" size={14} color={activeSearchTab === 'content' ? '#000' : '#888'} />
                        <Text style={[styles.searchTabText, activeSearchTab === 'content' && styles.searchTabTextActive]}>
                            İçerikler ({results.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.searchTab, activeSearchTab === 'users' && styles.searchTabActive]}
                        onPress={() => setActiveSearchTab('users')}
                    >
                        <Ionicons name="people" size={14} color={activeSearchTab === 'users' ? '#000' : '#888'} />
                        <Text style={[styles.searchTabText, activeSearchTab === 'users' && styles.searchTabTextActive]}>
                            Kullanıcılar ({userResults.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {(loading || categoryLoading) && (
                <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#E5B505" /></View>
            )}

            {showContentGrid && !loading && !categoryLoading && (
                <FlatList
                    data={displayData}
                    numColumns={NUM_COLUMNS}
                    keyExtractor={(item) => `res-${item.id}`}
                    contentContainerStyle={styles.gridContainer}
                    columnWrapperStyle={{ gap: 10 }}
                    renderItem={renderContentItem}
                    ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                />
            )}

            {showUsers && !loading && (
                <FlatList
                    data={userResults}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 }}
                    renderItem={renderUserItem}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>Kullanıcı bulunamadı</Text>
                        </View>
                    }
                />
            )}

            {searched && !loading && results.length === 0 && activeSearchTab === 'content' && (
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 48 }}>🎬</Text>
                    <Text style={styles.emptyTitle}>"{query}" için sonuç bulunamadı</Text>
                </View>
            )}

            {!searched && !loading && !categoryLoading && (
                <FlatList
                    data={UNIFIED_CATEGORIES}
                    numColumns={CAT_COLS}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
                    columnWrapperStyle={{ gap: CAT_GAP }}
                    renderItem={renderCategoryCard}
                    ItemSeparatorComponent={() => <View style={{ height: CAT_GAP }} />}
                    ListHeaderComponent={<Text style={styles.catSectionTitle}>Kategoriler</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#E5B505', marginBottom: 4 },
    headerSubtitle: { color: '#888', fontSize: 14 },
    searchWrapper: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 25, paddingHorizontal: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 },
    searchTabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
    searchTab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        paddingVertical: 8, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    searchTabActive: { backgroundColor: '#E5B505', borderColor: '#E5B505' },
    searchTabText: { color: '#888', fontSize: 13, fontWeight: '600' },
    searchTabTextActive: { color: '#000' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    catSectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
    catCard: {
        width: CAT_WIDTH, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 14,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    catEmoji: { fontSize: 32, marginBottom: 8 },
    catName: { color: '#ccc', fontSize: 14, fontWeight: '700', textAlign: 'center' },
    gridContainer: { paddingHorizontal: 16, paddingBottom: 100 },
    gridCard: { width: CARD_WIDTH },
    gridImageWrapper: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1a1a1a' },
    gridImage: { width: '100%', height: '100%' },
    ratingBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, gap: 2 },
    ratingText: { color: '#FFC107', fontSize: 10, fontWeight: '700' },
    gridTitle: { color: '#ccc', fontSize: 11, fontWeight: '600', marginTop: 6 },
    clearFilter: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(229,181,5,0.1)', borderWidth: 1, borderColor: 'rgba(229,181,5,0.3)', marginBottom: 16 },
    clearFilterText: { color: '#E5B505', fontSize: 13, fontWeight: '600' },
    // User search
    userCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    userAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
    userAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5B505', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    userAvatarLetter: { color: '#000', fontSize: 18, fontWeight: '800' },
    userInfo: { flex: 1 },
    userUsername: { color: '#fff', fontSize: 16, fontWeight: '600' },
    adminBadge: { backgroundColor: 'rgba(229,181,5,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
    adminText: { color: '#E5B505', fontSize: 10, fontWeight: '700' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12, textAlign: 'center' },
});
