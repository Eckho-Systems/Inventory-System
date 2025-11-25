import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Modal,
    Portal,
    Text,
    TextInput,
} from 'react-native-paper';
import { CreateItemInput } from '../../types/item';

interface AddItemModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (item: CreateItemInput) => Promise<boolean>;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  visible,
  onDismiss,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !category.trim() || !quantity.trim()) {
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    const thresholdNum = parseInt(lowStockThreshold, 10);

    if (isNaN(quantityNum) || quantityNum < 0 || isNaN(thresholdNum) || thresholdNum < 0) {
      return;
    }

    setIsLoading(true);
    const success = await onSubmit({
      name: name.trim(),
      category: category.trim(),
      quantity: quantityNum,
      description: description.trim() || undefined,
      lowStockThreshold: thresholdNum,
    });

    if (success) {
      handleClear();
      onDismiss();
    }
    setIsLoading(false);
  };

  const handleClear = () => {
    setName('');
    setCategory('');
    setQuantity('');
    setDescription('');
    setLowStockThreshold('10');
  };

  const handleDismiss = () => {
    handleClear();
    onDismiss();
  };

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
              <Text style={styles.title}>Add New Item</Text>

              <TextInput
                label="Item Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                error={!!name && name.trim().length === 0}
              />

              <TextInput
                label="Category"
                value={category}
                onChangeText={setCategory}
                mode="outlined"
                style={styles.input}
                error={!!category && category.trim().length === 0}
              />

              <TextInput
                label="Initial Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!!quantity && (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0)}
              />

              <TextInput
                label="Low Stock Threshold"
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!!lowStockThreshold && (isNaN(parseInt(lowStockThreshold, 10)) || parseInt(lowStockThreshold, 10) < 0)}
              />

              <TextInput
                label="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.descriptionInput}
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
                  onPress={handleSubmit}
                  style={styles.confirmButton}
                  disabled={
                    isLoading ||
                    !name.trim() ||
                    !category.trim() ||
                    !quantity.trim() ||
                    isNaN(parseInt(quantity, 10)) ||
                    parseInt(quantity, 10) < 0 ||
                    !lowStockThreshold.trim() ||
                    isNaN(parseInt(lowStockThreshold, 10)) ||
                    parseInt(lowStockThreshold, 10) < 0
                  }
                  loading={isLoading}
                >
                  Add Item
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
  input: {
    marginBottom: 16,
  },
  descriptionInput: {
    marginBottom: 24,
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
    backgroundColor: '#007AFF',
  },
});
