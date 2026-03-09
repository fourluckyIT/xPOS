import { db } from '@/db/schema';
import { nowTimestamp } from '@/lib/utils';
import type {
  Store, User, Category, Product, Recipe, Ingredient,
  Supplier, Table, Order, Shift, StockMovement,
  Promotion, Customer,
} from '@/types';

// ─── Constants ──────────────────────────────────────────────────

export const SCHEMA_VERSION = 2;
export const APP_VERSION = '1.0.0';
export const DRIVE_ROOT_FOLDER = 'xPOS';

// ─── Drive folder/file paths ────────────────────────────────────

export function drivePaths(storeId: string) {
  return {
    storeFolder: `${DRIVE_ROOT_FOLDER}/${storeId}`,
    metaFile: `${DRIVE_ROOT_FOLDER}/${storeId}/meta.json`,
    backupFile: `${DRIVE_ROOT_FOLDER}/${storeId}/backup-latest.json`,
    shiftFile: (shiftId: string) =>
      `${DRIVE_ROOT_FOLDER}/${storeId}/shifts/${shiftId}.json`,
  };
}

// ─── meta.json ──────────────────────────────────────────────────

export interface DriveMetaFile {
  schemaVersion: number;
  appVersion: string;
  storeId: string;
  storeName: string;
  businessType: 'restaurant' | 'retail';
  deviceId: string;
  lastBackupAt: number;
  lastBackupShiftId?: string;
}

// ─── backup-latest.json ─────────────────────────────────────────

export interface DriveBackupFile {
  _schemaVersion: number;
  _appVersion: string;
  _exportedAt: number;
  _checksum: string;           // "sha256:<hex>"
  _storeId: string;
  stores: Store[];
  users: User[];
  categories: Category[];
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  suppliers: Supplier[];
  diningTables: Table[];
  orders: Order[];
  shifts: Shift[];
  stockMovements: StockMovement[];
  promotions: Promotion[];
  customers: Customer[];
}

// ─── shift file (optional, per-shift archive) ───────────────────

export interface DriveShiftFile {
  _schemaVersion: number;
  _appVersion: string;
  shift: Shift;
  orders: Order[];
  stockMovements: StockMovement[];
}

// ─── Table names in export order ────────────────────────────────

const TABLE_NAMES = [
  'stores', 'users', 'categories', 'products', 'recipes',
  'ingredients', 'suppliers', 'diningTables', 'orders',
  'shifts', 'stockMovements', 'promotions', 'customers',
] as const;

// ─── Checksum ───────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return 'sha256:' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Serialize: IndexedDB → backup JSON ─────────────────────────

export async function serializeStoreBackup(storeId: string): Promise<{
  backup: DriveBackupFile;
  meta: DriveMetaFile;
}> {
  const store = await db.stores.get(storeId);
  if (!store) throw new Error(`Store ${storeId} not found`);

  const data: Record<string, unknown[]> = {};
  for (const name of TABLE_NAMES) {
    const table = db.table(name);
    // stores table: filter by id; all others: filter by storeId
    if (name === 'stores') {
      data[name] = [store];
    } else if (name === 'recipes') {
      // recipes don't have storeId — get via products
      const productIds = await db.products
        .where('storeId').equals(storeId)
        .primaryKeys();
      data[name] = await db.recipes
        .where('productId').anyOf(productIds)
        .toArray();
    } else {
      data[name] = await table
        .where('storeId').equals(storeId)
        .toArray();
    }
  }

  // Build backup without checksum first
  const backupWithoutChecksum = {
    _schemaVersion: SCHEMA_VERSION,
    _appVersion: APP_VERSION,
    _exportedAt: nowTimestamp(),
    _checksum: '',
    _storeId: storeId,
    ...data,
  };

  // Compute checksum over data (excluding _checksum field)
  const checksumInput = JSON.stringify({
    ...backupWithoutChecksum,
    _checksum: undefined,
  });
  const checksum = await sha256(checksumInput);

  const backup: DriveBackupFile = {
    ...backupWithoutChecksum,
    _checksum: checksum,
  } as DriveBackupFile;

  const lastShift = await db.shifts
    .where('storeId').equals(storeId)
    .reverse().sortBy('openedAt')
    .then(shifts => shifts[0]);

  const meta: DriveMetaFile = {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    storeId: store.id,
    storeName: store.name,
    businessType: store.businessType,
    deviceId: localStorage.getItem('xpos_device_id') || 'unknown',
    lastBackupAt: nowTimestamp(),
    lastBackupShiftId: lastShift?.id,
  };

  return { backup, meta };
}

