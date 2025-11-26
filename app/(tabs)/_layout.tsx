import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/stores';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, isInitialized, isLoading } = useAuth();

  // Don't render tabs until auth is initialized
  if (!isInitialized || isLoading) {
    return null;
  }

  const canViewReports = user?.role && ['manager', 'owner'].includes(user.role);
  const canManageUsers = user?.role === 'owner';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
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
    </Tabs>
  );
}
