import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConfirmationModal } from '@/src/components/ui/ConfirmationModal';
import { useAuthStore } from '@/src/stores/authStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user, isInitialized, isLoading, isAuthenticated, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Don't render tabs until auth is initialized
  if (!isInitialized || isLoading) {
    return null;
  }

  const canViewReports = user?.role && ['manager', 'owner'].includes(user.role);
  const canManageUsers = user?.role === 'owner';
  const canManageCategories = user?.role && ['manager', 'owner'].includes(user.role);

  const handleLogout = () => {
    console.log('Logout confirmed');
    logout();
    // Navigate to login page instead of logout URL
    window.location.href = 'http://localhost:8081/';
    setShowLogoutModal(false);
  };

  const handleCancelLogout = () => {
    console.log('Cancel logout');
    setShowLogoutModal(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: isAuthenticated ? undefined : { display: 'none' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
            href: canViewReports ? '/(tabs)/reports' : null,
          }}
        />
        <Tabs.Screen
          name="manage-users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
            href: canManageUsers ? '/(tabs)/manage-users' : null,
          }}
        />
        <Tabs.Screen
          name="manage-categories"
          options={{
            title: 'Categories',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
            href: canManageCategories ? '/(tabs)/manage-categories' : null,
          }}
        />
        <Tabs.Screen
          name="logout"
          options={{
            title: 'Logout',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="power" color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              console.log('Logout tab pressed');
              e.preventDefault();
              setShowLogoutModal(true);
            },
          }}
        />
      </Tabs>
      
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        onConfirm={handleLogout}
        onCancel={handleCancelLogout}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </>
  );
}
