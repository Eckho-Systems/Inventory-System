import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import LoadingScreen from '../../components/LoadingScreen';
import { StockListScreen } from '../../src/components/inventory/StockListScreen';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';
import { useAuth } from '../../src/stores';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  // Show loading screen while auth is being initialized
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={() => {
          // Navigation will be handled automatically by the tab layout
        }} 
      />
    );
  }

  // Show main app content if authenticated
  return (
    <View style={{ flex: 1 }}>
      <StockListScreen navigation={router} />
    </View>
  );
}
