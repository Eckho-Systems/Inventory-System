# Roberto's Inventory System - MVP PRD
**Version:** 1.0  
**Date:** November 13, 2025  
**Target Platform:** Android Tablet (Offline-First)  
**Timeline:** 6 months

---

## Tech Stack
- **Frontend:** React Native with Expo
- **Database:** SQLite (local, offline)
- **State Management:** Zustand
- **UI Library:** React Native Paper or NativeWind
- **Future Migration Path:** Supabase for multi-device sync

---

## Application Architecture

### Architecture Pattern: Feature-Based with Clean Separation

```
src/
├── features/
│   ├── auth/
│   │   ├── screens/
│   │   │   └── LoginScreen.tsx
│   │   ├── components/
│   │   │   └── LoginForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   └── store/
│   │       └── authStore.ts (Zustand)
│   │
│   ├── inventory/
│   │   ├── screens/
│   │   │   ├── StockListScreen.tsx
│   │   │   └── ItemDetailScreen.tsx
│   │   ├── components/
│   │   │   ├── StockTable.tsx
│   │   │   ├── AddStockModal.tsx
│   │   │   ├── RemoveStockModal.tsx
│   │   │   └── LowStockBadge.tsx
│   │   ├── hooks/
│   │   │   ├── useInventory.ts
│   │   │   └── useStockOperations.ts
│   │   └── store/
│   │       └── inventoryStore.ts
│   │
│   ├── transactions/
│   │   ├── screens/
│   │   │   └── TransactionLogsScreen.tsx
│   │   ├── components/
│   │   │   ├── TransactionList.tsx
│   │   │   └── TransactionFilters.tsx
│   │   └── hooks/
│   │       └── useTransactions.ts
│   │
│   ├── reports/
│   │   ├── screens/
│   │   │   └── ReportsScreen.tsx
│   │   ├── components/
│   │   │   ├── ReportFilters.tsx
│   │   │   └── ReportTable.tsx
│   │   └── hooks/
│   │       └── useReports.ts
│   │
│   └── users/
│       ├── screens/
│       │   ├── ManageUsersScreen.tsx
│       │   └── AddUserScreen.tsx
│       ├── components/
│       │   └── UserList.tsx
│       └── hooks/
│           └── useUsers.ts
│
├── database/
│   ├── db.ts (SQLite initialization)
│   ├── migrations/
│   │   └── initial.ts
│   └── models/
│       ├── User.ts
│       ├── Item.ts
│       └── Transaction.ts
│
├── services/
│   ├── userService.ts (CRUD operations for users)
│   ├── itemService.ts (CRUD operations for items)
│   ├── transactionService.ts (logging & querying)
│   └── reportService.ts (report generation logic)
│
├── navigation/
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx (role-based tabs)
│
├── guards/
│   └── PermissionGuard.tsx (checks user role before rendering)
│
├── utils/
│   ├── permissions.ts (role checking helpers)
│   ├── dateHelpers.ts
│   └── validation.ts
│
├── types/
│   ├── user.ts
│   ├── item.ts
│   └── transaction.ts
│
└── constants/
    ├── roles.ts (STAFF, MANAGER, OWNER enums)
    └── permissions.ts (permission matrix)
```

### Key Architectural Patterns

#### 1. Service Layer Pattern
Database logic separated from UI components.

**Example:**
```typescript
// services/itemService.ts
export const itemService = {
  async getAllItems() {
    const db = await getDatabase();
    const result = await db.getAllAsync('SELECT * FROM items');
    return result;
  },
  
  async addStock(itemId: string, quantity: number, userId: string) {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE items SET quantity = quantity + ?, last_stock_added = ? WHERE id = ?',
      [quantity, Date.now(), itemId]
    );
    
    // Log transaction
    await transactionService.create({
      itemId,
      quantityChange: quantity,
      userId,
      type: 'add'
    });
  }
};
```

#### 2. Custom Hooks for Business Logic
Keep components clean by moving logic to reusable hooks.

**Example:**
```typescript
// features/inventory/hooks/useStockOperations.ts
export const useStockOperations = () => {
  const [loading, setLoading] = useState(false);
  
  const addStock = async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      const user = useAuthStore.getState().user;
      await itemService.addStock(itemId, quantity, user.id);
      // Refresh inventory
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return { addStock, loading };
};
```

#### 3. Zustand for State Management
Simple, minimal boilerplate state management per feature.

