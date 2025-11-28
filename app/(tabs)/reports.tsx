import DatePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'monthPicker' | 'custom';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  itemId?: string;
  transactionType: 'all' | 'add' | 'remove';
  selectedMonth?: Date;
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | 'month'>('start');
  const [tempDate, setTempDate] = useState(new Date());
  const [showWebDatePicker, setShowWebDatePicker] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    timePeriod: 'daily',
    transactionType: 'all',
  });

  const handleMonthSelection = (month: Date) => {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    setFilters({
      ...filters,
      selectedMonth: month,
      startDate: startOfMonth,
      endDate: endOfMonth
    });
  };

  const validateDateRange = (start: Date, end: Date): boolean => {
    return end >= start;
  };

  const isDateRangeInvalid = filters.startDate && filters.endDate && !validateDateRange(filters.startDate, filters.endDate);

  const handleDateSelection = (date: Date, mode: 'start' | 'end') => {
    if (mode === 'start') {
      const newFilters = { ...filters, startDate: date };
      // If end date exists and is before new start date, update end date
      if (filters.endDate && !validateDateRange(date, filters.endDate)) {
        newFilters.endDate = date;
      }
      setFilters(newFilters);
    } else {
      // Only set end date if it's not before start date
      if (filters.startDate && validateDateRange(filters.startDate, date)) {
        setFilters({ ...filters, endDate: date });
      } else if (!filters.startDate) {
        // If no start date, set this as start date
        setFilters({ ...filters, startDate: date, endDate: date });
      }
    }
  };

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

    // Filter by date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (filters.timePeriod === 'custom' && filters.startDate && filters.endDate) {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else if (filters.timePeriod === 'monthPicker' && filters.selectedMonth) {
      startDate = new Date(filters.selectedMonth.getFullYear(), filters.selectedMonth.getMonth(), 1);
      endDate = new Date(filters.selectedMonth.getFullYear(), filters.selectedMonth.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
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
    }

    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.timestamp);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

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
                <Chip
                  selected={filters.timePeriod === 'monthPicker'}
                  onPress={() => setFilters({ ...filters, timePeriod: 'monthPicker' })}
                  style={styles.chip}
                >
                  Month Picker
                </Chip>
                <Chip
                  selected={filters.timePeriod === 'custom'}
                  onPress={() => setFilters({ ...filters, timePeriod: 'custom' })}
                  style={styles.chip}
                >
                  Custom Range
                </Chip>
              </View>

              {filters.timePeriod === 'custom' && (
                <View style={styles.dateRangeRow}>
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      isDateRangeInvalid && datePickerMode === 'end' ? styles.dateButtonInvalid : null
                    ]}
                    onPress={() => {
                      setDatePickerMode('start');
                      setTempDate(filters.startDate || new Date());
                      if (Platform.OS === 'web') {
                        setShowWebDatePicker(true);
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.dateButtonText}>
                      Start: {filters.startDate ? filters.startDate.toLocaleDateString() : 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.dateButton,
                      isDateRangeInvalid ? styles.dateButtonInvalid : null
                    ]}
                    onPress={() => {
                      setDatePickerMode('end');
                      setTempDate(filters.endDate || new Date());
                      if (Platform.OS === 'web') {
                        setShowWebDatePicker(true);
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.dateButtonText}>
                      End: {filters.endDate ? filters.endDate.toLocaleDateString() : 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {filters.timePeriod === 'monthPicker' && (
                <View style={styles.monthPickerRow}>
                  <TouchableOpacity
                    style={styles.monthButton}
                    onPress={() => {
                      setTempDate(filters.selectedMonth || new Date());
                      setDatePickerMode('month');
                      if (Platform.OS === 'web') {
                        setShowWebDatePicker(true);
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <Text style={styles.monthButtonText}>
                      {filters.selectedMonth 
                        ? filters.selectedMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                        : 'Select Month'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isDateRangeInvalid && (
                <Text style={styles.dateRangeError}>
                  End date cannot be before start date
                </Text>
              )}

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
                {filters.timePeriod === 'custom' && filters.startDate && filters.endDate
                  ? `Custom Range Report - ${filters.startDate.toLocaleDateString()} to ${filters.endDate.toLocaleDateString()}`
                  : filters.timePeriod === 'monthPicker' && filters.selectedMonth
                  ? `Monthly Report - ${filters.selectedMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`
                  : `${filters.timePeriod.charAt(0).toUpperCase() + filters.timePeriod.slice(1)} Report - ${new Date().toLocaleDateString()}`
                }
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
        
        {Platform.OS === 'web' ? (
          showWebDatePicker && (
            <View style={styles.webDatePickerOverlay}>
              <View style={styles.webDatePickerContent}>
                <Text style={styles.webDatePickerTitle}>
                  {datePickerMode === 'month' ? 'Select Month' : `Select ${datePickerMode === 'start' ? 'Start' : 'End'} Date`}
                </Text>
                <ReactDatePicker
                  selected={tempDate}
                  onChange={(date) => {
                    if (date) {
                      if (datePickerMode === 'month') {
                        handleMonthSelection(date);
                      } else {
                        handleDateSelection(date, datePickerMode);
                      }
                    }
                    setShowWebDatePicker(false);
                  }}
                  inline
                  maxDate={new Date()}
                  minDate={datePickerMode === 'end' && filters.startDate ? filters.startDate : undefined}
                  showMonthYearPicker={datePickerMode === 'month'}
                  dateFormat={datePickerMode === 'month' ? 'MMMM yyyy' : 'MMMM d, yyyy'}
                />
                <TouchableOpacity
                  style={styles.webDatePickerClose}
                  onPress={() => setShowWebDatePicker(false)}
                >
                  <Text style={styles.webDatePickerCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          showDatePicker && (
            <DatePicker
              value={tempDate}
              mode={datePickerMode === 'month' ? 'date' : 'date'}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                // For Android, the picker dismisses itself after selection
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    if (datePickerMode === 'month') {
                      handleMonthSelection(selectedDate);
                    } else {
                      handleDateSelection(selectedDate, datePickerMode);
                    }
                  }
                } else {
                  // For iOS, we need to handle the dismiss button
                  if (event.type === 'set' && selectedDate) {
                    if (datePickerMode === 'month') {
                      handleMonthSelection(selectedDate);
                    } else {
                      handleDateSelection(selectedDate, datePickerMode);
                    }
                  }
                  setShowDatePicker(false);
                }
              }}
            />
          )
        )}
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
  dateRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  dateButtonInvalid: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  dateRangeError: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  webDatePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  webDatePickerContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  webDatePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  webDatePickerClose: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  webDatePickerCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  monthPickerRow: {
    marginTop: 8,
  },
  monthButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  monthButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});
