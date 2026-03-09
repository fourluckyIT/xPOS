import { useState } from 'react';
import { generateId, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, OrderItem, OrderItemModifier } from '@/types';

interface Props {
  product: Product;
  onClose: () => void;
}

export default function ModifierDialog({ product, onClose }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<number | null>(
    product.variants.length > 0 ? 0 : null
  );
  const [selectedMods, setSelectedMods] = useState<Set<number>>(new Set());
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const addItem = useAppStore((s) => s.addItem);

  const basePrice = selectedVariant !== null
    ? product.variants[selectedVariant].price || product.price
    : product.price;

  const modTotal = [...selectedMods].reduce(
    (sum, idx) => sum + product.modifiers[idx].price,
    0
  );
  const unitTotal = basePrice + modTotal;

  function toggleMod(idx: number) {
    setSelectedMods((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function handleAdd() {
    const mods: OrderItemModifier[] = [...selectedMods].map((idx) => ({
      name: product.modifiers[idx].name,
      price: product.modifiers[idx].price,
    }));

    const variantName = selectedVariant !== null ? product.variants[selectedVariant].name : '';

    const item: OrderItem = {
      id: generateId(),
      orderId: '',
      productId: product.id,
      productName: variantName ? `${product.name} (${variantName})` : product.name,
      qty,
      unitPrice: basePrice,
      modifiers: mods,
      note,
      voided: false,
      voidReason: '',
    };
    addItem(item);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{product.name}</h3>
            <p className="text-sm text-primary font-semibold">฿{formatCurrency(product.price)}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variants */}
        {product.variants.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">ตัวเลือก</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedVariant(i)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm border-2 transition-all',
                    selectedVariant === i
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {v.name}
                  {v.price > 0 && <span className="text-xs ml-1 opacity-70">+฿{v.price}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers */}
        {product.modifiers.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">เพิ่มเติม</p>
            <div className="space-y-1.5">
              {product.modifiers.map((m, i) => (
                <button
                  key={i}
                  onClick={() => toggleMod(i)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm transition-all',
                    selectedMods.has(i)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span>{m.name}</span>
                  <span className="text-primary font-medium">+฿{formatCurrency(m.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-1">หมายเหตุ</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ไม่ใส่ผัก, เผ็ดมาก..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Qty + Add */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg px-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1.5 hover:bg-gray-100 rounded">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="p-1.5 hover:bg-gray-100 rounded">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            เพิ่ม ฿{formatCurrency(unitTotal * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
