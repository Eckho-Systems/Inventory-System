// Database types shared between web and native implementations

export interface SQLResultSet {
  insertId?: number;
  rowsAffected: number;
  rows: {
    length: number;
    _array: any[];
    item: (index: number) => any;
  };
}

export type SQLTransaction = {
  executeSql(
    sql: string,
    args?: any[],
    success?: (tx: SQLTransaction, result: SQLResultSet) => void,
    error?: (tx: SQLTransaction, error: Error) => boolean | void
  ): void;
};

export interface SQLiteDatabase {
  transaction(
    callback: (tx: SQLTransaction) => void,
    error?: (error: Error) => void,
    success?: () => void
  ): void;
  execAsync(sql: string): Promise<any[]>;
  runAsync(sql: string, args?: any[]): Promise<any>;
  getAllAsync(sql: string, args?: any[]): Promise<any[]>;
  closeAsync(): Promise<void>;
}
