import type { OrderItem, StoreSettings } from '@/types';

export function calcSubtotal(items: OrderItem[]): number {
  return items
    .filter((i) => !i.voided)
    .reduce((sum, item) => {
      const modTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
      return sum + (item.unitPrice + modTotal) * item.qty;
    }, 0);
}

export function calcServiceCharge(subtotal: number, settings: StoreSettings): number {
  if (!settings.enableServiceCharge) return 0;
  return Math.round(subtotal * (settings.serviceChargeRate / 100) * 100) / 100;
}

export function calcVat(subtotalPlusSC: number, settings: StoreSettings): number {
  if (!settings.enableVat) return 0;
  return Math.round(subtotalPlusSC * (settings.vatRate / 100) * 100) / 100;
}

function roundTotal(total: number, settings: StoreSettings): number {
  if (settings.roundingMode === 'baht') return Math.round(total);
  return Math.round(total * 100) / 100;
}

export function calcDiscount(
  subtotal: number,
  discount: number,
  discountType: 'amount' | 'percent'
): number {
  if (discountType === 'percent') {
    return Math.round(subtotal * (discount / 100) * 100) / 100;
  }
  return discount;
}

export function calcTotal(
  items: OrderItem[],
  discount: number,
  discountType: 'amount' | 'percent',
  settings: StoreSettings
): { subtotal: number; discountAmount: number; serviceCharge: number; vat: number; total: number } {
  const subtotal = calcSubtotal(items);
  const discountAmount = calcDiscount(subtotal, discount, discountType);
  const afterDiscount = subtotal - discountAmount;
  const serviceCharge = calcServiceCharge(afterDiscount, settings);
  const basePlusSC = afterDiscount + serviceCharge;

  // VAT mode
  // - add: VAT is added on top
  // - included: VAT is already included in prices (sticker price = paid price)
  let vat = 0;
  let totalRaw = 0;
  if (!settings.enableVat) {
    vat = 0;
    totalRaw = basePlusSC;
  } else if (settings.vatMode === 'included') {
    const denom = 1 + (settings.vatRate / 100);
    const preVat = denom === 0 ? basePlusSC : basePlusSC / denom;
    vat = Math.round((basePlusSC - preVat) * 100) / 100;
    totalRaw = basePlusSC;
  } else {
    vat = calcVat(basePlusSC, settings);
    totalRaw = basePlusSC + vat;
  }

  const total = roundTotal(totalRaw, settings);
  const roundingDiff = Math.round((total - totalRaw) * 100) / 100;
  if (roundingDiff !== 0) {
    vat = Math.round((vat + roundingDiff) * 100) / 100;
  }
  return {
    subtotal,
    discountAmount,
    serviceCharge,
    vat,
    total,
  };
}
