import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId, nowTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  UserCircle, Plus, Edit2, Trash2, Save, Search,
  Phone, Star, Gift, CalendarDays,
} from 'lucide-react';
import type { Customer, Promotion } from '@/types';

type Tab = 'customers' | 'promotions';

export default function CrmPage() {
  const store = useAppStore((s) => s.currentStore);
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [search, setSearch] = useState('');

  // Customer form
  const [showCustForm, setShowCustForm] = useState(false);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custPoints, setCustPoints] = useState('0');

  // Promo form
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoName, setPromoName] = useState('');
  const [promoType, setPromoType] = useState<Promotion['type']>('discount_amount');
  const [promoValue, setPromoValue] = useState('');
  const [promoMin, setPromoMin] = useState('0');
  const [promoActive, setPromoActive] = useState(true);

  useEffect(() => { loadData(); }, [store]);

  async function loadData() {
    if (!store) return;
    const c = await db.customers.where('storeId').equals(store.id).toArray();
    setCustomers(c.sort((a, b) => b.visits - a.visits));
    const p = await db.promotions.where('storeId').equals(store.id).toArray();
    setPromotions(p);
  }

  // --- Customer CRUD ---
  function openAddCust() {
    setEditingCust(null); setCustName(''); setCustPhone(''); setCustPoints('0');
    setShowCustForm(true);
  }

  function openEditCust(c: Customer) {
    setEditingCust(c); setCustName(c.name); setCustPhone(c.phone); setCustPoints(String(c.points));
    setShowCustForm(true);
  }

  async function saveCust() {
    if (!store || !custName.trim()) return;
    if (editingCust) {
      await db.customers.update(editingCust.id, {
        name: custName, phone: custPhone, points: parseInt(custPoints) || 0,
      });
    } else {
      await db.customers.add({
        id: generateId(), storeId: store.id, name: custName, phone: custPhone,
        points: parseInt(custPoints) || 0, visits: 0, createdAt: nowTimestamp(),
      });
    }
    setShowCustForm(false);
    loadData();
  }

  async function deleteCust(id: string) {
    if (!confirm('ลบลูกค้านี้?')) return;
    await db.customers.delete(id);
    loadData();
  }

  // --- Promo CRUD ---
  function openAddPromo() {
    setEditingPromo(null); setPromoName(''); setPromoType('discount_amount');
    setPromoValue(''); setPromoMin('0'); setPromoActive(true);
    setShowPromoForm(true);
  }

  function openEditPromo(p: Promotion) {
    setEditingPromo(p); setPromoName(p.name); setPromoType(p.type);
    setPromoValue(String(p.value)); setPromoMin(String(p.minPurchase)); setPromoActive(p.isActive);
    setShowPromoForm(true);
  }

  async function savePromo() {
    if (!store || !promoName.trim()) return;
    const data = {
      name: promoName, type: promoType, value: parseFloat(promoValue) || 0,
      minPurchase: parseFloat(promoMin) || 0, isActive: promoActive,
    };
    if (editingPromo) {
      await db.promotions.update(editingPromo.id, data);
    } else {
      const now = nowTimestamp();
      await db.promotions.add({
        id: generateId(), storeId: store.id, ...data,
        startDate: now, endDate: now + 365 * 24 * 60 * 60 * 1000,
      });
    }
    setShowPromoForm(false);
    loadData();
  }

  async function deletePromo(id: string) {
    if (!confirm('ลบโปรโมชั่นนี้?')) return;
    await db.promotions.delete(id);
    loadData();
  }

  async function togglePromo(p: Promotion) {
    await db.promotions.update(p.id, { isActive: !p.isActive });
    loadData();
  }

  const filteredCust = customers.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const promoTypeLabels: Record<string, string> = {
    discount_amount: 'ลดเงิน', discount_percent: 'ลด %', bogo: 'ซื้อ 1 แถม 1', bundle: 'ชุดรวม',
  };

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const totalVisits = customers.reduce((s, c) => s + c.visits, 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><UserCircle className="w-5 h-5" /> CRM & โปรโมชั่น</h1>
          <p className="text-sm text-muted-foreground">{customers.length} ลูกค้า • {totalVisits} ครั้งเข้าร้าน • {totalPoints} แต้มรวม</p>
        </div>
        <div className="flex gap-2">
          {tab === 'customers' && (
            <button onClick={openAddCust} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95">
              <Plus className="w-4 h-4" /> เพิ่มลูกค้า
            </button>
          )}
          {tab === 'promotions' && (
            <button onClick={openAddPromo} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95">
              <Plus className="w-4 h-4" /> เพิ่มโปรโมชั่น
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b">
        <button onClick={() => setTab('customers')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'customers' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          ลูกค้า ({customers.length})
        </button>
        <button onClick={() => setTab('promotions')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'promotions' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          โปรโมชั่น ({promotions.length})
        </button>
        {tab === 'customers' && (
          <>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="ค้นหาชื่อ/เบอร์..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'customers' && (
          <div className="space-y-2">
            {filteredCust.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-50">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {c.points > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                        <Star className="w-3 h-3" /> {c.points}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {c.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {c.phone}</span>}
                    <span>{c.visits} ครั้ง</span>
                    {c.lastVisit && <span className="flex items-center gap-0.5"><CalendarDays className="w-3 h-3" /> {new Date(c.lastVisit).toLocaleDateString('th-TH')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEditCust(c)} className="p-1.5 rounded hover:bg-gray-200"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCust(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {filteredCust.length === 0 && <div className="text-center text-muted-foreground py-16">ยังไม่มีลูกค้า</div>}
          </div>
        )}

        {tab === 'promotions' && (
          <div className="space-y-2">
            {promotions.map((p) => (
              <div key={p.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', !p.isActive && 'opacity-50')}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{promoTypeLabels[p.type]}</span>
                    {!p.isActive && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">ปิด</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.type === 'discount_amount' ? `ลด ฿${p.value}` : p.type === 'discount_percent' ? `ลด ${p.value}%` : `มูลค่า ฿${p.value}`}
                    {p.minPurchase > 0 && ` • ขั้นต่ำ ฿${p.minPurchase}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePromo(p)} className="p-1.5 rounded hover:bg-gray-200 text-sm">
                    {p.isActive ? '🟢' : '⚪️'}
                  </button>
                  <button onClick={() => openEditPromo(p)} className="p-1.5 rounded hover:bg-gray-200"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deletePromo(p.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {promotions.length === 0 && <div className="text-center text-muted-foreground py-16">ยังไม่มีโปรโมชั่น</div>}
          </div>
        )}
      </div>

      {/* Customer form modal */}
      {showCustForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCustForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editingCust ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อ</label>
                <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">เบอร์โทร</label>
                <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">แต้มสะสม</label>
                <input type="number" value={custPoints} onChange={(e) => setCustPoints(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCustForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
              <button onClick={saveCust} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion form modal */}
      {showPromoForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPromoForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editingPromo ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่น'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อโปรโมชั่น</label>
                <input type="text" value={promoName} onChange={(e) => setPromoName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">ประเภท</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(['discount_amount', 'discount_percent', 'bogo', 'bundle'] as const).map((t) => (
                    <button key={t} onClick={() => setPromoType(t)} className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                      promoType === t ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {promoTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">{promoType.includes('percent') ? 'เปอร์เซ็นต์' : 'มูลค่า (฿)'}</label>
                  <input type="number" value={promoValue} onChange={(e) => setPromoValue(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">ยอดขั้นต่ำ (฿)</label>
                  <input type="number" value={promoMin} onChange={(e) => setPromoMin(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowPromoForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
              <button onClick={savePromo} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
