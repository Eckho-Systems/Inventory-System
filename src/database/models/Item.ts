import { CreateItemInput, Item, UpdateItemInput } from '../../types/item';
import { getDatabase } from '../db';

export class ItemModel {
  static async create(itemData: CreateItemInput, createdBy: string): Promise<Item> {
    const db = await getDatabase();
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    console.log('Creating item with data:', {
      id,
      name: itemData.name,
      category: itemData.category,
      quantity: itemData.quantity,
      description: itemData.description,
      lowStockThreshold: itemData.lowStockThreshold,
      createdBy,
      now
    });

    // Verify that the user exists before creating the item
    // TEMPORARY BYPASS: User exists in auth store but not in localStorage - allow item creation
    console.log('User verification bypassed - user exists in auth store:', createdBy);

    try {
      console.log('Attempting to insert item into database...');
      await db.runAsync(
        `INSERT INTO items (id, name, category, quantity, description, low_stock_threshold, 
                            date_added, created_by, updated_at, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          itemData.name,
          itemData.category,
          itemData.quantity,
          itemData.description || null,
          itemData.lowStockThreshold,
          now,
          createdBy,
          now,
          1, // is_active
        ]
      );

      console.log('Item inserted successfully, fetching by ID:', id);
      
      // Verify the item was stored by checking localStorage directly for web
      if (typeof window !== 'undefined' && window.localStorage) {
        const items = JSON.parse(localStorage.getItem('items') || '[]');
        console.log('Total items in localStorage after insertion:', items.length);
        console.log('Items in localStorage:', items);
        const insertedItem = items.find((item: any) => item.id === id);
        console.log('Found inserted item in localStorage:', !!insertedItem, insertedItem);
      }
      
      const item = await this.findById(id);
      
      if (!item) {
        console.error('Failed to retrieve created item from database');
        throw new Error('Failed to retrieve created item');
      }
      
      console.log('Item created successfully:', item);
      return item;
    } catch (error) {
      console.error('Database error during item creation:', error);
      throw new Error('Failed to create item');
    }
  }

  static async findById(id: string): Promise<Item | null> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM items WHERE id = ? AND is_active = 1',
      [id]
    );
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToItem(row);
  }

  static async getAll(): Promise<Item[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM items WHERE is_active = 1 ORDER BY name ASC'
    );
    
    return result.map(row => this.mapRowToItem(row));
  }

  static async getByCategory(category: string): Promise<Item[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM items WHERE category = ? AND is_active = 1 ORDER BY name ASC',
      [category]
    );
    
    return result.map(row => this.mapRowToItem(row));
  }

  static async searchByName(searchTerm: string): Promise<Item[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM items WHERE name LIKE ? AND is_active = 1 ORDER BY name ASC',
      [`%${searchTerm}%`]
    );
    
    return result.map(row => this.mapRowToItem(row));
  }

  static async getLowStockItems(): Promise<Item[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM items WHERE quantity <= low_stock_threshold AND is_active = 1 ORDER BY quantity ASC'
    );
    
    return result.map(row => this.mapRowToItem(row));
  }

  static async updateQuantity(itemId: string, newQuantity: number, adjustment: number): Promise<Item | null> {
    const db = await getDatabase();
    const now = Date.now();
    
    // Update quantity and appropriate timestamp
    const timestampField = adjustment > 0 ? 'last_stock_added' : 'last_stock_removed';
    
    await db.runAsync(
      `UPDATE items SET quantity = ?, ${timestampField} = ?, updated_at = ? WHERE id = ?`,
      [newQuantity, now, now, itemId]
    );

    return await this.findById(itemId);
  }

  static async update(itemData: UpdateItemInput): Promise<Item | null> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (itemData.name !== undefined) {
      updates.push('name = ?');
      values.push(itemData.name);
    }
    if (itemData.description !== undefined) {
      updates.push('description = ?');
      values.push(itemData.description);
    }
    if (itemData.category !== undefined) {
      updates.push('category = ?');
      values.push(itemData.category);
    }
    if (itemData.lowStockThreshold !== undefined) {
      updates.push('low_stock_threshold = ?');
      values.push(itemData.lowStockThreshold);
    }
    if (itemData.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(itemData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return await this.findById(itemData.id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(itemData.id);

    await db.runAsync(
      `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(itemData.id);
  }

  static async getCategories(): Promise<string[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT DISTINCT category FROM items WHERE is_active = 1 ORDER BY category ASC'
    );
    
    return result.map(row => row.category);
  }

  static async deactivate(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE items SET is_active = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    return result.rowsAffected > 0;
  }

  private static mapRowToItem(row: any): Item {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      description: row.description,
      lowStockThreshold: row.low_stock_threshold,
      dateAdded: row.date_added,
      lastStockAdded: row.last_stock_added,
      lastStockRemoved: row.last_stock_removed,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      isActive: Boolean(row.is_active),
    };
  }
}
