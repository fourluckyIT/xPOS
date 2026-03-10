# LOCAL_PROJECT_REPORT.md

## 1. Project Overview
- project name
  - `xpos` (from `package.json#name`)
- detected stack
  - React `19.2.0`
  - Vite `8.0.0-beta.13`
  - TypeScript `~5.9.3` (project references + `tsc -b`)
  - TailwindCSS `4.2.1` via `@tailwindcss/vite`
  - React Router DOM `7.13.1`
  - Zustand `5.0.11`
  - Dexie `4.3.0` + `dexie-react-hooks` dependency present (but not used in current source)
  - UI utilities: `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `date-fns`, `uuid`
- detected package manager
  - `npm` (presence of `package-lock.json`)
- build scripts
  - `build`: `tsc -b && vite build`
- dev scripts
  - `dev`: `vite`
  - `preview`: `vite preview`
- test scripts (if any)
  - None found in `package.json#scripts`
- lint/typecheck scripts (if any)
  - `lint`: `eslint .`
  - No dedicated `typecheck` script; typecheck occurs as part of `npm run build` via `tsc -b`

## 2. Root Project Structure
Real structure observed at `/Users/itfourlucky/Desktop/xPOS`:

```text
xPOS/
  .git/
  .gitignore
  README.md
  docs/
    ARCHITECTURE.md
  eslint.config.js
  index.html
  package-lock.json
  package.json
  public/
    manifest.json
  src/
    App.tsx
    index.css
    main.tsx
    assets/
    auth/
      state-machine.ts
    components/
      pos/
        CashPaymentDialog.tsx
        ModifierDialog.tsx
        ShiftBar.tsx
      shared/
        Layout.tsx
        Sidebar.tsx
    db/
      schema.ts
      seed.ts
    drive/
      contracts.ts
    lib/
      calc.ts
      payment.ts
      roles.ts
      utils.ts
    routes/
      auth/
        SelectUser.tsx
      crm/
        CrmPage.tsx
      employees/
        EmployeesPage.tsx
      inventory/
        InventoryPage.tsx
      kitchen/
        KitchenPage.tsx
      menu/
        MenuPage.tsx
      pos/
        OrderHistoryPage.tsx
        PosPage.tsx
      reports/
        ReportsPage.tsx
      settings/
        SettingsPage.tsx
      tables/
        TablesPage.tsx
    store/
      app-store.ts
    types/
      index.ts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts

  # Also present in root:
  src.zip
  node_modules/   (directory exists in workspace listing)
```

## 3. Source Structure
Summary of `src/` folder-by-folder based on actual files.

### `src/main.tsx`
- purpose
  - React entry point (mounts app into `#root`).
- key files
  - `src/main.tsx`
- implementation status
  - Real and minimal.

### `src/App.tsx`
- purpose
  - Defines routing and a simple auth gate using Zustand `isAuthenticated`.
- key files
  - `src/App.tsx`
- implementation status
  - Real.
  - Auth gating is **in-memory only** (no persistence). When `isAuthenticated === false`, it renders `<SelectUser />` directly (not a router route).
  - Routes defined under `<Layout />`:
    - `/pos`, `/tables`, `/kitchen`, `/menu`, `/inventory`, `/employees`, `/crm`, `/reports`, `/history`, `/settings`
    - `*` redirects to `/pos`

### `src/types/`
- purpose
  - Central domain types and union enums.
- key files
  - `src/types/index.ts`
- implementation status
  - Real.
  - Contains most entities listed in the architecture document (Store/User/Product/Ingredient/Recipe/Order/Shift/StockMovement/SyncQueue/Promotion/Customer/Supplier/Table).
  - **Important mismatch vs current UI code**:
    - `StockMovement` type uses `targetType` + `targetId`, but some UI pages still write/read `ingredientId` on stock movements.
    - `Order` type embeds `items: OrderItem[]` and `payments: Payment[]` (no separate `orderItems` / `payments` tables).

### `src/db/`
- purpose
  - Dexie database + schema migrations + demo seed.
- key files
  - `src/db/schema.ts`
  - `src/db/seed.ts`
- implementation status
  - Real.
  - Schema currently defines **Dexie versions 1 and 2 only**.
  - Seed supports both business types (restaurant/retail) but uses one fixed store id (`demo-store-001`).

### `src/auth/`
- purpose
  - Startup/session state machine utilities (localStorage keys, screen resolution).
- key files
  - `src/auth/state-machine.ts`
