import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId, formatCurrency, nowTimestamp } from '@/lib/utils';
import { calcTotal } from '@/lib/calc';
import {
  Search, Minus, Plus, Trash2, X,
  Banknote, QrCode, CreditCard,
  UtensilsCrossed, ShoppingBag, Truck, Receipt, ScanBarcode, Store as StoreIcon,
} from 'lucide-react';
import type { Category, Product, Order, OrderItem, PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';
import ShiftBar from '@/components/pos/ShiftBar';
import ModifierDialog from '@/components/pos/ModifierDialog';
import CashPaymentDialog from '@/components/pos/CashPaymentDialog';

export default function PosPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [modProduct, setModProduct] = useState<Product | null>(null);
  const [barcode, setBarcode] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const store = useAppStore((s) => s.currentStore);
  const isRetail = store?.businessType === 'retail';
  const user = useAppStore((s) => s.currentUser);
  const order = useAppStore((s) => s.currentOrder);
  const addItem = useAppStore((s) => s.addItem);
  const removeItem = useAppStore((s) => s.removeItem);
  const updateItemQty = useAppStore((s) => s.updateItemQty);
  const clearOrder = useAppStore((s) => s.clearOrder);
  const setOrderType = useAppStore((s) => s.setOrderType);

  useEffect(() => {
    if (!store) return;
    db.categories.where('storeId').equals(store.id).sortBy('sortOrder').then(setCategories);
    db.products.where('storeId').equals(store.id).toArray().then((p) => setProducts(p.filter((x) => x.isActive)));
  }, [store]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCat !== 'all') {
      list = list.filter((p) => p.categoryId === activeCat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)));
    }
    return list;
  }, [products, activeCat, search]);

  const totals = useMemo(() => {
    if (!store) return { subtotal: 0, discountAmount: 0, serviceCharge: 0, vat: 0, total: 0 };
    return calcTotal(
      order.items,
      order.discount || 0,
      order.discountType || 'amount',
      store.settings
    );
  }, [order.items, order.discount, order.discountType, store]);

  function handleAddProduct(product: Product) {
    if (product.variants.length > 0 || product.modifiers.length > 0) {
      setModProduct(product);
      return;
    }
    const item: OrderItem = {
      id: generateId(),
      orderId: '',
      productId: product.id,
      productName: product.name,
      qty: 1,
      unitPrice: product.price,
      modifiers: [],
      note: '',
      voided: false,
      voidReason: '',
    };
    addItem(item);
  }

  async function handlePayment(method: PaymentMethod, _received?: number) {
    if (!store || !user || order.items.length === 0) return;

    const orderId = generateId();
    const newOrder: Order = {
      id: orderId,
      storeId: store.id,
      tableId: order.tableId,
      tableName: order.tableName,
      type: order.type || (isRetail ? 'walk_in' : 'dine_in'),
      status: 'closed',
      items: order.items.map((i) => ({ ...i, orderId })),
      payments: [{
        id: generateId(),
        orderId,
        method,
        amount: totals.total,
        ref: '',
        createdAt: nowTimestamp(),
      }],
      subtotal: totals.subtotal,
      discount: order.discount || 0,
      discountType: order.discountType || 'amount',
      serviceCharge: totals.serviceCharge,
      vat: totals.vat,
      total: totals.total,
      staffId: user.id,
      staffName: user.name,
      customerCount: 1,
      note: order.note || '',
      createdAt: nowTimestamp(),
      closedAt: nowTimestamp(),
    };

    await db.orders.add(newOrder);

    // Auto stock deduction via recipes
    for (const item of newOrder.items) {
      if (item.voided) continue;
      const recipes = await db.recipes.where('productId').equals(item.productId).toArray();
      for (const r of recipes) {
        const ingredient = await db.ingredients.get(r.ingredientId);
        if (!ingredient) continue;
        const deduction = r.qty * item.qty;
        await db.ingredients.update(r.ingredientId, {
          currentStock: Math.max(0, ingredient.currentStock - deduction),
        });
        await db.stockMovements.add({
          id: generateId(),
          storeId: store.id,
          ingredientId: r.ingredientId,
          type: 'sale',
          qty: -deduction,
          ref: `Order #${orderId.slice(-6).toUpperCase()}`,
          createdAt: nowTimestamp(),
        });
      }
    }

    if (newOrder.tableId) {
      await db.diningTables.update(newOrder.tableId, { status: 'available' });
    }

    clearOrder();
    setShowPayment(false);
    setShowCash(false);
  }

  const handleBarcodeScan = useCallback((code: string) => {
    const product = products.find((p) => p.barcode === code);
    if (product) {
      handleAddProduct(product);
    } else {
      alert(`ไม่พบสินค้า barcode: ${code}`);
    }
    setBarcode('');
  }, [products]);

  const restaurantTypes = [
    { type: 'dine_in' as const, icon: UtensilsCrossed, label: 'ทานที่ร้าน', color: 'bg-blue-100 text-blue-700' },
    { type: 'takeaway' as const, icon: ShoppingBag, label: 'กลับบ้าน', color: 'bg-amber-100 text-amber-700' },
    { type: 'delivery' as const, icon: Truck, label: 'เดลิเวอรี่', color: 'bg-green-100 text-green-700' },
  ];

  const retailTypes = [
    { type: 'walk_in' as const, icon: StoreIcon, label: 'หน้าร้าน', color: 'bg-green-100 text-green-700' },
    { type: 'wholesale' as const, icon: ShoppingBag, label: 'ขายส่ง', color: 'bg-purple-100 text-purple-700' },
  ];

  const orderTypeOpts = isRetail ? retailTypes : restaurantTypes;

  const categoryIcons: Record<string, string> = {
    'cat-rice': '🍚',
    'cat-curry': '🍛',
    'cat-stirfry': '🍳',
    'cat-salad': '🥗',
    'cat-drink': '🧋',
    'cat-dessert': '🍰',
    'cat-snack': '🍿',
    'cat-bev': '🥤',
    'cat-instant': '🍜',
    'cat-daily': '🧴',
    'cat-fresh': '🥚',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Menu area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: shift + search + barcode */}
        <div className="p-2.5 border-b flex items-center gap-2">
          <ShiftBar />
          <div className="flex-1" />
          {isRetail && (
            <div className="relative">
              <ScanBarcode className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              <input
                ref={barcodeRef}
                type="text"
                placeholder="สแกนบาร์โค้ด..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && barcode.trim()) {
                    handleBarcodeScan(barcode.trim());
                  }
                }}
                className="w-44 pl-8 pr-3 py-1.5 rounded-lg border-2 border-green-300 bg-green-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={isRetail ? 'ค้นหาสินค้า...' : 'ค้นหาเมนู...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Order type selector + table badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b">
          {orderTypeOpts.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setOrderType(opt.type)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95',
                order.type === opt.type ? opt.color : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
          {order.tableName && (
            <span className="ml-auto px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1">
              <Receipt className="w-3 h-3" /> {order.tableName}
            </span>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-b shrink-0">
          <button
            onClick={() => setActiveCat('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                activeCat === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              style={activeCat === cat.id ? { backgroundColor: cat.color } : undefined}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAddProduct(p)}
                className="flex flex-col items-center p-3 rounded-xl border hover:border-primary hover:shadow-md transition-all active:scale-95 bg-card group"
              >
                <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mb-2 group-hover:from-blue-100 group-hover:to-blue-50 transition-all">
                  <span className="text-2xl">{categoryIcons[p.categoryId] || '🍜'}</span>
                </div>
                <span className="text-xs font-medium text-center line-clamp-2 leading-tight">{p.name}</span>
                <span className="text-sm font-bold text-primary mt-1">฿{formatCurrency(p.price)}</span>
                {(p.variants.length > 0 || p.modifiers.length > 0) && (
                  <span className="text-[10px] text-muted-foreground">มีตัวเลือก</span>
                )}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center text-muted-foreground py-20">ไม่พบเมนู</div>
          )}
        </div>
      </div>

      {/* Right: Cart panel */}
      <div className="w-[340px] border-l flex flex-col bg-card shrink-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">รายการ <span className="text-sm font-normal text-muted-foreground">({order.items.reduce((s, i) => s + i.qty, 0)})</span></h2>
          {order.items.length > 0 && (
            <button onClick={clearOrder} className="text-xs text-destructive hover:underline flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> ล้าง
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {order.items.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 text-sm">
              ยังไม่มีรายการ<br />กดเมนูเพื่อเพิ่ม
            </div>
          ) : (
            order.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + {item.modifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}
                  {item.note && <p className="text-xs text-orange-500">📝 {item.note}</p>}
                  <p className="text-sm font-semibold text-primary mt-0.5">
                    ฿{formatCurrency((item.unitPrice + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.qty)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateItemQty(item.id, item.qty - 1)}
                    className="w-7 h-7 rounded-md bg-gray-200 flex items-center justify-center hover:bg-gray-300 active:scale-95"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                  <button
                    onClick={() => updateItemQty(item.id, item.qty + 1)}
                    className="w-7 h-7 rounded-md bg-gray-200 flex items-center justify-center hover:bg-gray-300 active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-7 h-7 rounded-md bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 active:scale-95 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals + Pay button */}
        <div className="border-t p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">รวม</span>
            <span>฿{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>ส่วนลด</span>
              <span>-฿{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
          {totals.serviceCharge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ค่าบริการ</span>
              <span>฿{formatCurrency(totals.serviceCharge)}</span>
            </div>
          )}
          {totals.vat > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                VAT {store?.settings.vatRate}%{store?.settings.vatMode === 'included' ? ' (รวมแล้ว)' : ''}
              </span>
              <span>฿{formatCurrency(totals.vat)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-1.5 border-t">
            <span>ยอดสุทธิ</span>
            <span className="text-primary">฿{formatCurrency(totals.total)}</span>
          </div>

          <button
            onClick={() => setShowPayment(true)}
            disabled={order.items.length === 0}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ชำระเงิน ฿{formatCurrency(totals.total)}
          </button>
        </div>
      </div>

      {/* Modifier dialog */}
      {modProduct && (
        <ModifierDialog product={modProduct} onClose={() => setModProduct(null)} />
      )}

      {/* Payment method selector */}
      {showPayment && !showCash && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-center mb-2">ชำระเงิน</h3>
            <p className="text-center text-3xl font-bold text-primary mb-6">
              ฿{formatCurrency(totals.total)}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setShowCash(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 hover:border-green-500 hover:bg-green-50 transition-all active:scale-[0.98]"
              >
                <Banknote className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <span className="font-semibold block">เงินสด</span>
                  <span className="text-xs text-muted-foreground">คำนวณเงินทอนอัตโนมัติ</span>
                </div>
              </button>
              <button
                onClick={() => handlePayment('qr')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98]"
              >
                <QrCode className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <span className="font-semibold block">QR Code / PromptPay</span>
                  <span className="text-xs text-muted-foreground">สแกนจ่าย</span>
                </div>
              </button>
              <button
                onClick={() => handlePayment('card')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 hover:border-purple-500 hover:bg-purple-50 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <span className="font-semibold block">บัตรเครดิต / เดบิต</span>
                  <span className="text-xs text-muted-foreground">รูดบัตร</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowPayment(false)}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Cash payment with change calculator */}
      {showCash && (
        <CashPaymentDialog
          total={totals.total}
          onConfirm={(received) => handlePayment('cash', received)}
          onClose={() => { setShowCash(false); setShowPayment(false); }}
        />
      )}
    </div>
  );
}
