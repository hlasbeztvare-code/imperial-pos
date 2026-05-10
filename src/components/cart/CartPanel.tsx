import React, { useState } from 'react';
import {
  usePosStore, useSharedStore, computeCartTotal,
  fmtCZK, fmtCZKShort, uid, nowStamp,
} from '@/store/posStore';
import type { PayMethod } from '@/types';
import { printReceipt, openCashDrawer } from '@/utils/hardware';

/* ── CartPanel ─────────────────────────────────────────── */
export const CartPanel: React.FC = () => {
  const activeTable  = usePosStore(s => s.activeTable);
  const carts        = usePosStore(s => s.carts);
  const discounts    = usePosStore(s => s.discounts);
  const updateLineQty = usePosStore(s => s.updateLineQty);
  const removeLine   = usePosStore(s => s.removeLine);
  const clearCart    = usePosStore(s => s.clearCart);
  const setDiscount  = usePosStore(s => s.setDiscount);
  const showToast    = usePosStore(s => s.showToast);
  const tables       = useSharedStore(s => s.shared.tables);

  const cart  = activeTable ? (carts[activeTable] || []) : [];
  const disc  = activeTable ? discounts[activeTable] : null;
  const tConf = tables.find(t => t.id === activeTable);
  const totals = computeCartTotal(cart, disc);

  const [payOpen,  setPayOpen]  = useState(false);
  const [discOpen, setDiscOpen] = useState(false);

  if (!activeTable || !tConf) {
    return (
      <div className="cart">
        <div className="cart-empty">
          <div className="big">🍽</div>
          <b>Žádný stůl</b>
          Vyberte stůl z půdorysu<br />pro zahájení objednávky
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="cart">
        <div className="cart-head">
          <div className="ttl">Účet</div>
          <div className="which">
            <b>{tConf.label}</b> <em>{tConf.num}</em>
          </div>
        </div>

        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="big">🧾</div>
              <b>Účet je prázdný</b>
              Přidejte položky z menu
            </div>
          ) : (
            cart.map(line => (
              <div key={line.lineId} className="line">
                <div className="l-row">
                  <div>
                    <div className="nm">{line.name}</div>
                    <div className="var">{line.varName}{line.note ? ` — ${line.note}` : ''}</div>
                  </div>
                  <div className="price">
                    {fmtCZK(line.unitPrice * line.qty)}
                    <small>{fmtCZK(line.unitPrice)} / ks</small>
                  </div>
                </div>
                <div className="l-row" style={{ marginTop: 8 }}>
                  <div className="qty">
                    <button onClick={() => {
                      if (line.qty === 1) removeLine(activeTable, line.lineId);
                      else updateLineQty(activeTable, line.lineId, -1);
                    }}>−</button>
                    <span>{line.qty}</span>
                    <button onClick={() => updateLineQty(activeTable, line.lineId, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="cart-actions">
              <button onClick={() => { if (confirm('Zrušit celý účet?')) clearCart(activeTable); }}>🗑 Zrušit</button>
              <button onClick={() => setDiscOpen(true)}>% Sleva</button>
              <button onClick={() => showToast('Tisk bonu — připravuje se', '')}>🖨 Bon</button>
              <button onClick={() => showToast('Rozdělit účet — připravuje se', '')}>✂ Rozdělit</button>
            </div>

            <div className="totals">
              <div className="row"><span>Mezisoučet</span><span>{fmtCZK(totals.sub)}</span></div>
              {totals.discAmount > 0 && (
                <div className="row disc">
                  <span>Sleva {disc?.mode === '%' ? `(${disc.value}%)` : ''}</span>
                  <span>−{fmtCZK(totals.discAmount)}</span>
                </div>
              )}
              <div className="row grand"><span>Celkem</span><b>{fmtCZK(totals.grand)}</b></div>
            </div>

            <div className="pay-bar">
              <button className="pay-btn" onClick={() => setPayOpen(true)}>PLATIT</button>
            </div>
          </>
        )}
      </div>

      {/* Discount modal */}
      {discOpen && (
        <DiscountModal
          tableId={activeTable}
          current={disc}
          onClose={() => setDiscOpen(false)}
          onApply={(d) => { setDiscount(activeTable, d); setDiscOpen(false); }}
          onRemove={() => { setDiscount(activeTable, null); setDiscOpen(false); }}
        />
      )}

      {/* Payment modal */}
      {payOpen && (
        <PaymentModal
          tableId={activeTable}
          tableName={`${tConf.label} ${tConf.num}`}
          totals={totals}
          onClose={() => setPayOpen(false)}
          onDone={() => setPayOpen(false)}
        />
      )}
    </>
  );
};

/* ── Discount Modal ────────────────────────────────────── */
const DiscountModal: React.FC<{
  tableId: string;
  current: import('@/types').Discount | null;
  onClose: () => void;
  onApply: (d: import('@/types').Discount) => void;
  onRemove: () => void;
}> = ({ current, onClose, onApply, onRemove }) => {
  const [mode, setMode] = useState<'%' | 'abs'>(current?.mode || '%');
  const [value, setValue] = useState(current?.value || 0);
  const [kind, setKind] = useState<'staff' | 'cust'>(current?.kind || 'cust');

  const quickPct = [5, 10, 15, 20];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal narrow" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>% Sleva</h3>
          <button className="close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Mode toggle */}
          <div className="disc-mode-toggle" style={{ marginBottom: 14 }}>
            <button className={mode === '%' ? 'on' : ''} onClick={() => setMode('%')}>%</button>
            <button className={mode === 'abs' ? 'on' : ''} onClick={() => setMode('abs')}>Kč</button>
          </div>

          {/* Quick picks */}
          {mode === '%' && (
            <div className="disc-quick">
              {quickPct.map(p => (
                <button key={p} className={value === p ? 'on' : ''} onClick={() => setValue(p)}
                  style={{ background: value === p ? 'var(--bronze)' : undefined, color: value === p ? '#fff' : undefined }}>
                  {p}%
                </button>
              ))}
            </div>
          )}

          {/* Manual input */}
          <div className="disc-input-row">
            <input
              type="number" value={value} min={0} max={mode === '%' ? 100 : undefined}
              onChange={e => setValue(Number(e.target.value))}
              style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', color: 'var(--bronze-2)' }}
              placeholder={mode === '%' ? 'Procent...' : 'Kč...'}
            />
            <span style={{ fontSize: 22, color: 'var(--ink-mute)', fontWeight: 700 }}>{mode}</span>
          </div>

          {/* Kind */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className={`btn ${kind === 'cust' ? 'primary' : ''}`} style={{ flex: 1 }} onClick={() => setKind('cust')}>👤 Zákazník</button>
            <button className={`btn ${kind === 'staff' ? 'primary' : ''}`} style={{ flex: 1 }} onClick={() => setKind('staff')}>👨‍🍳 Personál</button>
          </div>
        </div>
        <div className="modal-foot">
          {current && <button className="btn danger" onClick={onRemove}>Odebrat slevu</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button className="btn primary" onClick={() => onApply({ kind, mode, value })} disabled={value <= 0}>
            Použít slevu
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Payment Modal ─────────────────────────────────────── */
const PaymentModal: React.FC<{
  tableId: string;
  tableName: string;
  totals: import('@/types').CartTotals;
  onClose: () => void;
  onDone: () => void;
}> = ({ tableId, tableName, totals, onClose, onDone }) => {
  const pay            = useSharedStore(s => s.shared.pay);
  const completePayment = usePosStore(s => s.completePayment);
  const clearCart      = usePosStore(s => s.clearCart);
  const addAudit       = usePosStore(s => s.addAudit);
  const showToast      = usePosStore(s => s.showToast);
  const setActiveTable = usePosStore(s => s.setActiveTable);
  const setPendingPayment  = useSharedStore(s => s.setPendingPayment);
  const clearPendingPayment = useSharedStore(s => s.clearPendingPayment);

  const [method,   setMethod]   = useState<PayMethod>(pay.cashEnabled ? 'cash' : pay.nfcEnabled ? 'nfc' : 'qr');
  const [cashStr,  setCashStr]  = useState('');
  const [step,     setStep]     = useState<'choose' | 'cash' | 'qr' | 'nfc' | 'nfc_wait' | 'done'>('choose');

  const grand = totals.grand;
  const received = parseFloat(cashStr) || 0;
  const change = Math.max(0, received - grand);

  const confirmPayment = () => {
    if (method === 'nfc' && pay.sumupAffiliateKey) {
      // Pošli platbu na Android terminál přes Firebase sync
      setPendingPayment({
        id: `pay_${Date.now()}`,
        amount: grand,
        tableLabel: tableName,
        method: 'nfc',
        affiliateKey: pay.sumupAffiliateKey,
        createdAt: Date.now(),
      });
      showToast('📲 Platba odeslána na terminál', 'ok');
      // Kasa čeká — obsluha potvrdí ručně po úspěšné platbě SumUp
      setStep('nfc_wait');
      return;
    }
    // Hotovost / QR — rovnou potvrdit
    finishPayment();
  };

  const finishPayment = () => {
    const shared = useSharedStore.getState().shared;
    // 1. Ulož do store
    completePayment(tableId, grand);
    clearCart(tableId);
    clearPendingPayment();
    setActiveTable(null);
    addAudit('Platba', `${tableName} · ${fmtCZKShort(grand)} · ${method}`);
    // 2. Tiskárna — vytiskne účtenku
    printReceipt({
      seqNum: useSharedStore.getState().shared.pay ? usePosStore.getState().receiptSeq : 1,
      tableLabel: tableName,
      cart: usePosStore.getState().carts[tableId] || [],
      disc: usePosStore.getState().discounts[tableId] || null,
      totals,
      method,
      received,
      business: shared.business,
      iban: shared.iban,
    });
    // 3. Suplik — otevře se přes RJ11 přes tiskárnu
    openCashDrawer();
    showToast(`✓ Zaplaceno ${fmtCZKShort(grand)}`, 'ok');
    setStep('done');
    setTimeout(() => { onDone(); }, 1800);
  };

  // Quick cash amounts
  const quickCash = [grand, Math.ceil(grand / 100) * 100, Math.ceil(grand / 500) * 500, Math.ceil(grand / 1000) * 1000]
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  const methods: { id: PayMethod; icon: string; label: string; enabled: boolean }[] = [
    { id: 'cash', icon: '💵', label: 'Hotovost', enabled: pay.cashEnabled },
    { id: 'nfc',  icon: '💳', label: 'Karta / NFC', enabled: pay.nfcEnabled },
    { id: 'qr',   icon: '📱', label: 'QR platba', enabled: pay.qrEnabled },
  ];

  if (step === 'done') {
    return (
      <div className="overlay">
        <div className="modal narrow" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ok)' }}>Zaplaceno!</div>
          <div style={{ color: 'var(--bronze-2)', fontWeight: 800, fontSize: 20, marginTop: 8 }}>{fmtCZK(grand)}</div>
        </div>
      </div>
    );
  }

  if (step === 'nfc_wait') {
    return (
      <div className="overlay">
        <div className="modal narrow" style={{ textAlign: 'center' }}>
          <div className="modal-head"><h3>📲 Platba na terminálu</h3></div>
          <div className="modal-body" style={{ padding: 32 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📱</div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Čeká se na terminál...</div>
            <div style={{ color: 'var(--bronze-2)', fontWeight: 800, fontSize: 24 }}>{fmtCZK(grand)}</div>
            <div style={{ color: 'var(--ink-mute)', fontSize: 12, marginTop: 12 }}>Android zpracovává platbu přes SumUp NFC</div>
          </div>
          <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
            <button className="btn danger" onClick={() => { clearPendingPayment(); setStep('choose'); }}>✕ Zrušit</button>
            <button className="btn primary" style={{ flex: 1, marginLeft: 8 }} onClick={finishPayment}>✓ Platba proběhla</button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>💳 Platba — {tableName}</h3>
          <button className="close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Summary */}
          <div className="pay-summary">
            <div className="row"><span>Mezisoučet</span><span>{fmtCZK(totals.sub)}</span></div>
            {totals.discAmount > 0 && <div className="row"><span>Sleva</span><span>−{fmtCZK(totals.discAmount)}</span></div>}
            <div className="row grand"><span>K platbě</span><b>{fmtCZK(grand)}</b></div>
          </div>

          {/* Method selection */}
          <div className="pay-methods">
            {methods.map(m => (
              <div
                key={m.id}
                className={`pay-method ${method === m.id ? 'sel' : ''} ${!m.enabled ? 'dis' : ''}`}
                onClick={() => { if (m.enabled) setMethod(m.id); }}
              >
                <div className="pico">{m.icon}</div>
                <div className="plbl">{m.label}</div>
                {!m.enabled && <div style={{ fontSize: 9, color: 'var(--ink-mute)', marginTop: 4 }}>Vypnuto</div>}
              </div>
            ))}
          </div>

          {/* Cash section */}
          {method === 'cash' && (
            <div>
              <div className="cash-display">
                <small>Přijato Kč</small>
                {received > 0 ? fmtCZK(received) : '—'}
              </div>
              {/* Quick amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
                {quickCash.map(v => (
                  <button key={v} className="cash-pad quick" style={{ padding: 12, borderRadius: 8, border: '1px solid var(--bronze-dim)', background: 'var(--bg-3)', color: 'var(--bronze-2)', fontWeight: 800 }}
                    onClick={() => setCashStr(String(v))}>
                    {fmtCZKShort(v)}
                  </button>
                ))}
              </div>
              {/* Numpad */}
              <div className="cash-pad">
                {['7','8','9','4','5','6','1','2','3','.',  '0', '⌫'].map(k => (
                  <button key={k} className={`${k === '⌫' ? 'del' : ''}`}
                    style={{ padding: 16, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, fontWeight: 800, fontSize: 18, color: k === '⌫' ? 'var(--bad)' : 'var(--ink)' }}
                    onClick={() => {
                      if (k === '⌫') setCashStr(s => s.slice(0, -1));
                      else if (k === '.' && cashStr.includes('.')) return;
                      else setCashStr(s => s + k);
                    }}>
                    {k}
                  </button>
                ))}
              </div>
              {received >= grand && (
                <div className="cash-change">
                  Vrátit: <b>{fmtCZK(change)}</b>
                </div>
              )}
            </div>
          )}

          {/* NFC / Android Tap to Pay */}
          {method === 'nfc' && (
            <div>
              <div className="nfc-status waiting" style={{ marginBottom: 12 }}>
                <div className="nfc-icon">📲</div>
                <div className="nfc-msg">Android Tap to Pay</div>
                <div className="nfc-sub">Zákazník přiloží kartu nebo telefon k tomuto zařízení</div>
              </div>

              {/* SumUp Tap to Pay — deep-link do SumUp aplikace */}
              {pay.sumupAffiliateKey ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <button
                    className="btn primary"
                    style={{ padding: 16, fontSize: 15, fontWeight: 900 }}
                    onClick={() => {
                      // SumUp deep-link — otevře SumUp app s částkou předvyplněnou
                      const url = `sumupmerchant://pay/1.0?affiliate-key=${pay.sumupAffiliateKey}&amount=${grand.toFixed(2)}&currency=CZK&title=${encodeURIComponent(tableName)}&skip-screen-on-success=false`;
                      window.location.href = url;
                      // Fallback na web checkout po 1.5s (pokud app není nainstalována)
                      setTimeout(() => {
                        if (document.hidden) return; // app se otevřela
                        window.open(`https://me.sumup.com/payments/new?amount=${grand.toFixed(2)}&currency=CZK`, '_blank');
                      }, 1500);
                    }}
                  >
                    💳 Spustit SumUp Tap to Pay
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--ink-mute)', textAlign: 'center' }}>
                    Otevře aplikaci SumUp · Android 14 NFC terminál
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bad-soft)', border: '1px solid rgba(211,47,47,0.3)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--bad)' }}>
                  ⚠ Zadej SumUp Affiliate Key v Administraci → Nastavení
                </div>
              )}

              <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-3)', borderRadius: 8, fontSize: 11, color: 'var(--ink-mute)' }}>
                💡 <b style={{ color: 'var(--ink-dim)' }}>Alternativa:</b> Stripe Terminal nebo jiný Tap to Pay procesor lze nastavit v konfiguraci.
              </div>
            </div>
          )}

          {/* QR / FIO */}
          {method === 'qr' && (
            <div className="qr-info">
              <div className="nfc-icon" style={{ fontSize: 48, margin: '12px 0' }}>📱</div>
              <div className="qr-hint">
                Zákazník naskenuje QR kód<br />
                <b>a zaplatí přes mobilní banku</b>
              </div>
              {pay.qrEnabled && (
                <div style={{ marginTop: 12 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`SPD*1.0*ACC:${useSharedStore.getState().shared.iban}*AM:${grand.toFixed(2)}*CC:CZK*MSG:Platba${tableId}`)}`}
                    alt="QR platba" style={{ borderRadius: 10, border: '3px solid var(--bg-2)' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Zrušit</button>
          <button
            className="btn primary"
            style={{ flex: 1, fontSize: 16, fontWeight: 900 }}
            onClick={confirmPayment}
            disabled={method === 'cash' && received < grand}
          >
            ✓ Potvrdit platbu {fmtCZK(grand)}
          </button>
        </div>
      </div>
    </div>
  );
};
