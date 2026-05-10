/**
 * Hardware Bridge Utils — USB tiskárna + suplik
 *
 * Priorita:
 *  1. AndroidBridge (nativní APK s WebView)
 *  2. Web Serial API — přímá USB komunikace ESC/POS (Chrome/Edge na PC/kase)
 *  3. window.print() — systémový tisk (fallback — funguje všude)
 *
 * USB tiskárna zapojená do kasy přes USB.
 * Suplik zapojen přes RJ11 do tiskárny.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CartLine, Discount, BusinessInfo, CartTotals } from '@/types';
import { fmtCZK, nowStamp } from '@/store/posStore';

/* ════════════════════════════════════════════════════
   PROSTŘEDÍ
════════════════════════════════════════════════════ */
export const hasBridge    = (): boolean => !!(window as any).AndroidBridge?.isAvailable?.();
export const hasWebSerial = (): boolean => 'serial' in navigator;

// Uchovaný serial port
let _port: any = null;
let _initialized = false;

/**
 * Zavolej jednou při startu aplikace.
 * Pokud uživatel už dřív vybral port, Chrome ho vrátí bez jakéhokoli dialogu.
 */
export const initPrinter = async (): Promise<void> => {
  if (_initialized || !hasWebSerial()) return;
  _initialized = true;
  try {
    const ports: any[] = await (navigator as any).serial.getPorts();
    if (ports.length > 0) {
      _port = ports[0]; // vezmi první dříve schválený port
      if (!_port.readable) {
        await _port.open({ baudRate: 9600 });
      }
      console.log('[HW] Printer auto-connected from saved permissions');
    }
  } catch (e) {
    console.warn('[HW] Auto-connect failed:', e);
    _port = null;
  }
};

/** Vybere port — zavolej jen při ručním nastavení z Admin */
async function getPort(): Promise<any> {
  if (!hasWebSerial()) return null;
  // Nejdřív zkus uložená oprávnění (bez dialogu)
  if (!_port) {
    try {
      const ports: any[] = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        _port = ports[0];
      }
    } catch {}
  }
  if (_port) return _port;
  // Žádný uložený port — otevři dialog (vyžaduje klik)
  try {
    _port = await (navigator as any).serial.requestPort({ filters: [] });
    return _port;
  } catch {
    return null;
  }
};

async function writeToPort(data: Uint8Array): Promise<boolean> {
  const port = _port || await getPort();
  if (!port) return false;
  try {
    if (!port.readable) await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    return true;
  } catch (err) {
    console.error('[Serial] Write error:', err);
    _port = null;
    return false;
  }
}

/* ════════════════════════════════════════════════════
   SUPLIK
════════════════════════════════════════════════════ */
const DRAWER_CMD = new Uint8Array([
  0x1B, 0x70, 0x00, 0x19, 0xFA,  // ESC p — pin 2
  0x1B, 0x70, 0x01, 0x19, 0xFA,  // ESC p — pin 5
]);

export const openCashDrawer = async (): Promise<void> => {
  if (hasBridge()) {
    (window as any).AndroidBridge.openDrawer();
    return;
  }
  if (hasWebSerial()) {
    await writeToPort(DRAWER_CMD);
    return;
  }
  console.log('[HW] openCashDrawer: no hardware available (web mode)');
};

/* ════════════════════════════════════════════════════
   TISKÁRNA
════════════════════════════════════════════════════ */
export interface PrintReceiptParams {
  seqNum: number;
  tableLabel: string;
  cart: CartLine[];
  disc: Discount | null;
  totals: CartTotals;
  method: string;
  received: number;
  business: BusinessInfo;
  logo?: string | null;
  iban?: string;
}

