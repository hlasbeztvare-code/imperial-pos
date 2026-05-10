import type { Product, Category, TableConfig, BusinessInfo, SharedState } from '@/types';

/* ===== BUSINESS DEFAULTS ===== */
export const DEFAULT_BUSINESS: BusinessInfo = {
  name: 'CHEF OSMAN // CRISPY SHAWARMA',
  legal: 'European United Groupb s.r.o.',
  address: 'Náchodská 708/79, Praha, 19300',
  ico: '02633698',
  pos: 'POS 1',
  user: 'Majitel',
};

/* ===== CATEGORIES ===== */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all',   name: 'Vše',            icon: '🍽' },
  { id: 'main',  name: 'Hlavní jídla',   icon: '🌯' },
  { id: 'cold',  name: 'Studené nápoje', icon: '🥤' },
  { id: 'hot',   name: 'Teplé nápoje',   icon: '☕' },
  { id: 'water', name: 'Voda',           icon: '💧' },
];

/* ===== CATALOG (real Loyverse Chef Osman data) ===== */
export const DEFAULT_CATALOG: Product[] = [
  {
    id: 'crispy-shawarma', sku: '10000', name: 'Crispy Shawarma', cat: 'main', vat: 12, color: '#c97a2b', icon: '🌯',
    variations: [
      { id: 'v1', name: 'Velký kuřecí',  price: 155 },
      { id: 'v2', name: 'Velký hovězí',  price: 175 },
      { id: 'v3', name: 'Malý kuřecí',   price: 155 },
      { id: 'v4', name: 'Malý hovězí',   price: 175 },
      { id: 'v5', name: 'Talíř kuřecí',  price: 219 },
      { id: 'v6', name: 'Talíř hovězí',  price: 239 },
      { id: 'v7', name: 'Combo kuřecí',  price: 219 },
      { id: 'v8', name: 'Combo hovězí',  price: 239 },
    ],
  },
  {
    id: 'grilovane-kure', sku: '10001', name: 'Grilované kuře', cat: 'main', vat: 12, color: '#d49340', icon: '🍗',
    variations: [
      { id: 'v1', name: 'Malé',       price: 165 },
      { id: 'v2', name: 'Velké',      price: 199 },
      { id: 'v3', name: 'Talíř',      price: 229 },
      { id: 'v4', name: 'Combo menu', price: 249 },
    ],
  },
  {
    id: 'grilovane-maso', sku: '10002', name: 'Grilované maso', cat: 'main', vat: 12, color: '#a85a1f', icon: '🥩',
    variations: [
      { id: 'v1', name: 'Malé',       price: 185 },
      { id: 'v2', name: 'Velké',      price: 219 },
      { id: 'v3', name: 'Talíř',      price: 249 },
      { id: 'v4', name: 'Combo menu', price: 269 },
    ],
  },
  {
    id: 'mega-pizza', sku: '10003', name: 'Naše Mega Pizza', cat: 'main', vat: 12, color: '#cc4a2a', icon: '🍕',
    variations: [
      { id: 'v1', name: 'Malá 30cm',  price: 189 },
      { id: 'v2', name: 'Velká 40cm', price: 259 },
      { id: 'v3', name: 'Mega 50cm',  price: 329 },
    ],
  },
  {
    id: 'falafel', sku: '10004', name: 'Falafel', cat: 'main', vat: 12, color: '#7a8a3a', icon: '🧆',
    variations: [
      { id: 'v1', name: 'Malý',       price: 135 },
      { id: 'v2', name: 'Velký',      price: 165 },
      { id: 'v3', name: 'Talíř',      price: 189 },
      { id: 'v4', name: 'Combo menu', price: 209 },
    ],
  },
  {
    id: 'haloumi', sku: '10005', name: 'Haloumi', cat: 'main', vat: 12, color: '#d4b265', icon: '🧀',
    variations: [
      { id: 'v1', name: 'Malý',       price: 155 },
      { id: 'v2', name: 'Velký',      price: 189 },
      { id: 'v3', name: 'Talíř',      price: 219 },
      { id: 'v4', name: 'Combo menu', price: 239 },
    ],
  },
  {
    id: 'salaty', sku: '10006', name: 'Saláty', cat: 'main', vat: 12, color: '#5a8a3a', icon: '🥗',
    variations: [
      { id: 'v1', name: 'Tabbouleh',      price: 99 },
      { id: 'v2', name: 'Fattoush',       price: 109 },
      { id: 'v3', name: 'Šopský',         price: 99 },
      { id: 'v4', name: 'Caesar kuřecí',  price: 159 },
    ],
  },
  {
    id: 'mezze', sku: '10007', name: 'Mezze', cat: 'main', vat: 12, color: '#8a6a3a', icon: '🫓',
    variations: [
      { id: 'v1', name: 'Hummus',         price: 89 },
      { id: 'v2', name: 'Baba Ghanoush',  price: 99 },
      { id: 'v3', name: 'Mezze talíř',    price: 189 },
      { id: 'v4', name: 'Mezze velký',    price: 259 },
    ],
  },
  {
    id: 'raketova', sku: '10008', name: 'Raketová Shawarma 50cm', cat: 'main', vat: 12, color: '#c93a2a', icon: '🚀',
    variations: [
      { id: 'v1', name: 'Kuřecí',      price: 289 },
      { id: 'v2', name: 'Hovězí',      price: 319 },
      { id: 'v3', name: 'Mix kuř+hov', price: 339 },
      { id: 'v4', name: 'Combo menu',  price: 359 },
    ],
  },
  {
    id: 'coca', sku: '10009', name: 'Coca-Cola', cat: 'cold', vat: 21, color: '#c1272d', icon: '🥤',
    variations: [
      { id: 'v1', name: '0,33 L plech', price: 45 },
      { id: 'v2', name: '0,5 L PET',    price: 55 },
      { id: 'v3', name: '1,5 L PET',    price: 89 },
    ],
  },
  {
    id: 'fanta', sku: '10010', name: 'Fanta', cat: 'cold', vat: 21, color: '#f4801f', icon: '🥤',
    variations: [
      { id: 'v1', name: '0,33 L plech', price: 45 },
      { id: 'v2', name: '0,5 L PET',    price: 55 },
      { id: 'v3', name: '1,5 L PET',    price: 89 },
    ],
  },
  {
    id: 'sprite', sku: '10011', name: 'Sprite', cat: 'cold', vat: 21, color: '#3aaa3a', icon: '🥤',
    variations: [
      { id: 'v1', name: '0,33 L plech', price: 45 },
      { id: 'v2', name: '0,5 L PET',    price: 55 },
      { id: 'v3', name: '1,5 L PET',    price: 89 },
    ],
  },
  {
    id: 'kava', sku: '10012', name: 'Káva', cat: 'hot', vat: 12, color: '#5a3a1a', icon: '☕',
    variations: [
      { id: 'v1', name: 'Espresso',    price: 55 },
      { id: 'v2', name: 'Cappuccino',  price: 69 },
      { id: 'v3', name: 'Latte',       price: 75 },
      { id: 'v4', name: 'Americano',   price: 65 },
    ],
  },
  {
    id: 'arabska-kava', sku: '10013', name: 'Arabská káva', cat: 'hot', vat: 12, color: '#3a2410', icon: '☕',
    variations: [
      { id: 'v1', name: 'Malá',          price: 55 },
      { id: 'v2', name: 'Velká',         price: 79 },
      { id: 'v3', name: 'S kardamonem',  price: 89 },
    ],
  },
  {
    id: 'caj', sku: '10014', name: 'Syrský čaj', cat: 'hot', vat: 12, color: '#a13a1a', icon: '🍵',
    variations: [
      { id: 'v1', name: 'Černý',    price: 45 },
      { id: 'v2', name: 'Mátový',   price: 55 },
      { id: 'v3', name: 'Konvička', price: 99 },
    ],
  },
  {
    id: 'voda', sku: '10015', name: 'Voda', cat: 'water', vat: 21, color: '#3a8aaa', icon: '💧',
    variations: [
      { id: 'v1', name: 'Neperlivá 0,5 L', price: 35 },
      { id: 'v2', name: 'Perlivá 0,5 L',   price: 35 },
      { id: 'v3', name: 'Neperlivá 1,5 L',  price: 59 },
    ],
  },
];

