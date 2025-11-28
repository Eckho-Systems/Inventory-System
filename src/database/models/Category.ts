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
      `INSERT INTO categories (id, name, description, created_at, updated_at, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        categoryData.name,
        categoryData.description || null,
        now,
        now,
        createdBy,
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
      'SELECT * FROM categories WHERE id = ?',
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
      'SELECT * FROM categories WHERE name = ?',
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
      'SELECT * FROM categories ORDER BY name ASC'
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

  static async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    console.log('Attempting to delete category with ID:', id);
    
    // First check if category exists
    const category = await this.findById(id);
    if (!category) {
      console.log('Category not found with ID:', id);
      throw new Error('Category not found');
    }
    
    console.log('Category found:', category.name);
    
    // Check if category is being used by any items
    const itemsUsingCategory = await db.getAllAsync(
      'SELECT COUNT(*) as count FROM items WHERE category = ?',
      [category.name]
    );
    
    console.log('Raw query result:', itemsUsingCategory);
    
    const itemCount = itemsUsingCategory && itemsUsingCategory[0] ? itemsUsingCategory[0].count : 0;
    console.log('Items using this category:', itemCount);
    
    if (itemCount > 0) {
      console.log('Cannot delete category - items are using it');
      throw new Error('Cannot delete category that is being used by items');
    }

    console.log('Proceeding with category deletion');
    const result = await db.runAsync(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );
    
    console.log('Deletion result - rows affected:', result.rowsAffected);
    
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
      isActive: true, // All categories are now always active
    };
  }
}