**Example:**
```typescript
// features/auth/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (username, pin) => {
    const user = await userService.authenticate(username, pin);
    set({ user, isAuthenticated: true });
  },
  
  logout: () => {
    set({ user: null, isAuthenticated: false });
  }
}));
```

#### 4. Permission Guard Component
Protect screens based on user role.

**Example:**
```typescript
// guards/PermissionGuard.tsx
import { hasPermission } from '@/utils/permissions';
import { useAuthStore } from '@/features/auth/store/authStore';

interface Props {
  requiredRole: 'staff' | 'manager' | 'owner';
  children: React.ReactNode;
}

export const PermissionGuard = ({ requiredRole, children }: Props) => {
  const user = useAuthStore(state => state.user);
  
  if (!hasPermission(user?.role, requiredRole)) {
    return <Text>Access Denied</Text>;
  }
  
  return <>{children}</>;
};

// Usage:
<PermissionGuard requiredRole="manager">
  <ReportsScreen />
</PermissionGuard>
```

### Database Architecture

#### Database Initialization
```typescript
// database/db.ts
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export const getDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('inventory.db');
    await runMigrations(db);
  }
  return db;
};
```

#### Initial Migration
```typescript
// database/migrations/initial.ts
export const createTables = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      created_by TEXT,
      is_active INTEGER DEFAULT 1
    );
    
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      date_added INTEGER NOT NULL,
      last_stock_added INTEGER,
      last_stock_removed INTEGER,
      created_by TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
    CREATE INDEX idx_transactions_item_id ON transactions(item_id);
    CREATE INDEX idx_items_category ON items(category);
  `);
};
```

### Navigation Architecture

```typescript
// navigation/RootNavigator.tsx
import { useAuthStore } from '@/features/auth/store/authStore';

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// navigation/MainNavigator.tsx
export const MainNavigator = () => {
  const user = useAuthStore(state => state.user);
  
  return (
    <Tab.Navigator>
      <Tab.Screen name="Stock" component={StockListScreen} />
      
      {/* Manager and Owner only */}
      {hasPermission(user?.role, 'manager') && (
        <>
          <Tab.Screen name="Reports" component={ReportsScreen} />
          <Tab.Screen name="Users" component={ManageUsersScreen} />
        </>
      )}
      
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
```

### Work Division for 2-Person Team

**Developer A:**
- Auth feature (login, auth store, guards)
- Inventory feature (stock list, add/remove stock)
- Database setup and migrations

**Developer B:**
- Transactions feature (logs, filtering)
- Reports feature (report generation, filters)
- Users feature (add users, manage users)

**Shared Responsibility:**
- Navigation structure
- Service layer interfaces (coordinate design)
- Permission system utilities
- Code reviews

---

## Core Objectives
Build a local, offline inventory management system for Android tablet that:
1. Tracks 1000+ inventory items
2. Logs all stock transactions automatically
3. Implements role-based access control (3 user types)
4. Provides low stock alerts
5. Generates transaction reports

---

## User Roles & Permissions

### 🔵 Staff Role
**Can:**
- Add stock to existing items (+quantity)
- Remove stock from existing items (-quantity)
- View their assigned inventory data

**Cannot:**
- Add new items to the database
- View transaction logs
- Add users
- Generate reports
- Modify item details

---

### 🟢 Manager Role
**Inherits:** All Staff permissions

**Additional permissions:**
- Generate transaction logs (daily, weekly, monthly)
- Add new items to the product database
- Add new Staff members to the system
- Access advanced reporting and analytics
- View all staff transaction history

**Cannot:**
- Add Manager or Business Owner users
- Access system-wide configurations

---

### 🔴 Business Owner Role
**Inherits:** All Manager permissions

**Additional permissions:**
- Add new Manager-level users
- Add new Business Owner users
- Full administrative control
- Access to all system configurations

---

## Feature Requirements

### 1. Authentication & User Management

#### Login Screen
- Username/PIN input
- Role-based redirect after login
- "Stay logged in" option (tablet context)

#### User Database Schema
```
User {
  id: string (UUID)
  username: string (unique)
  pin: string (hashed)
  role: enum ['staff', 'manager', 'owner']
  created_at: timestamp
  created_by: string (user_id)
  is_active: boolean
}
```

#### Add User Functionality
- **Managers can add:** Staff only
- **Owners can add:** Staff, Managers, Owners
- Form fields: Username, PIN, Role (dropdown filtered by permission)
- Validation: Username must be unique

---

### 2. Inventory Item Database

#### Item Schema
```
Item {
  id: string (UUID)
  name: string
  category: string
  quantity: number (current stock level)
  description: string (optional)
  low_stock_threshold: number
  date_added: timestamp
  last_stock_added: timestamp (nullable)
  last_stock_removed: timestamp (nullable)
  created_by: string (user_id)
}
```

#### Add New Item (Manager/Owner Only)
Form fields:
- Item Name (required)
- Category (required, dropdown or free text)
- Initial Quantity (required, default: 0)
- Description (optional)
- Low Stock Threshold (required, default: 10)

---

### 3. Stock Display & Main View

#### Stock Table Columns
| Column | Description | Sortable | Clickable |
|--------|-------------|----------|-----------|
| Item Name | Product name | Yes | Yes (opens item detail) |
| Category | Product classification | Yes | No |
| Quantity | Current stock level | Yes | No |
| Date Last Added Stock | Most recent addition | Yes | No |
| Date Last Removed Stock | Most recent removal | Yes | No |

#### Features
- **Search bar:** Filter by item name
- **Category filter:** Dropdown to filter by category
- **Sort options:** By name, quantity, date added, date removed
- **Low stock visual:** Items at/below threshold display in RED
- **Click item name:** Opens item detail modal/screen

#### Item Detail View
Display:
- All item properties (name, category, quantity, description, threshold)
- Quick actions: "Add Stock" button, "Remove Stock" button
- Transaction history for this specific item (last 20 entries)
- Edit button (Manager/Owner only) to modify item details

---

### 4. Add/Remove Stock Functionality

#### Add Stock Flow (All Roles)
1. User selects item from main view OR item detail screen
2. Modal/screen appears: "Add Stock to [Item Name]"
3. Input field: Quantity to add (number, required, min: 1)
4. "Confirm" button
5. On confirm:
   - Update item quantity: `quantity = quantity + input`
   - Create transaction log entry
   - Update `last_stock_added` timestamp
   - Show success message
   - Return to main view

#### Remove Stock Flow (All Roles)
1. User selects item from main view OR item detail screen
2. Modal/screen appears: "Remove Stock from [Item Name]"
3. Input field: Quantity to remove (number, required, min: 1)
4. Validation: Cannot remove more than current quantity
5. "Confirm" button
6. On confirm:
   - Update item quantity: `quantity = quantity - input`
   - Create transaction log entry
   - Update `last_stock_removed` timestamp
   - Show success message
   - Return to main view

---

### 5. Transaction Logging System

#### Transaction Log Schema
```
Transaction {
  id: string (UUID)
  item_id: string (foreign key to Item)
  item_name: string (denormalized for quick display)
  quantity_change: number (positive for add, negative for remove)
  user_id: string (foreign key to User)
  user_name: string (denormalized)
  timestamp: timestamp
  transaction_type: enum ['add', 'remove']
}
```

#### Automatic Logging
Every add/remove stock action creates a log entry:
- **Format:** `"[Item Name] | [+/-Quantity] | [User Name] | [Date Time]"`
- **Example:** `"Liquid seasoning | +3 | John Smith | Nov 3 2025 2:30 PM"`

#### Log Entry Display
- Each log entry is clickable
- Clicking opens the corresponding item detail view
- Logs are searchable by: item name, user name, date range

---

### 6. Transaction Reports (Manager/Owner Only)

#### Report Screen
Accessible from main navigation (Manager/Owner only)

#### Report Filters
- **Time Period:** Daily, Weekly, Monthly (dropdown)
- **Date Range Picker:** Custom start/end dates
- **User Filter:** All users OR specific user (dropdown)
- **Item Filter:** All items OR specific item (dropdown)
- **Transaction Type:** All, Add only, Remove only

#### Report Display
- Table format with all transaction log columns
- Export button: "Export to CSV" (optional for MVP)
- Summary statistics:
  - Total transactions in period
  - Total items added
  - Total items removed
  - Most active user
  - Most frequently updated item

#### Example Report View
```
Daily Report - November 13, 2025
Filtered by: All Users, All Items

Total Transactions: 45
Total Added: +120 items
Total Removed: -89 items

[Transaction Table]
Item Name | Change | User | Time
Ketchup 350mL | +10 | John Smith | 9:30 AM
Vegetable Oil 1L | -5 | Maria Santos | 10:15 AM
...
```

---

### 7. Low Stock Alert System

#### Alert Configuration
- Each item has a `low_stock_threshold` value
- Configurable by Manager/Owner when creating/editing items
- Default threshold: 10 units

#### Visual Alerts
- **Main stock table:** Items at/below threshold display in RED text
- **Item detail view:** Red banner at top: "⚠️ Low Stock Alert"
- **Optional (Phase 2):** Badge on main navigation showing count of low-stock items

#### Alert Logic
```
if (item.quantity <= item.low_stock_threshold) {
  display_red_alert = true
}
```

#### Pop-up Notifications (Optional - NOT MVP)
- Can be added in future iteration
- Would notify Manager/Owner roles when stock drops below threshold

---

## Database Tables Summary

### Users Table
- id, username, pin_hash, role, created_at, created_by, is_active

### Items Table
- id, name, category, quantity, description, low_stock_threshold, date_added, last_stock_added, last_stock_removed, created_by

### Transactions Table
- id, item_id, item_name, quantity_change, user_id, user_name, timestamp, transaction_type

---

## Navigation Structure

```
App Structure:
├── Login Screen
└── Main App (after login)
    ├── Stock View (Home) - ALL ROLES
    │   ├── Search & Filter
    │   ├── Stock Table
    │   └── Item Detail Modal
    ├── Add Stock Modal - ALL ROLES
    ├── Remove Stock Modal - ALL ROLES
    ├── Add Item Screen - MANAGER/OWNER ONLY
    ├── Reports Screen - MANAGER/OWNER ONLY
    ├── Manage Users Screen - MANAGER/OWNER ONLY
    └── Settings/Logout
```

---

## MVP Scope - What's INCLUDED

✅ Role-based access control (3 user types)  
✅ Local SQLite database (offline)  
✅ Add/Remove stock with automatic logging  
✅ Transaction logs with filtering  
✅ Daily/Weekly/Monthly reports  
✅ Low stock visual alerts (red text)  
✅ Add new items (Manager/Owner)  
✅ Add new users (Manager/Owner)  
✅ Search and filter inventory  
✅ Item detail view with history  
✅ 1000+ items capacity  

---

## MVP Scope - What's EXCLUDED (Future Phases)

❌ Multi-device sync (use local SQLite only)  
❌ Pop-up/push notifications for low stock  
❌ Barcode scanning  
❌ Export to CSV/Excel  
❌ Edit existing items (only add new ones)  
❌ Delete items or users  
❌ Email/SMS alerts  
❌ Advanced analytics/charts  
❌ Supplier management  
❌ Purchase order generation  
❌ Inventory value calculations  

---

## Success Criteria

1. **Performance:** App loads in < 2 seconds on tablet
2. **Reliability:** Zero data loss on offline operation
3. **Usability:** Staff can add/remove stock in < 10 seconds
4. **Accuracy:** 100% transaction logging (no missed entries)
5. **Security:** Users cannot access features outside their role
6. **Capacity:** Handles 1000+ items without lag

---

## Development Phases

### Phase 1: Foundation (Weeks 1-4)
- Setup React Native + Expo project
- Implement SQLite database
- Create database schema and models
- Build login screen with authentication
- Setup navigation structure

### Phase 2: Core Inventory (Weeks 5-12)
- Stock table view with search/filter
- Add/Remove stock functionality
- Transaction logging system
- Item detail view
- Low stock visual alerts

### Phase 3: User Management (Weeks 13-16)
- Add user functionality (role-based)
- User management screen
- Permission enforcement across app

### Phase 4: Reporting (Weeks 17-20)
- Transaction reports screen
- Daily/Weekly/Monthly filters
- Report generation logic

### Phase 5: Polish & Testing (Weeks 21-24)
- UI/UX refinements
- Bug fixes
- Performance optimization
- User acceptance testing with client

---

## Notes for Developers

- **Stay focused:** If a feature isn't listed in "MVP Scope - INCLUDED", don't build it
- **Database first:** Set up schema correctly at the start to avoid migrations
- **Permission checks:** Every screen/action must verify user role
- **Denormalize wisely:** Store item_name and user_name in transactions for faster queries
- **Test offline:** Airplane mode should not break any functionality
- **Think ahead:** Structure code so adding Supabase sync later is straightforward

---

## Questions to Resolve Before Development

1. Should Business Owner be the only initial user, or do we seed test users?
2. What happens if a user is deactivated? Hide their transactions or keep visible?
3. Should users be able to change their own PIN?
4. Default categories for items, or fully free-form?
5. Should transaction logs be deletable by anyone? (Suggest: NO for audit trail)

---

**This PRD is your north star. Every time you code, ask: "Is this feature explicitly listed here?" If not, save it for Phase 2.**