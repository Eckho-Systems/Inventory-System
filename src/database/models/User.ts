import { Platform } from 'react-native';
import { getDatabase } from '../../database/db';
import { CreateUserInput, LoginCredentials, UpdateUserInput, User } from '../../types/user';
import { hashPin } from '../../utils/crypto';

export class UserModel {
  static async create(userData: CreateUserInput): Promise<User> {
    // For web platform, just return a mock user
    if (Platform.OS === 'web') {
      const user: User = {
        id: `user-${Date.now()}`,
        username: userData.username,
        pin: userData.pin, // Already hashed
        name: userData.name,
        role: userData.role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
      };
      
      // Store in localStorage
      localStorage.setItem(`user_${user.id}`, JSON.stringify(user));
      return user;
    }

    const db = await getDatabase();
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO users (id, username, pin_hash, name, role, created_at, updated_at, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userData.username,
        userData.pin, // Note: This should be hashed before calling this method
        userData.name,
        userData.role,
        now,
        now,
        1, // is_active
      ]
    );

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  static async findById(id: string): Promise<User | null> {
    // For web platform, check localStorage
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem(`user_${id}`);
      if (userStr) {
        return JSON.parse(userStr);
      }
      
      // Check mock user
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.id === id) {
          return mockUser;
        }
      }
      return null;
    }

    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToUser(row);
  }

  static async findByUsername(username: string): Promise<User | null> {
    // For web platform, check localStorage
    if (Platform.OS === 'web') {
      // Check mock user first
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.username === username) {
          return mockUser;
        }
      }
      
      // Check other users
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
          const userStr = localStorage.getItem(key);
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.username === username) {
              return user;
            }
          }
        }
      }
      return null;
    }

    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToUser(row);
  }

  static async authenticate(credentials: LoginCredentials): Promise<User | null> {
    console.log('Looking up user:', credentials.username);
    
    // For web platform, check localStorage
    if (Platform.OS === 'web') {
      console.log('Using web platform authentication');
      
      // Check mock user first
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.username === credentials.username) {
          console.log('Found mock user:', mockUser.username);
          
          // Verify PIN
          const inputPinHash = hashPin(credentials.pin);
          console.log('Web PIN verification:', {
            inputPin: credentials.pin,
            inputPinHash: inputPinHash,
            storedPinHash: mockUser.pin,
            match: inputPinHash === mockUser.pin
          });
          
          if (inputPinHash === mockUser.pin) {
            console.log('Web authentication successful');
            return mockUser;
          } else {
            console.log('Web PIN verification failed');
            return null;
          }
        }
      }
      console.log('User not found in localStorage');
      return null;
    }

    // For native platform, use database
    const db = await getDatabase();
    
    const result = await db.getAllAsync(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [credentials.username]
    );
    
    console.log('Database query result:', result.length, 'rows found');
    if (result.length > 0) {
      console.log('First row data:', result[0]);
    }
    
    if (result.length === 0) {
      console.log('User not found in database');
      return null;
    }

    const user = this.mapRowToUser(result[0]);
    console.log('Mapped user object:', {
      id: user.id,
      username: user.username,
      pin: user.pin,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });
    
    // Verify PIN using the same hashing method as userService
    const inputPinHash = hashPin(credentials.pin);
    console.log('PIN verification:', {
      inputPin: credentials.pin,
      inputPinHash: inputPinHash,
      storedPinHash: user.pin,
      match: inputPinHash === user.pin
    });
    
    if (inputPinHash !== user.pin) {
      console.log('PIN verification failed');
      return null;
    }

    console.log('Authentication successful for:', user.username);

    // Update last login
    await this.updateLastLogin(user.id);
    
    return user;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    // For web platform, update localStorage
    if (Platform.OS === 'web') {
      const userStr = localStorage.getItem(`user_${userId}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        user.lastLoginAt = Date.now();
        user.updatedAt = Date.now();
        localStorage.setItem(`user_${userId}`, JSON.stringify(user));
      }
      
      // Also update mock user if it matches
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.id === userId) {
          mockUser.lastLoginAt = Date.now();
          mockUser.updatedAt = Date.now();
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
        }
      }
      return;
    }

    const db = await getDatabase();
    await db.runAsync(
      'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?',
      [Date.now(), Date.now(), userId]
    );
  }

  static async update(userData: UpdateUserInput): Promise<User | null> {
    // For web platform, update localStorage
    if (Platform.OS === 'web') {
      // Check regular user
      const userStr = localStorage.getItem(`user_${userData.id}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        
        if (userData.name !== undefined) user.name = userData.name;
        if (userData.pin !== undefined) user.pin = userData.pin;
        if (userData.role !== undefined) user.role = userData.role;
        if (userData.isActive !== undefined) user.isActive = userData.isActive;
        
        user.updatedAt = Date.now();
        localStorage.setItem(`user_${userData.id}`, JSON.stringify(user));
        return user;
      }
      
      // Check mock user
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.id === userData.id) {
          if (userData.name !== undefined) mockUser.name = userData.name;
          if (userData.pin !== undefined) mockUser.pin = userData.pin;
          if (userData.role !== undefined) mockUser.role = userData.role;
          if (userData.isActive !== undefined) mockUser.isActive = userData.isActive;
          
          mockUser.updatedAt = Date.now();
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          return mockUser;
        }
      }
      
      return null;
    }

    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (userData.name !== undefined) {
      updates.push('name = ?');
      values.push(userData.name);
    }
    if (userData.pin !== undefined) {
      updates.push('pin_hash = ?');
      values.push(userData.pin); // Note: This should be hashed
    }
    if (userData.role !== undefined) {
      updates.push('role = ?');
      values.push(userData.role);
    }
    if (userData.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(userData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return await this.findById(userData.id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(userData.id);

    await db.runAsync(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.findById(userData.id);
  }

  static async getAll(): Promise<User[]> {
    // For web platform, check localStorage
    if (Platform.OS === 'web') {
      const users: User[] = [];
      
      // Check mock user first
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.isActive) {
          users.push(mockUser);
        }
      }
      
      // Check other users
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
          const userStr = localStorage.getItem(key);
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.isActive) {
              users.push(user);
            }
          }
        }
      }
      
      // Sort by created_at DESC
      return users.sort((a, b) => b.createdAt - a.createdAt);
    }

    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC'
    );
    
    return result.map(row => this.mapRowToUser(row));
  }

  static async deactivate(id: string): Promise<boolean> {
    // For web platform, update localStorage
    if (Platform.OS === 'web') {
      // Check regular user
      const userStr = localStorage.getItem(`user_${id}`);
      if (userStr) {
        const user = JSON.parse(userStr);
        user.isActive = false;
        user.updatedAt = Date.now();
        localStorage.setItem(`user_${id}`, JSON.stringify(user));
        return true;
      }
      
      // Check mock user
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.id === id) {
          mockUser.isActive = false;
          mockUser.updatedAt = Date.now();
          localStorage.setItem('mockUser', JSON.stringify(mockUser));
          return true;
        }
      }
      
      return false;
    }

    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    return result.rowsAffected > 0;
  }

  static async delete(id: string): Promise<boolean> {
    // For web platform, remove from localStorage
    if (Platform.OS === 'web') {
      // Check regular user
      const userStr = localStorage.getItem(`user_${id}`);
      if (userStr) {
        localStorage.removeItem(`user_${id}`);
        return true;
      }
      
      // Check mock user
      const mockUserStr = localStorage.getItem('mockUser');
      if (mockUserStr) {
        const mockUser = JSON.parse(mockUserStr);
        if (mockUser.id === id) {
          localStorage.removeItem('mockUser');
          return true;
        }
      }
      
      return false;
    }

    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    
    return result.rowsAffected > 0;
  }

  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      pin: row.pin_hash,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      isActive: Boolean(row.is_active),
    };
  }
}