- implementation status
  - **Real but not wired into the running app**.
  - `resolveStartupScreen()` exists (and models multi-step setup like Google/owner/store selector), but current app flow uses `routes/auth/SelectUser.tsx` directly.

### `src/drive/`
- purpose
  - Drive backup/restore **data contracts + serializer/restore helpers**.
- key files
  - `src/drive/contracts.ts`
- implementation status
  - **Partial**.
  - Implements:
    - `drivePaths(storeId)`
    - Backup/shift file interfaces
    - `serializeStoreBackup(storeId)`
    - `serializeShiftFile(storeId, shiftId)`
    - `validateBackup`, `restoreStoreBackup`, `verifyChecksum`
  - Missing:
    - No Google OAuth / Drive API client implementation.
    - Not referenced by Settings UI (Settings currently uses local JSON export/import, not Drive).

### `src/lib/`
- purpose
  - Pure utilities and core business logic.
- key files
  - `lib/utils.ts`: `hashPin`, `verifyPin`, `generateId`, `nowTimestamp`, `formatCurrency`, `cn`
  - `lib/calc.ts`: subtotal/service charge/VAT/rounding/discount/total
  - `lib/roles.ts`: role hierarchy + labels
  - `lib/payment.ts`: intended “single entry point” payment + stock deduction + low-stock sync enqueue
- implementation status
  - Real.
  - **Important**: `lib/payment.ts` appears to be a newer/cleaner payment path (Dexie transaction + per-product stock branching) but **is not used by `PosPage.tsx`** (no imports found in `src/`).

### `src/store/`
- purpose
  - Zustand global state for session + current order/cart.
- key files
  - `src/store/app-store.ts`
- implementation status
  - Real.
  - Not persisted (no `persist` middleware).

### `src/components/`
- purpose
  - Shared layout and POS dialogs.
- key files
  - `components/shared/Layout.tsx`: sidebar + outlet
  - `components/shared/Sidebar.tsx`: nav items with role gating + businessType hiding
  - `components/pos/ShiftBar.tsx`: open/close shift UI + shift sales summary
  - `components/pos/ModifierDialog.tsx`: variants/modifiers/note/qty dialog
  - `components/pos/CashPaymentDialog.tsx`: cash received + change calculator
- implementation status
  - Real.

### `src/routes/`
- purpose
  - Page-level UI.
- key files
  - auth: `SelectUser.tsx`
  - pos: `PosPage.tsx`, `OrderHistoryPage.tsx`
  - tables: `TablesPage.tsx`
  - kitchen: `KitchenPage.tsx`
  - inventory: `InventoryPage.tsx`
  - menu: `MenuPage.tsx`
  - employees: `EmployeesPage.tsx`
  - crm: `CrmPage.tsx`
  - reports: `ReportsPage.tsx`
  - settings: `SettingsPage.tsx`
- implementation status
  - Real.
  - Some pages are feature-complete as UI CRUD, but several are **not connected to real POS flows** (notably Kitchen vs POS order statuses).

### `src/assets/`
- purpose
  - Asset directory.
- implementation status
  - Present but empty in workspace listing.

## 4. Current Business Capabilities
Statuses based only on existing code.

### Local-first / offline capability
- IMPLEMENTED/PARTIAL/NOT IMPLEMENTED
  - **PARTIAL**
- evidence
  - Uses Dexie/IndexedDB for all core data (`src/db/schema.ts`).
  - No network calls in current POS checkout (`PosPage.tsx` saves directly to Dexie).
  - **No service worker/offline asset caching code found**; only `public/manifest.json` exists. Offline use depends on browser cache / installed PWA behavior not implemented in code.

### Retail capability
- status
  - **PARTIAL**
- evidence
  - Business type selection for demo seed (`SelectUser.tsx` → `seedDemoData('retail')`).
  - Retail order types shown in POS UI (`PosPage.tsx` uses `walk_in` / `wholesale`).
  - Barcode input UI in retail mode + search matches barcode (`PosPage.tsx`).
  - Sidebar hides Tables/Kitchen for retail (`Sidebar.tsx` uses `hideFor: 'retail'`).
  - **Retail stock on product (trackStock/currentStock) is not actually managed in UI**:
    - `MenuPage.tsx` product create/edit form does not expose `trackStock/currentStock/threshold/costPrice`.
    - POS checkout path in `PosPage.tsx` never deducts product stock.

### Restaurant/F&B capability
- status
  - **PARTIAL**
