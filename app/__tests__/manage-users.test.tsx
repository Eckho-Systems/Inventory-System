import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import ManageUsersScreen from '../../app/(tabs)/manage-users';
import { userService } from '../../src/services/userService';
import { useAuth } from '../../src/stores';
import { UserRole } from '../../src/types/user';

// Mock the useAuth hook
jest.mock('../../src/stores', () => ({
  useAuth: jest.fn(),
  authStore: {
    user: null,
    userRole: null,
  },
}));

// Mock the userService
jest.mock('../../src/services/userService', () => ({
  userService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ManageUsersScreen', () => {
  const mockUsers = [
    {
      id: '1',
      username: 'admin',
      name: 'Admin User',
      role: UserRole.OWNER, // Fix UserRole value
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      username: 'staff',
      name: 'Staff User',
      role: UserRole.STAFF,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    // Mock the useAuth hook to return an admin user
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: '1',
        username: 'admin',
        name: 'Admin User',
        role: UserRole.OWNER,
      },
      userRole: UserRole.OWNER,
    });

    // Mock the getAll function
    (userService.getAll as jest.Mock).mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the users list', async () => {
    render(<ManageUsersScreen />);
    
    // Wait for the loading to complete
    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeTruthy();
      expect(screen.getByText('Admin User')).toBeTruthy();
      expect(screen.getByText('Staff User')).toBeTruthy();
    });
  });

  it('opens the add user modal when the add button is pressed', async () => {
    render(<ManageUsersScreen />);
    
    // Wait for the loading to complete
    await waitFor(() => {
      const addButton = screen.getByText('Add User');
      fireEvent.press(addButton);
      
      // Check if the modal is visible
      expect(screen.getByText('Add New User')).toBeTruthy();
    });
  });

  it('creates a new user when the form is submitted', async () => {
    const newUser = {
      username: 'newuser',
      name: 'New User',
      pin: '1234',
      confirmPin: '1234',
      role: UserRole.STAFF,
    };

    // Mock the create function
    (userService.create as jest.Mock).mockResolvedValue({
      ...newUser,
      id: '3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<ManageUsersScreen />);
    
    // Open the add user modal
    await waitFor(() => {
      const addButton = screen.getByText('Add User');
      fireEvent.press(addButton);
    });

    // Fill in the form
    fireEvent.changeText(screen.getByPlaceholderText('Username'), newUser.username);
    fireEvent.changeText(screen.getByPlaceholderText('Full Name'), newUser.name);
    fireEvent.changeText(screen.getByPlaceholderText('PIN'), newUser.pin);
    fireEvent.changeText(screen.getByPlaceholderText('Confirm PIN'), newUser.confirmPin);
    
    // Submit the form
    const submitButton = screen.getByText('Save');
    fireEvent.press(submitButton);

    // Check if the createUser function was called with the correct data
    await waitFor(() => {
      expect(userService.create).toHaveBeenCalledWith({
        username: newUser.username,
        name: newUser.name,
        pin: newUser.pin,
        role: newUser.role,
      });
    });
  });

  it('shows an error when the PINs do not match', async () => {
    render(<ManageUsersScreen />);
    
    // Open the add user modal
    await waitFor(() => {
      const addButton = screen.getByText('Add User');
      fireEvent.press(addButton);
    });

    // Fill in the form with mismatched PINs
    fireEvent.changeText(screen.getByPlaceholderText('PIN'), '1234');
    fireEvent.changeText(screen.getByPlaceholderText('Confirm PIN'), '5678');
    
    // Submit the form
    const submitButton = screen.getByText('Save');
    fireEvent.press(submitButton);

    // Check if the error message is shown
    await waitFor(() => {
      expect(screen.getByText('PINs do not match')).toBeTruthy();
    });
  });
});
