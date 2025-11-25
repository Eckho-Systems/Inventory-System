import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Chip, DataTable, Modal, Portal, Searchbar, Text } from 'react-native-paper';
import { transactionService } from '../../services/transactionService';
import { Transaction, TransactionType } from '../../types/transaction';
import { ItemDetailScreen } from '../inventory/ItemDetailScreen';

interface FilterOptions {
  searchQuery: string;
  transactionType: TransactionType | 'all';
  dateRange: 'today' | 'week' | 'month' | 'all';
}

export const TransactionLogsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    transactionType: 'all',
    dateRange: 'all',
  });

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions = await transactionService.getAll();
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const getDateRangeFilter = (range: string): { startDate?: number; endDate?: number } => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    switch (range) {
      case 'today':
        return {
          startDate: startOfDay.getTime(),
          endDate: now,
        };
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          startDate: weekAgo.getTime(),
          endDate: now,
        };
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          startDate: monthAgo.getTime(),
          endDate: now,
        };
      default:
        return {};
    }
  };

  const filteredData = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        transaction =>
          transaction.itemName.toLowerCase().includes(query) ||
          transaction.userName.toLowerCase().includes(query)
      );
    }

    // Apply transaction type filter
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(
        transaction => transaction.transactionType === filters.transactionType
      );
    }

    // Apply date range filter
    const dateFilter = getDateRangeFilter(filters.dateRange);
    if (dateFilter.startDate) {
      filtered = filtered.filter(
        transaction => transaction.timestamp >= dateFilter.startDate!
      );
    }
    if (dateFilter.endDate) {
      filtered = filtered.filter(
        transaction => transaction.timestamp <= dateFilter.endDate!
      );
    }

    return filtered;
  }, [transactions, filters]);

  useEffect(() => {
    setFilteredTransactions(filteredData);
  }, [filteredData]);

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedItem(transaction.itemId);
    setShowItemDetail(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const formatTransaction = (transaction: Transaction) => {
    const formatted = transactionService.formatTransaction(transaction);
    const quantityColor = transaction.quantityChange > 0 ? '#4CAF50' : '#F44336';
    const quantityPrefix = transaction.quantityChange > 0 ? '+' : '';
    
    return {
      ...formatted,
      quantity: `${quantityPrefix}${transaction.quantityChange}`,
      quantityColor,
    };
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const formatted = formatTransaction(item);
    
    return (
      <DataTable.Row onPress={() => handleTransactionPress(item)}>
        <DataTable.Cell style={{ flex: 2 }}>
          <Text style={styles.itemName}>{formatted.itemName}</Text>
        </DataTable.Cell>
        <DataTable.Cell numeric>
          <Text style={{ color: formatted.quantityColor, fontWeight: 'bold' }}>
            {formatted.quantity}
          </Text>
        </DataTable.Cell>
        <DataTable.Cell style={{ flex: 1.5 }}>
          <Text style={styles.userName}>{formatted.user}</Text>
        </DataTable.Cell>
        <DataTable.Cell style={{ flex: 1.5 }}>
          <Text style={styles.timestamp}>{formatted.timestamp}</Text>
        </DataTable.Cell>
      </DataTable.Row>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search by item or user name..."
          onChangeText={(query) => setFilters(prev => ({ ...prev, searchQuery: query }))}
          value={filters.searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.chipContainer}>
          <Chip
            selected={filters.transactionType === 'all'}
            onPress={() => setFilters(prev => ({ ...prev, transactionType: 'all' }))}
            style={styles.chip}
          >
            All
          </Chip>
          <Chip
            selected={filters.transactionType === TransactionType.STOCK_ADD}
            onPress={() => setFilters(prev => ({ ...prev, transactionType: TransactionType.STOCK_ADD }))}
            style={styles.chip}
          >
            Add Stock
          </Chip>
          <Chip
            selected={filters.transactionType === TransactionType.STOCK_REMOVE}
            onPress={() => setFilters(prev => ({ ...prev, transactionType: TransactionType.STOCK_REMOVE }))}
            style={styles.chip}
          >
            Remove Stock
          </Chip>
        </View>
        
        <View style={styles.chipContainer}>
          <Chip
            selected={filters.dateRange === 'all'}
            onPress={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
            style={styles.chip}
          >
            All Time
          </Chip>
          <Chip
            selected={filters.dateRange === 'today'}
            onPress={() => setFilters(prev => ({ ...prev, dateRange: 'today' }))}
            style={styles.chip}
          >
            Today
          </Chip>
          <Chip
            selected={filters.dateRange === 'week'}
            onPress={() => setFilters(prev => ({ ...prev, dateRange: 'week' }))}
            style={styles.chip}
          >
            This Week
          </Chip>
          <Chip
            selected={filters.dateRange === 'month'}
            onPress={() => setFilters(prev => ({ ...prev, dateRange: 'month' }))}
            style={styles.chip}
          >
            This Month
          </Chip>
        </View>
      </View>

      <DataTable style={styles.table}>
        <DataTable.Header>
          <DataTable.Title style={{ flex: 2 }}>Item</DataTable.Title>
          <DataTable.Title numeric>Quantity</DataTable.Title>
          <DataTable.Title style={{ flex: 1.5 }}>User</DataTable.Title>
          <DataTable.Title style={{ flex: 1.5 }}>Time</DataTable.Title>
        </DataTable.Header>
        
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading ? 'Loading transactions...' : 'No transactions found'}
              </Text>
            </View>
          }
          contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyContainer : null}
        />
      </DataTable>

      <Portal>
        <Modal
          visible={showItemDetail}
          onDismiss={() => {
            setShowItemDetail(false);
            setSelectedItem(null);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedItem && (
            <View style={styles.modalContent}>
              <ItemDetailScreen
                route={{ params: { itemId: selectedItem } }}
                navigation={undefined}
              />
            </View>
          )}
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
  filtersContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    marginBottom: 4,
  },
  table: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 12,
    color: '#666',
  },
  timestamp: {
    fontSize: 11,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalContent: {
    flex: 1,
  },
});
