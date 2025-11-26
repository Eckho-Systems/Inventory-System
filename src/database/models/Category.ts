import { Category, CreateCategoryInput, UpdateCategoryInput } from '../../types/category';
import { getDatabase } from '../db';

export class CategoryModel {
  static async create(categoryData: CreateCategoryInput, createdBy: string): Promise<Category> {
    const db = await getDatabase();
    const id = `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Check if category name already exists
    const existing = await this.findByName(categoryData.name);
    if (existing) {
      throw new Error('Category with this name already exists');
    }

    await db.runAsync(
      `INSERT INTO categories (id, name, description, created_at, updated_at, created_by, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        categoryData.name,
        categoryData.description || null,
        now,
        now,
        createdBy,
        1, // is_active
      ]
    );

    const category = await this.findById(id);
    if (!category) {
      throw new Error('Failed to create category');
    }
    return category;
  }

  static async findById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM categories WHERE id = ? AND is_active = 1',
      [id]
    );
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToCategory(row);
  }

  static async findByName(name: string): Promise<Category | null> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM categories WHERE name = ? AND is_active = 1',
      [name]
    );
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToCategory(row);
  }

  static async getAll(): Promise<Category[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC'
    );
    
    return result.map(row => this.mapRowToCategory(row));
  }

  static async update(categoryData: UpdateCategoryInput): Promise<Category | null> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (categoryData.name !== undefined) {
      // Check if new name already exists (excluding current category)
      const existing = await this.findByName(categoryData.name);
      if (existing && existing.id !== categoryData.id) {
        throw new Error('Category with this name already exists');
      }
      updates.push('name = ?');
      values.push(categoryData.name);
    }
    if (categoryData.description !== undefined) {
      updates.push('description = ?');
      values.push(categoryData.description);
    }
    if (categoryData.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(categoryData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return await this.findById(categoryData.id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(categoryData.id);

    await db.runAsync(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(categoryData.id);
  }

  static async deactivate(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    // Check if category is being used by any items
    const itemsUsingCategory = await db.getAllAsync(
      'SELECT COUNT(*) as count FROM items WHERE category = (SELECT name FROM categories WHERE id = ?) AND is_active = 1',
      [id]
    );
    
    if (itemsUsingCategory[0].count > 0) {
      throw new Error('Cannot delete category that is being used by items');
    }

    const result = await db.runAsync(
      'UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    return result.rowsAffected > 0;
  }

  private static mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      isActive: Boolean(row.is_active),
    };
  }
}