- evidence
  - Table management UI + status (`TablesPage.tsx`, `db.diningTables`).
  - POS order types for restaurant (`dine_in/takeaway/delivery`) in `PosPage.tsx`.
  - Ingredient + recipe management exists (`InventoryPage.tsx`).
  - POS checkout deducts ingredient stock via recipes (`PosPage.tsx` loops recipes → updates ingredients).
  - Kitchen Display page exists but relies on `Order.status` being `open`/`preparing`.
    - Current POS checkout creates `status: 'closed'` only; no flow creates kitchen tickets.

### Shared POS capability
- status
  - **PARTIAL**
- evidence
  - PIN login (Select user + keypad) implemented (`SelectUser.tsx`).
  - Cart build/edit implemented (Zustand store + POS UI).
  - Payment method selection (cash/qr/card) implemented as labeling only.
  - Cash change calculator implemented (`CashPaymentDialog.tsx`).
  - **Discount/note support exists in Zustand** but no UI controls found in `PosPage.tsx` for setting discount/note.
  - Receipt printing not implemented (no print CSS / print action).
  - QR payment is only a method label; no PromptPay QR generation.

### Inventory capability
- status
  - **PARTIAL**
- evidence
  - Ingredient CRUD implemented (`InventoryPage.tsx` → `db.ingredients`).
  - Recipe CRUD implemented (`InventoryPage.tsx` → `db.recipes`).
  - Manual adjustments implemented (purchase/adjust/waste) and stock movement records written.
  - Low-stock list for ingredients implemented (`InventoryPage.tsx` alerts tab).
  - Product-level stock (retail) not implemented in UI and not deducted in POS.

### Shift/accounting capability
- status
  - **PARTIAL**
- evidence
  - Open/close shift implemented (`ShiftBar.tsx` writes to `db.shifts`).
  - Shift sales summary derived from closed orders since `openedAt` (`ShiftBar.tsx`).
  - Expected cash calculated from orders where payments include `cash`.
  - No enforcement that a shift must be open to sell.
  - No cash-in/cash-out events, no reconciliation by separate payment table (payments are embedded in orders).

### Reports capability
- status
  - **PARTIAL**
- evidence
  - `ReportsPage.tsx` computes totals, hourly heatmap, top products, payment breakdown, staff ranking from `db.orders`.
  - CSV export exists.
  - Type labels only include restaurant order types (no `walk_in`/`wholesale` labels).

### Settings capability
- status
  - **IMPLEMENTED**
- evidence
  - Store settings editor (business type, VAT/SC, rounding, receipt header/footer, toggles) persists to `db.stores` (`SettingsPage.tsx`).
  - Local JSON export/import of full DB (all tables) implemented.
  - Full reset via `db.delete()` implemented.

### Backup/sync capability
- status
  - **PARTIAL**
- evidence
  - Local export/import implemented in `SettingsPage.tsx`.
  - Drive backup contracts + serialize/restore helpers exist (`drive/contracts.ts`) but unused.
  - `syncQueue` table exists in Dexie schema; no background processor implementation found.

### Auth/login capability
- status
  - **PARTIAL**
- evidence
  - Login UI and PIN verification implemented (`SelectUser.tsx` + `verifyPin`).
  - **No persistent session**:
    - `useAppStore` is in-memory only.
    - `auth/state-machine.ts` has localStorage session keys and `resolveStartupScreen()` but is not used by `App.tsx`.

## 5. Current Data Model
Based on `src/types/index.ts` and supporting usage in code.

### Main entities (present in code)
- **Workspace**
  - Fields: `id`, `googleId`, `email`, `name`, `createdAt`
  - Note: explicitly marked “NOT stored in Dexie” in comment.
- **Store**
  - `id`, optional `workspaceId`, `name`, `businessType`, `address`, `phone`, `taxId`, optional `logo`, `settings`, `createdAt`
  - `StoreSettings`: VAT/SC rates + enable flags + `vatMode`, `roundingMode`, receipt header/footer, currency, low stock / auto backup toggles.
- **User**
  - `id`, `storeId`, `name`, `pinHash`, `role`, optional `avatar`, `isActive`, `createdAt`
- **Category**
  - `id`, `storeId`, `name`, `sortOrder`, `color`
- **Product**
  - `id`, `storeId`, `categoryId`, `name`, `price`, optional `image`, `unit`, optional `barcode`, `isActive`
  - embedded arrays: `variants: ProductVariant[]`, `modifiers: ProductModifier[]`
  - stock fields (defined in type): `trackStock`, `currentStock`, `lowStockThreshold`, `costPrice`
