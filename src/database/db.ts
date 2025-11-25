import { Platform } from 'react-native';
import { initDefaultData } from './init/initDefaultData';
import { SQLiteDatabase, SQLResultSet, SQLTransaction } from './types';

export const DATABASE_NAME = 'inventory.db';

export const getDatabase = async (): Promise<SQLiteDatabase> => {
  // For web, we need to provide a localStorage-based implementation
  if (Platform.OS === 'web') {
    const ensureStorageArray = (key: string) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    ensureStorageArray('items');
    ensureStorageArray('users');
    ensureStorageArray('transactions');

    const getStoredData = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
    const setStoredData = (key: string, value: any[]) => localStorage.setItem(key, JSON.stringify(value));

    const applyItemUpdate = (sql: string, args: any[] = []) => {
      const items = getStoredData('items');
      const itemId = args[args.length - 1];
      if (!itemId) {
        return { insertId: 0, rowsAffected: 0 };
      }

      const itemIndex = items.findIndex((item: any) => item.id === itemId);
      if (itemIndex === -1) {
        return { insertId: 0, rowsAffected: 0 };
      }

      const setClause = sql.substring(sql.indexOf('SET') + 3, sql.indexOf('WHERE'))
        .split(',')
        .map(part => part.trim())
        .filter(Boolean);

      const updatedItem = { ...items[itemIndex] };
      let argIndex = 0;

      setClause.forEach(clause => {
        const columnMatch = clause.match(/^([a-zA-Z_]+)\s*=\s*\?/);
        if (!columnMatch) {
          return;
        }
        const column = columnMatch[1];
        const value = args[argIndex++];
        if (value !== undefined) {
          updatedItem[column] = value;
        }
      });

      items[itemIndex] = updatedItem;
      setStoredData('items', items);
      return { insertId: 0, rowsAffected: 1 };
    };

    const queryTransactions = (sql: string, args: any[] = []) => {
      let results = [...getStoredData('transactions')];
      const params = [...args];

      let offset: number | undefined;
      if (sql.includes('OFFSET ?')) {
        offset = params.pop();
      }

      let limit: number | undefined;
      if (sql.includes('LIMIT ?')) {
        limit = params.pop();
      }

      const consume = () => params.shift();

      const applyFilter = (clause: string, predicate: (txn: any, value: any) => boolean) => {
        if (sql.includes(clause)) {
          const value = consume();
          results = results.filter(txn => predicate(txn, value));
        }
      };

      if (sql.includes('WHERE id = ?')) {
        const value = consume();
        results = results.filter(txn => txn.id === value);
      }

      applyFilter('item_id = ?', (txn, value) => txn.item_id === value);
      applyFilter('user_id = ?', (txn, value) => txn.user_id === value);
      applyFilter('timestamp >= ?', (txn, value) => txn.timestamp >= value);
      applyFilter('timestamp <= ?', (txn, value) => txn.timestamp <= value);
      applyFilter('transaction_type = ?', (txn, value) => txn.transaction_type === value);

      if (sql.includes('ORDER BY timestamp DESC')) {
        results.sort((a, b) => b.timestamp - a.timestamp);
      } else if (sql.includes('ORDER BY timestamp ASC')) {
        results.sort((a, b) => a.timestamp - b.timestamp);
      }

      if (typeof offset === 'number') {
        results = results.slice(offset);
      }

      if (typeof limit === 'number') {
        results = results.slice(0, limit);
      }

      return results;
    };

    return {
      transaction: (
        callback: (tx: SQLTransaction) => void,
        errorCallback?: (error: Error) => void,
        successCallback?: () => void
      ) => {
        try {
          const mockTx: SQLTransaction = {
            executeSql: (
              sql: string,
              args: any[] = [],
              success?: (tx: SQLTransaction, result: SQLResultSet) => void,
              error?: (tx: SQLTransaction, error: Error) => boolean | void
            ) => {
              if (success) {
                success(mockTx, {
                  insertId: 0,
                  rowsAffected: 0,
                  rows: {
                    length: 0,
                    _array: [],
                    item: () => null
                  }
                });
              }
            }
          };
          callback(mockTx);
          successCallback?.();
        } catch (err) {
          errorCallback?.(err as Error);
        }
      },
      runAsync: async (sql: string, args?: any[]) => {
        console.log('Web DB runAsync:', sql, args);
        
        // Parse the SQL to determine what operation to perform
        if (sql.includes('INSERT INTO items')) {
          // Extract item data from args
          const [id, name, category, quantity, description, lowStockThreshold, dateAdded, createdBy, updatedAt, isActive] = args || [];
          
          // Get existing items from localStorage
          const existingItems = JSON.parse(localStorage.getItem('items') || '[]');
          
          // Create new item
          const newItem = {
            id,
            name,
            category,
            quantity,
            description,
            low_stock_threshold: lowStockThreshold,
            date_added: dateAdded,
            created_by: createdBy,
            updated_at: updatedAt,
            is_active: isActive,
            last_stock_added: null,
            last_stock_removed: null
          };
          
          // Add to localStorage
          existingItems.push(newItem);
          localStorage.setItem('items', JSON.stringify(existingItems));
          
          console.log('Item stored in localStorage:', newItem);
          
          return { insertId: 1, rowsAffected: 1 };
        } else if (sql.includes('INSERT INTO users')) {
          // Handle user insertion
          const [id, username, pinHash, name, role, createdAt, updatedAt, lastLoginAt, isActive] = args || [];
          
          const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
          const newUser = {
            id,
            username,
            pin_hash: pinHash,
            name,
            role,
            created_at: createdAt,
            updated_at: updatedAt,
            last_login_at: lastLoginAt,
            is_active: isActive
          };
          
          existingUsers.push(newUser);
          localStorage.setItem('users', JSON.stringify(existingUsers));
          
          return { insertId: 1, rowsAffected: 1 };
        } else if (sql.includes('INSERT INTO transactions')) {
          const [
            id,
            itemId,
            itemName,
            quantityChange,
            userId,
            userName,
            userRole,
            timestamp,
            transactionType,
            notes,
          ] = args || [];

          const transactions = getStoredData('transactions');
          const newTransaction = {
            id,
            item_id: itemId,
            item_name: itemName,
            quantity_change: quantityChange,
            user_id: userId,
            user_name: userName,
            user_role: userRole,
            timestamp,
            transaction_type: transactionType,
            notes: notes ?? null,
          };

          transactions.push(newTransaction);
          setStoredData('transactions', transactions);
          return { insertId: 1, rowsAffected: 1 };
        } else if (sql.startsWith('UPDATE items SET')) {
          return applyItemUpdate(sql, args);
        } else if (sql.startsWith('DELETE FROM transactions')) {
          const transactions = getStoredData('transactions');
          const id = args?.[0];
          const filtered = transactions.filter((txn: any) => txn.id !== id);
          setStoredData('transactions', filtered);
          return {
            insertId: 0,
            rowsAffected: transactions.length - filtered.length,
          };
        }
        
        return { insertId: 0, rowsAffected: 0 };
      },
      getAllAsync: async (sql: string, args?: any[]) => {
        console.log('Web DB getAllAsync:', sql, args);
        
        if (sql.includes('SELECT * FROM items')) {
          const items = JSON.parse(localStorage.getItem('items') || '[]');
          
          if (sql.includes('WHERE id = ?')) {
            // Find by ID
            const itemId = args?.[0];
            const filteredItems = items.filter((item: any) => item.id === itemId && item.is_active === 1);
            console.log('Found items by ID:', filteredItems);
            return filteredItems;
          } else if (sql.includes('WHERE is_active = 1')) {
            // Get all active items
            const activeItems = items.filter((item: any) => item.is_active === 1);
            console.log('Found active items:', activeItems);
            return activeItems;
          }
          
          return items;
        } else if (sql.includes('SELECT id FROM users')) {
          const users = JSON.parse(localStorage.getItem('users') || '[]');
          
          if (sql.includes('WHERE id = ?')) {
            const userId = args?.[0];
            const filteredUsers = users.filter((user: any) => user.id === userId && user.is_active === 1);
            console.log('Found users by ID:', filteredUsers);
            return filteredUsers;
          }
          
          return users;
        } else if (sql.includes('SELECT * FROM transactions')) {
          return queryTransactions(sql, args || []);
        }
        
        return [];
      },
      execAsync: async (sql: string) => {
        console.log('Web DB execAsync:', sql);
        // For basic exec operations, just return empty array
        return [];
      },
      closeAsync: async () => {},
    };
  }

  // For native platforms, use the native database implementation
  const { getNativeDatabase } = await import('./native-db');
  return getNativeDatabase();
};

