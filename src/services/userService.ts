import { UserModel } from '../database/models/User';
import { CreateUserInput, LoginCredentials, UpdateUserInput, User } from '../types/user';

// Simple password hashing for demo purposes
// In production, use bcrypt or similar
export const hashPin = (pin: string): string => {
  // For demo: just reverse the pin (NOT SECURE FOR PRODUCTION)
  return pin.split('').reverse().join('');
};

const verifyPin = (pin: string, hashedPin: string): boolean => {
  return hashPin(pin) === hashedPin;
};

export const userService = {
  async authenticate(credentials: LoginCredentials): Promise<User | null> {
    try {
      console.log('Authenticating user:', credentials.username);
      
      const user = await UserModel.findByUsername(credentials.username);
      
      if (!user) {
        console.log('User not found:', credentials.username);
        return null;
      }

      console.log('User found:', user.username, 'with role:', user.role);
      console.log('Stored PIN hash:', user.pin);
      console.log('Input PIN:', credentials.pin);
      console.log('Input PIN hash:', hashPin(credentials.pin));

      // Verify PIN
      if (!verifyPin(credentials.pin, user.pin)) {
        console.log('PIN verification failed');
        return null;
      }

      console.log('Authentication successful for:', user.username);

      // Update last login
      await UserModel.updateLastLogin(user.id);
      
      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  },

  async create(userData: CreateUserInput): Promise<User> {
    try {
      // Hash the PIN before storing
      const hashedUserData = {
        ...userData,
        pin: hashPin(userData.pin),
      };

      return await UserModel.create(hashedUserData);
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  async update(userData: UpdateUserInput): Promise<User | null> {
    try {
      // Hash the PIN if it's being updated
      const updateData = { ...userData };
      if (userData.pin) {
        updateData.pin = hashPin(userData.pin);
      }

      return await UserModel.update(updateData);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  async getAll(): Promise<User[]> {
    try {
      return await UserModel.getAll();
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  },

  async findById(id: string): Promise<User | null> {
    try {
      return await UserModel.findById(id);
    } catch (error) {
      console.error('Find user error:', error);
      throw error;
    }
  },

  async deactivate(id: string): Promise<boolean> {
    try {
      return await UserModel.deactivate(id);
    } catch (error) {
      console.error('Deactivate user error:', error);
      throw error;
    }
  },

  // Helper method to check if a user can create another user with a specific role
  canCreateUser(creatorRole: string, targetRole: string): boolean {
    switch (creatorRole) {
      case 'staff':
        return false; // Staff cannot create users
      case 'manager':
        return targetRole === 'staff'; // Managers can only create staff
      case 'owner':
        return ['staff', 'manager', 'owner'].includes(targetRole); // Owners can create anyone
      default:
        return false;
    }
  },

  // Helper method to check if a user can perform certain actions
  canPerformAction(userRole: string, action: string): boolean {
    const permissions = {
      staff: ['add_stock', 'remove_stock', 'view_inventory'],
      manager: ['add_stock', 'remove_stock', 'view_inventory', 'add_item', 'view_reports', 'add_staff_user', 'view_transactions'],
      owner: ['add_stock', 'remove_stock', 'view_inventory', 'add_item', 'view_reports', 'add_staff_user', 'add_manager_user', 'add_owner_user', 'view_transactions', 'manage_users'],
    };

    return permissions[userRole as keyof typeof permissions]?.includes(action) || false;
  }
};
