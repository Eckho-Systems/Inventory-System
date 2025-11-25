import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../stores';

export const SimpleDebugAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { login, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Force login with default credentials
    if (!isAuthenticated && !isLoading) {
      console.log('Attempting force login with default credentials...');
      
      // Try to login with the default credentials
      login({ username: 'owner', pin: '1234' }).then((success) => {
        console.log('Force login result:', success);
      }).catch((error) => {
        console.error('Force login error:', error);
      });
    }
  }, [login, isAuthenticated, isLoading]);

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Attempting to log in...</Text>
        <Text>Username: owner</Text>
        <Text>PIN: 1234</Text>
      </View>
    );
  }

  return <>{children}</>;
};
