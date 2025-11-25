export const createTables = async (db: any): Promise<void> => {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'owner')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER,
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1))
    );`,

    // Items table
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      description TEXT,
      low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
      date_added INTEGER NOT NULL,
      last_stock_added INTEGER,
      last_stock_removed INTEGER,
      created_by TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );`,

    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove')),
      notes TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,

    // Create indexes for better performance
    `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);`,
    `CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
  ];

  for (const query of queries) {
    await db.execAsync(query);
  }
};

export const dropTables = async (db: any): Promise<void> => {
  const queries = [
    'DROP TABLE IF EXISTS transactions;',
    'DROP TABLE IF EXISTS items;',
    'DROP TABLE IF EXISTS users;',
  ];

  for (const query of queries) {
    await db.execAsync(query);
  }
};

// Seed data for testing - create a default owner user
export const seedData = async (db: any): Promise<void> => {
  console.log('Starting database seeding...');
  
  // Check if there are any users already
  const existingUsers = await db.getAllAsync('SELECT COUNT(*) as count FROM users');
  const userCount = existingUsers[0].count;
  console.log('Existing user count:', userCount);

  if (userCount === 0) {
    console.log('No users found, creating default owner user...');
    
    // Create default owner user
    const defaultOwner = {
      id: 'owner-001',
      username: 'owner',
      pin_hash: '4321', // This is "1234" reversed (hashPin function)
      name: 'Business Owner',
      role: 'owner',
      created_at: Date.now(),
      updated_at: Date.now(),
      is_active: 1,
    };
    
    console.log('Default owner data:', { ...defaultOwner, pin_hash: '***' });

    await db.runAsync(
      `INSERT INTO users (id, username, pin_hash, name, role, created_at, updated_at, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        defaultOwner.id,
        defaultOwner.username,
        defaultOwner.pin_hash,
        defaultOwner.name,
        defaultOwner.role,
        defaultOwner.created_at,
        defaultOwner.updated_at,
        defaultOwner.is_active,
      ]
    );
    
    console.log('Default owner user inserted successfully');

    // Create sample inventory items
    const sampleItems = [
      {
        id: 'item-001',
        name: 'Laptop',
        category: 'Electronics',
        quantity: 10,
        description: 'Dell Latitude 5420',
        low_stock_threshold: 5,
        date_added: Date.now(),
        created_by: defaultOwner.id,
        updated_at: Date.now(),
      },
      {
        id: 'item-002',
        name: 'Vegetable Oil 1L',
        category: 'Cooking Oil',
        quantity: 15,
        description: 'Refined vegetable oil in 1L bottles',
        low_stock_threshold: 8,
        date_added: Date.now(),
        created_by: defaultOwner.id,
        updated_at: Date.now(),
      },
      {
        id: 'item-003',
        name: 'Liquid Seasoning',
        category: 'Seasonings',
        quantity: 5, // Below threshold to test low stock alert
        description: 'All-purpose liquid seasoning',
        low_stock_threshold: 10,
        date_added: Date.now(),
        created_by: defaultOwner.id,
        updated_at: Date.now(),
      },
    ];

    for (const item of sampleItems) {
      await db.runAsync(
        `INSERT INTO items (id, name, category, quantity, description, low_stock_threshold, 
                           date_added, created_by, updated_at, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.category,
          item.quantity,
          item.description,
          item.low_stock_threshold,
          item.date_added,
          item.created_by,
          item.updated_at,
          1, // is_active
        ]
      );
    }
  }
};
