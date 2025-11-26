import { create } from 'zustand';
import { itemService } from '../services';
import { CreateItemInput, Item, StockAdjustmentInput, UpdateItemInput } from '../types/item';
import { useAuthStore } from './authStore';

interface InventoryState {
  items: Item[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: 'name' | 'quantity' | 'lastAdded';
  sortOrder: 'asc' | 'desc';
  
  // Actions
  loadItems: () => Promise<void>;
  loadCategories: () => Promise<void>;
  addItem: (item: CreateItemInput) => Promise<Item | null>;
  updateItem: (id: string, updates: UpdateItemInput) => Promise<Item | null>;
  adjustStock: (id: string, adjustment: StockAdjustmentInput) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSortBy: (sortBy: 'name' | 'quantity' | 'lastAdded') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  refreshItems: () => Promise<void>;
  clearError: () => void;
  
  // Computed values (getters)
  getFilteredItems: () => Item[];
  getLowStockItems: () => Item[];
  getItemById: (id: string) => Item | undefined;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  categories: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,
  sortBy: 'name',
  sortOrder: 'asc',

  loadItems: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const items = await itemService.getAll();
      set({ items, isLoading: false });
    } catch (error) {
      console.error('Failed to load items:', error);
      set({
        error: 'Failed to load inventory items',
        isLoading: false,
      });
    }
  },

  loadCategories: async () => {
    try {
      const categories = await itemService.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
      set({ error: 'Failed to load categories' });
    }
  },

  addItem: async (item: CreateItemInput) => {
    set({ isLoading: true, error: null });
    
    try {
      // Get current user from auth store
      const authState = useAuthStore.getState();
      const user = authState.user;
      
      console.log('Current user in addItem:', user);
      
      if (!user) {
        console.error('No user found in auth store');
        set({ isLoading: false, error: 'User not authenticated' });
        return null;
      }

      console.log('Creating item with user ID:', user.id);
      const newItem = await itemService.create(item, user.id, {
        id: user.id,
        name: user.name,
        role: user.role,
      });
      if (newItem) {
        set(state => ({
          items: [...state.items, newItem],
          isLoading: false,
        }));
        return newItem;
      }
      set({ isLoading: false, error: 'Failed to create item' });
      return null;
    } catch (error) {
      console.error('Failed to add item:', error);
      set({
        error: 'Failed to add item',
        isLoading: false,
      });
      return null;
    }
  },

  updateItem: async (id: string, updates: UpdateItemInput) => {
    set({ isLoading: true, error: null });
    
    try {
      const updatedItem = await itemService.update(updates);
      if (updatedItem) {
        set(state => ({
          items: state.items.map(item => 
            item.id === id ? updatedItem : item
          ),
          isLoading: false,
        }));
        return updatedItem;
      }
      set({ isLoading: false, error: 'Failed to update item' });
      return null;
    } catch (error) {
      console.error('Failed to update item:', error);
      set({
        error: 'Failed to update item',
        isLoading: false,
      });
      return null;
    }
  },

  adjustStock: async (id: string, adjustment: StockAdjustmentInput) => {
    set({ isLoading: true, error: null });
    
    try {
      // Get current user from auth store
      const authState = useAuthStore.getState();
      const user = authState.user;
      
      if (!user) {
        set({ isLoading: false, error: 'User not authenticated' });
        return false;
      }

      const success = await itemService.adjustStock(
        adjustment,
        user.name,
        user.role
      );
      
      if (success) {
        // Refresh items to get updated quantities
        await get().loadItems();
        set({ isLoading: false });
        return true;
      }
      set({ isLoading: false, error: 'Failed to adjust stock' });
      return false;
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      set({
        error: 'Failed to adjust stock',
        isLoading: false,
      });
      return false;
    }
  },

  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const success = await itemService.deactivate(id);
      if (success) {
        set(state => ({
          items: state.items.filter(item => item.id !== id),
          isLoading: false,
        }));
        return true;
      }
      set({ isLoading: false, error: 'Failed to delete item' });
      return false;
    } catch (error) {
      console.error('Failed to delete item:', error);
      set({
        error: 'Failed to delete item',
        isLoading: false,
      });
      return false;
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category });
  },

  setSortBy: (sortBy: 'name' | 'quantity' | 'lastAdded') => {
    set({ sortBy });
  },

  setSortOrder: (order: 'asc' | 'desc') => {
    set({ sortOrder: order });
  },

  refreshItems: async () => {
    await get().loadItems();
  },

  clearError: () => {
    set({ error: null });
  },

  getFilteredItems: () => {
    const { items, searchQuery, selectedCategory, sortBy, sortOrder } = get();
    
    let filtered = items;
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'lastAdded':
          const aDate = new Date(a.lastStockAdded || a.dateAdded).getTime();
          const bDate = new Date(b.lastStockAdded || b.dateAdded).getTime();
          comparison = aDate - bDate;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  },

  getLowStockItems: () => {
    const { items } = get();
    return items.filter(item => item.quantity <= item.lowStockThreshold);
  },

  getItemById: (id: string) => {
    const { items } = get();
    return items.find(item => item.id === id);
  },
}));

// Custom hook for inventory with additional helpers
export const useInventory = () => {
  const store = useInventoryStore();
  
  return {
    ...store,
    // Additional computed values
    filteredItems: store.getFilteredItems(),
    lowStockItems: store.getLowStockItems(),
    hasLowStockItems: store.getLowStockItems().length > 0,
    totalItems: store.items.length,
    totalQuantity: store.items.reduce((sum, item) => sum + item.quantity, 0),
    categories: ['All', ...store.categories],
  };
};
