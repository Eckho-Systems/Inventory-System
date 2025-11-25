import { hashPin } from '../../services/userService';
import { UserRole } from '../../types/user';
import { UserModel } from '../models/User';

export const initDefaultData = async (): Promise<boolean> => {
  try {
    console.log('Initializing default data...');
    
    // Check if owner user already exists
    const existingOwner = await UserModel.findByUsername('owner');
    if (existingOwner) {
      console.log('Default owner user already exists');
      return true;
    }

    console.log('Creating default owner user...');
    
    // Create default owner user
    const hashedPin = hashPin('1234');
    
    await UserModel.create({
      username: 'owner',
      pin: hashedPin,
      name: 'Business Owner',
      role: UserRole.OWNER,
    });

    console.log('Default owner user created');
    return true;
  } catch (error) {
    console.error('Failed to initialize default data:', error);
    return false;
  }
};
