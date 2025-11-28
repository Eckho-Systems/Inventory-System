export const createCategoriesTable = async (db: any): Promise<void> => {
  const query = `
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `;

  await db.execAsync(query);

  // Create index for better performance
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);');
};

export const seedCategories = async (db: any): Promise<void> => {
  console.log('Categories table created - no dummy data seeded');
};