- **Ingredient**
  - `id`, `storeId`, `name`, `unit`, `costPerUnit`, `currentStock`, `lowStockThreshold`, optional `supplierId`
- **Recipe**
  - join entity: `id`, `productId`, `ingredientId`, `qty`, `unit`
  - Note: no `storeId`; store is derived by product ownership.
- **Supplier**
  - `id`, `storeId`, `name`, `contact`, optional `affiliateLink`
- **Table** (F&B)
  - `id`, `storeId`, `zone`, `name`, `seats`, `sortOrder`, `status`
- **Order**
  - `id`, `storeId`, optional `tableId/tableName`, `type`, `status`
  - embedded: `items: OrderItem[]`, `payments: Payment[]`
  - totals: `subtotal`, `discount`, `discountType`, `serviceCharge`, `vat`, `total`
  - staff fields: `staffId`, `staffName`
  - `customerCount`, `note`, `createdAt`, optional `closedAt`
- **OrderItem**
  - `id`, `orderId`, `productId`, `productName`, `qty`, `unitPrice`
  - embedded: `modifiers: OrderItemModifier[]`
  - `note`, `voided`, `voidReason`
- **Payment**
  - `id`, `orderId`, `method`, `amount`, `ref`, `createdAt`
- **Shift**
  - `id`, `storeId`, `staffId`, `staffName`, `openedAt`, optional `closedAt`
  - `openingCash`, optional `closingCash`, optional `expectedCash`
  - `totalSales`, `totalOrders`, `backedUp`
- **StockMovement**
  - `id`, `storeId`, `targetType` (`product|ingredient`), `targetId`, `type`, `qty`, `ref`, `createdAt`
  - **Mismatch**: some pages still use `ingredientId` property when writing/reading stock movements.
- **Promotion**
  - `id`, `storeId`, `name`, `type`, `value`, `minPurchase`, `startDate`, `endDate`, `isActive`
- **Customer**
  - `id`, `storeId`, `name`, `phone`, optional `lineUserId`, `points`, `visits`, optional `lastVisit`, `createdAt`
- **SyncQueueItem**
  - `id`, `storeId`, `type`, `payload`, `status`, `retries`, optional `lastAttempt`, `createdAt`

### Relationships (as implemented)
- **Store → Users/Categories/Products/Ingredients/Tables/Orders/Shifts/...** via `storeId`.
- **Category → Products** via `categoryId`.
- **Product → Recipe** via `Recipe.productId`.
- **Recipe → Ingredient** via `Recipe.ingredientId`.
- **Order → OrderItem/Payment** embedded arrays, not separate tables.

### Embedded vs separate tables
- embedded/nested
  - `Product.variants`, `Product.modifiers`
  - `Order.items`, `Order.payments`
  - `OrderItem.modifiers`
- separate Dexie tables
  - All main entities listed in schema (no `orderItems` / `payments` table exists in current schema).

### Current schema version
- Dexie DB schema versions present
  - v1 and v2 (see `src/db/schema.ts`)
- Drive backup contract schema
  - `src/drive/contracts.ts` exports `SCHEMA_VERSION = 2`

### Migrations that already exist
- `schema.ts` has a v2 upgrade callback:
  - **Products**: adds defaults for `trackStock/currentStock/lowStockThreshold/costPrice` if missing.
  - **StockMovements**: migrates `ingredientId` → `targetId` and adds `targetType='ingredient'`.
  - **Store settings**: ensures defaults for `vatMode` and `roundingMode`.

## 6. Current Dexie Database Design
Based on `src/db/schema.ts`.

### Database instances
- One Dexie DB instance
  - name: `xpos` (`new XPosDB()` calls `super('xpos')`)

### Tables (current)
- `stores`
- `users`
- `categories`
- `products`
- `recipes`
- `ingredients`
- `suppliers`
- `diningTables`
- `orders`
- `shifts`
- `stockMovements`
- `promotions`
- `customers`
- `syncQueue` (added in v2)

