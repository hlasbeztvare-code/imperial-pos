import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, Discount, AuditEntry, CartTotals, SharedState } from '@/types';
import { defaultSharedState } from '@/data/defaults';

/* ============================================================
   HELPERS
   ============================================================ */
export const fmtCZK = (n: number): string => {
  const v = (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0Kč';
};

export const fmtCZKShort = (n: number): string => {
  const v = Math.round(n).toString();
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0Kč';
};

export const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function nowStamp(): string {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function shortStamp(): string {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function computeCartTotal(cart: CartLine[], disc?: Discount | null): CartTotals {
  let sub = 0, base12 = 0, base21 = 0;
  cart.forEach(l => {
    const lt = l.unitPrice * l.qty;
    sub += lt;
    if (l.vat === 12) base12 += lt;
    else if (l.vat === 21) base21 += lt;
  });
  let discAmount = 0;
  if (disc) {
    if (disc.mode === '%') discAmount = sub * (disc.value / 100);
    else discAmount = Math.min(disc.value, sub);
  }
  const grand = Math.max(0, sub - discAmount);
  const ratio = sub > 0 ? grand / sub : 0;
  const grand12 = base12 * ratio;
  const grand21 = base21 * ratio;
  const vat12 = grand12 * 12 / 112;
  const vat21 = grand21 * 21 / 121;
  return { sub, discAmount, grand, vat12, vat21, grand12, grand21 };
}

/* ============================================================
   POS STORE (Zustand — local device state)
   ============================================================ */
interface PosState {
  // Cart
  carts: Record<string, CartLine[]>;
  discounts: Record<string, Discount>;
  activeTable: string | null;

  // UI
  edit: boolean;
  snap: boolean;
  theme: 'dark' | 'light';
  brightness: number;
  activeCat: string;
  activePanel: 'floor' | 'menu' | 'orders';

  // Session
  receiptSeq: number;
  todayRevenue: number;
  ordersDone: number;
  audit: AuditEntry[];

  // Connection
  displayConnected: boolean;
  nfcConnected: boolean;

  // Toast
  toast: { msg: string; kind: 'ok' | 'err' | '' } | null;

  // Actions
  setActiveTable: (id: string | null) => void;
  setEdit: (on: boolean) => void;
  setSnap: (on: boolean) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setBrightness: (v: number) => void;
  setActiveCat: (id: string) => void;
  setActivePanel: (p: 'floor' | 'menu' | 'orders') => void;
  addToCart: (tid: string, line: CartLine) => void;
  updateLineQty: (tid: string, lineId: string, delta: number) => void;
  removeLine: (tid: string, lineId: string) => void;
  clearCart: (tid: string) => void;
  setDiscount: (tid: string, disc: Discount | null) => void;
  completePayment: (tid: string, amount: number) => void;
  addAudit: (action: string, details?: string) => void;
  showToast: (msg: string, kind?: 'ok' | 'err' | '') => void;
  resetDay: () => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      carts: {},
      discounts: {},
      activeTable: null,
      edit: false,
      snap: true,
      theme: 'dark',
      brightness: 100,
      activeCat: 'all',
      activePanel: 'floor',
      receiptSeq: 9,
      todayRevenue: 0,
      ordersDone: 0,
      audit: [],
      displayConnected: false,
      nfcConnected: false,
      toast: null,

      setActiveTable: (id) => set({ activeTable: id }),
      setEdit: (on) => set({ edit: on }),
      setSnap: (on) => set({ snap: on }),
      setTheme: (t) => {
        document.documentElement.setAttribute('data-theme', t);
        set({ theme: t });
      },
      setBrightness: (v) => {
        document.body.style.filter = `brightness(${v / 100})`;
        set({ brightness: v });
      },
      setActiveCat: (id) => set({ activeCat: id }),
      setActivePanel: (p) => set({ activePanel: p }),

      addToCart: (tid, line) => set(s => ({
        carts: {
          ...s.carts,
          [tid]: [...(s.carts[tid] || []), line],
        },
      })),

      updateLineQty: (tid, lineId, delta) => set(s => {
        const cart = (s.carts[tid] || []).map(l => {
          if (l.lineId !== lineId) return l;
          return { ...l, qty: Math.max(0, l.qty + delta) };
        }).filter(l => l.qty > 0);
        return { carts: { ...s.carts, [tid]: cart } };
      }),

      removeLine: (tid, lineId) => set(s => ({
        carts: {
          ...s.carts,
          [tid]: (s.carts[tid] || []).filter(l => l.lineId !== lineId),
        },
      })),

      clearCart: (tid) => set(s => {
        const { [tid]: _, ...rest } = s.carts;
        const { [tid]: _d, ...restD } = s.discounts;
        return { carts: rest, discounts: restD };
      }),

      setDiscount: (tid, disc) => set(s => {
        if (!disc) {
          const { [tid]: _, ...rest } = s.discounts;
          return { discounts: rest };
        }
        return { discounts: { ...s.discounts, [tid]: disc } };
      }),

      completePayment: (tid, amount) => set(s => {
        const { [tid]: _, ...restC } = s.carts;
        const { [tid]: _d, ...restD } = s.discounts;
        return {
          carts: restC,
          discounts: restD,
          receiptSeq: s.receiptSeq + 1,
          todayRevenue: s.todayRevenue + amount,
          ordersDone: s.ordersDone + 1,
        };
      }),

      addAudit: (action, details = '') => set(s => {
        const entry: AuditEntry = { t: nowStamp(), a: action, d: details };
        const audit = [...s.audit, entry].slice(-500);
        return { audit };
      }),

      showToast: (msg, kind = '') => {
        set({ toast: { msg, kind } });
        setTimeout(() => set({ toast: null }), 2200);
      },

      resetDay: () => set({ todayRevenue: 0, ordersDone: 0, receiptSeq: 9 }),
    }),
    {
      name: 'osman_pos_state_v3',
      partialize: (s) => ({
        carts: s.carts,
        discounts: s.discounts,
        receiptSeq: s.receiptSeq,
        todayRevenue: s.todayRevenue,
        ordersDone: s.ordersDone,
        audit: s.audit.slice(-200),
        theme: s.theme,
        brightness: s.brightness,
        snap: s.snap,
      }),
    },
  ),
);

