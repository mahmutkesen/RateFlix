import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
    return (
        <AuthProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0A0A0A' },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="register" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="content/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="user/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
            <StatusBar style="light" />
        </AuthProvider>
    );
}