### Indexes
- v2 `stores`: `'id'`
- v2 `users`: `'id, storeId, role'`
- v2 `categories`: `'id, storeId, sortOrder'`
- v2 `products`: `'id, storeId, categoryId, barcode, isActive'`
- v2 `recipes`: `'id, productId, ingredientId'`
- v2 `ingredients`: `'id, storeId'`
- v2 `suppliers`: `'id, storeId'`
- v2 `diningTables`: `'id, storeId, zone, status'`
- v2 `orders`: `'id, storeId, tableId, status, createdAt, closedAt'`
- v2 `shifts`: `'id, storeId, staffId, openedAt'`
- v2 `stockMovements`: `'id, storeId, targetId, createdAt'`
- v2 `promotions`: `'id, storeId, isActive'`
- v2 `customers`: `'id, storeId, phone'`
- v2 `syncQueue`: `'id, status, createdAt'`

### Upgrade logic
- Only v2 defines `upgrade(tx => { ... })`.

### Store filtering
- Most queries in routes use `.where('storeId').equals(store.id)`.
- Exceptions / risks:
  - `InventoryPage.tsx` loads recipes using `db.recipes.toArray()` (not store-filtered; recipes have no `storeId`).

### Current risks / missing indexes
- **StockMovement field mismatch risk**:
  - Schema v2 expects/query indexes include `targetId`, but UI code writes `ingredientId` in several places.
  - After migration to v2, older records may only have `targetId`; UI that expects `ingredientId` will show “unknown”.
- **Order status flows**:
  - Kitchen/table pages query `orders` by status (`open/preparing`) and tableId, but POS writes `closed` orders only.
- **No `storeId` index on `syncQueue`**:
  - `syncQueue` indexes are `id, status, createdAt`. If the queue grows, per-store filtering would require `.filter()` scanning unless additional index is added.

## 7. POS Flow Analysis
All references are to actual current code paths.

### First-time setup
- implemented in: `src/routes/auth/SelectUser.tsx`
- actual behavior
  - On mount, checks `await db.stores.count()`.
  - If 0 stores: shows welcome screen with business type selection.
  - Clicking a business type calls `seedDemoData(type)`.
- limitations
  - Setup is **demo-only** (hardcoded `DEMO_STORE_ID = 'demo-store-001'`).
  - The richer setup flow described in `src/auth/state-machine.ts` is not used.

### Business type selection
- implemented in: `SelectUser.tsx` + `db/seed.ts`
- actual behavior
  - Seeds either restaurant or retail categories/products.
  - Seeds tables only for restaurant (`tables = []` for retail).

### Login / PIN flow
- implemented in: `SelectUser.tsx`
- actual behavior
  - User chooses a user card, enters PIN via on-screen keypad.
  - When PIN length hits 4, calls `verifyPin(newPin, selectedUser.pinHash)`.
  - On success: `useAppStore.setUser(selectedUser)` sets `isAuthenticated`.
- limitations
  - PIN hashing is a simple non-cryptographic hash (`hashPin` in `utils.ts`), no salt.
  - No persistent login session on refresh (Zustand store resets).

### Cart flow
- implemented in:
  - `src/store/app-store.ts`: `addItem/removeItem/updateItemQty/clearOrder`
  - `src/routes/pos/PosPage.tsx`: UI
  - `src/components/pos/ModifierDialog.tsx`: variants/modifiers/qty/note
- actual behavior
  - Items are accumulated in `useAppStore().currentOrder.items`.
  - `addItem` merges items if same productId + same modifiers JSON + same note.

### Payment flow
- implemented in: `PosPage.tsx` + `CashPaymentDialog.tsx`
- actual behavior
  - User selects payment method.
  - Cash method opens `CashPaymentDialog` and passes received amount to `handlePayment('cash', received)`.
  - Non-cash methods call `handlePayment('qr')` or `handlePayment('card')`.
- limitations
  - No QR generation, no card terminal integration (methods only stored on the order).

### Order creation
- implemented in: `PosPage.tsx#handlePayment`
- actual behavior
  - Builds `newOrder` with `status: 'closed'` and embedded `items` and `payments`.
  - Writes order: `await db.orders.add(newOrder)`.
  - No Dexie transaction wrapping order + stock + table updates.

### Shift handling
- implemented in: `components/pos/ShiftBar.tsx`
- actual behavior
  - Opens a shift by inserting a `Shift` record.
  - Loads active shift by finding shift with no `closedAt`.
  - Shift sales are derived from **closed orders** where `closedAt >= openedAt`.
  - On close, writes `closedAt/closingCash/expectedCash/totalSales/totalOrders`.
- limitations
  - Orders are not linked to `shiftId`.
  - Selling is allowed without an open shift.

