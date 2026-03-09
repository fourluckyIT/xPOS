import { useState, useEffect, useMemo } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { formatCurrency } from '@/lib/utils';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  BarChart3, TrendingUp, ShoppingCart, DollarSign,
  Download, Users, Clock, Percent,
} from 'lucide-react';
import type { Order } from '@/types';

type DateRange = 'today' | '7days' | '30days' | 'custom';

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const store = useAppStore((s) => s.currentStore);
  const [range, setRange] = useState<DateRange>('today');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!store) return;
    let start: number, end: number;
    const now = new Date();
    if (range === 'today') {
      start = startOfDay(now).getTime();
      end = endOfDay(now).getTime();
    } else if (range === '7days') {
      start = startOfDay(subDays(now, 6)).getTime();
      end = endOfDay(now).getTime();
    } else if (range === '30days') {
      start = startOfDay(subDays(now, 29)).getTime();
      end = endOfDay(now).getTime();
    } else {
      const day = new Date(dateStr);
      start = startOfDay(day).getTime();
      end = endOfDay(day).getTime();
    }
    db.orders
      .where('storeId').equals(store.id)
      .filter((o) => o.status === 'closed' && o.closedAt! >= start && o.closedAt! <= end)
      .toArray()
      .then(setOrders);
  }, [store, range, dateStr]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalVat = orders.reduce((s, o) => s + o.vat, 0);
    const totalSC = orders.reduce((s, o) => s + o.serviceCharge, 0);
    const totalDiscount = orders.reduce((s, o) => s + o.discount, 0);
    const totalCustomers = orders.reduce((s, o) => s + o.customerCount, 0);

    // Product ranking
    const productCount: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const o of orders) {
      for (const item of o.items) {
        if (item.voided) continue;
        if (!productCount[item.productId]) {
          productCount[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productCount[item.productId].qty += item.qty;
        productCount[item.productId].revenue += item.unitPrice * item.qty;
      }
    }
    const topProducts = Object.values(productCount).sort((a, b) => b.qty - a.qty).slice(0, 10);

    // Payment breakdown
    const paymentBreakdown: Record<string, number> = {};
    for (const o of orders) {
      for (const p of o.payments) {
        paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
      }
    }

    // Hourly heatmap
    const hourly = new Array(24).fill(0);
    const hourlySales = new Array(24).fill(0);
    for (const o of orders) {
      const h = new Date(o.closedAt || o.createdAt).getHours();
      hourly[h]++;
      hourlySales[h] += o.total;
    }

    // Order type breakdown
    const typeBreakdown: Record<string, { count: number; sales: number }> = {};
    for (const o of orders) {
      if (!typeBreakdown[o.type]) typeBreakdown[o.type] = { count: 0, sales: 0 };
      typeBreakdown[o.type].count++;
      typeBreakdown[o.type].sales += o.total;
    }

    // Staff performance
    const staffPerf: Record<string, { name: string; orders: number; sales: number }> = {};
    for (const o of orders) {
      if (!staffPerf[o.staffId]) staffPerf[o.staffId] = { name: o.staffName, orders: 0, sales: 0 };
      staffPerf[o.staffId].orders++;
      staffPerf[o.staffId].sales += o.total;
    }
    const staffRanking = Object.values(staffPerf).sort((a, b) => b.sales - a.sales);

    return {
      totalSales, totalOrders, avgTicket, totalVat, totalSC, totalDiscount, totalCustomers,
      topProducts, paymentBreakdown, hourly, hourlySales, typeBreakdown, staffRanking,
    };
  }, [orders]);

  function exportCSV() {
    const header = 'บิล,วันที่,เวลา,ประเภท,โต๊ะ,พนักงาน,รวม,ส่วนลด,ค่าบริการ,VAT,ยอดสุทธิ,ชำระ\n';
    const rows = orders.map((o) => {
      const d = new Date(o.closedAt || o.createdAt);
      return [
        o.id.slice(-6).toUpperCase(),
        format(d, 'yyyy-MM-dd'),
        format(d, 'HH:mm'),
        typeLabels[o.type],
        o.tableName || '-',
        o.staffName,
        o.subtotal.toFixed(2),
        o.discount.toFixed(2),
        o.serviceCharge.toFixed(2),
        o.vat.toFixed(2),
        o.total.toFixed(2),
        o.payments.map((p) => paymentLabels[p.method]).join('+'),
      ].join(',');
    }).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xpos-report-${dateStr || format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const paymentLabels: Record<string, string> = {
    cash: 'เงินสด', qr: 'QR Code', card: 'บัตร', wallet: 'e-Wallet', transfer: 'โอนเงิน',
  };

  const typeLabels: Record<string, string> = {
    dine_in: 'ทานที่ร้าน', takeaway: 'กลับบ้าน', delivery: 'เดลิเวอรี่',
  };

  const rangeOpts: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'วันนี้' },
    { key: '7days', label: '7 วัน' },
    { key: '30days', label: '30 วัน' },
    { key: 'custom', label: 'เลือกวัน' },
  ];

  const maxHourly = Math.max(...stats.hourly, 1);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> รายงานการขาย
        </h1>
        <div className="flex items-center gap-2">
          {rangeOpts.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
              range === r.key ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}>
              {r.label}
            </button>
          ))}
          {range === 'custom' && (
            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)}
              className="border rounded-lg px-2 py-1 text-xs" />
          )}
          <button onClick={exportCSV} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-500 active:scale-95">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" /> ยอดขายรวม
            </div>
            <p className="text-2xl font-bold text-primary">฿{formatCurrency(stats.totalSales)}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <ShoppingCart className="w-4 h-4" /> จำนวนบิล
            </div>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" /> เฉลี่ย/บิล
            </div>
            <p className="text-2xl font-bold">฿{formatCurrency(stats.avgTicket)}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="w-4 h-4" /> ลูกค้า
            </div>
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
          </div>
        </div>

        {/* Tax & discount summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> VAT</span>
            <span className="font-semibold">฿{formatCurrency(stats.totalVat)}</span>
          </div>
          <div className="bg-card border rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ค่าบริการ</span>
            <span className="font-semibold">฿{formatCurrency(stats.totalSC)}</span>
          </div>
          <div className="bg-card border rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-destructive">ส่วนลดรวม</span>
            <span className="font-semibold text-destructive">-฿{formatCurrency(stats.totalDiscount)}</span>
          </div>
        </div>

        {/* Hourly heatmap */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> ยอดขายรายชั่วโมง</h3>
          <div className="flex items-end gap-[3px] h-24">
            {stats.hourly.map((count, h) => (
              <div key={h} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <div
                  className={cn('w-full rounded-t transition-all', count > 0 ? 'bg-primary/70 hover:bg-primary' : 'bg-gray-100')}
                  style={{ height: `${Math.max((count / maxHourly) * 100, count > 0 ? 8 : 2)}%` }}
                />
                {h % 3 === 0 && <span className="text-[9px] text-muted-foreground">{String(h).padStart(2, '0')}</span>}
                {count > 0 && (
                  <div className="absolute -top-8 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {h}:00 — {count} บิล ฿{formatCurrency(stats.hourlySales[h])}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Top products */}
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-bold mb-3">เมนูขายดี</h3>
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-2">
                {stats.topProducts.map((p, i) => {
                  const maxRev = stats.topProducts[0]?.revenue || 1;
                  return (
                    <div key={i} className="text-sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="font-medium">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{p.qty}</span>
                          <span className="text-muted-foreground ml-2">฿{formatCurrency(p.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-7">
                        <div className="h-full bg-primary/40 rounded-full" style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Payment breakdown */}
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-bold mb-3">ช่องทางชำระ</h3>
              {Object.keys(stats.paymentBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.paymentBreakdown).map(([method, amount]) => {
                    const pct = stats.totalSales > 0 ? (amount / stats.totalSales) * 100 : 0;
                    return (
                      <div key={method} className="text-sm">
                        <div className="flex items-center justify-between mb-0.5">
                          <span>{paymentLabels[method] || method}</span>
                          <span className="font-semibold">฿{formatCurrency(amount)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order type breakdown */}
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-bold mb-3">ประเภทออเดอร์</h3>
              {Object.keys(stats.typeBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(stats.typeBreakdown).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span>{typeLabels[type] || type}</span>
                      <span className="font-semibold">{data.count} บิล — ฿{formatCurrency(data.sales)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff performance */}
            <div className="bg-card border rounded-xl p-4">
              <h3 className="font-bold mb-3">พนักงาน</h3>
              {stats.staffRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.staffRanking.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span>{s.orders} บิล — <span className="font-semibold text-primary">฿{formatCurrency(s.sales)}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
