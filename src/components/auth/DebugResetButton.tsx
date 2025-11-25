import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { resetDatabase } from '../../database/db';

export const DebugResetButton: React.FC = () => {
  const handleReset = async () => {
    try {
      console.log('Resetting database...');
      await resetDatabase();
      console.log('Database reset complete');
      // You might want to reload the app here
    } catch (error) {
      console.error('Failed to reset database:', error);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleReset}>
      <Text style={styles.text}>Reset Database</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    margin: 10,
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
});