export const initDatabase = async (): Promise<void> => {
  // For web platform, we need to create a mock user in localStorage
  if (Platform.OS === 'web') {
    console.log('Initializing web database (localStorage)...');
    
    // Initialize empty arrays if they don't exist
    if (!localStorage.getItem('items')) {
      localStorage.setItem('items', JSON.stringify([]));
    }
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    
    // Check if mock user already exists
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const mockUserExists = existingUsers.some((user: any) => user.id === 'owner-001');
    
    if (!mockUserExists) {
      // Create a mock user in localStorage for web testing
      const mockUser = {
        id: 'owner-001',
        username: 'owner',
        pin_hash: '4321', // Hashed version of '1234'
        name: 'Business Owner',
        role: 'owner',
        created_at: Date.now(),
        updated_at: Date.now(),
        last_login_at: Date.now(),
        is_active: 1
      };
      
      existingUsers.push(mockUser);
      localStorage.setItem('users', JSON.stringify(existingUsers));
      console.log('Web database initialized with mock user:', mockUser);
    } else {
      console.log('Mock user already exists in web database');
    }
    return;
  }

  // For native platforms, use the native database implementation
  console.log('Initializing native database...');
  const { initNativeDatabase } = await import('./native-db');
  await initNativeDatabase();
  console.log('Native database initialized');
  
  // Initialize default data including admin user if needed
  console.log('Initializing default data including admin user if needed');
  await initDefaultData();
  console.log('Database initialization complete');
};

// Helper function to reset database (for development)
export const resetDatabase = async (): Promise<void> => {
  // For web platform, just log that database is reset (mock)
  if (Platform.OS === 'web') {
    console.log('Database reset (web mock)');
    return;
  }

  // For native platforms, use the native database implementation
  const { resetNativeDatabase } = await import('./native-db');
  await resetNativeDatabase();
  // Initialize default data including admin user if needed
  await initDefaultData();
};
