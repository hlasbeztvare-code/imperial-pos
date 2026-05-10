import React, { useMemo, useState } from 'react';
import { useSharedStore, usePosStore, uid, fmtCZKShort, fmtCZK } from '@/store/posStore';
import type { Product, Variation } from '@/types';

export const MenuGrid: React.FC = () => {
  const catalog = useSharedStore(s => s.shared.catalog);
  const categories = useSharedStore(s => s.shared.categories);
  const photos = useSharedStore(s => s.shared.photos) || {};

  const activeCat = usePosStore(s => s.activeCat);
  const setActiveCat = usePosStore(s => s.setActiveCat);
  const activeTable = usePosStore(s => s.activeTable);
  const addToCart = usePosStore(s => s.addToCart);
  const showToast = usePosStore(s => s.showToast);

  // Variation picker modal state
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [pickerQty, setPickerQty] = useState(1);
  const [pickerVar, setPickerVar] = useState<Variation | null>(null);

  const filteredCatalog = useMemo(() => {
    if (activeCat === 'all') return catalog;
    return catalog.filter(p => p.cat === activeCat);
  }, [catalog, activeCat]);

  const openPicker = (p: Product) => {
    if (!activeTable) {
      showToast('Nejprve vyberte stůl v půdorysu', 'err');
      return;
    }
    if (!p.variations || p.variations.length === 0) {
      showToast('Produkt nemá varianty', 'err');
      return;
    }
    if (p.variations.length === 1) {
      // Single variation — add immediately
      addToCart(activeTable, {
        lineId: uid('ln'),
        prodId: p.id,
        varId: p.variations[0].id,
        name: p.name,
        varName: p.variations[0].name,
        unitPrice: p.variations[0].price,
        qty: 1,
        vat: p.vat,
        note: '',
        addedAt: Date.now(),
      });
      showToast(`✓ ${p.name}`);
      return;
    }
    // Multiple variations — open picker
    setPickerProduct(p);
    setPickerVar(p.variations[0]);
    setPickerQty(1);
  };

  const closePicker = () => setPickerProduct(null);

  const confirmPicker = () => {
    if (!pickerProduct || !pickerVar || !activeTable) return;
    addToCart(activeTable, {
      lineId: uid('ln'),
      prodId: pickerProduct.id,
      varId: pickerVar.id,
      name: pickerProduct.name,
      varName: pickerVar.name,
      unitPrice: pickerVar.price,
      qty: pickerQty,
      vat: pickerProduct.vat,
      note: '',
      addedAt: Date.now(),
    });
    showToast(`✓ ${pickerProduct.name} — ${pickerVar.name} ×${pickerQty}`);
    closePicker();
  };

  return (
    <div className="menu-shell">
      {/* Category bar */}
      <div className="cat-bar">
        {categories.map(c => (
          <div
            key={c.id}
            className={`cat-chip ${activeCat === c.id ? 'on' : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            <div className="cimg">{c.icon}</div>
            {c.name}
          </div>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid">
        {filteredCatalog.map(p => {
          const hasPhoto = !!photos[p.id];
          const lowestPrice = p.variations && p.variations.length > 0
            ? Math.min(...p.variations.map(v => v.price))
            : 0;

          return (
            <div key={p.id} className="tile" onClick={() => openPicker(p)}>
              <div className="photo" style={{ backgroundColor: !hasPhoto ? p.color : undefined }}>
                {!hasPhoto && (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <circle cx="50" cy="50" r="30" fill="rgba(0,0,0,0.15)" />
                    <text x="50" y="58" fontSize="30" textAnchor="middle" fill="#fff" opacity="0.9">{p.icon}</text>
                  </svg>
                )}
                {hasPhoto && <img src={photos[p.id]} alt={p.name} />}
                <div className="badge">{p.cat.toUpperCase()}</div>
              </div>
              <div className="meta">
                <div className="nm">{p.name}</div>
                <div className="price">
                  <span className="from">od</span> {fmtCZKShort(lowestPrice)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Variation picker modal */}
      {pickerProduct && (
        <div className="overlay" onClick={closePicker}>
          <div className="modal narrow" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{pickerProduct.name}</h3>
              <button className="close" onClick={closePicker}>✕</button>
            </div>
            <div className="modal-body">
              <div className="var-section-title">Vyberte variantu</div>
              <div className="var-grid">
                {pickerProduct.variations!.map(v => (
                  <div
                    key={v.id}
                    className={`var-card ${pickerVar?.id === v.id ? 'sel' : ''}`}
                    onClick={() => setPickerVar(v)}
                  >
                    <span className="vnm">{v.name}</span>
                    <span className="vprice">{fmtCZKShort(v.price)}</span>
                  </div>
                ))}
              </div>

              {/* Qty */}
              <div className="qty-input">
                <button onClick={() => setPickerQty(q => Math.max(1, q - 1))}>−</button>
                <span>{pickerQty}</span>
                <button onClick={() => setPickerQty(q => q + 1)}>+</button>
              </div>

              {pickerVar && (
                <div style={{ textAlign: 'center', marginTop: 14, color: 'var(--bronze-2)', fontWeight: 800, fontSize: 16 }}>
                  Celkem: {fmtCZK(pickerVar.price * pickerQty)}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={closePicker}>Zrušit</button>
              <button
                className="btn primary"
                onClick={confirmPicker}
                disabled={!pickerVar}
              >
                Přidat do účtu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
