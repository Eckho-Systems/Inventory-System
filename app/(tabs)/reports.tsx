import React, { useEffect, useState } from 'react';
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

export default function ReportsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    timePeriod: 'daily',
    transactionType: 'all',
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // For now, get all transactions - in a real app, you'd apply filters
      const allTransactions = await transactionService.getAll();
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

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
                    <DataTable.Title>Item Name</DataTable.Title>
                    <DataTable.Title numeric>Change</DataTable.Title>
                    <DataTable.Title>User</DataTable.Title>
                    <DataTable.Title>Time</DataTable.Title>
                  </DataTable.Header>

                  {filteredTransactions.slice(0, 50).map((transaction) => (
                    <DataTable.Row key={transaction.id}>
                      <DataTable.Cell>{transaction.itemName}</DataTable.Cell>
                      <DataTable.Cell numeric>
                        <Text style={[
                          styles.quantity,
                          transaction.quantityChange > 0 ? styles.addition : styles.removal
                        ]}>
                          {transaction.quantityChange > 0 ? '+' : ''}{transaction.quantityChange}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell>{transaction.userName}</DataTable.Cell>
                      <DataTable.Cell>
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
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
});
