import { Platform } from 'react-native';
import { TransactionModel } from '../database/models/Transaction';
import { Transaction, TransactionFilter, TransactionStats, TransactionType } from '../types/transaction';
import { UserRole } from '../types/user';
import { downloadCSV, exportTransactionsToCSV, shareCSV } from '../utils/csvExport';
import { eventEmitter } from '../utils/eventEmitter';

export const transactionService = {
  async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
    try {
      return await TransactionModel.getAll(filter);
    } catch (error) {
      console.error('Get all transactions error:', error);
      throw error;
    }
  },

  async findById(id: string): Promise<Transaction | null> {
    try {
      return await TransactionModel.findById(id);
    } catch (error) {
      console.error('Find transaction error:', error);
      throw error;
    }
  },

  async getByItemId(itemId: string, limit: number = 20): Promise<Transaction[]> {
    try {
      return await TransactionModel.getByItemId(itemId, limit);
    } catch (error) {
      console.error('Get transactions by item error:', error);
      throw error;
    }
  },

  async getByUserId(userId: string, limit: number = 50): Promise<Transaction[]> {
    try {
      return await TransactionModel.getByUserId(userId, limit);
    } catch (error) {
      console.error('Get transactions by user error:', error);
      throw error;
    }
  },

  async getStats(filter?: Omit<TransactionFilter, 'limit' | 'offset'>): Promise<TransactionStats> {
    try {
      return await TransactionModel.getStats(filter);
    } catch (error) {
      console.error('Get transaction stats error:', error);
      throw error;
    }
  },

  async create(transactionData: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> {
    try {
      const transaction = await TransactionModel.create(transactionData);
      
      // Emit events for real-time updates
      eventEmitter.emit('transaction:created', transaction);
      eventEmitter.emit('stock:changed', transaction.itemId, transaction.quantityChange);
      
      return transaction;
    } catch (error) {
      console.error('Create transaction error:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      return await TransactionModel.delete(id);
    } catch (error) {
      console.error('Delete transaction error:', error);
      throw error;
    }
  },

  // Helper methods for filtering and reporting
  async getTransactionsByDateRange(startDate: number, endDate: number): Promise<Transaction[]> {
    try {
      return await this.getAll({
        startDate,
        endDate,
      });
    } catch (error) {
      console.error('Get transactions by date range error:', error);
      throw error;
    }
  },

  async getTransactionsByType(type: TransactionType, limit?: number): Promise<Transaction[]> {
    try {
      return await this.getAll({
        type,
        limit,
      });
    } catch (error) {
      console.error('Get transactions by type error:', error);
      throw error;
    }
  },

  async getRecentTransactions(limit: number = 50): Promise<Transaction[]> {
    try {
      return await this.getAll({ limit });
    } catch (error) {
      console.error('Get recent transactions error:', error);
      throw error;
    }
  },

  // Permission helper
  canViewTransactions(userRole: UserRole): boolean {
    return [UserRole.MANAGER, UserRole.OWNER].includes(userRole);
  },

  // Format transaction for display
  formatTransaction(transaction: Transaction): {
    id: string;
    itemName: string;
    action: string;
    quantity: string;
    user: string;
    timestamp: string;
    notes?: string;
    isNewItem?: boolean;
  } {
    const isNewItem = transaction.notes === 'Initial stock when creating item';
    const isDeletion = transaction.transactionType === TransactionType.ITEM_DELETE;
    let action: string;
    let quantity: string;
    
    if (isNewItem) {
      action = 'New Item';
      quantity = `${Math.abs(transaction.quantityChange)} units (Initial)`;
    } else if (isDeletion) {
      action = 'Deleted';
      quantity = 'Item Deleted';
    } else {
      action = transaction.transactionType === 'add' ? 'Added' : 'Removed';
      quantity = `${Math.abs(transaction.quantityChange)} units`;
    }
    
    const timestamp = new Date(transaction.timestamp).toLocaleString();
    
    return {
      id: transaction.id,
      itemName: transaction.itemName,
      action,
      quantity,
      user: transaction.userName,
      timestamp,
      notes: transaction.notes || undefined,
      isNewItem,
    };
  },

  // Export transactions to CSV
  async exportTransactions(filter?: TransactionFilter): Promise<string> {
    try {
      const transactions = await this.getAll(filter);
      const csvContent = exportTransactionsToCSV(transactions, {
        includeHeaders: true,
        dateFormat: 'long'
      });
      return csvContent;
    } catch (error) {
      console.error('Export transactions error:', error);
      throw error;
    }
  },

  // Export and download/share transactions
  async exportAndShareTransactions(
    filter?: TransactionFilter,
    filename?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const csvContent = await this.exportTransactions(filter);
      const defaultFilename = filename || `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (Platform.OS === 'web') {
        downloadCSV(csvContent, defaultFilename);
        return { success: true, message: 'CSV file downloaded successfully' };
      } else {
        return await shareCSV(csvContent, defaultFilename);
      }
    } catch (error) {
      console.error('Export and share transactions error:', error);
      return { success: false, message: 'Failed to export transactions' };
    }
  },
};