### Inventory deduction
- implemented in: `PosPage.tsx#handlePayment` (current live path)
- actual behavior
  - For each order item:
    - reads recipes: `db.recipes.where('productId').equals(item.productId)`
    - deducts ingredient stock accordingly
    - writes a stock movement record
- limitations
  - Uses `ingredientId` property in stock movement objects (not aligned with v2 schema/types).
  - Does not use `Product.trackStock` path (retail product stock deduction is not used here).
  - Low stock detection + sync enqueue is not present in this POS path.

### Table handling
- implemented in: `routes/tables/TablesPage.tsx` and `PosPage.tsx`
- actual behavior
  - Tables page sets table to `occupied`, sets current order table info in Zustand, navigates to `/pos`.
  - After payment, if `order.tableId` exists: `db.diningTables.update(tableId, { status: 'available' })`.
- limitations
  - Tables page tries to show open order counts by reading `db.orders` where `status === 'open'`.
  - Current POS never creates `open` orders, so this count is typically always empty.

### Kitchen flow
- implemented in: `routes/kitchen/KitchenPage.tsx`
- actual behavior
  - Polls every 5s for orders with `status === 'open' || 'preparing'`.
  - Allows marking served: `db.orders.update(orderId, { status: 'served' })`.
- limitation
  - No POS flow creates such orders; therefore Kitchen is effectively disconnected.

### Barcode search
- implemented in: `PosPage.tsx`
- actual behavior
  - Retail mode shows a barcode input.
  - On Enter, finds product by `p.barcode === code` and adds to cart.
  - General search matches `name` or `barcode.includes(q)`.

## 8. Inventory Analysis
Based on `routes/inventory/InventoryPage.tsx` and POS checkout logic.

- retail product-level stock exists
  - **NOT IMPLEMENTED** (type/schema fields exist; no UI and POS path does not deduct product stock)
- ingredient stock exists
  - **IMPLEMENTED** (`db.ingredients` CRUD + stock fields)
- recipe deduction exists
  - **PARTIAL**
  - Implemented for ingredient deduction in `PosPage.tsx`, but depends on recipes being configured.
- low stock alert exists
  - **PARTIAL**
  - Implemented as an “alerts” tab in Inventory page (ingredient-only).
  - Not implemented as an automatic post-sale alert in POS UI.
- stock movement records are written
  - **PARTIAL**
  - Written by Inventory adjustments and POS checkout.
  - Schema/type mismatch (`ingredientId` vs `targetId`) makes it unreliable across migrations.
- manual stock adjustment exists
  - **IMPLEMENTED** (Inventory page adjustment modal)
- purchase/restock exists
  - **PARTIAL**
  - Implemented as a movement type (`purchase`) in the adjustment modal.
  - No supplier invoice / cost tracking beyond `ref` note.

## 9. Sync / Backup / Cloud Analysis

- Google Drive integration
  - **NOT IMPLEMENTED** (no Drive API client or OAuth flow in code)
- backup contracts
  - **PARTIAL**
  - Drive backup/restore contracts + serialize/restore helpers exist in `src/drive/contracts.ts`.
  - Settings provides local JSON backup as a separate mechanism.
- restore flow
  - **PARTIAL**
  - `restoreStoreBackup()` exists for Drive contract payload.
  - UI restore-from-drive flow not present.
- sync queue
  - **PARTIAL**
  - Dexie table `syncQueue` exists (schema v2).
  - No processor/timer/retry loop found.
- vendor host client
  - **NOT IMPLEMENTED**
  - Only `Workspace` type exists; no HTTP client code found.
- LINE integration
  - **NOT IMPLEMENTED**
- mobile companion / LAN support
  - **NOT IMPLEMENTED**

## 10. UI / Route Analysis
Routes are defined in `src/App.tsx`.

- `/pos`
  - file: `src/routes/pos/PosPage.tsx`
  - purpose: main sales screen (categories/products/cart/payment)
  - completeness: **PARTIAL** (creates only closed orders; inventory deduction path is inconsistent; no discounts UI)
  - business type conditions:
    - retail: shows barcode input, order types `walk_in/wholesale`
    - restaurant: order types `dine_in/takeaway/delivery`

- `/tables`
  - file: `src/routes/tables/TablesPage.tsx`
  - purpose: dining table management + pick a table to sell
  - completeness: **PARTIAL** (table status works; open order linkage not implemented)
  - business type conditions:
    - hidden for retail in sidebar

