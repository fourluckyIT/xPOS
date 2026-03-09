# xPOS — System Architecture

> Implementation-oriented system design.
> Local-first POS for Thai SMB merchants (retail + restaurant).
> Rule: **LOCAL DATA MUST NEVER BE LOST.**

---

## SECTION 1 — POS DATA MODEL

### Separation: Master Data vs Transaction Data

```
MASTER DATA (transaction-independent)     TRANSACTION DATA (created by daily sales)
──────────────────────────────────────    ──────────────────────────────────────────
Store                                     Order
User                                      OrderItem        ← SEPARATE TABLE
Category                                  Payment          ← SEPARATE TABLE
Product                                   Shift
Ingredient                                StockMovement
Recipe                                    SyncQueueItem
Supplier
DiningTable
Promotion
Customer
```

Master data changes rarely (menu edits, staff changes).
Transaction data grows continuously and is append-mostly.

This distinction matters for backup strategy: master data is small and fully exported; transaction data is partitioned by shift/date for incremental backup.

---

### Entity Definitions

All entities use `id: string` (UUID v4 via `crypto.randomUUID()`).
All timestamps are `number` (epoch ms via `Date.now()`).

#### Store

```typescript
interface Store {
  id: string;
  workspaceId?: string;       // set after Google login; undefined offline
  name: string;
  businessType: BusinessType; // 'restaurant' | 'retail'
  address: string;
  phone: string;
  taxId: string;
  logo?: string;
  settings: StoreSettings;
  createdAt: number;
}
```

`businessType` controls **UI defaults only** (sidebar items, default order type, demo data). It does NOT control stock logic. Any store can mix both stock models.

#### User

```typescript
interface User {
  id: string;
  storeId: string;
  name: string;
  pinHash: string;           // hashed 4-6 digit PIN
  role: Role;                // 'super_admin' | 'manager' | 'staff'
  avatar?: string;
  isActive: boolean;
  createdAt: number;
}
```

#### Category

```typescript
interface Category {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  color: string;
}
```

#### Product

```typescript
interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  price: number;
  image?: string;
  unit: string;
  barcode?: string;
  isActive: boolean;
  variants: ProductVariant[];      // embedded — small, read-with-product
  modifiers: ProductModifier[];    // embedded — small, read-with-product
  trackStock: boolean;             // KEY FIELD: true = retail deduction, false = recipe deduction
  currentStock: number;
  lowStockThreshold: number;
  costPrice: number;
  createdAt: number;
}
```

**`trackStock` is the branching flag** for the entire stock system.

#### Ingredient

```typescript
interface Ingredient {
  id: string;
  storeId: string;
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  lowStockThreshold: number;
  supplierId?: string;
}
```

#### Recipe (join table: Product → Ingredient)

```typescript
interface Recipe {
  id: string;
  productId: string;
  ingredientId: string;
  qty: number;               // amount of ingredient per 1 unit of product
  unit: string;
}
```

#### Supplier

```typescript
interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contact: string;
  affiliateLink?: string;    // ecosystem commerce hook
}
```

#### DiningTable

```typescript
interface Table {
  id: string;
  storeId: string;
  zone: string;
  name: string;
  seats: number;
  sortOrder: number;
  status: TableStatus;       // 'available' | 'occupied' | 'reserved' | 'cleaning'
}
```

Dexie table name: `diningTables` (avoids Dexie reserved word `tables`).

#### Order

```typescript
interface Order {
  id: string;
  storeId: string;
  shiftId: string;           // ← links order to the active shift
  tableId?: string;
  tableName?: string;
  type: OrderType;
  status: OrderStatus;
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
```

**Critical change from current code:** `items` and `payments` arrays are REMOVED from this interface. They become separate tables.

#### OrderItem — SEPARATE TABLE

```typescript
interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;       // denormalized for receipt/history
  variantName?: string;
  qty: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];  // embedded — small, never queried independently
  note: string;
  voided: boolean;
  voidReason: string;
  createdAt: number;
}
```

#### Payment — SEPARATE TABLE

```typescript
interface Payment {
  id: string;
  orderId: string;
  shiftId: string;           // ← enables shift-level cash reconciliation
  method: PaymentMethod;
  amount: number;
  ref: string;               // external reference (QR txn id, card auth, etc.)
  createdAt: number;
}
```

