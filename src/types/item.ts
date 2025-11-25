export interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  description?: string;
  lowStockThreshold: number;
  dateAdded: number;
  lastStockAdded?: number;
  lastStockRemoved?: number;
  createdBy: string;
  updatedAt: number;
  isActive: boolean;
}

export interface CreateItemInput {
  name: string;
  category: string;
  quantity: number;
  description?: string;
  lowStockThreshold: number;
}

export interface UpdateItemInput {
  id: string;
  name?: string;
  description?: string | null;
  category?: string;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface StockAdjustmentInput {
  itemId: string;
  quantity: number;
  userId: string;
  notes?: string;
}
