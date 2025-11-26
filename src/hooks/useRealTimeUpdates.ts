import { useEffect, useRef } from 'react';
import { Transaction } from '../types/transaction';
import { eventEmitter } from '../utils/eventEmitter';

interface UseRealTimeUpdatesOptions {
  onTransactionUpdate?: (transaction: Transaction) => void;
  onStockChange?: (itemId: string, change: number) => void;
  enabled?: boolean;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const { onTransactionUpdate, onStockChange, enabled = true } = options;
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const handleTransactionUpdate = (transaction: Transaction) => {
      lastUpdateRef.current = Date.now();
      onTransactionUpdate?.(transaction);
    };

    const handleStockChange = (itemId: string, change: number) => {
      lastUpdateRef.current = Date.now();
      onStockChange?.(itemId, change);
    };

    // Subscribe to events
    const transactionUnsubscribe = eventEmitter.on(
      'transaction:created',
      handleTransactionUpdate
    );

    const stockChangeUnsubscribe = eventEmitter.on(
      'stock:changed',
      handleStockChange
    );

    // Cleanup
    return () => {
      transactionUnsubscribe?.();
      stockChangeUnsubscribe?.();
    };
  }, [enabled, onTransactionUpdate, onStockChange]);

  const getLastUpdateTime = () => lastUpdateRef.current;

  return {
    getLastUpdateTime,
  };
};