// ─── Serialize: single shift → shift file ───────────────────────

export async function serializeShiftFile(
  storeId: string,
  shiftId: string,
): Promise<DriveShiftFile> {
  const shift = await db.shifts.get(shiftId);
  if (!shift) throw new Error(`Shift ${shiftId} not found`);

  const orders = await db.orders
    .where('storeId').equals(storeId)
    .filter(o => o.createdAt >= shift.openedAt && (!shift.closedAt || o.createdAt <= shift.closedAt))
    .toArray();

  const orderIds = new Set(orders.map(o => o.id));

  const stockMovements = await db.stockMovements
    .where('storeId').equals(storeId)
    .filter(sm => orderIds.has(sm.ref))
    .toArray();

  return {
    _schemaVersion: SCHEMA_VERSION,
    _appVersion: APP_VERSION,
    shift,
    orders,
    stockMovements,
  };
}

// ─── Validation ─────────────────────────────────────────────────

export interface RestoreValidation {
  valid: boolean;
  error?: string;
}

export function validateBackup(data: unknown): RestoreValidation {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'ไฟล์ไม่ถูกต้อง' };
  }

  const d = data as Record<string, unknown>;

  if (!d._schemaVersion || !d._storeId) {
    return { valid: false, error: 'ไม่ใช่ไฟล์ backup ของ xPOS' };
  }

  if ((d._schemaVersion as number) > SCHEMA_VERSION) {
    return {
      valid: false,
      error: `ไฟล์ backup เวอร์ชัน ${d._schemaVersion} ใหม่กว่าแอปปัจจุบัน (v${SCHEMA_VERSION}) กรุณาอัปเดตแอป`,
    };
  }

  if (!Array.isArray(d.stores) || d.stores.length === 0) {
    return { valid: false, error: 'ไม่พบข้อมูลร้านในไฟล์ backup' };
  }

  if (!Array.isArray(d.users)) {
    return { valid: false, error: 'ไม่พบข้อมูลผู้ใช้ในไฟล์ backup' };
  }

  return { valid: true };
}

// ─── Restore: backup JSON → IndexedDB ───────────────────────────
// Rules:
// 1. Full replace — clears all data for the target storeId, then inserts from backup
// 2. If backup storeId differs from current, it replaces the current store entirely
// 3. Caller must confirm with user before calling this

export async function restoreStoreBackup(payload: DriveBackupFile): Promise<void> {
  const validation = validateBackup(payload);
  if (!validation.valid) throw new Error(validation.error);

  const storeId = payload._storeId;

  await db.transaction('rw',
    [db.stores, db.users, db.categories, db.products, db.recipes,
     db.ingredients, db.suppliers, db.diningTables, db.orders,
     db.shifts, db.stockMovements, db.promotions, db.customers],
    async () => {
      // Clear existing data for this storeId
      for (const name of TABLE_NAMES) {
        const table = db.table(name);
        if (name === 'stores') {
          await table.where('id').equals(storeId).delete();
        } else if (name === 'recipes') {
          const productIds = await db.products
            .where('storeId').equals(storeId)
            .primaryKeys();
          if (productIds.length > 0) {
            await db.recipes
              .where('productId').anyOf(productIds)
              .delete();
          }
        } else {
          await table.where('storeId').equals(storeId).delete();
        }
      }

      // Insert from backup
      for (const name of TABLE_NAMES) {
        const rows = (payload as unknown as Record<string, unknown[]>)[name];
        if (Array.isArray(rows) && rows.length > 0) {
          await db.table(name).bulkAdd(rows);
        }
      }
    }
  );
}

// ─── Verify checksum ────────────────────────────────────────────

export async function verifyChecksum(payload: DriveBackupFile): Promise<boolean> {
  const stored = payload._checksum;
  if (!stored) return false; // no checksum = old backup, accept anyway

  const copy = { ...payload, _checksum: undefined };
  const computed = await sha256(JSON.stringify(copy));
  return stored === computed;
}
