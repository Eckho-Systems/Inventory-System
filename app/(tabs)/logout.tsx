import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LogoutScreen() {
  const router = useRouter();

  const handleSignIn = () => {
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.messageText}>
        WE'RE SORRY. YOU'VE BEEN SIGNED OUT.
      </ThemedText>
      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
        <ThemedText style={styles.signInButtonText}>SIGN IN</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 32,
  },
  signInButton: {
    backgroundColor: '#6A2E00',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
