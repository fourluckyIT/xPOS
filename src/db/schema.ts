import Dexie, { type EntityTable } from 'dexie';
import type {
  Store, User, Category, Product, Recipe, Ingredient,
  Supplier, Table, Order, Shift, StockMovement,
  Promotion, Customer, SyncQueueItem,
} from '@/types';

export class XPosDB extends Dexie {
  stores!: EntityTable<Store, 'id'>;
  users!: EntityTable<User, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  products!: EntityTable<Product, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  ingredients!: EntityTable<Ingredient, 'id'>;
  suppliers!: EntityTable<Supplier, 'id'>;
  diningTables!: EntityTable<Table, 'id'>;
  orders!: EntityTable<Order, 'id'>;
  shifts!: EntityTable<Shift, 'id'>;
  stockMovements!: EntityTable<StockMovement, 'id'>;
  promotions!: EntityTable<Promotion, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('xpos');

    // ── v1: original schema ─────────────────────────────────────
    this.version(1).stores({
      stores: 'id',
      users: 'id, storeId, role',
      categories: 'id, storeId, sortOrder',
      products: 'id, storeId, categoryId, barcode, isActive',
      recipes: 'id, productId, ingredientId',
      ingredients: 'id, storeId',
      suppliers: 'id, storeId',
      diningTables: 'id, storeId, zone, status',
      orders: 'id, storeId, tableId, status, createdAt, closedAt',
      shifts: 'id, storeId, staffId, openedAt',
      stockMovements: 'id, storeId, ingredientId, createdAt',
      promotions: 'id, storeId, isActive',
      customers: 'id, storeId, phone',
    });

    // ── v2: retail stock on Product, unified StockMovement, syncQueue
    this.version(2).stores({
      stores: 'id',
      users: 'id, storeId, role',
      categories: 'id, storeId, sortOrder',
      products: 'id, storeId, categoryId, barcode, isActive',
      recipes: 'id, productId, ingredientId',
      ingredients: 'id, storeId',
      suppliers: 'id, storeId',
      diningTables: 'id, storeId, zone, status',
      orders: 'id, storeId, tableId, status, createdAt, closedAt',
      shifts: 'id, storeId, staffId, openedAt',
      stockMovements: 'id, storeId, targetId, createdAt',  // ingredientId → targetId
      promotions: 'id, storeId, isActive',
      customers: 'id, storeId, phone',
      syncQueue: 'id, status, createdAt',                   // new table
    }).upgrade(tx => {
      // Migrate products: add new stock fields with safe defaults
      tx.table('products').toCollection().modify(p => {
        if (p.trackStock === undefined) p.trackStock = false;
        if (p.currentStock === undefined) p.currentStock = 0;
        if (p.lowStockThreshold === undefined) p.lowStockThreshold = 0;
        if (p.costPrice === undefined) p.costPrice = 0;
      });
      // Migrate stockMovements: rename ingredientId → targetId + add targetType
      tx.table('stockMovements').toCollection().modify(sm => {
        if (sm.targetId === undefined && sm.ingredientId) {
          sm.targetType = 'ingredient';
          sm.targetId = sm.ingredientId;
          delete sm.ingredientId;
        }
      });
      // Migrate stores: add vatMode/roundingMode defaults if missing
      tx.table('stores').toCollection().modify(s => {
        if (s.settings && !s.settings.vatMode) s.settings.vatMode = 'add';
        if (s.settings && !s.settings.roundingMode) s.settings.roundingMode = 'none';
      });
    });
  }
}

export const db = new XPosDB();
