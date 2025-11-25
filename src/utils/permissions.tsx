import React from 'react';
import { useAuth } from '../stores';
import { UserRole } from '../types/user';

// Permission constants
export const PERMISSIONS = {
  // Inventory permissions
  VIEW_INVENTORY: 'view_inventory',
  ADD_STOCK: 'add_stock',
  REMOVE_STOCK: 'remove_stock',
  CREATE_ITEM: 'create_item',
  EDIT_ITEM: 'edit_item',
  DELETE_ITEM: 'delete_item',
  
  // Transaction permissions
  VIEW_TRANSACTIONS: 'view_transactions',
  EXPORT_TRANSACTIONS: 'export_transactions',
  
  // Report permissions
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // User management permissions
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  DEACTIVATE_USER: 'deactivate_user',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.STAFF]: [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.ADD_STOCK,
    PERMISSIONS.REMOVE_STOCK,
  ],
  
  [UserRole.MANAGER]: [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.ADD_STOCK,
    PERMISSIONS.REMOVE_STOCK,
    PERMISSIONS.CREATE_ITEM,
    PERMISSIONS.EDIT_ITEM,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.EXPORT_TRANSACTIONS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.EDIT_USER,
    PERMISSIONS.DEACTIVATE_USER,
  ],
  
  [UserRole.OWNER]: Object.values(PERMISSIONS), // All permissions
};

// Permission utility functions
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role].includes(permission);
};

export const hasAnyPermission = (
  role: UserRole, 
  permissions: Permission[]
): boolean => {
  return permissions.some(permission => hasPermission(role, permission));
};

export const hasAllPermissions = (
  role: UserRole, 
  permissions: Permission[]
): boolean => {
  return permissions.every(permission => hasPermission(role, permission));
};

// Higher-order component for permission-based rendering
export const withPermissionCheck = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: Permission
): React.FC<P> => {
  const WrappedComponent = (props: P) => {
    const { userRole } = useAuth();
    
    if (!userRole || !hasPermission(userRole, requiredPermission)) {
      return null;
    }
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPermissionCheck(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for checking permissions
export const usePermissions = () => {
  const { user, userRole } = useAuth();
  
  const checkPermission = (permission: Permission): boolean => {
    if (!user || !userRole) return false;
    return hasPermission(userRole, permission);
  };
  
  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!user || !userRole) return false;
    return hasAnyPermission(userRole, permissions);
  };
  
  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!user || !userRole) return false;
    return hasAllPermissions(userRole, permissions);
  };
  
  return {
    user,
    userRole,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    can: checkPermission, // Alias for convenience
  };
};
