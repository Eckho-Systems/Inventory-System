import { CategoryModel } from '../database/models/Category';
import { useAuthStore } from '../stores/authStore';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category';

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

    return await CategoryModel.create(categoryData, currentUser.id);
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

    return await CategoryModel.update(categoryData);
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

    return await CategoryModel.deactivate(id);
  }

  static async getCategoryNames(): Promise<string[]> {
    const categories = await CategoryModel.getAll();
    return categories.map(category => category.name);
  }
}
