import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Notification {
    _id: string;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export default function NotificationsScreen() {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data || []);
        } catch (e) {
            console.error('Error fetching notifications:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'FOLLOW': return { name: 'person-add', color: '#74b9ff' };
            case 'REVIEW_LIKE': return { name: 'heart', color: '#ff7675' };
            case 'LIST_LIKE': return { name: 'albums', color: '#a29bfe' };
            case 'COMMENT': return { name: 'chatbubble', color: '#55efc4' };
            case 'LIST_UPDATE': return { name: 'sync', color: '#E5B505' };
            default: return { name: 'notifications', color: '#888' };
        }
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const icon = getIcon(item.type);
        return (
            <TouchableOpacity 
                style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                onPress={() => {
                    if (!item.isRead) markAsRead(item._id);
                    // Navigate if needed based on type
                    if (item.data?.tmdbId) {
                        router.push(`/content/${item.data.tmdbId}?type=${item.data.mediaType || 'movie'}`);
                    }
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBadge, { backgroundColor: `${icon.color}22` }]}>
                    <Ionicons name={icon.name as any} size={20} color={icon.color} />
                </View>
                <View style={styles.content}>
                    <Text style={[styles.message, !item.isRead && styles.unreadText]}>{item.message}</Text>
                    <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Bildirimler</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#E5B505" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Ionicons name="notifications-off-outline" size={64} color="#333" />
                            <Text style={styles.emptyText}>Henüz bildiriminiz yok</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '700' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    listContent: { padding: 16 },
    notificationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 12 },
    unreadCard: { backgroundColor: 'rgba(229,181,5,0.05)', borderWidth: 1, borderColor: 'rgba(229,181,5,0.1)' },
    iconBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    content: { flex: 1 },
    message: { color: '#bbb', fontSize: 14, lineHeight: 20 },
    unreadText: { color: '#fff', fontWeight: '600' },
    time: { color: '#555', fontSize: 11, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5B505', marginLeft: 8 },
    emptyText: { color: '#555', fontSize: 16, marginTop: 12 },
});
