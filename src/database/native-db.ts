// Native-only database implementation
// This file is only imported on native platforms

import * as SQLite from 'expo-sqlite';
import { createTables, dropTables, seedData } from './migrations/001_initial_schema';
import { SQLiteDatabase } from './types';

export const DATABASE_NAME = 'inventory.db';

export const getNativeDatabase = async (): Promise<SQLiteDatabase> => {
  return SQLite.openDatabaseSync(DATABASE_NAME) as unknown as SQLiteDatabase;
};

export const initNativeDatabase = async (): Promise<void> => {
  const db = await getNativeDatabase();
  
  try {
    // Enable foreign key support
    await db.execAsync('PRAGMA foreign_keys = ON;');
    console.log('Foreign key support enabled');

    // Run initial schema creation
    await createTables(db);
    console.log('Database tables created successfully');

    // Seed data if needed
    await seedData(db);
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Helper function to reset database (for development)
export const resetNativeDatabase = async (): Promise<void> => {
  const db = await getNativeDatabase();
  
  try {
    await dropTables(db);
    console.log('Tables dropped');
    
    await createTables(db);
    console.log('Tables recreated');
    
    await seedData(db);
    console.log('Database reset and seeded successfully');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
};