#### Why OrderItem and Payment must be separate tables

1. **Atomicity** — If an order has 50 items embedded in a single IndexedDB record, updating one item (void, qty change) requires rewriting the entire order blob. With a separate table, each item is an independent write.

2. **Query performance** — "Show all items sold today" or "total revenue by product this week" requires scanning every order and deserializing every embedded array. With a separate table: `orderItems.where('orderId').anyOf(todayOrderIds)` or direct indexed queries.

3. **Partial sync** — When backing up incrementally, separate tables allow streaming order items independently. Embedded arrays force full-order serialization.

4. **Conflict safety** — If two operations modify the same order simultaneously (e.g., add item + apply discount), embedded arrays create write conflicts. Separate tables isolate the writes.

5. **Split payment** — Multiple payments per order (cash + QR) is natural with a separate payments table. Embedded arrays make split payment awkward to query ("total cash received this shift").

6. **Reporting** — Shift close needs `SUM(payments.amount) WHERE shiftId = X GROUP BY method`. This is a simple indexed query on a payments table. With embedded arrays, it requires loading every order and iterating every payment sub-array.

#### Shift

```typescript
interface Shift {
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
  cashIn: number;            // manual cash-in during shift
  cashOut: number;           // manual cash-out during shift
  backedUp: boolean;
}
```

#### StockMovement

```typescript
interface StockMovement {
  id: string;
  storeId: string;
  targetType: 'product' | 'ingredient';
  targetId: string;
  type: 'sale' | 'adjust' | 'purchase' | 'waste' | 'count';
  qty: number;               // negative = deduction
  ref: string;               // orderId or manual note
  createdAt: number;
}
```

#### SyncQueueItem

```typescript
interface SyncQueueItem {
  id: string;
  storeId: string;
  type: 'drive_backup' | 'daily_summary' | 'low_stock_alert';
  payload: string;           // JSON-serialized
  status: 'pending' | 'sent' | 'failed';
  retries: number;
  maxRetries: number;        // default 5
  lastAttempt?: number;
  createdAt: number;
}
```

---

### Dexie Schema (v3 — with separate OrderItem/Payment tables)

```typescript
this.version(3).stores({
  stores:         'id',
  users:          'id, storeId, role',
  categories:     'id, storeId, sortOrder',
  products:       'id, storeId, categoryId, barcode, isActive',
  recipes:        'id, productId, ingredientId',
  ingredients:    'id, storeId',
  suppliers:      'id, storeId',
  diningTables:   'id, storeId, zone, status',
  orders:         'id, storeId, shiftId, status, createdAt, closedAt',
  orderItems:     'id, orderId, productId',          // NEW
  payments:       'id, orderId, shiftId, method',    // NEW
  shifts:         'id, storeId, staffId, openedAt',
  stockMovements: 'id, storeId, targetId, createdAt',
  promotions:     'id, storeId, isActive',
  customers:      'id, storeId, phone',
  syncQueue:      'id, status, createdAt',
});
```

Migration from v2→v3:
- For each existing order, extract `order.items` → bulk insert into `orderItems`
- For each existing order, extract `order.payments` → bulk insert into `payments`
- Delete `items` and `payments` fields from order records

---

### Stock Deduction: Two Paths

#### Path A: Retail product stock (trackStock = true)

```
Sale of "น้ำดื่มขวด" qty=2
  → Product.currentStock: 48 → 46
  → StockMovement { targetType:'product', targetId: productId, qty: -2, type:'sale' }
```

Direct. One write to products, one write to stockMovements.

#### Path B: Recipe → ingredient deduction (trackStock = false)

```
Sale of "มอคค่าเย็น" qty=1
  → Recipe lookup: productId → [
      { ingredientId: 'espresso', qty: 2, unit: 'shot' },
      { ingredientId: 'milk',     qty: 200, unit: 'ml' },
      { ingredientId: 'syrup',    qty: 30, unit: 'ml' },
    ]
  → Ingredient "espresso": currentStock 100 → 98
  → Ingredient "milk": currentStock 5000 → 4800
  → Ingredient "syrup": currentStock 900 → 870
  → 3× StockMovement { targetType:'ingredient', ... }
```

#### Mixed business (same store)

A bubble tea shop selling both made-to-order drinks AND packaged snacks:

