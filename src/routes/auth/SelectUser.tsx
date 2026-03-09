import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { seedDemoData, DEMO_STORE_ID } from '@/db/seed';
import { useAppStore } from '@/store/app-store';
import { verifyPin } from '@/lib/utils';
import { getRoleLabel, getRoleColor } from '@/lib/roles';
import { Lock, Store as StoreIcon, Loader2, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import type { User, Store, BusinessType } from '@/types';

export default function SelectUser() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [store, setStoreLocal] = useState<Store | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const { setStore, setUser } = useAppStore();

  useEffect(() => {
    async function init() {
      const storeCount = await db.stores.count();
      if (storeCount === 0) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }
      const s = await db.stores.get(DEMO_STORE_ID);
      if (s) {
        setStoreLocal(s);
        setStore(s);
        const u = await db.users.where('storeId').equals(DEMO_STORE_ID).toArray();
        setUsers(u.filter((x) => x.isActive));
      }
      setLoading(false);
    }
    init();
  }, [setStore]);

  async function handleSetup(type: BusinessType) {
    setLoading(true);
    await seedDemoData(type);
    const s = await db.stores.get(DEMO_STORE_ID);
    if (s) {
      setStoreLocal(s);
      setStore(s);
      const u = await db.users.where('storeId').equals(DEMO_STORE_ID).toArray();
      setUsers(u.filter((x) => x.isActive));
    }
    setNeedsSetup(false);
    setLoading(false);
  }

  function handlePinKey(digit: string) {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4 && selectedUser) {
      if (verifyPin(newPin, selectedUser.pinHash)) {
        setUser(selectedUser);
      } else {
        setError('PIN ไม่ถูกต้อง');
        setTimeout(() => setPin(''), 300);
      }
    }
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  function handleBack() {
    setSelectedUser(null);
    setPin('');
    setError('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
              <StoreIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">ยินดีต้อนรับสู่ xPOS</h1>
            <p className="text-muted-foreground text-sm mt-1">เลือกประเภทร้านค้าของคุณ</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSetup('restaurant')}
              className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl shadow-lg border-2 border-transparent hover:border-orange-400 hover:shadow-xl transition-all active:scale-95 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold">ร้านอาหาร</span>
              <span className="text-xs text-muted-foreground text-center leading-relaxed">
                มีโต๊ะ ครัว สูตรอาหาร<br />ค่าบริการ ทานที่ร้าน/กลับบ้าน
              </span>
            </button>

            <button
              onClick={() => handleSetup('retail')}
              className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl shadow-lg border-2 border-transparent hover:border-green-400 hover:shadow-xl transition-all active:scale-95 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold">ร้านค้าปลีก</span>
              <span className="text-xs text-muted-foreground text-center leading-relaxed">
                สแกนบาร์โค้ด สต๊อกสินค้า<br />หน้าร้าน/ขายส่ง
              </span>
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            xPOS v0.1 — ฟรี 100% • เปลี่ยนภายหลังได้ในตั้งค่า
          </p>
        </div>
      </div>
    );
  }

  const businessLabel = store?.businessType === 'retail' ? 'ระบบจัดการร้านค้าปลีก' : 'ระบบจัดการร้านอาหาร';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Store header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <StoreIcon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">{store?.name || 'xPOS'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{businessLabel}</p>
        </div>

        {!selectedUser ? (
          /* User select grid */
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <p className="text-sm text-muted-foreground mb-4 text-center">เลือกผู้ใช้งาน</p>
            <div className="grid grid-cols-2 gap-3">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-primary hover:bg-blue-50 transition-all active:scale-95"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                    {u.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium truncate w-full text-center">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(u.role)}`}>
                    {getRoleLabel(u.role)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* PIN entry */
          <div className="bg-card rounded-2xl shadow-lg p-6">
            <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              ← เปลี่ยนผู้ใช้
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                {selectedUser.name.charAt(0)}
              </div>
              <p className="font-semibold">{selectedUser.name}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Lock className="w-3 h-3" /> ใส่ PIN 4 หลัก
              </p>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < pin.length ? 'bg-primary scale-110' : 'bg-gray-200'
                  } ${error && pin.length > 0 ? 'bg-destructive animate-pulse' : ''}`}
                />
              ))}
            </div>

            {error && <p className="text-destructive text-sm text-center mb-2">{error}</p>}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
                <button
                  key={key || 'empty'}
                  onClick={() => {
                    if (key === '⌫') handleBackspace();
                    else if (key) handlePinKey(key);
                  }}
                  disabled={!key}
                  className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
                    key
                      ? 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                      : 'bg-transparent cursor-default'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          xPOS v0.1 — ฟรี 100%
        </p>
      </div>
    </div>
  );
}
