import { db } from '@/db/schema';
import { generateId, nowTimestamp } from '@/lib/utils';
import { calcTotal } from '@/lib/calc';
import type {
  Store, User, Order, OrderItem, PaymentMethod,
  StockMovement, SyncQueueItem,
} from '@/types';

// ─── Input for completing a payment ─────────────────────────────

export interface PaymentInput {
  store: Store;
  user: User;
  items: OrderItem[];
  orderType: Order['type'];
  paymentMethod: PaymentMethod;
  receivedAmount?: number;    // for cash payments
  tableId?: string;
  tableName?: string;
  discount: number;
  discountType: 'amount' | 'percent';
  customerCount: number;
  note: string;
}

// ─── Output after completing a payment ──────────────────────────

export interface PaymentResult {
  order: Order;
  change: number;             // cash change to return
  lowStockAlerts: LowStockAlert[];
}

export interface LowStockAlert {
  targetType: 'product' | 'ingredient';
  targetId: string;
  name: string;
  currentStock: number;
  threshold: number;
}

// ─── Main payment completion flow ───────────────────────────────
//
// This is the single entry point for completing a sale.
// It handles:
// 1. Build and save the Order
// 2. Deduct stock (product-level OR recipe→ingredient, per product)
// 3. Free the table (if F&B dine-in)
// 4. Detect low stock → enqueue sync alerts
// 5. Return result with change + alerts

export async function completePayment(input: PaymentInput): Promise<PaymentResult> {
  const { store, user, items, paymentMethod } = input;

  if (items.length === 0) throw new Error('ไม่มีรายการสินค้า');

  // ── 1. Calculate totals ───────────────────────────────────────
  const totals = calcTotal(items, input.discount, input.discountType, store.settings);

  // ── 2. Build order ────────────────────────────────────────────
  const orderId = generateId();
  const now = nowTimestamp();

  const order: Order = {
    id: orderId,
    storeId: store.id,
    tableId: input.tableId,
    tableName: input.tableName,
    type: input.orderType,
    status: 'closed',
    items: items.map(i => ({ ...i, orderId })),
    payments: [{
      id: generateId(),
      orderId,
      method: paymentMethod,
      amount: totals.total,
      ref: '',
      createdAt: now,
    }],
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

  // ── 3. Stock deduction + order save (single transaction) ──────
  const lowStockAlerts: LowStockAlert[] = [];

  await db.transaction('rw',
    [db.orders, db.products, db.ingredients, db.recipes,
     db.stockMovements, db.diningTables, db.syncQueue],
    async () => {
      // Save order
      await db.orders.add(order);

      // Deduct stock per item
      for (const item of items) {
        if (item.voided) continue;

        const product = await db.products.get(item.productId);
        if (!product) continue;

        if (product.trackStock) {
          // ── RETAIL PATH: deduct directly from product ─────────
          await deductProductStock(
            store.id, product.id, item.qty, orderId, lowStockAlerts
          );
        } else {
          // ── F&B PATH: deduct via recipe → ingredients ─────────
          await deductRecipeStock(
            store.id, product.id, item.qty, orderId, lowStockAlerts
          );
        }
      }

      // Free table if dine-in
      if (order.tableId) {
        await db.diningTables.update(order.tableId, { status: 'available' });
      }

      // Enqueue low stock alerts for sync
      if (lowStockAlerts.length > 0 && store.settings.lowStockAlertEnabled) {
        const syncItem: SyncQueueItem = {
          id: generateId(),
          storeId: store.id,
          type: 'low_stock_alert',
          payload: JSON.stringify({
            storeId: store.id,
            storeName: store.name,
            alerts: lowStockAlerts,
            detectedAt: now,
          }),
          status: 'pending',
          retries: 0,
          createdAt: now,
        };
        await db.syncQueue.add(syncItem);
      }
    }
  );

  // ── 4. Calculate change ───────────────────────────────────────
  const change = paymentMethod === 'cash' && input.receivedAmount
    ? Math.max(0, input.receivedAmount - totals.total)
    : 0;

  return { order, change, lowStockAlerts };
}

// ─── Retail: deduct product stock directly ──────────────────────

async function deductProductStock(
  storeId: string,
  productId: string,
  qty: number,
  orderId: string,
  alerts: LowStockAlert[],
): Promise<void> {
  const product = await db.products.get(productId);
  if (!product) return;

  const newStock = product.currentStock - qty;

  await db.products.update(productId, { currentStock: newStock });

  const movement: StockMovement = {
    id: generateId(),
    storeId,
    targetType: 'product',
    targetId: productId,
    type: 'sale',
    qty: -qty,
    ref: orderId,
    createdAt: nowTimestamp(),
  };
  await db.stockMovements.add(movement);

  // Check low stock
  if (newStock <= product.lowStockThreshold && product.lowStockThreshold > 0) {
    alerts.push({
      targetType: 'product',
      targetId: productId,
      name: product.name,
      currentStock: newStock,
      threshold: product.lowStockThreshold,
    });
  }
}

// ─── F&B: deduct ingredient stock via recipe ────────────────────

async function deductRecipeStock(
  storeId: string,
  productId: string,
  qty: number,
  orderId: string,
  alerts: LowStockAlert[],
): Promise<void> {
  const recipes = await db.recipes
    .where('productId').equals(productId)
    .toArray();

  for (const recipe of recipes) {
    const ingredient = await db.ingredients.get(recipe.ingredientId);
    if (!ingredient) continue;

    const deductQty = recipe.qty * qty;
    const newStock = ingredient.currentStock - deductQty;

    await db.ingredients.update(ingredient.id, { currentStock: newStock });

    const movement: StockMovement = {
      id: generateId(),
      storeId,
      targetType: 'ingredient',
      targetId: ingredient.id,
      type: 'sale',
      qty: -deductQty,
      ref: orderId,
      createdAt: nowTimestamp(),
    };
    await db.stockMovements.add(movement);

    // Check low stock
    if (newStock <= ingredient.lowStockThreshold && ingredient.lowStockThreshold > 0) {
      alerts.push({
        targetType: 'ingredient',
        targetId: ingredient.id,
        name: ingredient.name,
        currentStock: newStock,
        threshold: ingredient.lowStockThreshold,
      });
    }
  }
}

// ─── Mixed business example ─────────────────────────────────────
//
// A beverage shop selling both made-to-order drinks AND packaged items:
//
//   Product: "มอคค่าเย็น"
//     trackStock = false
//     → deductRecipeStock → deducts espresso, milk, syrup from Ingredients
//
//   Product: "น้ำดื่มขวด"
//     trackStock = true, currentStock = 48
//     → deductProductStock → currentStock becomes 47
//
//   Product: "คุกกี้ห่อ"
//     trackStock = true, currentStock = 20
//     → deductProductStock → currentStock becomes 19
//
// The businessType flag on Store controls UI defaults (sidebar, order types).
// But stock deduction is always per-product based on product.trackStock.
// This means ANY store can mix both stock models.
