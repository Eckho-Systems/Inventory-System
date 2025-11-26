import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';

import LoadingScreen from '@/components/LoadingScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDatabase } from '@/src/database/db';
import { initializeAppData } from '@/src/services/initService';
import { useAuthStore } from '@/src/stores/authStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initializeAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Initialize database when app starts
        await initDatabase();
        console.log('Database initialized');
        
        // After database is initialized, initialize app data
        await initializeAppData();
        console.log('App data initialized');
        
        // Initialize authentication state
        await initializeAuth();
        console.log('Auth initialized');
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [initializeAuth]);

  // Show loading screen while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <PaperProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PaperProvider>
  );
}
