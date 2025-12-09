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
import { CreateUserInput, UpdateUserInput, User, UserRole } from '../../src/types/user';
import { PERMISSIONS } from '../../src/utils/permissions';

interface EditUserForm {
  id: string;
  name: string;
  pin: string;
  confirmPin: string;
  role: UserRole;
}

export default function ManageUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<CreateUserInput>({
    username: '',
    pin: '',
    name: '',
    role: UserRole.STAFF,
    confirmPin: '',
  });
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({
    id: '',
    name: '',
    pin: '',
    confirmPin: '',
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
    if (!newUser.username.trim() || !newUser.name.trim() || !newUser.pin.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!newUser.confirmPin?.trim()) {
      Alert.alert('Error', 'Please confirm the PIN');
      return;
    }

    if (newUser.pin !== newUser.confirmPin) {
      Alert.alert('Error', 'PIN and confirm PIN do not match ');
      return; 
    }

    if (newUser.pin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    try {
      const success = await userService.create(newUser);
      if (success) {
        setAddModalVisible(false);
        setNewUser({ username: '', pin: '', name: '', role: UserRole.STAFF, confirmPin: '' });
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

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserForm({
      id: user.id,
      name: user.name,
      pin: '', // Don't pre-fill PIN for security
      confirmPin: '', // Don't pre-fill PIN for security
      role: user.role,
    });
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!editUserForm.name?.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    // Validate PIN if user wants to change it
    if (editUserForm.pin?.trim()) {
      if (!editUserForm.confirmPin?.trim()) {
        Alert.alert('Error', 'Please confirm the new PIN');
        return;
      }
      
      if (editUserForm.pin !== editUserForm.confirmPin) {
        Alert.alert('Error', 'PIN and confirm PIN do not match');
        return;
      }
      
      if (editUserForm.pin.length !== 4) {
        Alert.alert('Error', 'PIN must be exactly 4 digits');
        return;
      }
    }

    try {
      const updateData: UpdateUserInput = {
        id: editingUser.id,
        name: editUserForm.name,
        role: editUserForm.role,
      };

      // Only include PIN if it's provided (user wants to change it)
      if (editUserForm.pin?.trim()) {
        updateData.pin = editUserForm.pin;
      }

      const updatedUser = await userService.update(updateData);
      if (updatedUser) {
        setEditModalVisible(false);
        setEditingUser(null);
        setEditUserForm({ id: '', name: '', pin: '', confirmPin: '', role: UserRole.STAFF });
        loadUsers();
        Alert.alert('Success', 'User updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const getAvailableRoles = () => {
    if (!currentUser) return [];
    
    switch (currentUser.role) {
      case UserRole.MANAGER:
        return [UserRole.STAFF];
      case UserRole.OWNER:
        return [UserRole.STAFF, UserRole.MANAGER, UserRole.OWNER];
      default:
        return [];
    }
  };

  const canDeleteUser = (user: User) => {
    if (!currentUser) return false;
    if (user.id === currentUser?.id) return false; // Can't delete own account
    
    return userService.canDeleteUser(currentUser.role, user.role);
  };

  const handleDeleteUser = async (user: User) => {
    // Use Alert for confirmation in React Native
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to permanently delete ${user.username}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await userService.delete(user.id);
              if (success) {
                loadUsers();
                Alert.alert('Success', 'User deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const canEditUser = (user: User) => {
    if (!currentUser) return false;
    if (user.id === currentUser?.id) return false; // Can't edit own role
    
    return userService.canCreateUser(currentUser.role, user.role);
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
                        <View style={styles.actionButtons}>
                          {canEditUser(user) && (
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleEditUser(user)}
                              style={[styles.actionButton, styles.editButton]}
                            >
                              Edit
                            </Button>
                          )}
                          {canDeleteUser(user) && (
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleDeleteUser(user)}
                              style={[styles.actionButton, styles.deleteButton]}
                              textColor="#d32f2f"
                            >
                              Delete
                            </Button>
                          )}
                          {user.isActive && user.id !== currentUser?.id && (
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleDeactivateUser(user)}
                              style={[styles.actionButton, styles.deactivateButton]}
                              textColor="#f44336"
                            >
                              Deactivate
                            </Button>
                          )}
                        </View>
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
                  label="Name"
                  value={newUser.name}
                  onChangeText={(text) => setNewUser({ ...newUser, name: text })}
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

                <TextInput
                  label="Confirm PIN"
                  value={newUser.confirmPin || ''}
                  onChangeText={(text) => setNewUser({ ...newUser, confirmPin: text })}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                />

                <View style={styles.roleSelection}>
                  <Text style={styles.label}>Role:</Text>
                  <View style={styles.roleButtons}>
                    {getAvailableRoles().map((role) => (
                      <Chip
                        key={role}
                        selected={newUser.role === role}
                        onPress={() => setNewUser({ ...newUser, role })}
                        style={styles.roleChip}
                      >
                        {getRoleDisplay(role)}
                      </Chip>
                    ))}
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
                    disabled={
                      !newUser.username.trim() || 
                      !newUser.name.trim() || 
                      !newUser.pin.trim() || 
                      !newUser.confirmPin?.trim() ||
                      newUser.pin !== newUser.confirmPin
                    }
                  >
                    Add User
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>

        <Portal>
          <Modal
            visible={editModalVisible}
            onDismiss={() => {
              setEditModalVisible(false);
              setEditingUser(null);
              setEditUserForm({ id: '', name: '', pin: '', confirmPin: '', role: UserRole.STAFF });
            }}
            contentContainerStyle={styles.modalContainer}
          >
            <Card style={styles.modalCard}>
              <Card.Content>
                <Text style={styles.modalTitle}>Edit User</Text>

                <TextInput
                  label="Username"
                  value={editingUser?.username || ''}
                  disabled
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Name"
                  value={editUserForm.name}
                  onChangeText={(text) => setEditUserForm({ ...editUserForm, name: text })}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="New PIN (4 digits, leave empty to keep current)"
                  value={editUserForm.pin}
                  onChangeText={(text) => setEditUserForm({ ...editUserForm, pin: text })}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                />

                <TextInput
                  label="Confirm New PIN"
                  value={editUserForm.confirmPin}
                  onChangeText={(text) => setEditUserForm({ ...editUserForm, confirmPin: text })}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                />

                <View style={styles.roleSelection}>
                  <Text style={styles.label}>Role:</Text>
                  <View style={styles.roleButtons}>
                    {getAvailableRoles().map((role) => (
                      <Chip
                        key={role}
                        selected={editUserForm.role === role}
                        onPress={() => setEditUserForm({ ...editUserForm, role })}
                        style={styles.roleChip}
                      >
                        {getRoleDisplay(role)}
                      </Chip>
                    ))}
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setEditModalVisible(false);
                      setEditingUser(null);
                      setEditUserForm({ id: '', name: '', pin: '', confirmPin: '', role: UserRole.STAFF });
                    }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleUpdateUser}
                    style={styles.confirmButton}
                    disabled={!editUserForm.name?.trim()}
                  >
                    Update User
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
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    minWidth: 60,
  },
  editButton: {
    borderColor: '#007AFF',
  },
  deleteButton: {
    borderColor: '#d32f2f',
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
