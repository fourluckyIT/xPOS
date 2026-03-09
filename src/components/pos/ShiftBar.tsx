import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId, nowTimestamp, formatCurrency } from '@/lib/utils';
import { Clock, PlayCircle, StopCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import type { Shift } from '@/types';

export default function ShiftBar() {
  const store = useAppStore((s) => s.currentStore);
  const user = useAppStore((s) => s.currentUser);
  const activeShift = useAppStore((s) => s.activeShift);
  const setActiveShift = useAppStore((s) => s.setActiveShift);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('0');
  const [shiftSales, setShiftSales] = useState(0);
  const [shiftOrders, setShiftOrders] = useState(0);

  useEffect(() => {
    if (!store || !user) return;
    db.shifts
      .where('storeId').equals(store.id)
      .filter((s) => !s.closedAt)
      .first()
      .then((s) => {
        if (s) setActiveShift(s);
      });
  }, [store, user, setActiveShift]);

  useEffect(() => {
    if (!activeShift || !store) return;
    db.orders
      .where('storeId').equals(store.id)
      .filter((o) => o.status === 'closed' && o.closedAt! >= activeShift.openedAt)
      .toArray()
      .then((orders) => {
        setShiftSales(orders.reduce((s, o) => s + o.total, 0));
        setShiftOrders(orders.length);
      });

    const interval = setInterval(() => {
      db.orders
        .where('storeId').equals(store.id)
        .filter((o) => o.status === 'closed' && o.closedAt! >= activeShift.openedAt)
        .toArray()
        .then((orders) => {
          setShiftSales(orders.reduce((s, o) => s + o.total, 0));
          setShiftOrders(orders.length);
        });
    }, 10000);
    return () => clearInterval(interval);
  }, [activeShift, store]);

  async function handleOpenShift() {
    if (!store || !user) return;
    const shift: Shift = {
      id: generateId(),
      storeId: store.id,
      staffId: user.id,
      staffName: user.name,
      openedAt: nowTimestamp(),
      openingCash: parseFloat(openingCash) || 0,
      totalSales: 0,
      totalOrders: 0,
      backedUp: false,
    };
    await db.shifts.add(shift);
    setActiveShift(shift);
    setShowOpen(false);
    setOpeningCash('0');
  }

  async function handleCloseShift() {
    if (!activeShift) return;
    const closing = parseFloat(closingCash) || 0;
    const cashOrders = await db.orders
      .where('storeId').equals(activeShift.storeId)
      .filter((o) =>
        o.status === 'closed' &&
        o.closedAt! >= activeShift.openedAt &&
        o.payments.some((p) => p.method === 'cash')
      )
      .toArray();

    const cashSales = cashOrders.reduce((s, o) =>
      s + o.payments.filter((p) => p.method === 'cash').reduce((ps, p) => ps + p.amount, 0), 0
    );
    const expectedCash = activeShift.openingCash + cashSales;

    await db.shifts.update(activeShift.id, {
      closedAt: nowTimestamp(),
      closingCash: closing,
      expectedCash,
      totalSales: shiftSales,
      totalOrders: shiftOrders,
    });
    setActiveShift(null);
    setShowClose(false);
    setClosingCash('0');
  }

  if (!activeShift) {
    return (
      <>
        <button
          onClick={() => setShowOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-500 active:scale-95 transition-all"
        >
          <PlayCircle className="w-4 h-4" /> เปิดกะ
        </button>

        {showOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowOpen(false)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xs p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 text-center">เปิดกะการขาย</h3>
              <label className="text-sm text-muted-foreground mb-1 block">เงินสดเริ่มต้น (บาท)</label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-lg text-center font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <button
                onClick={handleOpenShift}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 active:scale-[0.98] transition-all"
              >
                เปิดกะ
              </button>
              <button onClick={() => setShowOpen(false)} className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-green-600">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Clock className="w-3.5 h-3.5" />
          <span className="font-medium">{format(activeShift.openedAt, 'HH:mm')}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="font-semibold text-foreground">฿{formatCurrency(shiftSales)}</span>
          <span className="text-xs">({shiftOrders} บิล)</span>
        </div>
        <button
          onClick={() => setShowClose(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200 active:scale-95 transition-all"
        >
          <StopCircle className="w-3.5 h-3.5" /> ปิดกะ
        </button>
      </div>

      {showClose && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowClose(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-center">ปิดกะการขาย</h3>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">เปิดกะเมื่อ</span>
                <span>{format(activeShift.openedAt, 'HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เงินเปิดกะ</span>
                <span>฿{formatCurrency(activeShift.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดขายรวม</span>
                <span className="font-bold text-primary">฿{formatCurrency(shiftSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">จำนวนบิล</span>
                <span>{shiftOrders}</span>
              </div>
            </div>
            <label className="text-sm text-muted-foreground mb-1 block">เงินสดในลิ้นชัก (บาท)</label>
            <input
              type="number"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-lg text-center font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button
              onClick={handleCloseShift}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 active:scale-[0.98] transition-all"
            >
              ยืนยันปิดกะ
            </button>
            <button onClick={() => setShowClose(false)} className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </>
  );
}
