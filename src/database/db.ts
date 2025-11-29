import { Platform } from 'react-native';
import { hashPin } from '../utils/crypto';
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
    ensureStorageArray('categories');

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
          console.log('Transaction created:', newTransaction);
          return { insertId: 1, rowsAffected: 1 };
        } else if (sql.includes('INSERT INTO categories')) {
          const [id, name, description, createdAt, updatedAt, createdBy] = args || [];
          
          const existingCategories = JSON.parse(localStorage.getItem('categories') || '[]');
          const newCategory = {
            id,
            name,
            description,
            created_at: createdAt,
            updated_at: updatedAt,
            created_by: createdBy
          };
          
          existingCategories.push(newCategory);
          localStorage.setItem('categories', JSON.stringify(existingCategories));
          
          return { insertId: 1, rowsAffected: 1 };
        } else if (sql.startsWith('UPDATE items SET')) {
          return applyItemUpdate(sql, args);
        } else if (sql.startsWith('UPDATE categories SET')) {
          // Handle category updates
          const categories = JSON.parse(localStorage.getItem('categories') || '[]');
          const categoryId = args?.[args?.length - 1]; // Last argument is the ID
          
          if (!categoryId) {
            return { insertId: 0, rowsAffected: 0 };
          }

          const categoryIndex = categories.findIndex((cat: any) => cat.id === categoryId);
          if (categoryIndex === -1) {
            return { insertId: 0, rowsAffected: 0 };
          }

          const setClause = sql.substring(sql.indexOf('SET') + 3, sql.indexOf('WHERE'))
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);

          const updatedCategory = { ...categories[categoryIndex] };
          let argIndex = 0;

          setClause.forEach(clause => {
            const columnMatch = clause.match(/^([a-zA-Z_]+)\s*=\s*\?/);
            if (!columnMatch) {
              return;
            }
            const column = columnMatch[1];
            const value = args[argIndex++];
            if (value !== undefined) {
              updatedCategory[column] = value;
            }
          });

          categories[categoryIndex] = updatedCategory;
          localStorage.setItem('categories', JSON.stringify(categories));
          console.log('Category updated in localStorage:', updatedCategory);
          return { insertId: 0, rowsAffected: 1 };
        } else if (sql.startsWith('DELETE FROM transactions')) {
          const transactions = getStoredData('transactions');
          
          if (sql.includes('WHERE item_id = ?')) {
            if (sql.includes('AND transaction_type != ?')) {
              // Delete transactions by item_id but exclude a specific transaction type
              const itemId = args?.[0];
              const excludeType = args?.[1];
              const filtered = transactions.filter((txn: any) => 
                txn.item_id !== itemId || txn.transaction_type === excludeType
              );
              setStoredData('transactions', filtered);
              console.log('Deleted transactions for item_id:', itemId, 'excluding type:', excludeType, 'Count:', transactions.length - filtered.length);
              return {
                insertId: 0,
                rowsAffected: transactions.length - filtered.length,
              };
            } else {
              // Delete all transactions by item_id
              const itemId = args?.[0];
              const filtered = transactions.filter((txn: any) => txn.item_id !== itemId);
              setStoredData('transactions', filtered);
              console.log('Deleted all transactions for item_id:', itemId, 'Count:', transactions.length - filtered.length);
              return {
                insertId: 0,
                rowsAffected: transactions.length - filtered.length,
              };
            }
          } else {
            // Delete transaction by ID
            const id = args?.[0];
            const filtered = transactions.filter((txn: any) => txn.id !== id);
            setStoredData('transactions', filtered);
            return {
              insertId: 0,
              rowsAffected: transactions.length - filtered.length,
            };
          }
        } else if (sql.startsWith('DELETE FROM items')) {
          const items = getStoredData('items');
          const id = args?.[0];
          const filtered = items.filter((item: any) => item.id !== id);
          setStoredData('items', filtered);
          console.log('Deleted item from localStorage, ID:', id, 'Count:', items.length - filtered.length);
          return {
            insertId: 0,
            rowsAffected: items.length - filtered.length,
          };
        } else if (sql.startsWith('DELETE FROM categories')) {
          // Handle deleting a category by ID
          const categories = JSON.parse(localStorage.getItem('categories') || '[]');
          const id = args?.[0];
          const filtered = categories.filter((cat: any) => cat.id !== id);
          setStoredData('categories', filtered);
          console.log('Category deleted from localStorage, ID:', id);
          return {
            insertId: 0,
            rowsAffected: categories.length - filtered.length,
          };
        } else if (sql.includes('SELECT COUNT(*) as count FROM items WHERE category')) {
          // Handle category usage check for deletion
          const items = JSON.parse(localStorage.getItem('items') || '[]');
          const categoryName = args?.[0];
          const itemsUsingCategory = items.filter((item: any) => 
            item.category === categoryName
          );
          console.log('Items using category', categoryName, ':', itemsUsingCategory.length);
          return [{ count: itemsUsingCategory.length }];
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
        } else if (sql.includes('SELECT id FROM users') || sql.includes('SELECT * FROM users')) {
          let users = JSON.parse(localStorage.getItem('users') || '[]');
          
          // Also check mockUser and add to results if it matches
          const mockUserStr = localStorage.getItem('mockUser');
          if (mockUserStr) {
            const mockUser = JSON.parse(mockUserStr);
            // Add mockUser to the results if not already present
            if (!users.find((u: any) => u.id === mockUser.id)) {
              users.push({
                id: mockUser.id,
                username: mockUser.username,
                pin_hash: mockUser.pin,
                name: mockUser.name,
                role: mockUser.role,
                created_at: mockUser.createdAt,
                updated_at: mockUser.updatedAt,
                last_login_at: mockUser.lastLoginAt,
                is_active: mockUser.isActive ? 1 : 0
              });
            }
          }
          
          if (sql.includes('WHERE id = ?')) {
            const userId = args?.[0];
            const filteredUsers = users.filter((user: any) => user.id === userId && user.is_active === 1);
            console.log('Found users by ID:', filteredUsers);
            return filteredUsers;
          }
          
          return users;
        } else if (sql.includes('SELECT * FROM transactions')) {
          return queryTransactions(sql, args || []);
        } else if (sql.includes('SELECT * FROM categories')) {
          const categories = JSON.parse(localStorage.getItem('categories') || '[]');
          
          if (sql.includes('WHERE id = ?')) {
            const categoryId = args?.[0];
            const filteredCategories = categories.filter((category: any) => category.id === categoryId);
            return filteredCategories;
          } else if (sql.includes('WHERE name = ?')) {
            const categoryName = args?.[0];
            const filteredCategories = categories.filter((category: any) => category.name === categoryName);
            return filteredCategories;
          }
          
          return categories;
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
    if (!localStorage.getItem('categories')) {
      localStorage.setItem('categories', JSON.stringify([]));
    }
    
    // Check if mock user already exists
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const mockUserExists = existingUsers.some((user: any) => user.id === 'owner-001');
    
    if (!mockUserExists) {
      // Create a mock user in localStorage for web testing
      const mockUser = {
        id: 'owner-001',
        username: 'owner',
        pin_hash: hashPin('1234'), // Properly hash the PIN '1234'
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
};

// Helper function to reset database (for development)
export const resetDatabase = async (): Promise<void> => {
  // For web platform, clear localStorage
  if (Platform.OS === 'web') {
    console.log('Clearing web database (localStorage)...');
    localStorage.clear();
    console.log('Web database cleared');
    return;
  }

  // For native platforms, use the native database implementation
  const { resetNativeDatabase } = await import('./native-db');
  await resetNativeDatabase();
};

// Helper function to reset web database specifically
export const resetWebDatabase = (): void => {
  if (Platform.OS === 'web') {
    console.log('Resetting web database...');
    localStorage.removeItem('users');
    localStorage.removeItem('items');
    localStorage.removeItem('transactions');
    localStorage.removeItem('categories');
    localStorage.removeItem('mockUser');
    console.log('Web database reset complete');
  }
};
