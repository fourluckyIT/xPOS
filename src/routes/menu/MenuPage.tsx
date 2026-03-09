import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId, formatCurrency, nowTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  UtensilsCrossed, Plus, Edit2, Trash2, Save, Search,
  ToggleLeft, ToggleRight, X, Palette,
} from 'lucide-react';
import type { Category, Product, ProductVariant, ProductModifier } from '@/types';

type Tab = 'products' | 'categories';

export default function MenuPage() {
  const store = useAppStore((s) => s.currentStore);
  const [tab, setTab] = useState<Tab>('products');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');

  // Product form
  const [showProdForm, setShowProdForm] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCat, setPCat] = useState('');
  const [pUnit, setPUnit] = useState('จาน');
  const [pBarcode, setPBarcode] = useState('');
  const [pActive, setPActive] = useState(true);
  const [pVariants, setPVariants] = useState<ProductVariant[]>([]);
  const [pModifiers, setPModifiers] = useState<ProductModifier[]>([]);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [cName, setCName] = useState('');
  const [cColor, setCColor] = useState('#3b82f6');

  useEffect(() => { loadData(); }, [store]);

  async function loadData() {
    if (!store) return;
    const cats = await db.categories.where('storeId').equals(store.id).sortBy('sortOrder');
    setCategories(cats);
    const prods = await db.products.where('storeId').equals(store.id).toArray();
    setProducts(prods);
  }

  // --- Product CRUD ---
  function openAddProd() {
    setEditingProd(null);
    setPName(''); setPPrice(''); setPCat(categories[0]?.id || ''); setPUnit('จาน');
    setPBarcode(''); setPActive(true); setPVariants([]); setPModifiers([]);
    setShowProdForm(true);
  }

  function openEditProd(p: Product) {
    setEditingProd(p);
    setPName(p.name); setPPrice(String(p.price)); setPCat(p.categoryId); setPUnit(p.unit);
    setPBarcode(p.barcode || ''); setPActive(p.isActive);
    setPVariants([...p.variants]); setPModifiers([...p.modifiers]);
    setShowProdForm(true);
  }

  async function saveProd() {
    if (!store || !pName.trim() || !pCat) return;
    const data = {
      name: pName, price: parseFloat(pPrice) || 0, categoryId: pCat,
      unit: pUnit, barcode: pBarcode || undefined, isActive: pActive,
      variants: pVariants, modifiers: pModifiers,
    };
    if (editingProd) {
      await db.products.update(editingProd.id, data);
    } else {
      await db.products.add({
        id: generateId(), storeId: store.id, ...data, createdAt: nowTimestamp(),
      } as Product);
    }
    setShowProdForm(false);
    loadData();
  }

  async function deleteProd(id: string) {
    if (!confirm('ลบเมนูนี้?')) return;
    await db.products.delete(id);
    loadData();
  }

  async function toggleProdActive(p: Product) {
    await db.products.update(p.id, { isActive: !p.isActive });
    loadData();
  }

  // --- Category CRUD ---
  function openAddCat() {
    setEditingCat(null); setCName(''); setCColor('#3b82f6');
    setShowCatForm(true);
  }

  function openEditCat(c: Category) {
    setEditingCat(c); setCName(c.name); setCColor(c.color);
    setShowCatForm(true);
  }

  async function saveCat() {
    if (!store || !cName.trim()) return;
    if (editingCat) {
      await db.categories.update(editingCat.id, { name: cName, color: cColor });
    } else {
      await db.categories.add({
        id: generateId(), storeId: store.id, name: cName,
        sortOrder: categories.length, color: cColor,
      });
    }
    setShowCatForm(false);
    loadData();
  }

  async function deleteCat(id: string) {
    const prodCount = products.filter((p) => p.categoryId === id).length;
    if (prodCount > 0) { alert(`หมวดนี้มี ${prodCount} เมนู — ลบเมนูก่อน`); return; }
    if (!confirm('ลบหมวดนี้?')) return;
    await db.categories.delete(id);
    loadData();
  }

  // --- Variant/Modifier helpers ---
  function addVariant() { setPVariants([...pVariants, { name: '', price: 0 }]); }
  function removeVariant(i: number) { setPVariants(pVariants.filter((_, idx) => idx !== i)); }
  function updateVariant(i: number, field: 'name' | 'price', val: string) {
    const copy = [...pVariants];
    if (field === 'name') copy[i] = { ...copy[i], name: val };
    else copy[i] = { ...copy[i], price: parseFloat(val) || 0 };
    setPVariants(copy);
  }

  function addModifier() { setPModifiers([...pModifiers, { name: '', price: 0 }]); }
  function removeModifier(i: number) { setPModifiers(pModifiers.filter((_, idx) => idx !== i)); }
  function updateModifier(i: number, field: 'name' | 'price', val: string) {
    const copy = [...pModifiers];
    if (field === 'name') copy[i] = { ...copy[i], name: val };
    else copy[i] = { ...copy[i], price: parseFloat(val) || 0 };
    setPModifiers(copy);
  }

  const filteredProds = products.filter((p) => {
    if (filterCat !== 'all' && p.categoryId !== filterCat) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e'];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><UtensilsCrossed className="w-5 h-5" /> จัดการเมนู</h1>
          <p className="text-sm text-muted-foreground">{products.length} เมนู • {categories.length} หมวด</p>
        </div>
        <div className="flex gap-2">
          {tab === 'products' && (
            <button onClick={openAddProd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95">
              <Plus className="w-4 h-4" /> เพิ่มเมนู
            </button>
          )}
          {tab === 'categories' && (
            <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95">
              <Plus className="w-4 h-4" /> เพิ่มหมวด
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b">
        <button onClick={() => setTab('products')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'products' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          เมนู ({products.length})
        </button>
        <button onClick={() => setTab('categories')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
          หมวด ({categories.length})
        </button>
        {tab === 'products' && (
          <>
            <div className="flex-1" />
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="all">ทุกหมวด</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="relative ml-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-40 pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'products' && (
          <div className="space-y-1">
            {filteredProds.map((p) => {
              const cat = catMap[p.categoryId];
              return (
                <div key={p.id} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm', !p.isActive ? 'opacity-50' : 'hover:bg-gray-50')}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: (cat?.color || '#eee') + '20' }}>
                    🍜
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {cat && <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>}
                      {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">ปิด</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.variants.length > 0 && `${p.variants.length} ตัวเลือก`}
                      {p.variants.length > 0 && p.modifiers.length > 0 && ' • '}
                      {p.modifiers.length > 0 && `${p.modifiers.length} เพิ่มเติม`}
                    </div>
                  </div>
                  <span className="font-bold text-primary shrink-0">฿{formatCurrency(p.price)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleProdActive(p)} className="p-1.5 rounded hover:bg-gray-200">
                      {p.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button onClick={() => openEditProd(p)} className="p-1.5 rounded hover:bg-gray-200"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteProd(p.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
            {filteredProds.length === 0 && <div className="text-center text-muted-foreground py-16">ไม่พบเมนู</div>}
          </div>
        )}

        {tab === 'categories' && (
          <div className="space-y-2">
            {categories.map((c) => {
              const count = products.filter((p) => p.categoryId === c.id).length;
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border">
                  <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: c.color }} />
                  <div className="flex-1">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{count} เมนู</span>
                  </div>
                  <button onClick={() => openEditCat(c)} className="p-1.5 rounded hover:bg-gray-100"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCat(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
            {categories.length === 0 && <div className="text-center text-muted-foreground py-16">ยังไม่มีหมวด</div>}
          </div>
        )}
      </div>

      {/* Product form modal */}
      {showProdForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowProdForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editingProd ? 'แก้ไขเมนู' : 'เพิ่มเมนู'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อเมนู</label>
                <input type="text" value={pName} onChange={(e) => setPName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">ราคา (฿)</label>
                  <input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">หน่วย</label>
                  <input type="text" value={pUnit} onChange={(e) => setPUnit(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">หมวด</label>
                  <select value={pCat} onChange={(e) => setPCat(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Barcode (ไม่บังคับ)</label>
                <input type="text" value={pBarcode} onChange={(e) => setPBarcode(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">ตัวเลือก (Variants)</label>
                  <button onClick={addVariant} className="text-xs text-primary hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" /> เพิ่ม</button>
                </div>
                {pVariants.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input type="text" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)}
                      placeholder="ชื่อ" className="flex-1 border rounded px-2 py-1 text-sm" />
                    <input type="number" value={v.price || ''} onChange={(e) => updateVariant(i, 'price', e.target.value)}
                      placeholder="+฿" className="w-20 border rounded px-2 py-1 text-sm" />
                    <button onClick={() => removeVariant(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Modifiers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">เพิ่มเติม (Modifiers)</label>
                  <button onClick={addModifier} className="text-xs text-primary hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" /> เพิ่ม</button>
                </div>
                {pModifiers.map((m, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <input type="text" value={m.name} onChange={(e) => updateModifier(i, 'name', e.target.value)}
                      placeholder="ชื่อ" className="flex-1 border rounded px-2 py-1 text-sm" />
                    <input type="number" value={m.price || ''} onChange={(e) => updateModifier(i, 'price', e.target.value)}
                      placeholder="+฿" className="w-20 border rounded px-2 py-1 text-sm" />
                    <button onClick={() => removeModifier(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">เปิดขาย</span>
                <button onClick={() => setPActive(!pActive)}>
                  {pActive ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowProdForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
              <button onClick={saveProd} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category form modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCatForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editingCat ? 'แก้ไขหมวด' : 'เพิ่มหมวด'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อหมวด</label>
                <input type="text" value={cName} onChange={(e) => setCName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1"><Palette className="w-3 h-3" /> สี</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {colors.map((c) => (
                    <button key={c} onClick={() => setCColor(c)}
                      className={cn('w-7 h-7 rounded-lg transition-all', cColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCatForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
              <button onClick={saveCat} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