| Product | trackStock | Deduction path |
|---------|-----------|----------------|
| ชาไทยเย็น | false | Recipe → ingredients (tea, milk, sugar) |
| น้ำดื่มขวด | true | Product.currentStock directly |
| คุกกี้ห่อ | true | Product.currentStock directly |
| เอสเพรสโซ่ร้อน | false | Recipe → ingredients (espresso, water) |

The `businessType` on Store is a **UI hint**, not a stock logic gate. The `trackStock` flag on each Product determines the deduction path. This allows any store to freely mix both models.

---

## SECTION 2 — SAFE SYNCHRONIZATION ARCHITECTURE

### Core Rules

1. **IndexedDB is the ONLY source of truth** — all reads/writes go to Dexie first
2. **Cloud never blocks POS** — all cloud operations are fire-and-forget with retry
3. **Sync is asynchronous** — enqueue → background process → retry on failure
4. **Orders never depend on internet** — zero network calls in the payment path
5. **Failed sync retries later** — exponential backoff, capped at 5 retries

### Flow: Order Creation → Payment → Stock → Sync

```
┌──────────────────────────────────────────────────────────┐
│                    SINGLE Dexie TRANSACTION              │
│                                                          │
│  1. Insert Order                                         │
│  2. Insert OrderItems (bulk)                             │
│  3. Insert Payment(s)                                    │
│  4. For each item:                                       │
│     if product.trackStock → deductProductStock()         │
│     else                  → deductRecipeStock()          │
│  5. Insert StockMovement(s)                              │
│  6. If dine_in → update table status to 'available'      │
│  7. If lowStock detected → insert SyncQueueItem          │
│                                                          │
│  ALL WRITES ATOMIC — if any fails, none are committed    │
└──────────────────────────────────────────────────────────┘
         │
         │ (async, non-blocking, OUTSIDE transaction)
         ▼
┌──────────────────────────────────────────────────────────┐
│  Background: processSyncQueue()                          │
│  - Picks pending items from syncQueue                    │
│  - Attempts delivery (Drive upload / LINE push / etc.)   │
│  - On success: status → 'sent'                           │
│  - On failure: retries++, lastAttempt = now              │
│  - If retries >= maxRetries: status stays 'failed'       │
│    (manual retry available from Settings)                 │
└──────────────────────────────────────────────────────────┘
```

### Flow: Shift Close

```
1. Calculate shift totals from orderItems + payments WHERE shiftId = X
2. Update Shift record (closedAt, closingCash, expectedCash, totalSales, totalOrders)
3. If autoBackupOnShiftClose:
   a. Serialize shift file (shift + orders + stockMovements for the shift period)
   b. Enqueue SyncQueueItem { type: 'drive_backup', payload: serialized shift }
4. Mark shift.backedUp = true (locally, regardless of upload result)
```

### Flow: Backup Generation

```
Two types of backup:
1. Shift backup  — small, per-shift, contains only that shift's orders/movements
2. Full backup   — large, all master data + all transactions, written to backup-latest.json

Shift backup: triggered on shift close (if autoBackupOnShiftClose = true)
Full backup:  triggered manually from Settings, or weekly auto (if connected)
```

---

### Pseudocode

#### completePayment()

