import { useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Text
} from 'react-native-paper';
import { transactionService } from '../../services';
import { useInventory } from '../../stores';
import { Transaction, TransactionType } from '../../types/transaction';
import { PERMISSIONS } from '../../utils';
import { PermissionGuard } from '../auth/PermissionGuard';
import { StockModal } from './StockModal';

interface ItemDetailScreenProps {
  route?: any;
  navigation?: any;
}

export const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({
  route: routeProp,
  navigation: navigationProp,
}) => {
  const route = useRoute();
  const { itemId } = (routeProp || route).params;
  
  const { getItemById, items } = useInventory();
  
  const [item, setItem] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const itemData = getItemById(itemId);
      if (itemData) {
        setItem(itemData);
        
        const transactionsData = await transactionService.getByItemId(itemId);
        setTransactions(transactionsData);
      }
    } catch (error) {
      console.error('Failed to load item details:', error);
    } finally {
      setLoading(false);
    }
  }, [itemId, getItemById]);

  useEffect(() => {
    const updatedItem = getItemById(itemId);
    if (updatedItem) {
      setItem(updatedItem);
    }
  }, [items, itemId, getItemById]);

  useEffect(() => {
    loadData();
  }, [itemId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderTransactionItem = ({ item: transaction }: { item: Transaction }) => {
    const isAddition = transaction.transactionType === TransactionType.STOCK_ADD;
    const isRemoval = transaction.transactionType === TransactionType.STOCK_REMOVE;
    
    return (
      <Card style={styles.transactionCard}>
        <Card.Content>
          <View style={styles.transactionHeader}>
            <Chip
              icon={isAddition ? 'plus' : isRemoval ? 'minus' : 'edit'}
              mode="outlined"
              style={[
                styles.transactionChip,
                isAddition && styles.additionChip,
                isRemoval && styles.removalChip,
              ]}
            >
              {transaction.transactionType}
            </Chip>
            <Text style={styles.transactionDate}>
              {new Date(transaction.timestamp).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionQuantity}>
              {isAddition ? '+' : '-'}{Math.abs(transaction.quantityChange)} units
            </Text>
            <Text style={styles.transactionUser}>
              by {transaction.userName}
            </Text>
          </View>
          
          {transaction.notes && (
            <Text style={styles.transactionNotes}>{transaction.notes}</Text>
          )}
          
          <Text style={styles.transactionResult}>
            Result: {transaction.quantityChange > 0 ? '+' : ''}{transaction.quantityChange} units
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const isLowStock = item.quantity <= item.lowStockThreshold;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        <Card style={styles.itemCard}>
          <Card.Content>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              {isLowStock && (
                <Chip
                  icon="alert"
                  mode="outlined"
                  textStyle={styles.lowStockChip}
                >
                  Low Stock
                </Chip>
              )}
            </View>
            
            <Text style={styles.itemCategory}>{item.category}</Text>
            
            <View style={styles.itemDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Stock:</Text>
                <Text
                  style={[
                    styles.detailValue,
                    isLowStock && styles.lowStockText,
                  ]}
                >
                  {item.quantity}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Low Stock Threshold:</Text>
                <Text style={styles.detailValue}>{item.lowStockThreshold}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>${item.price.toFixed(2)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date Added:</Text>
                <Text style={styles.detailValue}>
                  {new Date(item.dateAdded).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Stock Actions</Text>
          <View style={styles.actionButtons}>
            <PermissionGuard permissions={PERMISSIONS.ADD_STOCK}>
              <Button
                mode="contained"
                icon="plus"
                style={[styles.actionButton, styles.addButton]}
                onPress={() => setAddModalVisible(true)}
              >
                Add Stock
              </Button>
            </PermissionGuard>
            
            <PermissionGuard permissions={PERMISSIONS.REMOVE_STOCK}>
              <Button
                mode="contained"
                icon="minus"
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => setRemoveModalVisible(true)}
                disabled={item.quantity === 0}
              >
                Remove Stock
              </Button>
            </PermissionGuard>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            Transaction History ({transactions.length})
          </Text>
          
          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </Card.Content>
            </Card>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.transactionList}
            />
          )}
        </View>
      </ScrollView>

      <StockModal
        visible={addModalVisible}
        item={item}
        onDismiss={() => setAddModalVisible(false)}
        type="add"
      />

      <StockModal
        visible={removeModalVisible}
        item={item}
        onDismiss={() => setRemoveModalVisible(false)}
        type="remove"
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
  },
  itemCard: {
    margin: 16,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  lowStockChip: {
    color: '#d32f2f',
  },
  itemCategory: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  lowStockText: {
    color: '#d32f2f',
  },
  actionSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#4caf50',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
  historySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyCard: {
    elevation: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  transactionList: {
    gap: 8,
  },
  transactionCard: {
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionChip: {
    height: 32,
  },
  additionChip: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  removalChip: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transactionQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionUser: {
    fontSize: 12,
    color: '#666',
  },
  transactionNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  transactionResult: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
});
