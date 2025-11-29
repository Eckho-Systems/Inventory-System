import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { ItemDetailScreen } from '../src/screens/inventory/ItemDetailScreen';

export default function ModalScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();

  if (!itemId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No item ID provided</Text>
      </View>
    );
  }

  return <ItemDetailScreen route={{ params: { itemId } }} />;
}