- `/kitchen`
  - file: `src/routes/kitchen/KitchenPage.tsx`
  - purpose: kitchen display for `open/preparing` orders
  - completeness: **PARTIAL** (page works but POS does not produce compatible orders)
  - business type conditions:
    - hidden for retail in sidebar

- `/menu`
  - file: `src/routes/menu/MenuPage.tsx`
  - purpose: product & category CRUD
  - completeness: **PARTIAL** (core CRUD works; product stock fields not managed)

- `/inventory`
  - file: `src/routes/inventory/InventoryPage.tsx`
  - purpose: ingredient stock, recipe mapping, movement history, low stock list
  - completeness: **PARTIAL** (ingredient-focused; movement schema mismatch)

- `/employees`
  - file: `src/routes/employees/EmployeesPage.tsx`
  - purpose: employee CRUD + shift history list
  - completeness: **PARTIAL** (no timecard; shift accounting is basic)

- `/crm`
  - file: `src/routes/crm/CrmPage.tsx`
  - purpose: customers + promotions CRUD
  - completeness: **PARTIAL** (not integrated into checkout)

- `/reports`
  - file: `src/routes/reports/ReportsPage.tsx`
  - purpose: sales reporting (date range, export CSV)
  - completeness: **PARTIAL** (retail types not labeled; relies on embedded order structure)

- `/history`
  - file: `src/routes/pos/OrderHistoryPage.tsx`
  - purpose: closed order list + detail panel
  - completeness: **PARTIAL** (type labels do not include retail types)

- `/settings`
  - file: `src/routes/settings/SettingsPage.tsx`
  - purpose: store configuration + local backup/import/reset
  - completeness: **IMPLEMENTED**

Auth screen (not a route):
- `SelectUser` shown when unauthenticated
  - file: `src/routes/auth/SelectUser.tsx`

## 11. State Management Analysis
Based on `src/store/app-store.ts`.

### App state structure
- **Auth/session**
  - `currentStore: Store | null`
  - `currentUser: User | null`
  - `isAuthenticated: boolean`
- **Shift**
  - `activeShift: Shift | null`
- **Current cart/order draft**
  - `currentOrder: Partial<Order> & { items: OrderItem[] }`
  - defaults in `emptyOrder`: items `[]`, type `'dine_in'`, discount `0`, discountType `'amount'`, note `''`

### Session handling
- Session is **in-memory only**.
- `logout()` clears `currentUser/isAuthenticated/currentOrder`, but does not clear `currentStore`.
- `auth/state-machine.ts` defines localStorage keys and helpers but is not integrated.

### Persisted vs in-memory
- Persisted (IndexedDB)
  - all business data via Dexie tables
  - active shift is persisted as a shift record
- In-memory only
  - `currentUser`, `isAuthenticated`, `currentOrder`, `activeShift` (but rehydrated by `ShiftBar` only)

## 12. Key Technical Strengths
Only what is supported by current code.

- **Broad UI coverage already exists**
  - POS, tables, kitchen, inventory, menu, employees, CRM, reports, settings all have real pages.
- **Dexie schema with a real migration step**
  - v2 upgrade adds safe defaults and performs data migration work (`schema.ts`).
- **Business type UI switching is implemented end-to-end**
  - Seed, sidebar visibility, POS order-type options, and barcode input are all conditioned on `Store.businessType`.
- **POS UI/UX is fairly complete**
  - Modifier dialog, cash dialog, cart management, and summary totals are implemented.

## 13. Key Technical Gaps
Blunt gaps observed in code.

- **Two competing payment/stock implementations**
  - `src/lib/payment.ts` implements a transactional, unified flow (with product-vs-recipe branching and sync queue enqueue).
  - `src/routes/pos/PosPage.tsx` implements a separate non-transactional flow and does not use `lib/payment.ts`.
- **StockMovement schema/type mismatch (high risk)**
  - Schema v2 and types expect `targetType/targetId`.
  - Inventory + POS pages write/read `ingredientId`.
  - This will break reporting/history after migrations and makes data inconsistent.
- **Kitchen Display is disconnected from POS**
  - Kitchen reads `open/preparing` orders; POS writes only `closed`.
- **No persistent login/session despite having a state-machine file**
  - Refreshing the page logs you out (Zustand resets).
- **Retail stock is not implemented in UI**
  - `Product.trackStock/currentStock/...` exist in types and migration, but not in product management UI or POS checkout path.
- **Recipe store scoping is not enforced**
  - Recipes have no `storeId` and Inventory loads all recipes via `toArray()`.
