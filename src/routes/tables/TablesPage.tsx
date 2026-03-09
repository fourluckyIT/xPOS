import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, UtensilsCrossed, Plus, Edit2, Trash2, Save } from 'lucide-react';
import type { Table, Order, TableStatus } from '@/types';

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [activeZone, setActiveZone] = useState<string>('all');
  const [tableOrders, setTableOrders] = useState<Record<string, Order>>({});
  const [editMode, setEditMode] = useState(false);

  // Table form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [fName, setFName] = useState('');
  const [fZone, setFZone] = useState('');
  const [fNewZone, setFNewZone] = useState('');
  const [fSeats, setFSeats] = useState('4');

  const store = useAppStore((s) => s.currentStore);
  const user = useAppStore((s) => s.currentUser);
  const setOrderTable = useAppStore((s) => s.setOrderTable);
  const setOrderType = useAppStore((s) => s.setOrderType);
  const navigate = useNavigate();

  const isManager = user?.role === 'manager' || user?.role === 'super_admin';

  useEffect(() => {
    if (!store) return;
    loadTables();
  }, [store]);

  async function loadTables() {
    if (!store) return;
    const t = await db.diningTables.where('storeId').equals(store.id).sortBy('sortOrder');
    setTables(t);
    const uniqueZones = [...new Set(t.map((x) => x.zone))];
    setZones(uniqueZones);

    const openOrders = await db.orders
      .where('storeId').equals(store.id)
      .filter((o) => o.status === 'open' && !!o.tableId)
      .toArray();
    const orderMap: Record<string, Order> = {};
    for (const o of openOrders) {
      if (o.tableId) orderMap[o.tableId] = o;
    }
    setTableOrders(orderMap);
  }

  async function handleTableClick(table: Table) {
    if (editMode) return;
    if (table.status === 'available') {
      await db.diningTables.update(table.id, { status: 'occupied' });
      setOrderTable(table.id, table.name);
      setOrderType('dine_in');
      navigate('/pos');
    } else if (table.status === 'occupied') {
      setOrderTable(table.id, table.name);
      setOrderType('dine_in');
      navigate('/pos');
    }
  }

  async function cycleStatus(table: Table) {
    const order: TableStatus[] = ['available', 'occupied', 'reserved', 'cleaning'];
    const next = order[(order.indexOf(table.status) + 1) % order.length];
    await db.diningTables.update(table.id, { status: next });
    loadTables();
  }

  function openAdd() {
    setEditing(null);
    setFName(''); setFZone(zones[0] || ''); setFNewZone(''); setFSeats('4');
    setShowForm(true);
  }

  function openEdit(t: Table) {
    setEditing(t);
    setFName(t.name); setFZone(t.zone); setFNewZone(''); setFSeats(String(t.seats));
    setShowForm(true);
  }

  async function handleSave() {
    if (!store || !fName.trim()) return;
    const zone = fNewZone.trim() || fZone;
    if (!zone) return;
    if (editing) {
      await db.diningTables.update(editing.id, { name: fName, zone, seats: parseInt(fSeats) || 4 });
    } else {
      await db.diningTables.add({
        id: generateId(), storeId: store.id, name: fName, zone,
        seats: parseInt(fSeats) || 4, sortOrder: tables.length, status: 'available',
      });
    }
    setShowForm(false);
    loadTables();
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบโต๊ะนี้?')) return;
    await db.diningTables.delete(id);
    loadTables();
  }

  const filtered = activeZone === 'all' ? tables : tables.filter((t) => t.zone === activeZone);

  const statusColors: Record<string, string> = {
    available: 'bg-green-50 border-green-300 hover:border-green-500',
    occupied: 'bg-orange-50 border-orange-300 hover:border-orange-500',
    reserved: 'bg-blue-50 border-blue-300 hover:border-blue-500',
    cleaning: 'bg-gray-100 border-gray-300',
  };

  const statusLabels: Record<string, string> = {
    available: 'ว่าง',
    occupied: 'มีลูกค้า',
    reserved: 'จอง',
    cleaning: 'ทำความสะอาด',
  };

  const statusDots: Record<string, string> = {
    available: 'bg-green-500',
    occupied: 'bg-orange-500',
    reserved: 'bg-blue-500',
    cleaning: 'bg-gray-400',
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">จัดการโต๊ะ</h1>
          <p className="text-sm text-muted-foreground">
            ว่าง {tables.filter((t) => t.status === 'available').length} / ทั้งหมด {tables.length} โต๊ะ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(statusLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn('w-2.5 h-2.5 rounded-full', statusDots[key])} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          {isManager && (
            <div className="flex gap-1 ml-2">
              <button onClick={() => setEditMode(!editMode)} className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                editMode ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>
                {editMode ? 'เสร็จ' : 'จัดการ'}
              </button>
              <button onClick={openAdd} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-95">
                <Plus className="w-3 h-3" /> เพิ่มโต๊ะ
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto border-b shrink-0">
        <button onClick={() => setActiveZone('all')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
            activeZone === 'all' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          ทุกโซน
        </button>
        {zones.map((z) => (
          <button key={z} onClick={() => setActiveZone(z)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeZone === z ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {z}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filtered.map((table) => (
            <div key={table.id} className="relative">
              <button
                onClick={() => handleTableClick(table)}
                className={cn(
                  'w-full flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all active:scale-95 min-h-[120px]',
                  statusColors[table.status],
                  editMode && 'opacity-80'
                )}
              >
                <UtensilsCrossed className="w-6 h-6 mb-1 text-gray-500" />
                <span className="text-lg font-bold">{table.name}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Users className="w-3 h-3" />
                  <span>{table.seats}</span>
                </div>
                <span className={cn('text-[10px] mt-1 px-1.5 py-0.5 rounded-full', statusDots[table.status].replace('bg-', 'bg-opacity-20 text-').replace('500', '700'))}>
                  {statusLabels[table.status]}
                </span>
                {tableOrders[table.id] && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {tableOrders[table.id].items.length}
                  </span>
                )}
              </button>
              {editMode && (
                <div className="absolute -top-1 -right-1 flex gap-0.5">
                  <button onClick={() => cycleStatus(table)} className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] hover:bg-blue-600 shadow" title="เปลี่ยนสถานะ">
                    ↻
                  </button>
                  <button onClick={() => openEdit(table)} className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 shadow">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(table.id)} className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'แก้ไขโต๊ะ' : 'เพิ่มโต๊ะ'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อโต๊ะ</label>
                <input type="text" value={fName} onChange={(e) => setFName(e.target.value)}
                  placeholder="เช่น T1, โต๊ะ 5" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">โซน</label>
                {zones.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-1">
                    {zones.map((z) => (
                      <button key={z} onClick={() => { setFZone(z); setFNewZone(''); }}
                        className={cn('px-2 py-1 rounded text-xs font-medium', fZone === z && !fNewZone ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600')}>
                        {z}
                      </button>
                    ))}
                  </div>
                )}
                <input type="text" value={fNewZone} onChange={(e) => setFNewZone(e.target.value)}
                  placeholder="หรือพิมพ์โซนใหม่..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">จำนวนที่นั่ง</label>
                <input type="number" value={fSeats} onChange={(e) => setFSeats(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
