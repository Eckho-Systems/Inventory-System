import { CategoryModel } from '../database/models/Category';
import { useAuthStore } from '../stores/authStore';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category';
const { eventEmitter } = require('../utils/eventEmitter');

export class CategoryService {
  static async createCategory(categoryData: CreateCategoryInput): Promise<Category> {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if user has permission (owner or manager)
    if (currentUser.role !== 'owner' && currentUser.role !== 'manager') {
      throw new Error('Only owners and managers can create categories');
    }

    const category = await CategoryModel.create(categoryData, currentUser.id);
    // Emit event to notify listeners that categories have changed
    eventEmitter.emit('categoriesChanged', { action: 'created', category });
    return category;
  }

  static async getAllCategories(): Promise<Category[]> {
    return await CategoryModel.getAll();
  }

  static async getCategoryById(id: string): Promise<Category | null> {
    return await CategoryModel.findById(id);
  }

  static async getCategoryByName(name: string): Promise<Category | null> {
    return await CategoryModel.findByName(name);
  }

  static async updateCategory(categoryData: UpdateCategoryInput): Promise<Category | null> {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if user has permission (owner or manager)
    if (currentUser.role !== 'owner' && currentUser.role !== 'manager') {
      throw new Error('Only owners and managers can update categories');
    }

    const category = await CategoryModel.update(categoryData);
    if (category) {
      // Emit event to notify listeners that categories have changed
      eventEmitter.emit('categoriesChanged', { action: 'updated', category });
    }
    return category;
  }

  static async deleteCategory(id: string): Promise<boolean> {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Check if user has permission (owner or manager)
    if (currentUser.role !== 'owner' && currentUser.role !== 'manager') {
      throw new Error('Only owners and managers can delete categories');
    }

    const success = await CategoryModel.delete(id);
    if (success) {
      // Emit event to notify listeners that categories have changed
      eventEmitter.emit('categoriesChanged', { action: 'deleted', categoryId: id });
    }
    return success;
  }

  static async getCategoryNames(): Promise<string[]> {
    const categories = await CategoryModel.getAll();
    return categories.map(category => category.name);
  }
}
