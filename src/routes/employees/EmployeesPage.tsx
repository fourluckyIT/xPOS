import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId, hashPin, formatCurrency, nowTimestamp } from '@/lib/utils';
import { getRoleLabel, getRoleColor } from '@/lib/roles';
import { cn } from '@/lib/utils';
import {
  Users, Plus, Edit2, Trash2, Save, Clock,
  ToggleLeft, ToggleRight, KeyRound,
} from 'lucide-react';
import type { User, Role, Shift } from '@/types';

type Tab = 'employees' | 'shifts';

export default function EmployeesPage() {
  const store = useAppStore((s) => s.currentStore);
  const [tab, setTab] = useState<Tab>('employees');
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<Role>('staff');
  const [formPin, setFormPin] = useState('');
  const [formActive, setFormActive] = useState(true);

  useEffect(() => { loadData(); }, [store]);

  async function loadData() {
    if (!store) return;
    const u = await db.users.where('storeId').equals(store.id).toArray();
    setUsers(u);
    const s = await db.shifts.where('storeId').equals(store.id).toArray();
    setShifts(s.sort((a, b) => b.openedAt - a.openedAt).slice(0, 50));
  }

  function openAdd() {
    setEditing(null);
    setFormName(''); setFormRole('staff'); setFormPin(''); setFormActive(true);
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setFormName(u.name); setFormRole(u.role); setFormPin(''); setFormActive(u.isActive);
    setShowForm(true);
  }

  async function handleSave() {
    if (!store || !formName.trim()) return;
    if (editing) {
      const updates: Partial<User> = { name: formName, role: formRole, isActive: formActive };
      if (formPin.length === 4) updates.pinHash = hashPin(formPin);
      await db.users.update(editing.id, updates);
    } else {
      if (formPin.length !== 4) { alert('PIN ต้องเป็น 4 หลัก'); return; }
      await db.users.add({
        id: generateId(), storeId: store.id, name: formName,
        pinHash: hashPin(formPin), role: formRole,
        isActive: formActive, createdAt: nowTimestamp(),
      });
    }
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบพนักงานนี้?')) return;
    await db.users.delete(id);
    loadData();
  }

  async function toggleActive(u: User) {
    await db.users.update(u.id, { isActive: !u.isActive });
    loadData();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'employees', label: 'พนักงาน' },
    { key: 'shifts', label: 'ประวัติกะ' },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> จัดการพนักงาน</h1>
          <p className="text-sm text-muted-foreground">{users.filter((u) => u.isActive).length} คนทำงาน / {users.length} ทั้งหมด</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95">
          <Plus className="w-4 h-4" /> เพิ่มพนักงาน
        </button>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'employees' && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', !u.isActive && 'opacity-50')}>
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{u.name}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', getRoleColor(u.role))}>{getRoleLabel(u.role)}</span>
                    {!u.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">ปิดใช้งาน</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">สร้างเมื่อ {new Date(u.createdAt).toLocaleDateString('th-TH')}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(u)} className="p-1.5 rounded hover:bg-gray-100" title={u.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                    {u.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </button>
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="text-center text-muted-foreground py-16">ยังไม่มีพนักงาน</div>}
          </div>
        )}

        {tab === 'shifts' && (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_120px_100px_100px_100px_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
              <span>พนักงาน</span><span>เวลา</span><span className="text-right">เงินเปิด</span>
              <span className="text-right">ยอดขาย</span><span className="text-right">เงินปิด</span><span className="text-right">ส่วนต่าง</span>
            </div>
            {shifts.map((s) => {
              const diff = s.closedAt && s.closingCash !== undefined && s.expectedCash !== undefined
                ? s.closingCash - s.expectedCash : null;
              return (
                <div key={s.id} className="grid grid-cols-[1fr_120px_100px_100px_100px_80px] gap-2 px-3 py-2.5 rounded-lg items-center text-sm hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{s.staffName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.openedAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    {s.closedAt ? ` — ${new Date(s.closedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : ' (เปิดอยู่)'}
                  </div>
                  <span className="text-right">฿{formatCurrency(s.openingCash)}</span>
                  <span className="text-right font-semibold text-primary">฿{formatCurrency(s.totalSales)}</span>
                  <span className="text-right">{s.closingCash !== undefined ? `฿${formatCurrency(s.closingCash)}` : '—'}</span>
                  <span className={cn('text-right font-semibold', diff !== null ? (diff >= 0 ? 'text-green-600' : 'text-red-600') : '')}>
                    {diff !== null ? `${diff >= 0 ? '+' : ''}฿${formatCurrency(diff)}` : '—'}
                  </span>
                </div>
              );
            })}
            {shifts.length === 0 && <div className="text-center text-muted-foreground py-16">ยังไม่มีประวัติกะ</div>}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อ</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">บทบาท</label>
                <div className="flex gap-1 mt-1">
                  {(['staff', 'manager', 'super_admin'] as const).map((r) => (
                    <button key={r} onClick={() => setFormRole(r)} className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
                      formRole === r ? getRoleColor(r) : 'bg-gray-100 text-gray-500'
                    )}>
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1"><KeyRound className="w-3 h-3" /> PIN (4 หลัก){editing && ' — เว้นว่างถ้าไม่เปลี่ยน'}</label>
                <input type="password" maxLength={4} value={formPin} onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={editing ? '••••' : 'ใส่ PIN 4 หลัก'}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">สถานะ</span>
                <button onClick={() => setFormActive(!formActive)} className="flex items-center gap-1 text-sm">
                  {formActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  {formActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </button>
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
