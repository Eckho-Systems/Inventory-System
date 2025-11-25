import { Transaction, TransactionFilter, TransactionStats } from '../../types/transaction';
import { getDatabase } from '../db';

export class TransactionModel {
  static async create(transactionData: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> {
    const db = await getDatabase();
    const id = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO transactions (id, item_id, item_name, quantity_change, user_id, user_name, 
                                user_role, timestamp, transaction_type, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        transactionData.itemId,
        transactionData.itemName,
        transactionData.quantityChange,
        transactionData.userId,
        transactionData.userName,
        transactionData.userRole,
        now,
        transactionData.transactionType,
        transactionData.notes || null,
      ]
    );

    const transaction = await this.findById(id);
    if (!transaction) {
      throw new Error('Failed to create transaction');
    }
    return transaction;
  }

  static async findById(id: string): Promise<Transaction | null> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToTransaction(row);
  }

  static async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (filter?.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filter.endDate);
    }

    if (filter?.userId) {
      query += ' AND user_id = ?';
      params.push(filter.userId);
    }

    if (filter?.itemId) {
      query += ' AND item_id = ?';
      params.push(filter.itemId);
    }

    if (filter?.type) {
      query += ' AND transaction_type = ?';
      params.push(filter.type);
    }

    query += ' ORDER BY timestamp DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter?.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const result = await db.getAllAsync(query, params);
    return result.map(row => this.mapRowToTransaction(row));
  }

  static async getByItemId(itemId: string, limit: number = 20): Promise<Transaction[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM transactions WHERE item_id = ? ORDER BY timestamp DESC LIMIT ?',
      [itemId, limit]
    );
    
    return result.map(row => this.mapRowToTransaction(row));
  }

  static async getByUserId(userId: string, limit: number = 50): Promise<Transaction[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    
    return result.map(row => this.mapRowToTransaction(row));
  }

  static async getStats(filter?: Omit<TransactionFilter, 'limit' | 'offset'>): Promise<TransactionStats> {
    const db = await getDatabase();
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filter?.startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(filter.endDate);
    }

    if (filter?.userId) {
      whereClause += ' AND user_id = ?';
      params.push(filter.userId);
    }

    if (filter?.itemId) {
      whereClause += ' AND item_id = ?';
      params.push(filter.itemId);
    }

    if (filter?.type) {
      whereClause += ' AND transaction_type = ?';
      params.push(filter.type);
    }

    // Get basic stats
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END) as stock_added,
        SUM(CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END) as stock_removed
      FROM transactions ${whereClause}
    `;

    const basicStats = await db.getAllAsync(basicStatsQuery, params);
    const stats = basicStats[0];

    // Get most active user
    const mostActiveUserQuery = `
      SELECT user_id, user_name, COUNT(*) as transaction_count
      FROM transactions ${whereClause}
      GROUP BY user_id, user_name
      ORDER BY transaction_count DESC
      LIMIT 1
    `;

    const mostActiveUserResult = await db.getAllAsync(mostActiveUserQuery, params);
    const mostActiveUser = mostActiveUserResult.length > 0 ? {
      userId: mostActiveUserResult[0].user_id,
      userName: mostActiveUserResult[0].user_name,
      transactionCount: mostActiveUserResult[0].transaction_count,
    } : {
      userId: '',
      userName: '',
      transactionCount: 0,
    };

    // Get most tracked item
    const mostTrackedItemQuery = `
      SELECT item_id, item_name, COUNT(*) as transaction_count
      FROM transactions ${whereClause}
      GROUP BY item_id, item_name
      ORDER BY transaction_count DESC
      LIMIT 1
    `;

    const mostTrackedItemResult = await db.getAllAsync(mostTrackedItemQuery, params);
    const mostTrackedItem = mostTrackedItemResult.length > 0 ? {
      itemId: mostTrackedItemResult[0].item_id,
      itemName: mostTrackedItemResult[0].item_name,
      transactionCount: mostTrackedItemResult[0].transaction_count,
    } : {
      itemId: '',
      itemName: '',
      transactionCount: 0,
    };

    return {
      totalTransactions: stats.total_transactions || 0,
      stockAdded: stats.stock_added || 0,
      stockRemoved: stats.stock_removed || 0,
      mostActiveUser,
      mostTrackedItem,
    };
  }

  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM transactions WHERE id = ?',
      [id]
    );
    
    return result.rowsAffected > 0;
  }

  private static mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      quantityChange: row.quantity_change,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      timestamp: row.timestamp,
      transactionType: row.transaction_type,
      notes: row.notes,
    };
  }
}
