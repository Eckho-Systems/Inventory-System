import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, DataTable, FAB, Modal, Portal, Text } from 'react-native-paper';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { transactionService } from '../../services/transactionService';
import { Transaction, TransactionFilter, TransactionStats, TransactionType } from '../../types/transaction';
import { exportReportStatsToCSV, exportTransactionsToCSV, shareCSV } from '../../utils/csvExport';

interface ReportFilters {
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  itemId?: string;
  transactionType: 'all' | 'add' | 'remove' | 'delete';
}

export const ReportsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    timePeriod: 'daily',
    transactionType: 'all',
  });

  // Mock data for users and items - in real app these would come from services
  const [users] = useState([
    { id: 'user1', name: 'John Smith' },
    { id: 'user2', name: 'Maria Santos' },
    { id: 'user3', name: 'Bob Johnson' },
  ]);
  
  const [items] = useState([
    { id: 'item1', name: 'Ketchup 350mL' },
    { id: 'item2', name: 'Vegetable Oil 1L' },
    { id: 'item3', name: 'Liquid Seasoning' },
  ]);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      const filter: TransactionFilter = {};
      
      // Apply date filters based on time period
      const now = new Date();
      let startDate: Date | undefined;
      let endDate = now;
      
      switch (filters.timePeriod) {
        case 'daily':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'custom':
          startDate = filters.startDate;
          endDate = filters.endDate || now;
          break;
      }
      
      if (startDate) {
        filter.startDate = startDate.getTime();
      }
      if (endDate) {
        filter.endDate = endDate.getTime();
      }
      
      if (filters.userId) {
        filter.userId = filters.userId;
      }
      
      if (filters.itemId) {
        filter.itemId = filters.itemId;
      }
      
      if (filters.transactionType !== 'all') {
        if (filters.transactionType === 'add') {
          filter.type = TransactionType.STOCK_ADD;
        } else if (filters.transactionType === 'remove') {
          filter.type = TransactionType.STOCK_REMOVE;
        } else if (filters.transactionType === 'delete') {
          filter.type = TransactionType.ITEM_DELETE;
        }
      }
      
      const [transactionsData, statsData] = await Promise.all([
        transactionService.getAll(filter),
        transactionService.getStats(filter),
      ]);
      
      setTransactions(transactionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Real-time updates
  useRealTimeUpdates({
    onTransactionUpdate: useCallback(() => {
      console.log('Advanced Reports: Transaction update detected, refreshing data...');
      loadReportData();
    }, [loadReportData]),
    onStockChange: useCallback((itemId: string, change: number) => {
      console.log(`Advanced Reports: Stock change detected for item ${itemId}: ${change}`);
      loadReportData();
    }, [loadReportData]),
    enabled: true,
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadReportData();
  };

  const formatTransaction = (transaction: Transaction) => {
    const formatted = transactionService.formatTransaction(transaction);
    const isDeletion = transaction.transactionType === TransactionType.ITEM_DELETE || 
                       transaction.notes?.includes('deleted') ||
                       transaction.notes?.includes('Item deleted');
    
    // Single debug log for delete transactions
    if (transaction.itemName === 'woof' || transaction.itemName === 'cs') {
      console.log('Delete transaction check:', {
        itemName: transaction.itemName,
        transactionType: transaction.transactionType,
        notes: transaction.notes,
        isDeletion
      });
    }
    
    let quantityColor = '#333';
    let quantity = '0';
    
    if (isDeletion) {
      quantityColor = '#d32f2f';
      quantity = 'DELETED';
    } else {
      quantityColor = transaction.quantityChange > 0 ? '#4CAF50' : '#F44336';
      const quantityPrefix = transaction.quantityChange > 0 ? '+' : '';
      quantity = `${quantityPrefix}${Math.abs(transaction.quantityChange)}`;
    }
    
    // Clean user name in case it has quantity concatenated
    const cleanUser = transaction.userName?.trim() || 'Unknown';
    const userMatch = cleanUser.match(/^[\+\-]?\d+(.*)$/);
    const finalUser = userMatch ? userMatch[1].trim() || 'Unknown' : cleanUser;
    
    return {
      ...formatted,
      quantity,
      quantityColor,
      user: finalUser,
    };
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const formatted = formatTransaction(item);
    
    return (
      <DataTable.Row>
        <DataTable.Cell style={{ flex: 2 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.itemName, { textAlign: 'center' }]}>{formatted.itemName}</Text>
          </View>
        </DataTable.Cell>
        <DataTable.Cell style={styles.changeColumn}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: formatted.quantityColor, fontWeight: 'bold', textAlign: 'center' }}>
              {formatted.quantity}
            </Text>
          </View>
        </DataTable.Cell>
        <DataTable.Cell style={{ flex: 1.5 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.userName, { textAlign: 'center' }]}>{formatted.user}</Text>
          </View>
        </DataTable.Cell>
        <DataTable.Cell style={{ flex: 1.5 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.timestamp, { textAlign: 'center' }]}>{formatted.timestamp}</Text>
          </View>
        </DataTable.Cell>
      </DataTable.Row>
    );
  };

  const getReportTitle = () => {
    const period = filters.timePeriod.charAt(0).toUpperCase() + filters.timePeriod.slice(1);
    const date = filters.timePeriod === 'daily' 
      ? new Date().toLocaleDateString()
      : '';
    return `${period} Report${date ? ` - ${date}` : ''}`;
  };

  const getFilterDescription = () => {
    const parts = [];
    if (filters.userId) {
      const user = users.find(u => u.id === filters.userId);
      parts.push(`User: ${user?.name || 'Unknown'}`);
    }
    if (filters.itemId) {
      const item = items.find(i => i.id === filters.itemId);
      parts.push(`Item: ${item?.name || 'Unknown'}`);
    }
    if (filters.transactionType !== 'all') {
      const typeMap = {
        'add': 'Add Only',
        'remove': 'Remove Only', 
        'delete': 'Delete Only'
      };
      parts.push(`Type: ${typeMap[filters.transactionType]}`);
    }
    return parts.length > 0 ? `Filtered by: ${parts.join(', ')}` : 'Filtered by: All Users, All Items';
  };

  const handleExportCSV = async () => {
    try {
      // Generate CSV content for both stats and transactions
      const statsCSV = stats ? exportReportStatsToCSV(
        stats,
        getReportTitle(),
        getFilterDescription()
      ) : '';
      
      const transactionsCSV = exportTransactionsToCSV(transactions);
      
      // Combine both CSVs with a separator
      const fullCSV = statsCSV + '\n\n\nTRANSACTION DETAILS\n\n' + transactionsCSV;
      
      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const filename = `inventory-report-${date}.csv`;
      
      // Share the CSV
      const result = await shareCSV(fullCSV, filename);
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          'Report data has been prepared for sharing. In a production app, this would open the share dialog.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export report data');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={styles.scrollView}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{getReportTitle()}</Text>
            <Text style={styles.filterDescription}>{getFilterDescription()}</Text>
          </View>
          <Button
            mode="outlined"
            onPress={handleExportCSV}
            style={styles.exportButton}
          >
            Export CSV
          </Button>
        </View>

        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statsTitle}>Summary Statistics</Text>
            
            {stats && (
              <>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalTransactions}</Text>
                    <Text style={styles.statLabel}>Total Transactions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>+{stats.stockAdded}</Text>
                    <Text style={styles.statLabel}>Total Added</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#F44336' }]}>-{stats.stockRemoved}</Text>
                    <Text style={styles.statLabel}>Total Removed</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.mostActiveUser.userName || 'N/A'}</Text>
                    <Text style={styles.statLabel}>Most Active User</Text>
                    <Text style={styles.statSublabel}>
                      {stats.mostActiveUser.transactionCount} transactions
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.mostTrackedItem.itemName || 'N/A'}</Text>
                    <Text style={styles.statLabel}>Most Updated Item</Text>
                    <Text style={styles.statSublabel}>
                      {stats.mostTrackedItem.transactionCount} updates
                    </Text>
                  </View>
                </View>
              </>
            )}
            
            {!stats && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {loading ? 'Loading statistics...' : 'No statistics available'}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.tableCard}>
          <Card.Content>
            <Text style={styles.tableTitle}>Transaction Details</Text>
            
            <DataTable style={styles.table}>
              <DataTable.Header>
                <DataTable.Title style={{ flex: 2 }}>Item Name</DataTable.Title>
                <DataTable.Title style={styles.changeHeader}>Change</DataTable.Title>
                <DataTable.Title style={{ flex: 1.5 }}>User</DataTable.Title>
                <DataTable.Title style={{ flex: 1.5 }}>Time</DataTable.Title>
              </DataTable.Header>
              
              {transactions.map((item) => (
                <React.Fragment key={item.id}>
                  {renderTransactionItem({ item })}
                </React.Fragment>
              ))}
              
              {transactions.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {loading ? 'Loading...' : 'No transactions found'}
                  </Text>
                </View>
              )}
            </DataTable>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="filter"
        style={styles.fab}
        onPress={() => setShowFilters(true)}
      />

      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Filters</Text>
            
            <Text style={styles.filterLabel}>Time Period</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={filters.timePeriod === 'daily'}
                onPress={() => setFilters(prev => ({ ...prev, timePeriod: 'daily' }))}
                style={styles.chip}
              >
                Daily
              </Chip>
              <Chip
                selected={filters.timePeriod === 'weekly'}
                onPress={() => setFilters(prev => ({ ...prev, timePeriod: 'weekly' }))}
                style={styles.chip}
              >
                Weekly
              </Chip>
              <Chip
                selected={filters.timePeriod === 'monthly'}
                onPress={() => setFilters(prev => ({ ...prev, timePeriod: 'monthly' }))}
                style={styles.chip}
              >
                Monthly
              </Chip>
            </View>
            
            <Text style={styles.filterLabel}>Transaction Type</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={filters.transactionType === 'all'}
                onPress={() => setFilters(prev => ({ ...prev, transactionType: 'all' }))}
                style={styles.chip}
              >
                All
              </Chip>
              <Chip
                selected={filters.transactionType === 'add'}
                onPress={() => setFilters(prev => ({ ...prev, transactionType: 'add' }))}
                style={styles.chip}
              >
                Add Only
              </Chip>
              <Chip
                selected={filters.transactionType === 'remove'}
                onPress={() => setFilters(prev => ({ ...prev, transactionType: 'remove' }))}
                style={styles.chip}
              >
                Remove Only
              </Chip>
              <Chip
                selected={filters.transactionType === 'delete'}
                onPress={() => setFilters(prev => ({ ...prev, transactionType: 'delete' }))}
                style={styles.chip}
              >
                Delete Only
              </Chip>
            </View>
            
            <Text style={styles.filterLabel}>User Filter</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={!filters.userId}
                onPress={() => setFilters(prev => ({ ...prev, userId: undefined }))}
                style={styles.chip}
              >
                All Users
              </Chip>
              {users.map((user) => (
                <Chip
                  key={user.id}
                  selected={filters.userId === user.id}
                  onPress={() => setFilters(prev => ({ ...prev, userId: user.id }))}
                  style={styles.chip}
                >
                  {user.name}
                </Chip>
              ))}
            </View>
            
            <Text style={styles.filterLabel}>Item Filter</Text>
            <View style={styles.chipContainer}>
              <Chip
                selected={!filters.itemId}
                onPress={() => setFilters(prev => ({ ...prev, itemId: undefined }))}
                style={styles.chip}
              >
                All Items
              </Chip>
              {items.map((item) => (
                <Chip
                  key={item.id}
                  selected={filters.itemId === item.id}
                  onPress={() => setFilters(prev => ({ ...prev, itemId: item.id }))}
                  style={styles.chip}
                >
                  {item.name}
                </Chip>
              ))}
            </View>
            
            <Button
              mode="contained"
              onPress={() => setShowFilters(false)}
              style={styles.applyButton}
            >
              Apply Filters
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  filterDescription: {
    fontSize: 14,
    color: '#666',
  },
  exportButton: {
    marginLeft: 8,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statSublabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  tableCard: {
    margin: 16,
    marginTop: 8,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  table: {
    backgroundColor: '#fff',
  },
  changeHeader: {
    justifyContent: 'center',
  },
  changeColumn: {
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  applyButton: {
    marginTop: 24,
  },
});



