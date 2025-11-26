import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Card,
  Chip,
  DataTable,
  Text
} from 'react-native-paper';
import { PermissionGuard } from '../../src/components/auth/PermissionGuard';
import { useRealTimeUpdates } from '../../src/hooks/useRealTimeUpdates';
import { transactionService } from '../../src/services';
import { useAuth } from '../../src/stores';
import { Transaction } from '../../src/types/transaction';
import { PERMISSIONS } from '../../src/utils/permissions';

interface ReportFilters {
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  itemId?: string;
  transactionType: 'all' | 'add' | 'remove';
}

// Helper function to clean user name data
const cleanUserName = (userName: string | undefined): string => {
  if (!userName) return 'Unknown';
  
  // If userName contains numbers at the start (like "+5John Smith"), extract just the name
  const cleaned = userName.trim();
  const match = cleaned.match(/^[\+\-]?\d+(.*)$/);
  
  if (match) {
    return match[1].trim() || 'Unknown';
  }
  
  return cleaned;
};

export default function ReportsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [filters, setFilters] = useState<ReportFilters>({
    timePeriod: 'daily',
    transactionType: 'all',
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // For now, get all transactions - in a real app, you'd apply filters
      const allTransactions = await transactionService.getAll();
      console.log('Reports: Loaded transactions:', allTransactions.length, allTransactions);
      setTransactions(allTransactions);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Reports screen focused, refreshing data...');
      loadTransactions();
    }, [loadTransactions])
  );

  // Real-time updates
  useRealTimeUpdates({
    onTransactionUpdate: useCallback(() => {
      console.log('Reports: Transaction update detected, refreshing data...');
      loadTransactions();
    }, [loadTransactions]),
    onStockChange: useCallback((itemId: string, change: number) => {
      console.log(`Reports: Stock change detected for item ${itemId}: ${change}`);
      loadTransactions();
    }, [loadTransactions]),
    enabled: true,
  });

  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Filter by transaction type
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => 
        filters.transactionType === 'add' ? t.quantityChange > 0 : t.quantityChange < 0
      );
    }

    // Filter by date range (simplified for MVP)
    const now = new Date();
    let startDate: Date;

    switch (filters.timePeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    filtered = filtered.filter(t => new Date(t.timestamp) >= startDate);

    return filtered;
  };

  const getSummaryStats = () => {
    const filtered = getFilteredTransactions();
    const totalAdded = filtered.filter(t => t.quantityChange > 0).reduce((sum, t) => sum + t.quantityChange, 0);
    const totalRemoved = filtered.filter(t => t.quantityChange < 0).reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
    
    return {
      totalTransactions: filtered.length,
      totalAdded,
      totalRemoved,
    };
  };

  const stats = getSummaryStats();
  const filteredTransactions = getFilteredTransactions();

  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_REPORTS]}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <Card style={styles.filtersCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Report Filters</Text>
              
              <View style={styles.filterRow}>
                <Text style={styles.label}>Time Period:</Text>
                <Chip
                  selected={filters.timePeriod === 'daily'}
                  onPress={() => setFilters({ ...filters, timePeriod: 'daily' })}
                  style={styles.chip}
                >
                  Daily
                </Chip>
                <Chip
                  selected={filters.timePeriod === 'weekly'}
                  onPress={() => setFilters({ ...filters, timePeriod: 'weekly' })}
                  style={styles.chip}
                >
                  Weekly
                </Chip>
                <Chip
                  selected={filters.timePeriod === 'monthly'}
                  onPress={() => setFilters({ ...filters, timePeriod: 'monthly' })}
                  style={styles.chip}
                >
                  Monthly
                </Chip>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.label}>Transaction Type:</Text>
                <Chip
                  selected={filters.transactionType === 'all'}
                  onPress={() => setFilters({ ...filters, transactionType: 'all' })}
                  style={styles.chip}
                >
                  All
                </Chip>
                <Chip
                  selected={filters.transactionType === 'add'}
                  onPress={() => setFilters({ ...filters, transactionType: 'add' })}
                  style={styles.chip}
                >
                  Add Only
                </Chip>
                <Chip
                  selected={filters.transactionType === 'remove'}
                  onPress={() => setFilters({ ...filters, transactionType: 'remove' })}
                  style={styles.chip}
                >
                  Remove Only
                </Chip>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                {filters.timePeriod.charAt(0).toUpperCase() + filters.timePeriod.slice(1)} Report - {new Date().toLocaleDateString()}
              </Text>
              <Text style={styles.lastUpdate}>
                Last updated: {new Date(lastUpdate).toLocaleString()}
              </Text>
              <Text style={styles.subtitle}>Filtered by: All Users, All Items</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalTransactions}</Text>
                  <Text style={styles.statLabel}>Total Transactions</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>+{stats.totalAdded}</Text>
                  <Text style={styles.statLabel}>Total Added</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>-{stats.totalRemoved}</Text>
                  <Text style={styles.statLabel}>Total Removed</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.tableCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Transaction Details</Text>
              
              {filteredTransactions.length === 0 ? (
                <Text style={styles.emptyText}>No transactions found for the selected filters</Text>
              ) : (
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title style={{ justifyContent: 'center' }}>Item Name</DataTable.Title>
                    <DataTable.Title style={{ justifyContent: 'center' }}>Change</DataTable.Title>
                    <DataTable.Title style={{ justifyContent: 'center' }}>User</DataTable.Title>
                    <DataTable.Title style={{ justifyContent: 'center' }}>Time</DataTable.Title>
                  </DataTable.Header>

                  {filteredTransactions.slice(0, 50).map((transaction) => {
                    const isNewItem = transaction.notes === 'Initial stock when creating item';
                    return (
                      <DataTable.Row key={transaction.id} style={isNewItem ? styles.newItemRow : undefined}>
                        <DataTable.Cell>
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={styles.itemName}>{transaction.itemName}</Text>
                            {isNewItem && (
                              <Text style={styles.newItemBadge}>NEW</Text>
                            )}
                          </View>
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={[
                              styles.quantity,
                              isNewItem ? styles.newItemQuantity : 
                              (transaction.quantityChange > 0 ? styles.addition : styles.removal)
                            ]}>
                              {transaction.quantityChange > 0 ? '+' : ''}{Math.abs(transaction.quantityChange)}
                            </Text>
                          </View>
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={styles.userName}>
                              {cleanUserName(transaction.userName)}
                            </Text>
                          </View>
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={isNewItem ? styles.newItemTime : styles.timestamp}>
                              {new Date(transaction.timestamp).toLocaleString()}
                            </Text>
                          </View>
                        </DataTable.Cell>
                      </DataTable.Row>
                    );
                  })}
                </DataTable>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  tableCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  filterRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quantity: {
    fontWeight: '600',
  },
  addition: {
    color: '#4caf50',
  },
  removal: {
    color: '#f44336',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  itemNameContainer: {
    flexDirection: 'column',
  },
  newItemRow: {
    backgroundColor: '#3a3a3a',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  newItemBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    textAlign: 'center',
    overflow: 'hidden',
  },
  newItemQuantity: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  newItemTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 12,
    color: '#ccc',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
});