/* ===== DEFAULT TABLES ===== */
export function defaultTables(): TableConfig[] {
  const t: TableConfig[] = [];
  for (let i = 0; i < 4; i++) t.push({ id: `t${i + 1}`, num: String(i + 1), label: 'Stůl', shape: 'square', x: 80 + i * 180, y: 80, w: 120, h: 120 });
  for (let i = 0; i < 4; i++) t.push({ id: `t${i + 5}`, num: String(i + 5), label: 'Stůl', shape: 'round', x: 80 + i * 180, y: 260, w: 120, h: 120 });
  t.push({ id: 't9',  num: '9',  label: 'Stůl velký', shape: 'square', x: 80,  y: 440, w: 160, h: 160 });
  t.push({ id: 't10', num: '10', label: 'Stůl velký', shape: 'square', x: 280, y: 440, w: 160, h: 160 });
  t.push({ id: 'bar', num: 'B',  label: 'Bar',        shape: 'square', x: 480, y: 440, w: 200, h: 90 });
  t.push({ id: 'to',  num: '⊃',  label: 'S sebou',    shape: 'round',  x: 720, y: 440, w: 140, h: 140 });
  return t;
}

/* ===== DEFAULT SHARED STATE ===== */
export function defaultSharedState(): SharedState {
  return {
    catalog: JSON.parse(JSON.stringify(DEFAULT_CATALOG)),
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    tables: defaultTables(),
    photos: {},
    catPhotos: {},
    logo: null,
    slideshow: [],
    welcomeMsg: 'Vítejte u Chef Osman — Crispy Shawarma!',
    thanksMsg: 'Děkujeme Vám a přejeme dobrou chuť!',
    showCustomerPrices: true,
    business: { ...DEFAULT_BUSINESS },
    iban: '',
    pinCode: '1234',
    pay: {
      nfcEnabled: true,
      qrEnabled: true,
      cashEnabled: true,
      nfcMobileUrl: '',
      fioEnabled: false,
      fioToken: '',
      sumupAffiliateKey: '',
    },
    schemaVersion: 2,
    pendingPayment: null,
  };
}