/* ============================================================
   SHARED STORE (Zustand — synced to Firebase)
   ============================================================ */
interface SharedStore {
  shared: SharedState;
  setShared: (s: SharedState) => void;
  updateShared: (partial: Partial<SharedState>) => void;
  updateProduct: (id: string, data: Partial<import('@/types').Product>) => void;
  addProduct: (p: import('@/types').Product) => void;
  deleteProduct: (id: string) => void;
  updateTable: (id: string, data: Partial<import('@/types').TableConfig>) => void;
  addTable: (t: import('@/types').TableConfig) => void;
  deleteTable: (id: string) => void;
  setPendingPayment: (p: SharedState['pendingPayment']) => void;
  clearPendingPayment: () => void;
}

export const useSharedStore = create<SharedStore>()(
  persist(
    (set) => ({
      shared: defaultSharedState(),

      setShared: (s) => set({ shared: s }),

      updateShared: (partial) => set(state => ({
        shared: { ...state.shared, ...partial },
      })),

      updateProduct: (id, data) => set(state => ({
        shared: {
          ...state.shared,
          catalog: state.shared.catalog.map(p => p.id === id ? { ...p, ...data } : p),
        },
      })),

      addProduct: (p) => set(state => ({
        shared: {
          ...state.shared,
          catalog: [...state.shared.catalog, p],
        },
      })),

      deleteProduct: (id) => set(state => ({
        shared: {
          ...state.shared,
          catalog: state.shared.catalog.filter(p => p.id !== id),
        },
      })),

      updateTable: (id, data) => set(state => ({
        shared: {
          ...state.shared,
          tables: state.shared.tables.map(t => t.id === id ? { ...t, ...data } : t),
        },
      })),

      addTable: (t) => set(state => ({
        shared: {
          ...state.shared,
          tables: [...state.shared.tables, t],
        },
      })),

      deleteTable: (id) => set(state => ({
        shared: {
          ...state.shared,
          tables: state.shared.tables.filter(t => t.id !== id),
        },
      })),

      setPendingPayment: (p) => set(state => ({ shared: { ...state.shared, pendingPayment: p } })),
      clearPendingPayment: () => set(state => ({ shared: { ...state.shared, pendingPayment: null } })),
    }),
    {
      name: 'osman_shared_v3',
    },
  ),
);
