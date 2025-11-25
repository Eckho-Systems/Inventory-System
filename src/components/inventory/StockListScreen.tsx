import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Chip, Portal, Searchbar } from 'react-native-paper';
import { useAuth } from '../../stores';
import { useInventory } from '../../stores/inventoryStore';
import { Item } from '../../types/item';
import { PermissionGuard } from '../auth/PermissionGuard';
import { AddItemModal } from './AddItemModal';
import { StockModal } from './StockModal';

interface Props {
  navigation: any;
}

export const StockListScreen: React.FC<Props> = ({ navigation }) => {
  const router = useRouter();
  const { 
    filteredItems, 
    isLoading, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory, 
    categories, 
    sortBy, 
    setSortBy, 
    sortOrder, 
    setSortOrder,
    addItem,
    adjustStock,
    loadItems,
    loadCategories,
    refreshItems
  } = useInventory();
  const { user } = useAuth();

  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [stockModalType, setStockModalType] = useState<'add' | 'remove'>('add');

  // Load items and categories when component mounts
  useEffect(() => {
    loadItems();
    loadCategories();
  }, [loadItems, loadCategories]);

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    router.push(`/modal?itemId=${item.id}`);
  };

  const handleAddStock = (item: Item) => {
    setSelectedItem(item);
    setStockModalType('add');
    setStockModalVisible(true);
  };

  const handleRemoveStock = (item: Item) => {
    setSelectedItem(item);
    setStockModalType('remove');
    setStockModalVisible(true);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={[
          styles.quantity,
          item.quantity <= item.lowStockThreshold && styles.lowStock
        ]}>
          {item.quantity}
        </Text>
      </View>
      <Text style={styles.category}>{item.category}</Text>
      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
      <View style={styles.itemFooter}>
        <Text style={styles.threshold}>
          Low stock: {item.lowStockThreshold}
        </Text>
        <Text style={styles.date}>
          Added: {new Date(item.dateAdded).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.addButton]}
          onPress={() => handleAddStock(item)}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.actionButtonText}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => handleRemoveStock(item)}
          disabled={item.quantity === 0}
        >
          <Ionicons name="remove" size={16} color="white" />
          <Text style={styles.actionButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.searchContainer}>
        <Searchbar
          placeholder="Search items..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <Chip
            selected={!selectedCategory}
            onPress={() => setSelectedCategory(null)}
            style={styles.categoryChip}
          >
            All
          </Chip>
          {categories.slice(1).map((category) => (
            <Chip
              key={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
              style={styles.categoryChip}
            >
              {category}
            </Chip>
          ))}
        </ScrollView>

        <View style={styles.sortContainer}>
          <Button
            mode="outlined"
            onPress={() => setSortBy(sortBy === 'name' ? 'quantity' : sortBy === 'quantity' ? 'lastAdded' : 'name')}
            style={styles.sortButton}
          >
            Sort: {sortBy === 'name' ? 'Name' : sortBy === 'quantity' ? 'Quantity' : 'Last Added'}
          </Button>
          <Button
            mode="outlined"
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={styles.sortButton}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </View>
      </ScrollView>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>Add your first inventory item</Text>
          </View>
        }
      />

      <PermissionGuard permissions={["create_item"]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddItemModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </PermissionGuard>

      <Portal>
        <AddItemModal
          visible={addItemModalVisible}
          onDismiss={() => setAddItemModalVisible(false)}
          onSubmit={async (item) => {
            const result = await addItem(item);
            if (result) {
              setAddItemModalVisible(false);
              await refreshItems();
            }
            return result !== null;
          }}
        />
        
        <StockModal
          visible={stockModalVisible}
          item={selectedItem}
          onDismiss={() => setStockModalVisible(false)}
          type={stockModalType}
        />
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    maxHeight: 200,
  },
  searchBar: {
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryContainer: {
    paddingRight: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  lowStock: {
    color: '#FF3B30',
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  threshold: {
    fontSize: 12,
    color: '#999',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
  },
  addButton: {
    backgroundColor: '#4caf50',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
});
