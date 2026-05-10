/**
 * TerminalView — běží na Android 14 telefonu
 * URL: localhost:5173/#terminal  nebo  vase-domena.vercel.app/#terminal
 *
 * Telefon slouží jako NFC platební terminál:
 *  1. Kasa odešle pendingPayment přes Firebase / SharedStore
 *  2. Tento view ho zachytí a automaticky otevře SumUp
 *  3. Po platbě potvrdí kase (clearPendingPayment)
 */
import React, { useEffect, useRef } from 'react';
import { useSharedStore, fmtCZK } from '@/store/posStore';

export const TerminalView: React.FC = () => {
  const pending         = useSharedStore(s => s.shared.pendingPayment);
  const clearPending    = useSharedStore(s => s.clearPendingPayment);
  const business        = useSharedStore(s => s.shared.business);
  const autoOpened      = useRef(false);

  // Automaticky otevři SumUp jakmile dorazí platba
  useEffect(() => {
    if (!pending || autoOpened.current) return;
    autoOpened.current = true;

    const url = `sumupmerchant://pay/1.0`
      + `?affiliate-key=${encodeURIComponent(pending.affiliateKey)}`
      + `&amount=${pending.amount.toFixed(2)}`
      + `&currency=CZK`
      + `&title=${encodeURIComponent(pending.tableLabel)}`
      + `&skip-screen-on-success=false`
      + `&callback=${encodeURIComponent(window.location.href)}`;

    // Krátká prodleva aby displej stihl zobrazit
    setTimeout(() => {
      window.location.href = url;
    }, 600);
  }, [pending]);

  // Reset ready pro další platbu
  useEffect(() => {
    if (!pending) {
      autoOpened.current = false;
    }
  }, [pending]);

  const handleClear = () => {
    clearPending();
    autoOpened.current = false;
  };

  return (
    <div style={{
      height: '100dvh',
      background: 'linear-gradient(160deg, #0D0D0D 0%, #1a1005 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      color: '#e8d5b0',
      padding: 24,
      textAlign: 'center',
      gap: 24,
      userSelect: 'none',
    }}>
      {/* Logo */}
      <div style={{
        width: 90, height: 90, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, #F2C46B 0%, #CD7F32 45%, #6B3F12 100%)',
        display: 'grid', placeItems: 'center',
        fontSize: 48, fontWeight: 900, color: '#1a0e02',
        boxShadow: '0 0 0 3px #8A5621, 0 8px 32px rgba(205,127,50,0.4)',
      }}>
        O
      </div>

      <div>
        <div style={{ fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#a07840', marginBottom: 6 }}>
          {business.name.split('//')[0]?.trim()}
        </div>
        <div style={{ fontSize: 11, color: '#6b5030' }}>NFC Platební terminál</div>
      </div>

      {pending ? (
        /* ── Příchozí platba ── */
        <div style={{
          background: 'rgba(205,127,50,0.08)',
          border: '1px solid rgba(205,127,50,0.3)',
          borderRadius: 20, padding: '28px 32px',
          width: '100%', maxWidth: 380,
          animation: 'pulseCard 1.5s ease-in-out infinite',
        }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a07840', marginBottom: 8 }}>
            {pending.tableLabel}
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#F2C46B', marginBottom: 4, lineHeight: 1 }}>
            {fmtCZK(pending.amount)}
          </div>
          <div style={{ fontSize: 13, color: '#8a6a3a', marginTop: 12 }}>
            {pending.method === 'nfc' ? '📱 Přikládám SumUp...' : '📷 QR platba'}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => {
                const url = `sumupmerchant://pay/1.0`
                  + `?affiliate-key=${encodeURIComponent(pending.affiliateKey)}`
                  + `&amount=${pending.amount.toFixed(2)}`
                  + `&currency=CZK`
                  + `&title=${encodeURIComponent(pending.tableLabel)}`;
                window.location.href = url;
              }}
              style={{
                background: 'linear-gradient(135deg, #F2C46B, #CD7F32)',
                border: 0, borderRadius: 14, padding: '16px 28px',
                fontWeight: 900, fontSize: 16, color: '#1a0e02', cursor: 'pointer',
              }}
            >
              💳 Otevřít SumUp
            </button>
            <button
              onClick={handleClear}
              style={{
                background: 'rgba(211,47,47,0.12)',
                border: '1px solid rgba(211,47,47,0.3)',
                borderRadius: 14, padding: '16px 20px',
                fontWeight: 700, fontSize: 14, color: '#ef5350', cursor: 'pointer',
              }}
            >
              ✕ Zrušit
            </button>
          </div>
        </div>
      ) : (
        /* ── Čeká na platbu ── */
        <div style={{ color: '#5a4020', fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          Čeká na platbu z kasy...
          <div style={{ fontSize: 11, marginTop: 8, color: '#3a2810' }}>
            Telefon je připraven přijímat NFC platby
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseCard {
          0%, 100% { box-shadow: 0 0 0 0 rgba(205,127,50,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(205,127,50,0); }
        }
      `}</style>
    </div>
  );
};
