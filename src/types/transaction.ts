import { UserRole } from './user';

export enum TransactionType {
  STOCK_ADD = 'add',
  STOCK_REMOVE = 'remove',
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  quantityChange: number;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: number;
  transactionType: TransactionType;
  notes?: string;
}

export interface TransactionFilter {
  startDate?: number;
  endDate?: number;
  userId?: string;
  itemId?: string;
  type?: TransactionType;
  limit?: number;
  offset?: number;
}

export interface TransactionStats {
  totalTransactions: number;
  stockAdded: number;
  stockRemoved: number;
  mostActiveUser: {
    userId: string;
    userName: string;
    transactionCount: number;
  };
  mostTrackedItem: {
    itemId: string;
    itemName: string;
    transactionCount: number;
  };
}