```typescript
async function completePayment(input: PaymentInput): Promise<PaymentResult> {
  const { store, user, items, paymentMethod } = input;
  if (items.length === 0) throw new Error('ไม่มีรายการสินค้า');

  const totals = calcTotal(items, input.discount, input.discountType, store.settings);
  const orderId = generateId();
  const now = nowTimestamp();
  const activeShift = getActiveShift(); // from Zustand store

  // Build order (NO embedded items/payments)
  const order: Order = {
    id: orderId,
    storeId: store.id,
    shiftId: activeShift.id,
    tableId: input.tableId,
    tableName: input.tableName,
    type: input.orderType,
    status: 'closed',
    subtotal: totals.subtotal,
    discount: input.discount,
    discountType: input.discountType,
    serviceCharge: totals.serviceCharge,
    vat: totals.vat,
    total: totals.total,
    staffId: user.id,
    staffName: user.name,
    customerCount: input.customerCount,
    note: input.note,
    createdAt: now,
    closedAt: now,
  };

  // Build order items with orderId
  const orderItems = items.map(i => ({ ...i, orderId, createdAt: now }));

  // Build payment record
  const payment: Payment = {
    id: generateId(),
    orderId,
    shiftId: activeShift.id,
    method: paymentMethod,
    amount: totals.total,
    ref: '',
    createdAt: now,
  };

  const lowStockAlerts: LowStockAlert[] = [];

  // === SINGLE ATOMIC TRANSACTION ===
  await db.transaction('rw',
    [db.orders, db.orderItems, db.payments, db.products,
     db.ingredients, db.recipes, db.stockMovements,
     db.diningTables, db.syncQueue],
    async () => {
      await db.orders.add(order);
      await db.orderItems.bulkAdd(orderItems);
      await db.payments.add(payment);

      for (const item of items) {
        if (item.voided) continue;
        const product = await db.products.get(item.productId);
        if (!product) continue;

        if (product.trackStock) {
          await deductProductStock(store.id, product.id, item.qty, orderId, lowStockAlerts);
        } else {
          await deductRecipeStock(store.id, product.id, item.qty, orderId, lowStockAlerts);
        }
      }

      if (order.tableId) {
        await db.diningTables.update(order.tableId, { status: 'available' });
      }

      if (lowStockAlerts.length > 0 && store.settings.lowStockAlertEnabled) {
        await db.syncQueue.add({
          id: generateId(),
          storeId: store.id,
          type: 'low_stock_alert',
          payload: JSON.stringify({ storeId: store.id, alerts: lowStockAlerts, detectedAt: now }),
          status: 'pending',
          retries: 0,
          maxRetries: 5,
          createdAt: now,
        });
      }
    }
  );
  // === END TRANSACTION — all data safe in IndexedDB ===

  const change = paymentMethod === 'cash' && input.receivedAmount
    ? Math.max(0, input.receivedAmount - totals.total)
    : 0;

  return { order, change, lowStockAlerts };
}
```

#### closeShift()

```typescript
async function closeShift(shiftId: string, closingCash: number): Promise<Shift> {
  const shift = await db.shifts.get(shiftId);
  if (!shift) throw new Error('ไม่พบกะที่เปิดอยู่');

  const now = nowTimestamp();

  // Query payments in this shift for expected cash calculation
  const payments = await db.payments.where('shiftId').equals(shiftId).toArray();
  const cashPayments = payments.filter(p => p.method === 'cash');
  const expectedCash = shift.openingCash
    + cashPayments.reduce((sum, p) => sum + p.amount, 0)
    + (shift.cashIn || 0)
    - (shift.cashOut || 0);

  const orders = await db.orders.where('shiftId').equals(shiftId).toArray();
  const closedOrders = orders.filter(o => o.status === 'closed');

  const updatedShift: Partial<Shift> = {
    closedAt: now,
    closingCash,
    expectedCash,
    totalSales: closedOrders.reduce((sum, o) => sum + o.total, 0),
    totalOrders: closedOrders.length,
  };

  await db.shifts.update(shiftId, updatedShift);

  // Auto-backup if enabled
  const store = await db.stores.get(shift.storeId);
  if (store?.settings.autoBackupOnShiftClose) {
    await enqueueSyncEvent(shift.storeId, 'drive_backup', {
      type: 'shift_close',
      shiftId: shift.id,
    });
    await db.shifts.update(shiftId, { backedUp: true });
  }

  return { ...shift, ...updatedShift } as Shift;
}
```

#### enqueueSyncEvent()

```typescript
async function enqueueSyncEvent(
  storeId: string,
  type: SyncItemType,
  data: unknown,
): Promise<void> {
  const item: SyncQueueItem = {
    id: generateId(),
    storeId,
    type,
    payload: JSON.stringify(data),
    status: 'pending',
    retries: 0,
    maxRetries: 5,
    createdAt: nowTimestamp(),
  };
  await db.syncQueue.add(item);
  // Trigger background processor (non-blocking)
  scheduleSyncProcessing();
}
```

---

