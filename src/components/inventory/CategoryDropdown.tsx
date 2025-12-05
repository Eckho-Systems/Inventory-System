import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    Button,
    Divider,
    Menu,
    Text,
} from 'react-native-paper';
import { CategoryService } from '../../services/categoryService';
const { eventEmitter } = require('../../utils/eventEmitter');

interface CategoryDropdownProps {
  selectedCategory?: string | null;
  onCategorySelect: (category: string) => void;
  error?: boolean;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  selectedCategory,
  onCategorySelect,
  error = false,
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  // Listen for category changes and refresh automatically
  useEffect(() => {
    const unsubscribe = eventEmitter.on('categoriesChanged', () => {
      loadCategories();
    });

    return unsubscribe;
  }, []);

  const loadCategories = async () => {
    try {
      const categoryNames = await CategoryService.getCategoryNames();
      setCategories(categoryNames);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category: string) => {
    onCategorySelect(category);
    setVisible(false);
  };

  const displayText = selectedCategory || 'All';

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            style={[styles.button, error && styles.errorButton]}
            contentStyle={styles.buttonContent}
          >
            <Text style={[styles.buttonText, error && styles.errorText]}>
              {displayText}
            </Text>
          </Button>
        }
      >
        {loading ? (
          <View style={styles.loadingItem}>
            <Text>Loading categories...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyItem}>
            <Text>No categories available</Text>
          </View>
        ) : (
          <View>
            <Menu.Item
              onPress={() => handleSelectCategory('All')}
              title="All"
              style={!selectedCategory && styles.selectedItem}
            />
            <Divider />
            {categories.map((category, index) => (
              <View key={category}>
                <Menu.Item
                  onPress={() => handleSelectCategory(category)}
                  title={category}
                  style={selectedCategory === category && styles.selectedItem}
                />
                {index < categories.length - 1 && <Divider />}
              </View>
            ))}
          </View>
        )}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  button: {
    justifyContent: 'flex-start',
    height: 56,
  },
  errorButton: {
    borderColor: '#B00020',
  },
  buttonContent: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  buttonText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#B00020',
  },
  loadingItem: {
    padding: 16,
  },
  emptyItem: {
    padding: 16,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
});
