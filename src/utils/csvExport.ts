import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Transaction, TransactionStats } from '../types/transaction';

const getDocumentDirectory = (): string => {
  if (Platform.OS === 'web') {
    return '';
  }
  // In Expo SDK 54, use Paths.document
  return FileSystem.Paths.document?.toString() || '';
};

// Helper function to escape CSV values
const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

interface CSVExportOptions {
  includeHeaders?: boolean;
  dateFormat?: 'short' | 'long';
}

export const exportTransactionsToCSV = (
  transactions: Transaction[],
  options: CSVExportOptions = {}
): string => {
  const { includeHeaders = true, dateFormat = 'short' } = options;

  const headers = [
    'Item Name',
    'Quantity Change',
    'User Name', 
    'User Role',
    'Transaction Type',
    'Timestamp',
    'Notes'
  ];

  const rows = transactions.map(transaction => {
    const timestamp = new Date(transaction.timestamp);
    const formattedTimestamp = dateFormat === 'short' 
      ? timestamp.toISOString().split('T')[0]
      : timestamp.toISOString();

    return [
      escapeCsvValue(transaction.itemName),
      transaction.quantityChange.toString(),
      escapeCsvValue(transaction.userName),
      escapeCsvValue(transaction.userRole),
      escapeCsvValue(transaction.transactionType),
      escapeCsvValue(formattedTimestamp),
      escapeCsvValue(transaction.notes)
    ];
  });

  const csvContent = [
    ...(includeHeaders ? [headers] : []),
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  return csvContent;
};

export const generateReportCsv = (
  data: TransactionStats,
  reportTitle: string,
  filters: string
): string => {
  const rows = [
    ['Report Information', 'Title', `"${reportTitle}"`],
    ['Report Information', 'Filters', `"${filters}"`],
    ['Report Information', 'Generated', `"${new Date().toLocaleString()}"`],
    ['', '', ''], // Empty row for separation
    ['Summary Statistics', 'Total Transactions', data.totalTransactions?.toString() || '0'],
    ['Summary Statistics', 'Total Items Added', data.stockAdded?.toString() || '0'],
    ['Summary Statistics', 'Total Items Removed', data.stockRemoved?.toString() || '0'],
    ['Summary Statistics', 'Most Active User', `"${data.mostActiveUser?.userName || 'N/A'}"`],
    ['Summary Statistics', 'Most Active User Transactions', data.mostActiveUser?.transactionCount?.toString() || '0'],
    ['Summary Statistics', 'Most Updated Item', `"${data.mostTrackedItem?.itemName || 'N/A'}"`],
    ['Summary Statistics', 'Most Updated Item Count', data.mostTrackedItem?.transactionCount?.toString() || '0'],
  ];

  return rows
    .map(row => row.join(','))
    .join('\n');
};

export const exportReportStatsToCSV = generateReportCsv;

export const downloadCSV = async (csvContent: string, filename: string): Promise<{ success: boolean; message: string }> => {
  if (Platform.OS === 'web') {
    try {
      // Web implementation
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 0);
      
      return { success: true, message: 'Download started' };
    } catch (error) {
      console.error('Failed to download CSV:', error);
      return { success: false, message: 'Failed to download CSV' };
    }
  }
  
  // For React Native, use the share functionality
  return shareCSV(csvContent, filename);
};

// React Native compatible version
export const shareCSV = async (csvContent: string, filename: string): Promise<{ success: boolean; message: string }> => {
  if (Platform.OS === 'web') {
    return downloadCSV(csvContent, filename);
  }

  try {
    // Ensure the directory exists
    const documentDirectory = getDocumentDirectory();
    const dirInfo = await FileSystem.getInfoAsync(documentDirectory);
    
    // If it doesn't exist, create it
    if (!dirInfo.exists) {
      try {
        await FileSystem.makeDirectoryAsync(documentDirectory, { intermediates: true });
      } catch (mkdirError) {
        console.warn('Failed to create directory:', mkdirError);
      }
    }
  } catch (dirError) {
    console.warn('Failed to check directory:', dirError);
  }

  try {
    // Create a temporary file path with a timestamp to avoid conflicts
    const timestamp = new Date().getTime();
    const documentDirectory = getDocumentDirectory();
    const fileUri = `${documentDirectory}${timestamp}_${filename}`;
    
    // Write the CSV content to the file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: 'utf8',
    });
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions',
        UTI: 'public.comma-separated-values-text',
      });
      
      // Clean up after sharing
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(fileUri);
        } catch (cleanupError) {
          console.warn('Could not clean up temporary file:', cleanupError);
        }
      }, 0);
      
      return { success: true, message: 'CSV file shared successfully' };
    } else {
      // If sharing is not available, just save the file
      return { success: true, message: `CSV file saved to ${fileUri}` };
    }
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return { 
      success: false, 
      message: `Failed to export CSV: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};
