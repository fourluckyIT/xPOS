import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Receipt, Clock, ChevronRight, X, Banknote, QrCode, CreditCard, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

const paymentIcons: Record<string, typeof Banknote> = {
  cash: Banknote,
  qr: QrCode,
  card: CreditCard,
  wallet: Wallet,
  transfer: Wallet,
};

const paymentLabels: Record<string, string> = {
  cash: 'เงินสด',
  qr: 'QR Code',
  card: 'บัตร',
  wallet: 'e-Wallet',
  transfer: 'โอนเงิน',
};

const typeLabels: Record<string, string> = {
  dine_in: 'ทานที่ร้าน',
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี่',
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const store = useAppStore((s) => s.currentStore);

  useEffect(() => {
    if (!store) return;
    db.orders
      .where('storeId').equals(store.id)
      .filter((o) => o.status === 'closed')
      .toArray()
      .then((list) => setOrders(list.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0))));
  }, [store]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Order list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5" /> ประวัติบิล
          </h1>
          <p className="text-sm text-muted-foreground">{orders.length} รายการ</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">ยังไม่มีบิล</div>
          ) : (
            <div className="divide-y">
              {orders.map((o) => {
                const PayIcon = paymentIcons[o.payments[0]?.method] || Banknote;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left',
                      selected?.id === o.id && 'bg-blue-50'
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <PayIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">#{o.id.slice(-6).toUpperCase()}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{typeLabels[o.type]}</span>
                        {o.tableName && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">{o.tableName}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{format(o.closedAt || o.createdAt, 'd MMM HH:mm', { locale: th })}</span>
                        <span>• {o.items.length} รายการ</span>
                        <span>• {o.staffName}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">฿{formatCurrency(o.total)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order detail panel */}
      {selected && (
        <div className="w-[380px] border-l bg-card flex flex-col shrink-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold">บิล #{selected.id.slice(-6).toUpperCase()}</h2>
            <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">ประเภท</p>
                <p className="font-medium">{typeLabels[selected.type]}</p>
              </div>
              {selected.tableName && (
                <div>
                  <p className="text-muted-foreground text-xs">โต๊ะ</p>
                  <p className="font-medium">{selected.tableName}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs">เวลา</p>
                <p className="font-medium">{format(selected.closedAt || selected.createdAt, 'd MMM yyyy HH:mm', { locale: th })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">พนักงาน</p>
                <p className="font-medium">{selected.staffName}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="font-semibold text-sm mb-2">รายการสินค้า</h3>
              <div className="space-y-1.5">
                {selected.items.map((item) => (
                  <div key={item.id} className={cn('flex items-start justify-between text-sm', item.voided && 'opacity-40 line-through')}>
                    <div className="flex-1">
                      <span className="font-medium">{item.qty}x</span>{' '}
                      <span>{item.productName}</span>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground ml-4">
                          + {item.modifiers.map((m) => m.name).join(', ')}
                        </p>
                      )}
                      {item.note && <p className="text-xs text-orange-500 ml-4">📝 {item.note}</p>}
                    </div>
                    <span className="font-medium shrink-0">
                      ฿{formatCurrency((item.unitPrice + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">รวม</span>
                <span>฿{formatCurrency(selected.subtotal)}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>ส่วนลด</span>
                  <span>-฿{formatCurrency(selected.discount)}</span>
                </div>
              )}
              {selected.serviceCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ค่าบริการ</span>
                  <span>฿{formatCurrency(selected.serviceCharge)}</span>
                </div>
              )}
              {selected.vat > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span>฿{formatCurrency(selected.vat)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-1 border-t">
                <span>ยอดสุทธิ</span>
                <span className="text-primary">฿{formatCurrency(selected.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="border-t pt-3">
              <h3 className="font-semibold text-sm mb-2">การชำระ</h3>
              {selected.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{paymentLabels[p.method] || p.method}</span>
                  <span className="font-medium">฿{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
