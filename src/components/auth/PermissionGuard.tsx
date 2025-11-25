import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Permission, usePermissions } from '../../utils';

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: Permission | Permission[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, requires all permissions; if false, requires any permission
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions,
  fallback,
  requireAll = false,
}) => {
  const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermissions();
  
  const hasRequiredPermission = () => {
    if (Array.isArray(permissions)) {
      return requireAll 
        ? checkAllPermissions(permissions)
        : checkAnyPermission(permissions);
    }
    return checkPermission(permissions);
  };
  
  if (!hasRequiredPermission()) {
    return fallback || (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
        <Text style={styles.subtext}>
          You don&apos;t have permission to access this feature.
        </Text>
      </View>
    );
  }
  
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#d32f2f',
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
});
