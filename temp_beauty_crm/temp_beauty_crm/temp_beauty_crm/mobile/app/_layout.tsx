import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { useNotifications } from '../src/hooks/useNotifications';
import { OfflineIndicator } from '../src/components/common/OfflineIndicator';

// Initialize i18n
import '../src/i18n';

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Initialize push notifications
  useNotifications();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <OfflineIndicator />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(employee)" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
