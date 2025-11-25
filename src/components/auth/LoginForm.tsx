import React, { useState } from 'react';
import {
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Text,
    TextInput
} from 'react-native-paper';
import { useAuth } from '../../stores';

interface LoginFormProps {
  onSuccess?: () => void;
  showTitle?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  showTitle = true 
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();

  const handleSubmit = async () => {
    clearError();
    
    if (!username.trim() || !pin.trim()) {
      return;
    }

    console.log('Attempting login with:', { username, pin: '***' });
    const success = await login({ username, pin });
    console.log('Login success:', success);
    
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    clearError();
  };

  const handlePinChange = (text: string) => {
    setPin(text);
    clearError();
  };

  return (
    <View style={styles.container}>
      {showTitle && (
        <>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your credentials</Text>
        </>
      )}

      <TextInput
        label="Username"
        value={username}
        onChangeText={handleUsernameChange}
        mode="outlined"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        disabled={isLoading}
        error={!!error}
      />

      <TextInput
        label="PIN"
        value={pin}
        onChangeText={handlePinChange}
        mode="outlined"
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={styles.input}
        keyboardType="numeric"
        maxLength={10}
        disabled={isLoading}
        error={!!error}
      />

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading || !username.trim() || !pin.trim()}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 12,
  },
});
