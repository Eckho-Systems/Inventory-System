import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Chip,
    DataTable,
    Modal,
    Portal,
    Text,
    TextInput,
} from 'react-native-paper';
import { PermissionGuard } from '../../src/components/auth/PermissionGuard';
import { userService } from '../../src/services/userService';
import { useAuth } from '../../src/stores';
import { CreateUserInput, User, UserRole } from '../../src/types/user';
import { PERMISSIONS } from '../../src/utils/permissions';

export default function ManageUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserInput>({
    username: '',
    pin: '',
    name: '',
    role: UserRole.STAFF,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await userService.getAll();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username.trim() || !newUser.pin.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const success = await userService.create(newUser);
      if (success) {
        setAddModalVisible(false);
        setNewUser({ username: '', pin: '', name: '', role: UserRole.STAFF });
        loadUsers();
        Alert.alert('Success', 'User created successfully');
      } else {
        Alert.alert('Error', 'Failed to create user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create user');
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'You cannot deactivate your own account');
      return;
    }

    Alert.alert(
      'Confirm Deactivation',
      `Are you sure you want to deactivate ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await userService.deactivate(user.id);
              if (success) {
                loadUsers();
                Alert.alert('Success', 'User deactivated successfully');
              } else {
                Alert.alert('Error', 'Failed to deactivate user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate user');
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#FF6B35';
      case 'manager':
        return '#4ECDC4';
      case 'staff':
        return '#45B7D1';
      default:
        return '#666';
    }
  };

  const getRoleDisplay = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_USERS]}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <Card style={styles.headerCard}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Manage Users</Text>
                <Button
                  mode="contained"
                  onPress={() => setAddModalVisible(true)}
                  style={styles.addButton}
                >
                  Add User
                </Button>
              </View>
              <Text style={styles.subtitle}>
                Total Users: {users.length} | Active: {users.filter(u => u.isActive).length}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.tableCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>User List</Text>
              
              {users.length === 0 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : (
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Username</DataTable.Title>
                    <DataTable.Title>Role</DataTable.Title>
                    <DataTable.Title>Status</DataTable.Title>
                    <DataTable.Title>Created</DataTable.Title>
                    <DataTable.Title>Actions</DataTable.Title>
                  </DataTable.Header>

                  {users.map((user) => (
                    <DataTable.Row key={user.id}>
                      <DataTable.Cell>{user.username}</DataTable.Cell>
                      <DataTable.Cell>
                        <Chip
                          style={[styles.roleChip, { backgroundColor: getRoleColor(user.role) }]}
                          textStyle={{ color: 'white' }}
                        >
                          {getRoleDisplay(user.role)}
                        </Chip>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Chip
                          style={user.isActive ? styles.activeChip : styles.inactiveChip}
                          textStyle={{ color: 'white' }}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Chip>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </DataTable.Cell>
                      <DataTable.Cell>
                        {user.isActive && user.id !== currentUser?.id && (
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => handleDeactivateUser(user)}
                            style={styles.deactivateButton}
                            textColor="#f44336"
                          >
                            Deactivate
                          </Button>
                        )}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        <Portal>
          <Modal
            visible={addModalVisible}
            onDismiss={() => setAddModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={styles.modalTitle}>Add New User</Text>

                <TextInput
                  label="Username"
                  value={newUser.username}
                  onChangeText={(text) => setNewUser({ ...newUser, username: text })}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="PIN (4 digits)"
                  value={newUser.pin}
                  onChangeText={(text) => setNewUser({ ...newUser, pin: text })}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                />

                <View style={styles.roleSelection}>
                  <Text style={styles.label}>Role:</Text>
                  <View style={styles.roleButtons}>
                    <Chip
                      selected={newUser.role === UserRole.STAFF}
                      onPress={() => setNewUser({ ...newUser, role: UserRole.STAFF })}
                      style={styles.roleChip}
                    >
                      Staff
                    </Chip>
                    <Chip
                      selected={newUser.role === UserRole.MANAGER}
                      onPress={() => setNewUser({ ...newUser, role: UserRole.MANAGER })}
                      style={styles.roleChip}
                    >
                      Manager
                    </Chip>
                    <Chip
                      selected={newUser.role === UserRole.OWNER}
                      onPress={() => setNewUser({ ...newUser, role: UserRole.OWNER })}
                      style={styles.roleChip}
                    >
                      Owner
                    </Chip>
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setAddModalVisible(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleAddUser}
                    style={styles.confirmButton}
                    disabled={!newUser.username.trim() || !newUser.pin.trim()}
                  >
                    Add User
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>
      </View>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  tableCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  roleChip: {
    marginRight: 4,
  },
  activeChip: {
    backgroundColor: '#4caf50',
  },
  inactiveChip: {
    backgroundColor: '#999',
  },
  deactivateButton: {
    borderColor: '#f44336',
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  roleSelection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#007AFF',
  },
});
