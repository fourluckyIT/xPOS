import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/types';

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const store = useAppStore((s) => s.currentStore);

  useEffect(() => {
    if (!store) return;
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [store]);

  async function loadOrders() {
    if (!store) return;
    const recent = await db.orders
      .where('storeId').equals(store.id)
      .filter((o) => o.status === 'open' || o.status === 'preparing')
      .toArray();
    setOrders(recent.sort((a, b) => a.createdAt - b.createdAt));
  }

  async function markDone(orderId: string) {
    await db.orders.update(orderId, { status: 'served' });
    loadOrders();
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-950 text-white">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-xl font-bold">🍳 ครัว — Kitchen Display</h1>
        <span className="text-sm text-gray-400">{orders.length} ออเดอร์รอ</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="text-center text-gray-500 py-20 text-lg">ไม่มีออเดอร์ค้าง ✅</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {orders.map((order) => {
              const elapsed = Math.floor((Date.now() - order.createdAt) / 60000);
              const urgent = elapsed > 15;
              return (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-xl border p-3 flex flex-col',
                    urgent ? 'border-red-500 bg-red-950/50' : 'border-gray-700 bg-gray-900'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">
                      {order.tableName || (order.type === 'takeaway' ? '🛍️ กลับบ้าน' : `#${order.id.slice(-4)}`)}
                    </span>
                    <div className={cn('flex items-center gap-1 text-xs', urgent ? 'text-red-400' : 'text-gray-400')}>
                      <Clock className="w-3 h-3" />
                      <span>{elapsed} นาที</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {order.items.filter((i) => !i.voided).map((item) => (
                      <div key={item.id} className="flex items-start gap-2 text-sm">
                        <span className="font-bold text-yellow-400 w-5 text-right">{item.qty}x</span>
                        <div className="flex-1">
                          <span>{item.productName}</span>
                          {item.modifiers.length > 0 && (
                            <span className="text-gray-400 text-xs block">
                              + {item.modifiers.map((m) => m.name).join(', ')}
                            </span>
                          )}
                          {item.note && <span className="text-orange-400 text-xs block">📝 {item.note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                    <span className="text-xs text-gray-500">
                      {format(order.createdAt, 'HH:mm', { locale: th })}
                    </span>
                    <button
                      onClick={() => markDone(order.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      เสร็จ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
