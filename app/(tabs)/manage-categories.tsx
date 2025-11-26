import { CategoryManager } from '@/src/components/inventory/CategoryManager';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ManageCategoriesScreen() {
  return (
    <View style={styles.container}>
      <CategoryManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
