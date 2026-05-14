import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, SafeAreaView, Dimensions, RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, reviews: 0, lists: 0, newReviewsToday: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setStats(res.data);
        } catch (e) {
            console.error('Admin stats fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const StatCard = ({ title, value, icon, color }: any) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View>
                <Text style={styles.statLabel}>{title}</Text>
                <Text style={styles.statNumber}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Yönetici Paneli</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#E5B505" />
                </View>
            ) : (
                <ScrollView 
                    style={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E5B505" />}
                >
                    <View style={styles.welcomeBox}>
                        <Text style={styles.welcomeTitle}>Hoş Geldiniz, Admin</Text>
                        <Text style={styles.welcomeText}>RateFlix platformunun güncel durumunu buradan takip edebilirsiniz.</Text>
                    </View>

                    <View style={styles.grid}>
                        <StatCard title="Toplam Üye" value={stats.users} icon="people" color="#74b9ff" />
                        <StatCard title="Toplam İnceleme" value={stats.reviews} icon="star" color="#ffeaa7" />
                        <StatCard title="Toplam Liste" value={stats.lists} icon="list" color="#a29bfe" />
                        <StatCard title="Bugün Yeni" value={stats.newReviewsToday} icon="time" color="#ff7675" />
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={20} color="#888" />
                        <Text style={styles.infoText}>
                            Daha detaylı kullanıcı yönetimi ve rol değişiklikleri için lütfen Web versiyonundaki Admin panelini kullanın.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '700' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    welcomeBox: { marginBottom: 24 },
    welcomeTitle: { color: '#E5B505', fontSize: 24, fontWeight: '800', marginBottom: 8 },
    welcomeText: { color: '#888', fontSize: 14, lineHeight: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { 
        width: (width - 60) / 2, 
        backgroundColor: 'rgba(255,255,255,0.04)', 
        borderRadius: 16, 
        padding: 20, 
        marginBottom: 20,
        borderLeftWidth: 4,
    },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 4 },
    statNumber: { color: '#fff', fontSize: 24, fontWeight: '800' },
    infoBox: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, gap: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    infoText: { color: '#666', fontSize: 13, flex: 1, lineHeight: 18 },
});
