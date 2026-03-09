import { create } from 'zustand';
import type { User, Store, Order, OrderItem, Shift } from '@/types';

interface AppState {
  // Auth
  currentStore: Store | null;
  currentUser: User | null;
  isAuthenticated: boolean;

  // Active shift
  activeShift: Shift | null;

  // Current order being built
  currentOrder: Partial<Order> & { items: OrderItem[] };

  // Actions
  setStore: (store: Store | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setActiveShift: (shift: Shift | null) => void;

  // Order actions
  addItem: (item: OrderItem) => void;
  removeItem: (itemId: string) => void;
  updateItemQty: (itemId: string, qty: number) => void;
  clearOrder: () => void;
  setOrderTable: (tableId: string, tableName: string) => void;
  setOrderType: (type: Order['type']) => void;
  setOrderDiscount: (discount: number, discountType: Order['discountType']) => void;
  setOrderNote: (note: string) => void;
}

const emptyOrder: Partial<Order> & { items: OrderItem[] } = {
  items: [],
  type: 'dine_in',
  discount: 0,
  discountType: 'amount',
  note: '',
};

export const useAppStore = create<AppState>((set) => ({
  currentStore: null,
  currentUser: null,
  isAuthenticated: false,
  activeShift: null,
  currentOrder: { ...emptyOrder },

  setStore: (store) => set({ currentStore: store }),
  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  logout: () => set({ currentUser: null, isAuthenticated: false, currentOrder: { ...emptyOrder } }),
  setActiveShift: (shift) => set({ activeShift: shift }),

  addItem: (item) =>
    set((state) => {
      const existing = state.currentOrder.items.find(
        (i) => i.productId === item.productId &&
               JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers) &&
               i.note === item.note
      );
      if (existing) {
        return {
          currentOrder: {
            ...state.currentOrder,
            items: state.currentOrder.items.map((i) =>
              i.id === existing.id ? { ...i, qty: i.qty + item.qty } : i
            ),
          },
        };
      }
      return {
        currentOrder: {
          ...state.currentOrder,
          items: [...state.currentOrder.items, item],
        },
      };
    }),

  removeItem: (itemId) =>
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        items: state.currentOrder.items.filter((i) => i.id !== itemId),
      },
    })),

  updateItemQty: (itemId, qty) =>
    set((state) => ({
      currentOrder: {
        ...state.currentOrder,
        items: qty <= 0
          ? state.currentOrder.items.filter((i) => i.id !== itemId)
          : state.currentOrder.items.map((i) => (i.id === itemId ? { ...i, qty } : i)),
      },
    })),

  clearOrder: () => set({ currentOrder: { ...emptyOrder } }),

  setOrderTable: (tableId, tableName) =>
    set((state) => ({
      currentOrder: { ...state.currentOrder, tableId, tableName },
    })),

  setOrderType: (type) =>
    set((state) => ({
      currentOrder: { ...state.currentOrder, type },
    })),

  setOrderDiscount: (discount, discountType) =>
    set((state) => ({
      currentOrder: { ...state.currentOrder, discount, discountType },
    })),

  setOrderNote: (note) =>
    set((state) => ({
      currentOrder: { ...state.currentOrder, note },
    })),
}));
