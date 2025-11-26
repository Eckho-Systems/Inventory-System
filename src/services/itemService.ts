import { ItemModel } from '../database/models/Item';
import { TransactionModel } from '../database/models/Transaction';
import { CreateItemInput, Item, StockAdjustmentInput, UpdateItemInput } from '../types/item';
import { TransactionType } from '../types/transaction';
import { UserRole } from '../types/user';

export const itemService = {
  async getAll(): Promise<Item[]> {
    try {
      return await ItemModel.getAll();
    } catch (error) {
      console.error('Get all items error:', error);
      throw error;
    }
  },

  async findById(id: string): Promise<Item | null> {
    try {
      return await ItemModel.findById(id);
    } catch (error) {
      console.error('Find item error:', error);
      throw error;
    }
  },

  async create(item: CreateItemInput, createdBy: string, userInfo?: { id: string; name: string; role: UserRole }): Promise<Item | null> {
    try {
      console.log('itemService.create called with:', { item, createdBy, userInfo });
      const newItem = await ItemModel.create(item, createdBy);
      
      // If item has initial quantity > 0, create a transaction record
      if (newItem && item.quantity > 0 && userInfo) {
        await TransactionModel.create({
          itemId: newItem.id,
          itemName: newItem.name,
          quantityChange: item.quantity,
          userId: userInfo.id,
          userName: userInfo.name,
          userRole: userInfo.role,
          transactionType: TransactionType.STOCK_ADD,
          notes: 'Initial stock when creating item',
        });
        console.log('Created transaction for new item with initial quantity:', item.quantity);
      }
      
      return newItem;
    } catch (error) {
      console.error('Create item error:', error);
      throw error;
    }
  },

  async update(itemData: UpdateItemInput): Promise<Item | null> {
    try {
      return await ItemModel.update(itemData);
    } catch (error) {
      console.error('Update item error:', error);
      throw error;
    }
  },

  async searchByName(searchTerm: string): Promise<Item[]> {
    try {
      return await ItemModel.searchByName(searchTerm);
    } catch (error) {
      console.error('Search items error:', error);
      throw error;
    }
  },

  async getByCategory(category: string): Promise<Item[]> {
    try {
      return await ItemModel.getByCategory(category);
    } catch (error) {
      console.error('Get items by category error:', error);
      throw error;
    }
  },

  async getLowStockItems(): Promise<Item[]> {
    try {
      return await ItemModel.getLowStockItems();
    } catch (error) {
      console.error('Get low stock items error:', error);
      throw error;
    }
  },

  async getCategories(): Promise<string[]> {
    try {
      return await ItemModel.getCategories();
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  },

  async addStock(adjustment: StockAdjustmentInput): Promise<Item | null> {
    try {
      // Get current item
      const item = await ItemModel.findById(adjustment.itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Calculate new quantity
      const newQuantity = item.quantity + adjustment.quantity;
      if (newQuantity < 0) {
        throw new Error('Cannot remove more stock than available');
      }

      // Update item quantity
      const updatedItem = await ItemModel.updateQuantity(
        adjustment.itemId,
        newQuantity,
        adjustment.quantity
      );

      if (!updatedItem) {
        throw new Error('Failed to update item quantity');
      }

      // Create transaction record
      await TransactionModel.create({
        itemId: item.id,
        itemName: item.name,
        quantityChange: adjustment.quantity,
        userId: adjustment.userId,
        userName: '', // Will be filled by the service layer
        userRole: UserRole.STAFF, // Will be filled by the service layer
        transactionType: TransactionType.STOCK_ADD,
        notes: adjustment.notes,
      });

      return updatedItem;
    } catch (error) {
      console.error('Add stock error:', error);
      throw error;
    }
  },

  async removeStock(adjustment: StockAdjustmentInput): Promise<Item | null> {
    try {
      // Get current item
      const item = await ItemModel.findById(adjustment.itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Calculate new quantity
      const newQuantity = item.quantity - adjustment.quantity;
      if (newQuantity < 0) {
        throw new Error('Cannot remove more stock than available');
      }

      // Update item quantity
      const updatedItem = await ItemModel.updateQuantity(
        adjustment.itemId,
        newQuantity,
        -adjustment.quantity // Negative for removal
      );

      if (!updatedItem) {
        throw new Error('Failed to update item quantity');
      }

      // Create transaction record
      await TransactionModel.create({
        itemId: item.id,
        itemName: item.name,
        quantityChange: -adjustment.quantity, // Negative for removal
        userId: adjustment.userId,
        userName: '', // Will be filled by the service layer
        userRole: UserRole.STAFF, // Will be filled by the service layer
        transactionType: TransactionType.STOCK_REMOVE,
        notes: adjustment.notes,
      });

      return updatedItem;
    } catch (error) {
      console.error('Remove stock error:', error);
      throw error;
    }
  },

  async adjustStock(adjustment: StockAdjustmentInput, userName: string, userRole: UserRole): Promise<Item | null> {
    try {
      // Get current item
      const item = await ItemModel.findById(adjustment.itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Determine if this is add or remove
      const isAddition = adjustment.quantity > 0;
      const absoluteQuantity = Math.abs(adjustment.quantity);

      // Calculate new quantity
      const newQuantity = isAddition ? item.quantity + absoluteQuantity : item.quantity - absoluteQuantity;
      if (newQuantity < 0) {
        throw new Error('Cannot remove more stock than available');
      }

      // Update item quantity
      const updatedItem = await ItemModel.updateQuantity(
        adjustment.itemId,
        newQuantity,
        adjustment.quantity
      );

      if (!updatedItem) {
        throw new Error('Failed to update item quantity');
      }

      // Create transaction record
      await TransactionModel.create({
        itemId: item.id,
        itemName: item.name,
        quantityChange: adjustment.quantity,
        userId: adjustment.userId,
        userName,
        userRole,
        transactionType: isAddition ? TransactionType.STOCK_ADD : TransactionType.STOCK_REMOVE,
        notes: adjustment.notes,
      });

      return updatedItem;
    } catch (error) {
      console.error('Adjust stock error:', error);
      throw error;
    }
  },

  async deactivate(id: string): Promise<boolean> {
    try {
      return await ItemModel.deactivate(id);
    } catch (error) {
      console.error('Deactivate item error:', error);
      throw error;
    }
  }
};
