import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View
} from 'react-native';
import {
    Button,
    Card,
    Modal,
    Portal,
    Text,
    TextInput,
} from 'react-native-paper';
import { useInventory } from '../../stores';
import { useAuthStore } from '../../stores/authStore';
import { Item } from '../../types/item';

interface StockModalProps {
  visible: boolean;
  item: Item | null;
  onDismiss: () => void;
  type: 'add' | 'remove';
}

export const StockModal: React.FC<StockModalProps> = ({
  visible,
  item,
  onDismiss,
  type,
}) => {
  const { adjustStock, isLoading } = useInventory();
  const { user } = useAuthStore();
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!item || !quantity || !user) return;

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return;
    }

    if (type === 'remove' && quantityNum > item.quantity) {
      setQuantityError('Cannot remove more than current stock');
      return;
    }

    const adjustment = {
      itemId: item.id,
      quantity: type === 'add' ? quantityNum : -quantityNum,
      userId: user.id,
      notes: notes.trim() || undefined,
    };

    const success = await adjustStock(item.id, adjustment);
    if (success) {
      setQuantity('');
      setNotes('');
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setQuantity('');
    setNotes('');
    setQuantityError(null);
    onDismiss();
  };

  if (!item) return null;

  const parsedQuantity = parseInt(quantity, 10);
  const isQuantityInvalid = isNaN(parsedQuantity) || parsedQuantity <= 0;
  const exceedsStock = type === 'remove' && parsedQuantity > item.quantity;
  const quantityHasError = !!quantity && (isQuantityInvalid || exceedsStock);
  const confirmDisabled = isLoading || !quantity || isQuantityInvalid || exceedsStock;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.title}>
                {type === 'add' ? 'Add Stock' : 'Remove Stock'}
              </Text>
              
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.currentStock}>
                Current Stock: {item.quantity}
              </Text>
              {item.quantity <= item.lowStockThreshold && (
                <Text style={styles.lowStockWarning}>
                  Low Stock Alert (Threshold: {item.lowStockThreshold})
                </Text>
              )}

              <TextInput
                label={`${type === 'add' ? 'Add' : 'Remove'} Quantity`}
                value={quantity}
                onChangeText={(value) => {
                  setQuantity(value);
                  if (quantityError) {
                    setQuantityError(null);
                  }
                }}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={quantityHasError}
              />

              {quantityError && (
                <Text style={styles.helperText}>{quantityError}</Text>
              )}

              <TextInput
                label="Notes (Optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />

              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleDismiss}
                  style={styles.cancelButton}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  style={[
                    styles.confirmButton,
                    type === 'remove' && styles.removeButton,
                  ]}
                  disabled={confirmDisabled}
                  loading={isLoading}
                >
                  {type === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentStock: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  lowStockWarning: {
    fontSize: 12,
    color: '#d32f2f',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  notesInput: {
    marginBottom: 24,
  },
  helperText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#4caf50',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
});
