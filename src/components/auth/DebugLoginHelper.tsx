import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { resetWebDatabase } from '../../database/db';

export const DebugLoginHelper: React.FC = () => {
  const handleResetDatabase = () => {
    resetWebDatabase();
    alert('Database reset! Please refresh the page to reinitialize.');
  };

  const handleShowLocalStorage = () => {
    if (Platform.OS === 'web') {
      const users = localStorage.getItem('users');
      console.log('Users in localStorage:', users);
      alert(`Users stored: ${users}`);
    } else {
      alert('localStorage is only available on web platform');
    }
  };

  // Only show debug helper on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Login Helper</Text>
      
      <Text style={styles.info}>
        Default credentials: owner / 1234
      </Text>
      
      <Button
        mode="outlined"
        onPress={handleResetDatabase}
        style={styles.button}
      >
        Reset Database
      </Button>
      
      <Button
        mode="outlined"
        onPress={handleShowLocalStorage}
        style={styles.button}
      >
        Show Users in Console
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
  },
  button: {
    marginBottom: 8,
  },
});
