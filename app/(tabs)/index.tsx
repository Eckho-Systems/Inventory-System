import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { SimpleDebugAuth } from '../../src/components/auth/SimpleDebugAuth';
import { StockListScreen } from '../../src/components/inventory/StockListScreen';

export default function HomeScreen() {
  const router = useRouter();
  
  return (
    <SimpleDebugAuth>
      <View style={{ flex: 1 }}>
        <StockListScreen navigation={router} />
      </View>
    </SimpleDebugAuth>
  );
}
