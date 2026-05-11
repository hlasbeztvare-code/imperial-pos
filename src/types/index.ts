/* ============================================================
   IMPERIAL POS TYPES — Shared across all 3 tiers
   ============================================================ */

// ---- Product & Catalog ----

export interface Variation {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  cat: string;
  vat: number;
  color: string;
  icon: string;
  variations: Variation[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

// ---- Tables / Floor ----

export type TableShape = 'square' | 'round';

export interface TableConfig {
  id: string;
  num: string;
  label: string;
  shape: TableShape;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---- Cart ----

export interface CartLine {
  lineId: string;
  prodId: string;
  varId: string;
  qty: number;
  note: string;
  unitPrice: number;
  vat: number;
  name: string;
  varName: string;
  addedAt: number;
}

export interface Discount {
  kind: 'staff' | 'cust';
  mode: '%' | 'abs';
  value: number;
}

export interface CartTotals {
  sub: number;
  discAmount: number;
  grand: number;
  vat12: number;
  vat21: number;
  grand12: number;
  grand21: number;
}

// ---- Payment ----

export type PayMethod = 'nfc' | 'qr' | 'cash';
export type OrderMode = 'dine_in' | 'takeaway';

export interface PaymentConfig {
  nfcEnabled: boolean;
  qrEnabled: boolean;
  cashEnabled: boolean;
  nfcMobileUrl: string;
  fioEnabled: boolean;
  fioToken: string;
  sumupAffiliateKey: string;
}

export interface PaymentContext {
  tid: string;
  totals: CartTotals;
  method: PayMethod;
  received: number;
  mode: OrderMode;
  tipAmount: number;
}

// ---- Business ----

export interface BusinessInfo {
  name: string;
  legal: string;
  address: string;
  ico: string;
  pos: string;
  user: string;
}

// ---- Receipt ----

export interface ReceiptData {
  seqStr: string;
  cart: CartLine[];
  disc: Discount | null;
  totals: CartTotals;
  method: PayMethod | 'preview';
  received: number;
  change: number;
  mode: OrderMode;
  targetLabel: string;
  when: string;
  txData?: { txid?: string; manual?: boolean } | null;
}

// ---- Audit ----

export interface AuditEntry {
  t: string;
  a: string;
  d: string;
}

// ---- Shared State (synced via Firebase) ----

export interface SharedState {
  catalog: Product[];
  categories: Category[];
  tables: TableConfig[];
  photos: Record<string, string>;
  catPhotos: Record<string, string>;
  logo: string | null;
  slideshow: string[];
  welcomeMsg: string;
  thanksMsg: string;
  showCustomerPrices: boolean;
  business: BusinessInfo;
  iban: string;
  pinCode: string;
  pay: PaymentConfig;
  schemaVersion: number;
  // Payment terminal sync (Firebase → Android phone)
  pendingPayment: {
    id: string;
    amount: number;
    tableLabel: string;
    method: 'nfc' | 'qr';
    affiliateKey: string;
    createdAt: number;
  } | null;
}

// ---- Local POS State ----

export interface LocalState {
  carts: Record<string, CartLine[]>;
  discounts: Record<string, Discount>;
  activeTable: string | null;
  edit: boolean;
  snap: boolean;
  receiptSeq: number;
  todayRevenue: number;
  ordersDone: number;
  audit: AuditEntry[];
  theme: 'dark' | 'light';
  brightness: number;
  displayConnected: boolean;
  nfcConnected: boolean;
}

// ---- Auth ----

export interface AuthUser {
  email: string;
  displayName: string;
  idToken: string;
  photoUrl?: string;
}

// ---- Hardware Bridge (APK) ----

export interface AndroidBridge {
  print(html: string): void;
  openDrawer(): void;
  isAvailable(): boolean;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridge;
    LCodeNative?: any;
    LCodeHardware?: any;
    LCodeAuth?: any;
  }
}

