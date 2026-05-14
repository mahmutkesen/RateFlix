import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { register } = useAuth();

    const handleRegister = async () => {
        if (!username.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
            return;
        }
        setLoading(true);
        try {
            const message = await register(username.trim(), email.trim(), password);
            if (message) {
                Alert.alert('Başarılı', message, [
                    { text: 'Giriş Yap', onPress: () => { router.back(); router.push('/login'); } }
                ]);
            } else {
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            Alert.alert('Kayıt Başarısız', err.response?.data?.message || 'Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="videocam" size={32} color="#E5B505" />
                    </View>
                </View>

                <Text style={styles.title}>RateFlix'e Katılın</Text>
                <Text style={styles.subtitle}>İzlediklerinizi takip etmeye başlamak için bir hesap oluşturun</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kullanıcı Adı</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="cinephile99"
                            placeholderTextColor="#555"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>E-posta Adresi</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="isim@ornek.com"
                            placeholderTextColor="#555"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Şifre</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="En az 6 karakter"
                            placeholderTextColor="#555"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.registerBtnText}>Kayıt Ol</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Zaten bir hesabınız var mı? </Text>
                    <TouchableOpacity onPress={() => { router.back(); router.push('/login'); }}>
                        <Text style={styles.footerLink}>Giriş yapın</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 0,
        padding: 8,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(229, 181, 5, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#ccc',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 14,
    },
    eyeBtn: {
        padding: 4,
    },
    registerBtn: {
        backgroundColor: '#E5B505',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    registerBtnDisabled: {
        opacity: 0.6,
    },
    registerBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#888',
        fontSize: 14,
    },
    footerLink: {
        color: '#E5B505',
        fontSize: 14,
        fontWeight: '600',
    },
});