- **Drive/Sync is mostly paper-thin**
  - Backup contracts exist, but no Drive API integration and no sync queue processing.

## 14. Immediate Next Best Tasks
Next 5 tasks (priority order) based on current code reality.

1) Unify checkout into one authoritative implementation
- why it matters
  - Prevents data divergence and enables atomic writes (order + stock + table + movements).
- likely files to change
  - `src/routes/pos/PosPage.tsx`
  - `src/lib/payment.ts`
  - potentially `src/types/index.ts` and `src/db/schema.ts` if you adopt the newer design
- schema migration needed
  - Not strictly, but **very likely** once you fix StockMovement fields and/or adopt separate tables.
- dependency risk
  - Medium: touches core sales path.

2) Fix `StockMovement` field mismatch everywhere (ingredientId → targetId/targetType)
- why it matters
  - Current data will be inconsistent across DB versions and inventory history will break.
- likely files to change
  - `src/routes/inventory/InventoryPage.tsx`
  - `src/routes/pos/PosPage.tsx`
  - any code that reads/writes stock movements
- schema migration needed
  - Probably not (schema already expects `targetId`), but you may need a cleanup migration for existing bad records.
- dependency risk
  - High: affects inventory integrity.

3) Implement a real order lifecycle for restaurant (open → preparing → served → closed)
- why it matters
  - Makes Tables and Kitchen pages meaningful and enables true restaurant workflow.
- likely files to change
  - `src/routes/pos/PosPage.tsx`
  - `src/routes/kitchen/KitchenPage.tsx`
  - `src/routes/tables/TablesPage.tsx`
  - `src/types/index.ts` (if you add fields)
- schema migration needed
  - Maybe (if new fields added).
- dependency risk
  - Medium.

4) Add persistent session boot flow (wire `auth/state-machine.ts` or add Zustand persist)
- why it matters
  - “Refresh = logout” is not acceptable for real POS usage.
- likely files to change
  - `src/App.tsx`
  - `src/routes/auth/SelectUser.tsx`
  - `src/auth/state-machine.ts`
  - `src/store/app-store.ts`
- schema migration needed
  - No.
- dependency risk
  - Low-medium.

5) Make retail stock real (product stock fields + deduction + UI)
- why it matters
  - Retail mode currently has barcode UI but not true stock control.
- likely files to change
  - `src/routes/menu/MenuPage.tsx` (product form)
  - `src/routes/pos/PosPage.tsx` or `src/lib/payment.ts` (deduction path)
  - `src/routes/inventory/InventoryPage.tsx` (optional product stock view)
- schema migration needed
  - No (fields already exist in type and v2 migration), but you must ensure new products write those fields.
- dependency risk
  - Medium.

## 15. MVP Status Assessment
- assessment
  - **Prototype / Early MVP**
- why
  - Core UI exists and you can record sales to IndexedDB, but there are several “integrity blockers”:
    - Stock movement schema mismatch (data correctness risk)
    - Non-transactional checkout writes (risk of partial writes)
    - No persistent session
    - Kitchen/table workflow not actually connected
    - Retail stock tracking not implemented in UI

## 16. Final Plain-English Summary
- what xPOS is right now
  - เป็นเว็บ POS ที่มีหน้าจอครบหลายส่วน (ขาย/เมนู/สต๊อก/พนักงาน/รายงาน/ตั้งค่า) และบันทึกข้อมูลลง IndexedDB ได้จริง
- what is solid
  - โครง UI, โครง types, Dexie schema + migration v2, และการสลับ business type (ร้านอาหาร/ค้าปลีก) ทำงานได้จริง
- what is still missing
  - ความถูกต้อง/ความสอดคล้องของข้อมูลสต๊อก (StockMovement) ยังไม่เสถียร
  - Flow ร้านอาหาร (ครัว/ออเดอร์สถานะ) ยังไม่เชื่อมกับ POS
  - session ไม่ persist รีเฟรชแล้วหลุด
  - Google Drive backup ยังเป็นแค่สัญญา/โค้ดช่วย serialize แต่ไม่มี client
  - retail stock จริง (หักสต๊อกสินค้า) ยังไม่เกิดในระบบ
- what should be built next
  - ทำให้ checkout เป็น path เดียวแบบ transaction + แก้ StockMovement ให้ตรง schema ก่อน แล้วค่อยต่อ order lifecycle + session persist + retail stock + drive sync
