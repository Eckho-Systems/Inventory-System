export const createCategoriesTable = async (db: any): Promise<void> => {
  const query = `
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `;

  await db.execAsync(query);

  // Create index for better performance
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);');
};

export const seedCategories = async (db: any): Promise<void> => {
  console.log('Seeding default categories...');
  
  // Check if there are any categories already
  const existingCategories = await db.getAllAsync('SELECT COUNT(*) as count FROM categories WHERE is_active = 1');
  const categoryCount = existingCategories[0].count;
  
  if (categoryCount === 0) {
    console.log('No categories found, creating default categories...');
    
    // Get the owner user to use as created_by
    const ownerResult = await db.getAllAsync('SELECT id FROM users WHERE role = "owner" AND is_active = 1 LIMIT 1');
    const ownerId = ownerResult.length > 0 ? ownerResult[0].id : 'owner-001';
    
    const defaultCategories = [
      {
        id: 'category-001',
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: ownerId,
        is_active: 1,
      },
      {
        id: 'category-002',
        name: 'Cooking Oil',
        description: 'Various types of cooking oils',
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: ownerId,
        is_active: 1,
      },
      {
        id: 'category-003',
        name: 'Seasonings',
        description: 'Food seasonings and spices',
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: ownerId,
        is_active: 1,
      },
      {
        id: 'category-004',
        name: 'Beverages',
        description: 'Drinks and liquids',
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: ownerId,
        is_active: 1,
      },
      {
        id: 'category-005',
        name: 'Office Supplies',
        description: 'Office equipment and supplies',
        created_at: Date.now(),
        updated_at: Date.now(),
        created_by: ownerId,
        is_active: 1,
      },
    ];

    for (const category of defaultCategories) {
      await db.runAsync(
        `INSERT INTO categories (id, name, description, created_at, updated_at, created_by, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.name,
          category.description,
          category.created_at,
          category.updated_at,
          category.created_by,
          category.is_active,
        ]
      );
    }
    
    console.log('Default categories created successfully');
  }
};
