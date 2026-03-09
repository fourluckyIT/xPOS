// ─── Enums / Unions ─────────────────────────────────────────────

export type Role = 'super_admin' | 'manager' | 'staff';
export type BusinessType = 'restaurant' | 'retail';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'walk_in' | 'wholesale';
export type OrderStatus = 'open' | 'preparing' | 'served' | 'closed' | 'cancelled';
export type PaymentMethod = 'cash' | 'qr' | 'card' | 'wallet' | 'transfer';
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';
export type StockMovementType = 'sale' | 'adjust' | 'purchase' | 'waste' | 'count';
export type StockTargetType = 'product' | 'ingredient';
export type SyncItemType = 'drive_backup' | 'daily_summary' | 'low_stock_alert';
export type SyncItemStatus = 'pending' | 'sent' | 'failed';

// ─── Workspace (vendor host registry — NOT stored in Dexie) ────

export interface Workspace {
  id: string;
  googleId: string;
  email: string;
  name: string;
  createdAt: number;
}

// ─── Store ──────────────────────────────────────────────────────

export interface Store {
  id: string;
  workspaceId?: string;       // set after Google login; undefined in offline-only mode
  name: string;
  businessType: BusinessType;
  address: string;
  phone: string;
  taxId: string;
  logo?: string;
  settings: StoreSettings;
  createdAt: number;
}

export interface StoreSettings {
  vatRate: number;
  serviceChargeRate: number;
  enableVat: boolean;
  enableServiceCharge: boolean;
  vatMode: 'add' | 'included';
  roundingMode: 'none' | 'baht';
  receiptHeader: string;
  receiptFooter: string;
  currency: string;
  lowStockAlertEnabled: boolean;
  autoBackupOnShiftClose: boolean;
}

// ─── User (store-scoped) ────────────────────────────────────────

export interface User {
  id: string;
  storeId: string;
  name: string;
  pinHash: string;
  role: Role;
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}

// ─── Category ───────────────────────────────────────────────────

export interface Category {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  color: string;
}

// ─── Product ────────────────────────────────────────────────────

export interface ProductModifier {
  name: string;
  price: number;
}

export interface ProductVariant {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  price: number;
  image?: string;
  unit: string;
  barcode?: string;
  isActive: boolean;
  variants: ProductVariant[];
  modifiers: ProductModifier[];
  // Stock — retail uses direct product stock; F&B uses recipe→ingredient
  trackStock: boolean;        // true = deduct from this product on sale
  currentStock: number;       // meaningful when trackStock=true
  lowStockThreshold: number;  // alert when currentStock < this
  costPrice: number;          // purchase cost, for margin calc
  createdAt: number;
}

// ─── Recipe (F&B: links Product → Ingredient) ───────────────────

export interface Recipe {
  id: string;
  productId: string;
  ingredientId: string;
  qty: number;
  unit: string;
}

// ─── Ingredient (F&B stock unit) ────────────────────────────────

export interface Ingredient {
  id: string;
  storeId: string;
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  lowStockThreshold: number;
  supplierId?: string;
}

// ─── Supplier ───────────────────────────────────────────────────

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contact: string;
  affiliateLink?: string;
}

// ─── Table (F&B) ────────────────────────────────────────────────

export interface Table {
  id: string;
  storeId: string;
  zone: string;
  name: string;
  seats: number;
  sortOrder: number;
  status: TableStatus;
}

// ─── Order ──────────────────────────────────────────────────────

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
  note: string;
  voided: boolean;
  voidReason: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  ref: string;
  createdAt: number;
}

export interface Order {
  id: string;
  storeId: string;
  tableId?: string;
  tableName?: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  payments: Payment[];
  subtotal: number;
  discount: number;
  discountType: 'amount' | 'percent';
  serviceCharge: number;
  vat: number;
  total: number;
  staffId: string;
  staffName: string;
  customerCount: number;
  note: string;
  createdAt: number;
  closedAt?: number;
}

// ─── Shift ──────────────────────────────────────────────────────

export interface Shift {
  id: string;
  storeId: string;
  staffId: string;
  staffName: string;
  openedAt: number;
  closedAt?: number;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  totalSales: number;
  totalOrders: number;
  backedUp: boolean;
}

// ─── Stock Movement ─────────────────────────────────────────────

export interface StockMovement {
  id: string;
  storeId: string;
  targetType: StockTargetType; // 'product' for retail, 'ingredient' for F&B
  targetId: string;            // productId or ingredientId
  type: StockMovementType;
  qty: number;                 // negative = deduction
  ref: string;                 // orderId or manual note
  createdAt: number;
}

// ─── Promotion ──────────────────────────────────────────────────

export interface Promotion {
  id: string;
  storeId: string;
  name: string;
  type: 'discount_amount' | 'discount_percent' | 'bogo' | 'bundle';
  value: number;
  minPurchase: number;
  startDate: number;
  endDate: number;
  isActive: boolean;
}

// ─── Customer ───────────────────────────────────────────────────

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  lineUserId?: string;
  points: number;
  visits: number;
  lastVisit?: number;
  createdAt: number;
}

// ─── Sync Queue (device-level, not store-scoped) ────────────────

export interface SyncQueueItem {
  id: string;
  storeId: string;
  type: SyncItemType;
  payload: string;             // JSON-serialized
  status: SyncItemStatus;
  retries: number;
  lastAttempt?: number;
  createdAt: number;
}