export const printReceipt = async (params: PrintReceiptParams): Promise<void> => {
  // 1. Android native APK
  if (hasBridge()) {
    (window as any).AndroidBridge.print(buildHtml(params));
    return;
  }

  // 2. Web Serial — raw ESC/POS (pokud je port vybrán)
  if (hasWebSerial() && _port) {
    const ok = await writeToPort(buildEscPos(params));
    if (ok) return;
  }

  // 3. window.print() fallback
  printViaIframe(buildHtml(params));
};

/** Vybere USB port — zavolat z Admin jednou */
export const setupPrinter = async (): Promise<boolean> => {
  if (hasBridge()) return true;
  if (!hasWebSerial()) {
    alert('Web Serial API není dostupné.\nPoužijte Chrome nebo Edge.');
    return false;
  }
  _port = null;
  const port = await getPort();
  if (!port) return false;
  try {
    await port.open({ baudRate: 9600 });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const isPrinterReady = (): boolean =>
  hasBridge() || (hasWebSerial() && !!_port);

/* ════════════════════════════════════════════════════
   HTML ÚČTENKA (80mm, window.print / AndroidBridge)
════════════════════════════════════════════════════ */
function buildHtml(p: PrintReceiptParams): string {
  const change = Math.max(0, p.received - p.totals.grand);
  const methodLabel: Record<string, string> = {
    cash: 'Hotovost', nfc: 'Karta / NFC', qr: 'QR platba',
  };

  const logoHtml = p.logo
    ? `<img src="${p.logo}" alt="logo" style="width:100%;max-width:180px;aspect-ratio:9/16;object-fit:contain;border-radius:8px;display:block;margin:0 auto 8px">`
    : `<div style="width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#F2C46B,#CD7F32);display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#1a0e02;margin-bottom:8px">O</div>`;

  return `
<div style="font-family:'Courier New',monospace;font-size:11px;width:100%;max-width:80mm;margin:0 auto;padding:4px;color:#000">
  <div style="text-align:center;margin-bottom:8px">
    ${logoHtml}
    <div style="font-size:15px;font-weight:900;letter-spacing:2px">${p.business.name.split('//')[0]?.trim()}</div>
    <div style="font-size:10px">${p.business.name.split('//')[1]?.trim() || ''}</div>
    <div style="font-size:10px;color:#444;margin-top:3px">${p.business.address}</div>
    <div style="font-size:10px;color:#444">IČO: ${p.business.ico}</div>
  </div>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:10px">
    <tr><td>Účtenka č.</td><td style="text-align:right"><b>#${String(p.seqNum).padStart(5,'0')}</b></td></tr>
    <tr><td>Stůl</td><td style="text-align:right">${p.tableLabel}</td></tr>
    <tr><td>Datum/čas</td><td style="text-align:right">${nowStamp()}</td></tr>
    <tr><td>Pokladna</td><td style="text-align:right">${p.business.pos}</td></tr>
  </table>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:11px">
    ${p.cart.map(l => `
    <tr><td colspan="3" style="font-weight:700;padding-top:4px">${l.name}</td></tr>
    <tr>
      <td style="padding-left:8px;color:#555;font-size:10px">${l.varName}</td>
      <td style="text-align:center;width:30px">${l.qty}×</td>
      <td style="text-align:right;white-space:nowrap">${fmtCZK(l.unitPrice * l.qty)}</td>
    </tr>`).join('')}
  </table>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:11px">
    <tr><td>Mezisoučet</td><td style="text-align:right">${fmtCZK(p.totals.sub)}</td></tr>
    ${p.disc && p.totals.discAmount > 0 ? `<tr><td>Sleva</td><td style="text-align:right">-${fmtCZK(p.totals.discAmount)}</td></tr>` : ''}
    <tr style="font-size:14px;font-weight:900">
      <td>CELKEM</td><td style="text-align:right">${fmtCZK(p.totals.grand)}</td>
    </tr>
    ${p.totals.vat12 > 0 ? `<tr style="font-size:9px;color:#555"><td>DPH 12%</td><td style="text-align:right">${fmtCZK(p.totals.vat12)}</td></tr>` : ''}
    ${p.totals.vat21 > 0 ? `<tr style="font-size:9px;color:#555"><td>DPH 21%</td><td style="text-align:right">${fmtCZK(p.totals.vat21)}</td></tr>` : ''}
  </table>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:10px">
    <tr><td>Způsob platby</td><td style="text-align:right"><b>${methodLabel[p.method] || p.method}</b></td></tr>
    ${p.method === 'cash' && p.received > 0 ? `
    <tr><td>Zaplaceno</td><td style="text-align:right">${fmtCZK(p.received)}</td></tr>
    <tr><td>Vráceno</td><td style="text-align:right"><b>${fmtCZK(change)}</b></td></tr>` : ''}
  </table>
  <div style="border-top:1px dashed #000;margin:8px 0"></div>
  <div style="text-align:center;font-size:10px;color:#444">
    <div style="font-weight:700;font-size:11px">Děkujeme a přejeme dobrou chuť!</div>
    <div style="margin-top:4px">${p.business.name}</div>
    ${p.iban ? `<div style="margin-top:4px;font-size:9px">IBAN: ${p.iban}</div>` : ''}
  </div>
  <div style="height:32px"></div>
</div>`;
}

/* ════════════════════════════════════════════════════
   ESC/POS BINÁRNÍ (Web Serial přímý tisk)
════════════════════════════════════════════════════ */
function buildEscPos(p: PrintReceiptParams): Uint8Array {
  const enc = new TextEncoder();
  const w = 42;
  const lr = (l: string, r: string) => l + r.padStart(w - l.length);
  const dashes = '-'.repeat(w);

  const lines: string[] = [
    '\x1B\x40',           // Init
    '\x1B\x61\x01',       // Center
    p.business.name.split('//')[0]?.trim() || '',
    p.business.name.split('//')[1]?.trim() || '',
    p.business.address,
    `ICO: ${p.business.ico}`,
    '',
    '\x1B\x61\x00',       // Left
    dashes,
    lr(`#${String(p.seqNum).padStart(5,'0')}`, nowStamp()),
    lr('Stul:', p.tableLabel),
    dashes, '',
    ...p.cart.flatMap(l => [
      `${l.name} (${l.varName})`,
      lr(`  ${l.qty}x ${fmtCZK(l.unitPrice)}`, fmtCZK(l.unitPrice * l.qty)),
    ]),
    '',
    dashes,
    lr('Mezisoucket:', fmtCZK(p.totals.sub)),
    ...(p.totals.discAmount > 0 ? [lr('Sleva:', `-${fmtCZK(p.totals.discAmount)}`)] : []),
    '\x1B\x45\x01',       // Bold
    lr('CELKEM:', fmtCZK(p.totals.grand)),
    '\x1B\x45\x00',       // Bold off
    lr('Platba:', p.method === 'cash' ? 'Hotovost' : p.method === 'nfc' ? 'Karta/NFC' : 'QR'),
    ...(p.method === 'cash' && p.received > 0 ? [
      lr('Zaplaceno:', fmtCZK(p.received)),
      lr('Vraceno:', fmtCZK(Math.max(0, p.received - p.totals.grand))),
    ] : []),
    dashes, '',
    '\x1B\x61\x01',       // Center
    'Dekujeme a dobrou chut!',
    '',
    '\x1B\x64\x06',       // Feed
    '\x1D\x56\x00',       // Full cut
  ];

  const parts = lines.map(l => enc.encode(l + '\n'));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

/* ════════════════════════════════════════════════════
   IFRAME PRINT FALLBACK
════════════════════════════════════════════════════ */
function printViaIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:80mm;height:1px;border:0;opacity:0';
  iframe.srcdoc = `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:11px;width:80mm;color:#000;background:#fff}
      @page{margin:0;size:80mm auto}
      @media print{html,body{width:80mm}}
    </style></head><body>${html}</body></html>`;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 4000);
    }, 200);
  };
}
