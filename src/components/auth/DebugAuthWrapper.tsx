import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../stores';
import { DebugResetButton } from './DebugResetButton';
import { LoginForm } from './LoginForm';

export const DebugAuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Auto-login with default credentials for debugging
    if (!isAuthenticated) {
      console.log('Attempting auto-login with default credentials...');
      login({ username: 'owner', pin: '1234' }).then((success) => {
        console.log('Auto-login success:', success);
      });
    }
  }, [login, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Attempting auto-login...</Text>
        <DebugResetButton />
        <LoginForm />
      </View>
    );
  }

  return <>{children}</>;
};
