import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import {
  Settings, Save, Download, Upload,
  ToggleLeft, ToggleRight, Store as StoreIcon,
  FileText, Database, AlertTriangle, UtensilsCrossed, ShoppingCart,
} from 'lucide-react';
import type { StoreSettings, BusinessType } from '@/types';

type Tab = 'store' | 'receipt' | 'data';

export default function SettingsPage() {
  const storeState = useAppStore((s) => s.currentStore);
  const setStoreGlobal = useAppStore((s) => s.setStore);
  const [tab, setTab] = useState<Tab>('store');
  const [saved, setSaved] = useState(false);

  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [vatRate, setVatRate] = useState('7');
  const [scRate, setScRate] = useState('10');
  const [enableVat, setEnableVat] = useState(true);
  const [enableSc, setEnableSc] = useState(false);
  const [vatMode, setVatMode] = useState<'add' | 'included'>('add');
  const [roundingMode, setRoundingMode] = useState<'none' | 'baht'>('none');
  const [currency, setCurrency] = useState('THB');
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  useEffect(() => {
    if (!storeState) return;
    setBusinessType(storeState.businessType || 'restaurant');
    setName(storeState.name);
    setAddress(storeState.address);
    setPhone(storeState.phone);
    setTaxId(storeState.taxId);
    setVatRate(String(storeState.settings.vatRate));
    setScRate(String(storeState.settings.serviceChargeRate));
    setEnableVat(storeState.settings.enableVat);
    setEnableSc(storeState.settings.enableServiceCharge);
    setVatMode(storeState.settings.vatMode || 'add');
    setRoundingMode(storeState.settings.roundingMode || 'none');
    setCurrency(storeState.settings.currency);
    setLowStockAlert(storeState.settings.lowStockAlertEnabled);
    setAutoBackup(storeState.settings.autoBackupOnShiftClose);
    setReceiptHeader(storeState.settings.receiptHeader);
    setReceiptFooter(storeState.settings.receiptFooter);
  }, [storeState]);

  async function handleSave() {
    if (!storeState) return;
    const settings: StoreSettings = {
      vatRate: parseFloat(vatRate) || 0,
      serviceChargeRate: parseFloat(scRate) || 0,
      enableVat: enableVat,
      enableServiceCharge: enableSc,
      vatMode,
      roundingMode,
      receiptHeader,
      receiptFooter,
      currency,
      lowStockAlertEnabled: lowStockAlert,
      autoBackupOnShiftClose: autoBackup,
    };
    await db.stores.update(storeState.id, { name, businessType, address, phone, taxId, settings });
    const updated = await db.stores.get(storeState.id);
    if (updated) setStoreGlobal(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    const data: Record<string, unknown[]> = {};
    data.stores = await db.stores.toArray();
    data.users = await db.users.toArray();
    data.categories = await db.categories.toArray();
    data.products = await db.products.toArray();
    data.recipes = await db.recipes.toArray();
    data.ingredients = await db.ingredients.toArray();
    data.suppliers = await db.suppliers.toArray();
    data.diningTables = await db.diningTables.toArray();
    data.orders = await db.orders.toArray();
    data.shifts = await db.shifts.toArray();
    data.stockMovements = await db.stockMovements.toArray();
    data.promotions = await db.promotions.toArray();
    data.customers = await db.customers.toArray();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xpos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.stores || !data.users) {
          alert('ไฟล์ไม่ถูกต้อง');
          return;
        }
        if (!confirm('การนำเข้าจะ **แทนที่** ข้อมูลเดิมทั้งหมด\nยืนยัน?')) return;

        await db.transaction('rw',
          [db.stores, db.users, db.categories, db.products, db.recipes,
           db.ingredients, db.suppliers, db.diningTables, db.orders,
           db.shifts, db.stockMovements, db.promotions, db.customers],
          async () => {
            await db.stores.clear(); if (data.stores) await db.stores.bulkAdd(data.stores);
            await db.users.clear(); if (data.users) await db.users.bulkAdd(data.users);
            await db.categories.clear(); if (data.categories) await db.categories.bulkAdd(data.categories);
            await db.products.clear(); if (data.products) await db.products.bulkAdd(data.products);
            await db.recipes.clear(); if (data.recipes) await db.recipes.bulkAdd(data.recipes);
            await db.ingredients.clear(); if (data.ingredients) await db.ingredients.bulkAdd(data.ingredients);
            await db.suppliers.clear(); if (data.suppliers) await db.suppliers.bulkAdd(data.suppliers);
            await db.diningTables.clear(); if (data.diningTables) await db.diningTables.bulkAdd(data.diningTables);
            await db.orders.clear(); if (data.orders) await db.orders.bulkAdd(data.orders);
            await db.shifts.clear(); if (data.shifts) await db.shifts.bulkAdd(data.shifts);
            await db.stockMovements.clear(); if (data.stockMovements) await db.stockMovements.bulkAdd(data.stockMovements);
            await db.promotions.clear(); if (data.promotions) await db.promotions.bulkAdd(data.promotions);
            await db.customers.clear(); if (data.customers) await db.customers.bulkAdd(data.customers);
          }
        );
        alert('นำเข้าสำเร็จ! กรุณารีโหลดหน้า');
        window.location.reload();
      } catch {
        alert('ไฟล์ไม่ถูกต้อง');
      }
    };
    input.click();
  }

  async function handleReset() {
    if (!confirm('ลบข้อมูลทั้งหมดแล้วเริ่มใหม่?\nข้อมูลจะหายถาวร!')) return;
    if (!confirm('ยืนยันอีกครั้ง? ข้อมูลทั้งหมดจะถูกลบ')) return;
    await db.delete();
    window.location.reload();
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button onClick={() => onChange(!value)} className="shrink-0">
        {value ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
      </button>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Settings }[] = [
    { key: 'store', label: 'ร้านค้า', icon: StoreIcon },
    { key: 'receipt', label: 'ใบเสร็จ', icon: FileText },
    { key: 'data', label: 'ข้อมูล', icon: Database },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5" /> ตั้งค่า</h1>
        <button onClick={handleSave} className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95',
          saved ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'
        )}>
          <Save className="w-4 h-4" /> {saved ? 'บันทึกแล้ว ✓' : 'บันทึก'}
        </button>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-xl mx-auto space-y-6">
          {tab === 'store' && (
            <>
              <section className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">ประเภทร้านค้า</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setBusinessType('restaurant')}
                    className={cn('flex items-center gap-3 p-3 rounded-xl border-2 transition-all', businessType === 'restaurant' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}>
                    <UtensilsCrossed className={cn('w-5 h-5', businessType === 'restaurant' ? 'text-orange-500' : 'text-gray-400')} />
                    <div className="text-left">
                      <span className="text-sm font-semibold block">ร้านอาหาร</span>
                      <span className="text-[10px] text-muted-foreground">โต๊ะ ครัว สูตร ค่าบริการ</span>
                    </div>
                  </button>
                  <button onClick={() => setBusinessType('retail')}
                    className={cn('flex items-center gap-3 p-3 rounded-xl border-2 transition-all', businessType === 'retail' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300')}>
                    <ShoppingCart className={cn('w-5 h-5', businessType === 'retail' ? 'text-green-500' : 'text-gray-400')} />
                    <div className="text-left">
                      <span className="text-sm font-semibold block">ร้านค้าปลีก</span>
                      <span className="text-[10px] text-muted-foreground">บาร์โค้ด สต๊อก หน้าร้าน/ขายส่ง</span>
                    </div>
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">ข้อมูลร้าน</h3>
                <div>
                  <label className="text-sm text-muted-foreground">ชื่อร้าน</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">ที่อยู่</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">โทรศัพท์</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">เลขประจำตัวผู้เสียภาษี</label>
                    <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">ภาษี & ค่าบริการ</h3>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">VAT (ภาษีมูลค่าเพิ่ม)</p>
                    <p className="text-xs text-muted-foreground">คำนวณ VAT ในบิล</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)}
                      className="w-16 border rounded px-2 py-1 text-sm text-center" />
                    <span className="text-sm">%</span>
                    <Toggle value={enableVat} onChange={setEnableVat} />
                  </div>
                </div>

                {enableVat && (
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">โหมด VAT</p>
                      <p className="text-xs text-muted-foreground">เลือกระหว่างบวกเพิ่ม หรือรวมในราคา</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setVatMode('add')} className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                        vatMode === 'add' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}>บวกเพิ่ม</button>
                      <button onClick={() => setVatMode('included')} className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                        vatMode === 'included' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}>รวมในราคา</button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">การปัดเศษ</p>
                    <p className="text-xs text-muted-foreground">ปัดยอดสุทธิให้เป็นบาทถ้วน (เหมาะร้านค้าปลีก)</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setRoundingMode('none')} className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      roundingMode === 'none' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>ไม่ปัด</button>
                    <button onClick={() => setRoundingMode('baht')} className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      roundingMode === 'baht' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}>บาทถ้วน</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Service Charge (ค่าบริการ)</p>
                    <p className="text-xs text-muted-foreground">เพิ่มค่าบริการในบิล</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={scRate} onChange={(e) => setScRate(e.target.value)}
                      className="w-16 border rounded px-2 py-1 text-sm text-center" />
                    <span className="text-sm">%</span>
                    <Toggle value={enableSc} onChange={setEnableSc} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">ระบบ</h3>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">แจ้งเตือนสต๊อกต่ำ</p>
                    <p className="text-xs text-muted-foreground">แสดง badge เมื่อวัตถุดิบใกล้หมด</p>
                  </div>
                  <Toggle value={lowStockAlert} onChange={setLowStockAlert} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">Auto Backup เมื่อปิดกะ</p>
                    <p className="text-xs text-muted-foreground">สำรองข้อมูลอัตโนมัติทุกครั้งที่ปิดกะ</p>
                  </div>
                  <Toggle value={autoBackup} onChange={setAutoBackup} />
                </div>
              </section>
            </>
          )}

          {tab === 'receipt' && (
            <section className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">ใบเสร็จ</h3>
              <div>
                <label className="text-sm text-muted-foreground">หัวใบเสร็จ</label>
                <textarea value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} rows={3}
                  placeholder="ชื่อร้าน, ที่อยู่, เบอร์โทร..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">ท้ายใบเสร็จ</label>
                <textarea value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} rows={2}
                  placeholder="ขอบคุณค่ะ / Thank you!"
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Receipt preview */}
              <div className="border rounded-xl p-4 bg-gray-50 font-mono text-xs leading-relaxed">
                <div className="text-center whitespace-pre-line">{receiptHeader || '(หัวใบเสร็จ)'}</div>
                <div className="border-t border-dashed my-2" />
                <div className="flex justify-between"><span>ข้าวผัดกระเพรา x1</span><span>60.00</span></div>
                <div className="flex justify-between"><span>ชาเย็น x2</span><span>70.00</span></div>
                <div className="border-t border-dashed my-2" />
                <div className="flex justify-between"><span>รวม</span><span>130.00</span></div>
                {enableVat && vatMode === 'add' && (
                  <div className="flex justify-between"><span>VAT {vatRate}%</span><span>{(130 * (parseFloat(vatRate) || 0) / 100).toFixed(2)}</span></div>
                )}
                {enableVat && vatMode === 'included' && (
                  <div className="flex justify-between"><span>VAT {vatRate}% (รวมแล้ว)</span><span>{(130 - 130 / (1 + (parseFloat(vatRate) || 0) / 100)).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-bold"><span>ยอดสุทธิ</span><span>{(() => {
                  const r = parseFloat(vatRate) || 0;
                  const totalRaw = enableVat && vatMode === 'add' ? 130 + 130 * (r / 100) : 130;
                  const total = roundingMode === 'baht' ? Math.round(totalRaw) : totalRaw;
                  return total.toFixed(roundingMode === 'baht' ? 0 : 2);
                })()}</span></div>
                <div className="border-t border-dashed my-2" />
                <div className="text-center whitespace-pre-line">{receiptFooter || '(ท้ายใบเสร็จ)'}</div>
              </div>
            </section>
          )}

          {tab === 'data' && (
            <section className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">จัดการข้อมูล</h3>

              <button onClick={handleExport}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98]">
                <Download className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <span className="font-semibold block">Export ข้อมูล (JSON)</span>
                  <span className="text-xs text-muted-foreground">ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ JSON</span>
                </div>
              </button>

              <button onClick={handleImport}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 hover:border-green-500 hover:bg-green-50 transition-all active:scale-[0.98]">
                <Upload className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <span className="font-semibold block">Import ข้อมูล (JSON)</span>
                  <span className="text-xs text-muted-foreground">นำเข้าข้อมูลจากไฟล์ backup — จะแทนที่ข้อมูลเดิม</span>
                </div>
              </button>

              <div className="border-t pt-4">
                <button onClick={handleReset}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 hover:border-red-500 hover:bg-red-50 transition-all active:scale-[0.98]">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div className="text-left">
                    <span className="font-semibold block text-red-600">รีเซ็ตข้อมูลทั้งหมด</span>
                    <span className="text-xs text-muted-foreground">ลบข้อมูลทั้งหมดแล้วเริ่มใหม่ด้วย demo data</span>
                  </div>
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">ข้อมูลจัดเก็บที่ไหน?</p>
                <p>ข้อมูลทั้งหมดเก็บใน IndexedDB บนเครื่องของคุณ (Local-first)</p>
                <p>เมื่อ export จะได้ไฟล์ JSON ที่สามารถ import กลับได้</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