### syncQueue Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ syncQueue table                                                 │
├──────────┬──────────┬────────────────┬────────┬─────┬──────────┤
│ id       │ storeId  │ type           │ status │ ret │ payload  │
├──────────┼──────────┼────────────────┼────────┼─────┼──────────┤
│ uuid-1   │ store-1  │ drive_backup   │ pending│  0  │ {shift}  │
│ uuid-2   │ store-1  │ low_stock_alert│ failed │  3  │ {alerts} │
│ uuid-3   │ store-1  │ daily_summary  │ sent   │  0  │ {report} │
└──────────┴──────────┴────────────────┴────────┴─────┴──────────┘
```

### Retry Strategy

```
Attempt 1: immediate
Attempt 2: wait 30 seconds
Attempt 3: wait 2 minutes
Attempt 4: wait 10 minutes
Attempt 5: wait 1 hour
After 5 failures: status remains 'failed', visible in Settings → Sync

Backoff formula: min(baseDelay * 2^(retries-1), 3600000)
  where baseDelay = 30000 ms (30 seconds)
```

Processing loop:

```typescript
async function processSyncQueue(): Promise<void> {
  const pending = await db.syncQueue
    .where('status').anyOf(['pending', 'failed'])
    .filter(item => {
      if (item.status === 'pending') return true;
      if (item.retries >= item.maxRetries) return false;
      const backoff = Math.min(30000 * Math.pow(2, item.retries - 1), 3600000);
      return Date.now() - (item.lastAttempt || 0) > backoff;
    })
    .toArray();

  for (const item of pending) {
    try {
      await dispatchSyncItem(item);  // Drive upload, LINE push, etc.
      await db.syncQueue.update(item.id, { status: 'sent' });
    } catch (err) {
      await db.syncQueue.update(item.id, {
        status: 'failed',
        retries: item.retries + 1,
        lastAttempt: Date.now(),
      });
    }
  }
}

// Runs every 60 seconds when app is open, via setInterval
function scheduleSyncProcessing(): void {
  // Debounced — if already scheduled, skip
  if (syncTimerId) return;
  syncTimerId = setTimeout(async () => {
    syncTimerId = null;
    await processSyncQueue();
  }, 5000); // 5s delay after trigger
}
```

---

## SECTION 3 — GOOGLE DRIVE BACKUP MODEL

### Principle

The **merchant owns their data** on their own Google Drive. xPOS writes files to the merchant's Drive using their OAuth token. xPOS never stores merchant data on any xPOS server.

### Folder Structure

```
Google Drive/
└── xPOS/
    └── {storeId}/
        ├── meta.json              — store identity + last backup timestamp
        ├── backup-latest.json     — full database snapshot (master + transactions)
        └── shifts/
            ├── {shiftId-1}.json   — shift 1 archive
            ├── {shiftId-2}.json   — shift 2 archive
            └── ...
```

### File Purposes

#### meta.json

```json
{
  "schemaVersion": 3,
  "appVersion": "1.2.0",
  "storeId": "store-uuid",
  "storeName": "ร้านกาแฟ ABC",
  "businessType": "restaurant",
  "deviceId": "dev-uuid",
  "lastBackupAt": 1741500000000,
  "lastBackupShiftId": "shift-uuid"
}
```

Purpose: Quick identity check without downloading the full backup. Used during restore flow to show the user which store and when it was last backed up before downloading.

#### backup-latest.json

Full database export. Contains ALL master data and ALL transaction data for one store. Includes `_checksum` for integrity verification.

```json
{
  "_schemaVersion": 3,
  "_appVersion": "1.2.0",
  "_exportedAt": 1741500000000,
  "_checksum": "sha256:abc123...",
  "_storeId": "store-uuid",
  "stores": [...],
  "users": [...],
  "categories": [...],
  "products": [...],
  "recipes": [...],
  "ingredients": [...],
  "suppliers": [...],
  "diningTables": [...],
  "orders": [...],
  "orderItems": [...],
  "payments": [...],
  "shifts": [...],
  "stockMovements": [...],
  "promotions": [...],
  "customers": [...]
}
```

Purpose: **Full restore on a new device.** This is the disaster recovery file. One file = complete store recovery.

#### shifts/{shiftId}.json

```json
{
  "_schemaVersion": 3,
  "_appVersion": "1.2.0",
  "shift": { ... },
  "orders": [ ... ],
  "orderItems": [ ... ],
  "payments": [ ... ],
  "stockMovements": [ ... ]
}
```

Purpose: **Incremental archive.** Each closed shift is archived separately. This enables:
- Audit trail per shift
- Reduced size per upload (shift file ~10-100KB vs full backup ~1-10MB)
- Partial recovery (restore only missing shifts)

### When Backups Happen

| Trigger | What is backed up | Condition |
|---------|-------------------|-----------|
| Shift close | `shifts/{shiftId}.json` | `autoBackupOnShiftClose = true` |
| Shift close | `backup-latest.json` + `meta.json` | `autoBackupOnShiftClose = true` |
| Manual trigger (Settings) | `backup-latest.json` + `meta.json` | Always |
| Weekly auto (background) | `backup-latest.json` + `meta.json` | Google connected |

All backups are enqueued via `syncQueue`. None block POS operations.

### Restore Flow on New Device

```
1. User opens xPOS on new device → setup_welcome screen
2. User taps "กู้คืนข้อมูล" (Restore from backup)
3. User signs in with Google
4. App reads xPOS/ folder on Drive
5. App lists available stores (from each {storeId}/meta.json)
6. User picks which store to restore
7. App downloads backup-latest.json
8. App calls verifyChecksum(backup) → validates integrity
9. If valid: app calls restoreStoreBackup(backup) → writes all data to IndexedDB
10. App navigates to select_user screen
11. User logs in with their PIN (PIN hashes are in the backup)
```

If meta.json lists a newer schemaVersion than the app, the app prompts the user to update.

### Checksum Validation

```
Serialize:
  1. Build backup object with _checksum = ''
  2. JSON.stringify the entire object (deterministic — same field order)
  3. SHA-256 hash via Web Crypto API
  4. Store as "sha256:<hex>" in _checksum field

