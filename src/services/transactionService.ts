import { TransactionModel } from '../database/models/Transaction';
import { Transaction, TransactionFilter, TransactionStats, TransactionType } from '../types/transaction';
import { UserRole } from '../types/user';

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
      return await TransactionModel.create(transactionData);
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
  } {
    const action = transaction.transactionType === 'add' ? 'Added' : 'Removed';
    const quantity = `${Math.abs(transaction.quantityChange)} units`;
    const timestamp = new Date(transaction.timestamp).toLocaleString();
    
    return {
      id: transaction.id,
      itemName: transaction.itemName,
      action,
      quantity,
      user: transaction.userName,
      timestamp,
      notes: transaction.notes || undefined,
    };
  }
};
