import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Icon } from 'react-native-paper';
import { StockListScreen } from '../screens/inventory/StockListScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { TransactionLogsScreen } from '../screens/transactions/TransactionLogsScreen';
import { ManageUsersScreen } from '../screens/users/ManageUsersScreen';
import { useAuth } from '../stores';

export type MainStackParamList = {
  Inventory: undefined;
  Reports: undefined;
  Transactions: undefined;
  Users: undefined;
};

const Tab = createBottomTabNavigator<MainStackParamList>();

export const MainNavigator = () => {
  const { userRole } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Inventory':
              iconName = focused ? 'package-variant-closed' : 'package-variant-closed-outline';
              break;
            case 'Reports':
              iconName = focused ? 'chart-line' : 'chart-line-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'history' : 'history-outline';
              break;
            case 'Users':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <Icon source={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Inventory"
        component={StockListScreen}
        options={{
          title: 'Inventory',
          headerTitle: 'Stock Management',
        }}
      />

      {(userRole === 'manager' || userRole === 'owner') && (
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            title: 'Reports',
            headerTitle: 'Inventory Reports',
          }}
        />
      )}

      {(userRole === 'manager' || userRole === 'owner') && (
        <Tab.Screen
          name="Transactions"
          component={TransactionLogsScreen}
          options={{
            title: 'Transactions',
            headerTitle: 'Transaction History',
          }}
        />
      )}

      {userRole === 'owner' && (
        <Tab.Screen
          name="Users"
          component={ManageUsersScreen}
          options={{
            title: 'Users',
            headerTitle: 'User Management',
          }}
        />
      )}
    </Tab.Navigator>
  );
};