Verify:
  1. Read _checksum from backup
  2. Replace _checksum with undefined in a copy
  3. JSON.stringify → SHA-256
  4. Compare computed hash with stored hash
  5. If mismatch → backup is corrupt, abort restore, show error
```

### Drive Upload Failure Handling

```
Upload fails (network error, token expired, quota exceeded)
  → SyncQueueItem status → 'failed', retries++
  → Retry via exponential backoff (see Section 2)
  → POS continues operating normally
  → Data remains safe in IndexedDB
  → User sees non-blocking banner: "การสำรองข้อมูลล้มเหลว กำลังลองใหม่..."
  → If token expired: banner changes to "กรุณาเชื่อมต่อ Google Drive ใหม่"
  → Manual retry available in Settings → Sync
```

---

## SECTION 4 — FAILURE SCENARIOS

### Internet is offline

| Aspect | Behavior |
|--------|----------|
| POS sales | **Continue without interruption.** Zero network dependency in payment path. |
| Stock deduction | Works. All local. |
| Shift open/close | Works. All local. |
| Backup | Enqueued to syncQueue. Will upload when online. |
| Low stock alerts | Enqueued to syncQueue. Will send when online. |
| UI indicator | Status bar shows "ออฟไลน์" with grey icon. Non-blocking. |

### Google Drive token expired

| Aspect | Behavior |
|--------|----------|
| POS sales | **Unaffected.** |
| Backup | Enqueued to syncQueue. Sync processor detects 401, marks 'failed'. |
| UI indicator | Banner: "Google Drive หมดอายุ — กรุณาเข้าสู่ระบบใหม่" |
| Recovery | User taps banner → re-authenticates → `setGoogleToken()` → sync processor retries all failed items. |
| Data safety | All data remains in IndexedDB. Nothing is lost. |

### Drive upload fails (network/quota/server error)

| Aspect | Behavior |
|--------|----------|
| POS sales | **Unaffected.** |
| Sync queue | Item retries with exponential backoff (30s → 2m → 10m → 1h → 1h) |
| After max retries | Status = 'failed', visible in Settings → Sync |
| Manual recovery | User taps "ลองใหม่" in Settings → resets retries to 0 |
| Data safety | All data remains in IndexedDB. |

### Vendor host API fails

| Aspect | Behavior |
|--------|----------|
| POS sales | **Unaffected.** POS has zero dependency on vendor host for sales. |
| Workspace features | Unavailable (license check, affiliate links, etc.) |
| UI | Graceful degradation — commerce features show "ไม่สามารถเชื่อมต่อได้" |
| Core functionality | 100% operational. POS is fully functional without vendor host. |

### POS device crashes (browser crash, device reboot)

| Aspect | Behavior |
|--------|----------|
| Committed data | **Safe.** Dexie transactions are ACID. Committed writes survive crashes. |
| In-progress transaction | If crash occurs MID-transaction, Dexie rolls back (IndexedDB guarantee). No partial writes. |
| Current cart (Zustand) | **Lost.** Zustand state is in-memory only. Acceptable trade-off — user re-adds items. |
| Active shift | Survives. Shift record was written to IndexedDB on open. |
| Recovery | User reloads app → resolveStartupScreen() → resumes from select_user or pos screen. |

### syncQueue grows large

| Scenario | Merchant offline for days, queue accumulates |
|----------|----------------------------------------------|
| Storage impact | Minimal. Each SyncQueueItem is ~1-5KB. 1000 items ≈ 5MB. IndexedDB can hold hundreds of MB. |
| Processing | When online, processor works through queue sequentially. |
| Throttle | Process max 10 items per cycle, 60s between cycles. Prevents overwhelming the network. |
| Cleanup | After successful send, items can be deleted (or archived) after 7 days. |
| UI | Settings → Sync shows queue count + status breakdown. |
| Worst case | If queue exceeds 10,000 items (extreme), show warning + offer "force full backup" which replaces the entire queue with one full backup. |

---

## SECTION 5 — ECOSYSTEM MODEL

### Architecture: POS Layer vs Commerce Layer

```
┌─────────────────────────────────────────┐
│          COMMERCE LAYER (optional)       │
│  ┌─────────┐ ┌──────┐ ┌──────────────┐ │
│  │Affiliate│ │ LINE │ │ Supplier     │ │
│  │ Links   │ │ OA   │ │ Marketplace  │ │
│  └─────────┘ └──────┘ └──────────────┘ │
├─────────────────────────────────────────┤
│          POS LAYER (always works)        │
│  ┌─────────┐ ┌──────┐ ┌──────────────┐ │
│  │ Sales   │ │Stock │ │   Shifts     │ │
│  │ Orders  │ │Mgmt  │ │   Reports    │ │
│  └─────────┘ └──────┘ └──────────────┘ │
├─────────────────────────────────────────┤
│     IndexedDB (Dexie) — source of truth │
└─────────────────────────────────────────┘
```

The POS layer is **complete and functional** with zero commerce features. The commerce layer is additive.

### Low Stock Alerts

```
Trigger: Stock falls below lowStockThreshold after a sale
Detection: Inside completePayment() transaction
Action: Enqueue SyncQueueItem { type: 'low_stock_alert' }
Delivery: LINE notification to merchant (if LINE OA connected)
Fallback: Alert visible in-app on POS dashboard (always works, no network needed)
```

Value: Prevents lost sales from stockouts. Pure merchant benefit.

### Supplier Recommendations

```
Data source: Ingredient.supplierId → Supplier record
Trigger: Low stock alert on an ingredient
Action: Include supplier info in the alert notification
  "หมดสต็อก: นมสด — สั่งเพิ่มจาก: บริษัท ABC (02-xxx-xxxx)"
