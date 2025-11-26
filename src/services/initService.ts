import { initDefaultData } from '../database/init/initDefaultData';

export const initializeAppData = async (): Promise<void> => {
  try {
    console.log('Initializing app data...');
    
    // Initialize default data (including admin user)
    const success = await initDefaultData();
    
    if (success) {
      console.log('App data initialized successfully');
    } else {
      console.error('Failed to initialize app data');
    }
  } catch (error) {
    console.error('Error initializing app data:', error);
  }
};
