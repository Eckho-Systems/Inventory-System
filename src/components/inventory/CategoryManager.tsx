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
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput
} from 'react-native-paper';
import { CategoryService } from '../../services/categoryService';
import { useAuth } from '../../stores/authStore';
import { Category } from '../../types/category';

export const CategoryManager: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await CategoryService.getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await CategoryService.createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
      
      setCategoryName('');
      setCategoryDescription('');
      setShowAddModal(false);
      loadCategories();
      Alert.alert('Success', 'Category added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !categoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await CategoryService.updateCategory({
        id: selectedCategory.id,
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
      
      setCategoryName('');
      setCategoryDescription('');
      setShowEditModal(false);
      setSelectedCategory(null);
      loadCategories();
      Alert.alert('Success', 'Category updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    console.log('Delete button pressed for category:', category.name, 'ID:', category.id);
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    setIsSubmitting(true);
    try {
      await CategoryService.deleteCategory(selectedCategory.id);
      setShowDeleteModal(false);
      setSelectedCategory(null);
      loadCategories();
      Alert.alert('Success', 'Category deleted successfully');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', error.message || 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  const canManageCategories = user?.role === 'owner' || user?.role === 'manager';

  if (!canManageCategories) {
    return (
      <View style={styles.container}>
        <Text style={styles.accessDeniedText}>
          You don't have permission to manage categories.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Category Management</Text>
        <Button
          mode="contained"
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
        >
          Add Category
        </Button>
      </View>

      <ScrollView style={styles.scrollView}>
        {categories.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No categories found</Text>
              <Text style={styles.emptySubtext}>
                Add your first category to get started
              </Text>
            </Card.Content>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <Card.Content>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.categoryActions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditModal(category)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteCategory(category)}
                    />
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Category Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={closeModals}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text style={styles.modalTitle}>Add New Category</Text>
              
              <TextInput
                label="Category Name"
                value={categoryName}
                onChangeText={setCategoryName}
                mode="outlined"
                style={styles.input}
                error={!!categoryName && categoryName.trim().length === 0}
              />

              <TextInput
                label="Description (Optional)"
                value={categoryDescription}
                onChangeText={setCategoryDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={closeModals}
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddCategory}
                  style={styles.confirmButton}
                  disabled={!categoryName.trim() || isSubmitting}
                  loading={isSubmitting}
                >
                  Add Category
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Edit Category Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={closeModals}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text style={styles.modalTitle}>Edit Category</Text>
              
              <TextInput
                label="Category Name"
                value={categoryName}
                onChangeText={setCategoryName}
                mode="outlined"
                style={styles.input}
                error={!!categoryName && categoryName.trim().length === 0}
              />

              <TextInput
                label="Description (Optional)"
                value={categoryDescription}
                onChangeText={setCategoryDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={closeModals}
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleEditCategory}
                  style={styles.confirmButton}
                  disabled={!categoryName.trim() || isSubmitting}
                  loading={isSubmitting}
                >
                  Update Category
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={showDeleteModal}
          onDismiss={closeModals}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text style={styles.modalTitle}>Delete Category</Text>
              <Text style={styles.deleteWarningText}>
                Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone.
              </Text>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={closeModals}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmDeleteCategory}
                  style={styles.deleteButton}
                  buttonColor="#dc3545"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  Delete
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  categoryCard: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
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
  textArea: {
    marginBottom: 24,
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
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#dc3545',
  },
  deleteWarningText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});
