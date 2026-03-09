import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { useAppStore } from '@/store/app-store';
import { generateId, formatCurrency, nowTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  ArrowUpDown, Save, TrendingDown, TrendingUp, RotateCcw, Link2,
} from 'lucide-react';
import type { Ingredient, StockMovement, Recipe, Product } from '@/types';

type Tab = 'ingredients' | 'recipes' | 'adjustments' | 'alerts';

export default function InventoryPage() {
  const store = useAppStore((s) => s.currentStore);
  const [tab, setTab] = useState<Tab>('ingredients');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAdjust, setShowAdjust] = useState<Ingredient | null>(null);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formCost, setFormCost] = useState('0');
  const [formStock, setFormStock] = useState('0');
  const [formThreshold, setFormThreshold] = useState('5');

  // Adjust state
  const [adjQty, setAdjQty] = useState('');
  const [adjType, setAdjType] = useState<'purchase' | 'adjust' | 'waste'>('purchase');
  const [adjNote, setAdjNote] = useState('');

  // Recipe form
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState('');
  const [recipeIngredient, setRecipeIngredient] = useState('');
  const [recipeQty, setRecipeQty] = useState('');
  const [recipeUnit, setRecipeUnit] = useState('');

  useEffect(() => { loadData(); }, [store]);

  async function loadData() {
    if (!store) return;
    const items = await db.ingredients.where('storeId').equals(store.id).toArray();
    setIngredients(items);
    const mvs = await db.stockMovements.where('storeId').equals(store.id).toArray();
    setMovements(mvs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100));
    const recs = await db.recipes.toArray();
    setRecipes(recs);
    const prods = await db.products.where('storeId').equals(store.id).toArray();
    setProducts(prods);
  }

  function openAdd() {
    setEditing(null);
    setFormName(''); setFormUnit('หน่วย'); setFormCost('0'); setFormStock('0'); setFormThreshold('5');
    setShowForm(true);
  }

  function openEdit(ing: Ingredient) {
    setEditing(ing);
    setFormName(ing.name); setFormUnit(ing.unit); setFormCost(String(ing.costPerUnit));
    setFormStock(String(ing.currentStock)); setFormThreshold(String(ing.lowStockThreshold));
    setShowForm(true);
  }

  async function handleSave() {
    if (!store || !formName.trim()) return;
    if (editing) {
      await db.ingredients.update(editing.id, {
        name: formName, unit: formUnit, costPerUnit: parseFloat(formCost) || 0,
        currentStock: parseFloat(formStock) || 0, lowStockThreshold: parseFloat(formThreshold) || 0,
      });
    } else {
      await db.ingredients.add({
        id: generateId(), storeId: store.id, name: formName, unit: formUnit,
        costPerUnit: parseFloat(formCost) || 0, currentStock: parseFloat(formStock) || 0,
        lowStockThreshold: parseFloat(formThreshold) || 0,
      });
    }
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบวัตถุดิบนี้?')) return;
    await db.ingredients.delete(id);
    loadData();
  }

  async function handleAdjust() {
    if (!showAdjust || !store) return;
    const qty = parseFloat(adjQty) || 0;
    if (qty === 0) return;
    const delta = adjType === 'waste' ? -Math.abs(qty) : Math.abs(qty);
    await db.ingredients.update(showAdjust.id, {
      currentStock: Math.max(0, showAdjust.currentStock + delta),
    });
    await db.stockMovements.add({
      id: generateId(), storeId: store.id, ingredientId: showAdjust.id,
      type: adjType, qty: delta, ref: adjNote, createdAt: nowTimestamp(),
    });
    setShowAdjust(null); setAdjQty(''); setAdjNote('');
    loadData();
  }

  const filtered = ingredients.filter((i) =>
    !search.trim() || i.name.toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = ingredients.filter((i) => i.currentStock <= i.lowStockThreshold);
  const totalValue = ingredients.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0);

  // Recipe CRUD
  function openRecipeAdd() {
    setRecipeProduct(products[0]?.id || '');
    setRecipeIngredient(ingredients[0]?.id || '');
    setRecipeQty('1');
    setRecipeUnit(ingredients[0]?.unit || '');
    setShowRecipeForm(true);
  }

  async function saveRecipe() {
    if (!recipeProduct || !recipeIngredient || !recipeQty) return;
    await db.recipes.add({
      id: generateId(),
      productId: recipeProduct,
      ingredientId: recipeIngredient,
      qty: parseFloat(recipeQty) || 0,
      unit: recipeUnit,
    });
    setShowRecipeForm(false);
    loadData();
  }

  async function deleteRecipe(id: string) {
    if (!confirm('ลบสูตรนี้?')) return;
    await db.recipes.delete(id);
    loadData();
  }

  const ingMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));
  const prodMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // Group recipes by product
  const recipesByProduct: Record<string, Recipe[]> = {};
  for (const r of recipes) {
    if (!recipesByProduct[r.productId]) recipesByProduct[r.productId] = [];
    recipesByProduct[r.productId].push(r);
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'ingredients', label: 'วัตถุดิบ' },
    { key: 'recipes', label: 'สูตร', count: recipes.length },
    { key: 'adjustments', label: 'ประวัติ' },
    { key: 'alerts', label: 'ใกล้หมด', count: lowStock.length },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5" /> จัดการสต๊อก</h1>
          <p className="text-sm text-muted-foreground">{ingredients.length} รายการ • มูลค่ารวม ฿{formatCurrency(totalValue)}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95">
          <Plus className="w-4 h-4" /> เพิ่มวัตถุดิบ
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="ค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-48 pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'ingredients' && (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_100px_100px_80px_100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
              <span>ชื่อ</span><span>หน่วย</span><span className="text-right">คงเหลือ</span>
              <span className="text-right">ต้นทุน/หน่วย</span><span className="text-right">มูลค่า</span><span></span>
            </div>
            {filtered.map((ing) => {
              const isLow = ing.currentStock <= ing.lowStockThreshold;
              return (
                <div key={ing.id} className={cn('grid grid-cols-[1fr_80px_100px_100px_80px_100px] gap-2 px-3 py-2.5 rounded-lg items-center text-sm', isLow ? 'bg-red-50' : 'hover:bg-gray-50')}>
                  <div className="flex items-center gap-2">
                    {isLow && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    <span className="font-medium truncate">{ing.name}</span>
                  </div>
                  <span className="text-muted-foreground">{ing.unit}</span>
                  <span className={cn('text-right font-semibold', isLow ? 'text-red-600' : '')}>{ing.currentStock}</span>
                  <span className="text-right">฿{formatCurrency(ing.costPerUnit)}</span>
                  <span className="text-right text-muted-foreground">฿{formatCurrency(ing.currentStock * ing.costPerUnit)}</span>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => { setShowAdjust(ing); setAdjType('purchase'); setAdjQty(''); setAdjNote(''); }}
                      className="p-1.5 rounded hover:bg-gray-200" title="ปรับสต๊อก"><ArrowUpDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEdit(ing)} className="p-1.5 rounded hover:bg-gray-200" title="แก้ไข"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(ing.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500" title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="text-center text-muted-foreground py-16">ยังไม่มีวัตถุดิบ</div>}
          </div>
        )}

        {tab === 'recipes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">กำหนดวัตถุดิบที่ใช้ในแต่ละเมนู — ระบบจะหักสต๊อกอัตโนมัติเมื่อขาย</p>
              <button onClick={openRecipeAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-95">
                <Plus className="w-3.5 h-3.5" /> เพิ่มสูตร
              </button>
            </div>
            {Object.keys(recipesByProduct).length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>ยังไม่มีสูตร</p>
                <p className="text-xs mt-1">เพิ่มสูตรเพื่อเชื่อมเมนูกับวัตถุดิบ</p>
              </div>
            ) : (
              Object.entries(recipesByProduct).map(([productId, recs]) => {
                const prod = prodMap[productId];
                return (
                  <div key={productId} className="bg-card border rounded-xl p-3">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      🍜 {prod?.name || 'ไม่พบเมนู'}
                    </h4>
                    <div className="space-y-1">
                      {recs.map((r) => {
                        const ing = ingMap[r.ingredientId];
                        return (
                          <div key={r.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-gray-50">
                            <span>{ing?.name || '?'}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{r.qty} {r.unit || ing?.unit}</span>
                              <button onClick={() => deleteRecipe(r.id)} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'adjustments' && (
          <div className="space-y-1">
            {movements.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">ยังไม่มีประวัติ</div>
            ) : movements.map((mv) => {
              const ing = ingredients.find((i) => i.id === mv.ingredientId);
              const icon = mv.type === 'purchase' ? TrendingUp : mv.type === 'waste' ? TrendingDown : RotateCcw;
              const Icon = icon;
              const color = mv.qty > 0 ? 'text-green-600' : 'text-red-600';
              return (
                <div key={mv.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
                  <Icon className={cn('w-4 h-4 shrink-0', color)} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{ing?.name || 'ไม่ทราบ'}</span>
                    {mv.ref && <span className="text-muted-foreground ml-2 text-xs">— {mv.ref}</span>}
                  </div>
                  <span className={cn('font-semibold', color)}>{mv.qty > 0 ? '+' : ''}{mv.qty} {ing?.unit}</span>
                  <span className="text-xs text-muted-foreground w-32 text-right">{new Date(mv.createdAt).toLocaleString('th-TH')}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="space-y-2">
            {lowStock.length === 0 ? (
              <div className="text-center text-green-600 py-16">สต๊อกปกติทั้งหมด ✅</div>
            ) : lowStock.map((ing) => (
              <div key={ing.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{ing.name}</p>
                  <p className="text-sm text-red-600">เหลือ {ing.currentStock} {ing.unit} (ขั้นต่ำ {ing.lowStockThreshold})</p>
                </div>
                <button onClick={() => { setShowAdjust(ing); setAdjType('purchase'); setAdjQty(''); setAdjNote(''); }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 active:scale-95">
                  เติมสต๊อก
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">ชื่อ</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">หน่วย</label>
                  <input type="text" value={formUnit} onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">ต้นทุน/หน่วย (฿)</label>
                  <input type="number" value={formCost} onChange={(e) => setFormCost(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">จำนวนปัจจุบัน</label>
                  <input type="number" value={formStock} onChange={(e) => setFormStock(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">แจ้งเตือนเมื่อเหลือ</label>
                  <input type="number" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
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

      {/* Recipe form modal */}
      {showRecipeForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRecipeForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">เพิ่มสูตร (Recipe)</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">เมนู</label>
                <select value={recipeProduct} onChange={(e) => setRecipeProduct(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">วัตถุดิบ</label>
                <select value={recipeIngredient} onChange={(e) => {
                  setRecipeIngredient(e.target.value);
                  const ing = ingredients.find((i) => i.id === e.target.value);
                  if (ing) setRecipeUnit(ing.unit);
                }}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">จำนวนที่ใช้</label>
                  <input type="number" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)}
                    placeholder="1" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">หน่วย</label>
                  <input type="text" value={recipeUnit} onChange={(e) => setRecipeUnit(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowRecipeForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
              <button onClick={saveRecipe} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1">
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock adjustment modal */}
      {showAdjust && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdjust(null)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">ปรับสต๊อก</h3>
            <p className="text-sm text-muted-foreground mb-4">{showAdjust.name} — เหลือ {showAdjust.currentStock} {showAdjust.unit}</p>
            <div className="flex gap-1 mb-3">
              {([['purchase', 'ซื้อเข้า', 'bg-green-100 text-green-700'], ['adjust', 'ปรับ', 'bg-blue-100 text-blue-700'], ['waste', 'เสียหาย', 'bg-red-100 text-red-700']] as const).map(([t, l, c]) => (
                <button key={t} onClick={() => setAdjType(t)} className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-all', adjType === t ? c : 'bg-gray-100 text-gray-500')}>
                  {l}
                </button>
              ))}
            </div>
            <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder="จำนวน"
              className="w-full border rounded-lg px-3 py-2 text-lg text-center font-bold mb-2 focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
            <input type="text" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={handleAdjust} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98]">ยืนยัน</button>
            <button onClick={() => setShowAdjust(null)} className="w-full mt-2 py-2 text-sm text-muted-foreground">ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}