Enhancement: Supplier can register on vendor platform → becomes "verified supplier"
  Verified suppliers get priority placement in recommendations
```

Value for merchant: Quick reorder contact.
Value for platform: Supplier pays for verified listing.

### Affiliate Product Links

```
Data source: Supplier.affiliateLink
Trigger: When merchant views low stock item, show "สั่งซื้อเพิ่ม" button
Action: Opens affiliate link (Lazada/Shopee/direct supplier)
Tracking: Affiliate click tracked via vendor host API (fire-and-forget)
```

Value for merchant: One-tap reorder.
Value for platform: Affiliate commission on purchases.

### LINE Notifications

```
Connection: Merchant connects LINE OA in Settings
Events pushed via LINE:
  - Low stock alerts
  - Daily sales summary (end of day)
  - Shift close summary
  - Backup success/failure status
Delivery: Via vendor host API → LINE Messaging API
Fallback: If LINE not connected, all info is available in-app
```

### Revenue Model

| Revenue stream | Description | Dependency on merchant |
|---------------|-------------|----------------------|
| **Affiliate commission** | % of purchases made through supplier links | Opt-in. Merchant sees value (easy reorder). |
| **Verified supplier listings** | Suppliers pay for priority placement | Zero merchant cost. |
| **Premium analytics** (Phase 3) | Advanced reports, multi-store dashboard | Freemium upsell. |
| **Delivery integration** (Phase 3) | Commission on delivery orders routed through platform | Opt-in per order. |

### Free Forever Guarantee

The POS layer — sales, orders, stock, shifts, reports, backup — is **free and fully functional** without any commerce feature. The merchant never needs to:
- Pay a subscription
- Connect LINE
- Use affiliate links
- Register with a vendor host

Revenue comes from value-added services that merchants **choose** to use because they save time or money.

---

## SECTION 6 — MVP BOUNDARIES

### MVP (Current → Near-term)

**Goal: Reliable local POS that handles daily sales for both retail and restaurant.**

| Feature | Status | Notes |
|---------|--------|-------|
| Store setup (business type selection) | ✅ Done | |
| User management + PIN auth | ✅ Done | |
| Product/category management | ✅ Done | |
| POS order flow (cart → payment) | ✅ Done | |
| Cash payment + change calculation | ✅ Done | |
| Retail stock (trackStock on product) | ✅ Done | |
| Recipe → ingredient stock (F&B) | ✅ Done | |
| Mixed stock mode (per product) | ✅ Done | |
| Shift open/close | ✅ Done | |
| Order history | ✅ Done | |
| Table management (F&B) | ✅ Done | |
| Barcode scanner input (retail) | ✅ Done | |
| Google Drive backup/restore | 🔧 Contracts done | Need Drive API client |
| **Separate OrderItem/Payment tables** | ⬜ TODO | Schema v3 migration |
| **Order.shiftId field** | ⬜ TODO | Link orders to shifts |
| **Payment.shiftId field** | ⬜ TODO | Cash reconciliation |
| SyncQueue background processor | ⬜ TODO | Timer + retry loop |
| Low stock in-app alert (no LINE) | ⬜ TODO | Dashboard indicator |
| Basic daily report (this shift) | ⬜ TODO | Shift summary screen |
| Receipt printing (browser print) | ⬜ TODO | Thermal 58/80mm CSS |
| QR payment (PromptPay) | ⬜ TODO | Generate QR image |
| Discount per item (not just per order) | ⬜ TODO | OrderItem.discount |

### Phase 2

**Goal: Cloud backup working + basic commerce hooks.**

| Feature | Notes |
|---------|-------|
| Google Drive API client | Upload/download via GAPI or REST + OAuth |
| Auto backup on shift close | Trigger → serialize → enqueue → upload |
| Restore from Drive on new device | Full restore flow |
| LINE OA connection | OAuth + store LINE userId |
| LINE low stock alerts | Push notification on low stock |
| LINE daily summary | End-of-day sales push |
| Supplier management page | CRUD suppliers, link to ingredients |
| Stock purchase entry | Record incoming stock + cost |
| Multi-payment (split bill) | Cash + QR on same order |
| Expense tracking (basic) | Cash out with reason |
| Weekly auto full backup | Background timer |

### Phase 3

**Goal: Ecosystem and advanced features.**

| Feature | Notes |
|---------|-------|
| Vendor host API | Workspace registry, license, analytics sink |
| Affiliate product links | Supplier links in low-stock UI |
| Verified supplier marketplace | Supplier-facing portal |
| Delivery integration | GrabFood/LINE MAN order import |
| Advanced reports | Product mix, hourly heatmap, margin analysis |
| Multi-store dashboard | Super admin cross-store view |
| Customer loyalty (CRM) | Points, visit tracking, LINE rewards |
| Web portal (view-only) | Merchant views reports from any browser via Drive data |
| Inventory count mode | Physical count → auto-adjust stock |
| Promotion engine | BOGO, bundle pricing, time-based discounts |

### Design Principles for All Phases

1. **Local-first always** — no feature should require internet for basic operation
2. **Atomic transactions** — all writes that must be consistent go in one Dexie transaction
3. **Fire-and-forget sync** — enqueue, retry, never block
4. **Simple over clever** — no CRDT, no real-time sync, no conflict resolution needed (single-device POS)
5. **Schema migrations** — Dexie version upgrades with safe defaults for new fields
6. **Graceful degradation** — if a cloud feature fails, the POS feature it enhances still works locally
