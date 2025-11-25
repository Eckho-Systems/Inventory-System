import { Transaction } from '../types/transaction';

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
      ? timestamp.toLocaleDateString()
      : timestamp.toLocaleString();

    return [
      `"${transaction.itemName}"`,
      transaction.quantityChange.toString(),
      `"${transaction.userName}"`,
      transaction.userRole,
      transaction.transactionType,
      `"${formattedTimestamp}"`,
      transaction.notes ? `"${transaction.notes.replace(/"/g, '""')}"` : ''
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
  data: any,
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

export const downloadCSV = (csvContent: string, filename: string) => {
  // For React Native, we'll use a different approach
  // This function would need to be adapted based on the platform
  // For now, we'll just return the content that can be shared
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// React Native compatible version
export const shareCSV = async (csvContent: string, filename: string) => {
  try {
    // This would use React Native's Share API in a real implementation
    // For now, we'll just log the content
    console.log('CSV Content to share:', csvContent);
    console.log('Filename:', filename);
    
    // In a real implementation, you would:
    // 1. Save the file to device storage
    // 2. Use Share.share() to share the file
    
    return { success: true, message: 'CSV export prepared for sharing' };
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return { success: false, message: 'Failed to export CSV' };
  }
};
