import React, { useState, useRef } from 'react';
import { usePosStore, useSharedStore, fmtCZK } from '@/store/posStore';
import type { Product, Category, Variation } from '@/types';
import { setupPrinter, isPrinterReady } from '@/utils/hardware';

type AdminTab = 'katalog' | 'kategorie' | 'prehled' | 'nastaveni';

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState<AdminTab>('katalog');

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide admin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>⚙ Administrace</h3>
          <button className="close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-tabs">
          {([
            ['katalog', '🍽 Katalog'],
            ['kategorie', '🗂 Kategorie'],
            ['prehled', '📊 Přehled'],
            ['nastaveni', '⚙ Nastavení'],
          ] as [AdminTab, string][]).map(([t, label]) => (
            <button key={t} className={`admin-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>
        <div className="modal-body admin-body">
          {tab === 'katalog'    && <AdminKatalog />}
          {tab === 'kategorie'  && <AdminKategorie />}
          {tab === 'prehled'    && <AdminPrehled />}
          {tab === 'nastaveni'  && <AdminNastaveni />}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   KATALOG — products + variants + image upload
══════════════════════════════════════════════════════════ */
const AdminKatalog: React.FC = () => {
  const catalog    = useSharedStore(s => s.shared.catalog);
  const categories = useSharedStore(s => s.shared.categories);
  const photos     = useSharedStore(s => s.shared.photos) || {};
  const updateProduct = useSharedStore(s => s.updateProduct);
  const deleteProduct = useSharedStore(s => s.deleteProduct);
  const addProduct    = useSharedStore(s => s.addProduct);
  const updateShared  = useSharedStore(s => s.updateShared);

  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<Partial<Product>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filterCat === 'all' ? catalog : catalog.filter(p => p.cat === filterCat);

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ ...p, variations: p.variations.map(v => ({ ...v })) });
    setImgPreview(photos[p.id] || null);
  };

  const openNew = () => {
    const id = `prod_${Date.now()}`;
    setEditId('__new__');
    setForm({
      id,
      sku: '',
      name: '',
      cat: categories.find(c => c.id !== 'all')?.id || 'main',
      vat: 12,
      color: '#8a6a3a',
      icon: '🍽',
      variations: [{ id: `v_${Date.now()}`, name: 'Standardní', price: 0 }],
    });
    setImgPreview(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setImgPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImgPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = () => {
    if (!form.name?.trim() || !form.variations?.length) return;
    const prodId = form.id!;

    // Save image
    const newPhotos = { ...photos };
    if (imgPreview) {
      newPhotos[prodId] = imgPreview;
    } else {
      delete newPhotos[prodId];
    }
    updateShared({ photos: newPhotos });

    if (editId === '__new__') {
      addProduct(form as Product);
    } else if (editId) {
      updateProduct(editId, form);
    }
    setEditId(null);
    setImgPreview(null);
  };

  const updateVar = (i: number, patch: Partial<Variation>) =>
    setForm(f => ({ ...f, variations: f.variations!.map((v, ii) => ii === i ? { ...v, ...patch } : v) }));

  const addVar = () =>
    setForm(f => ({ ...f, variations: [...(f.variations || []), { id: `v_${Date.now()}`, name: '', price: 0 }] }));

  const removeVar = (i: number) =>
    setForm(f => ({ ...f, variations: f.variations!.filter((_, ii) => ii !== i) }));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: 1 }}>
          <option value="all">— Všechny kategorie —</option>
          {categories.filter(c => c.id !== 'all').map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <button className="btn primary" onClick={openNew}>+ Nový produkt</button>
      </div>

      {/* Product list */}
      <div style={{ display: 'grid', gap: 6, maxHeight: editId ? 200 : 440, overflowY: 'auto' }}>
        {filtered.map(p => {
          const img = photos[p.id];
          const minPrice = p.variations.length ? Math.min(...p.variations.map(v => v.price)) : 0;
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-3)', border: `1px solid ${editId === p.id ? 'var(--bronze)' : 'var(--line)'}`, borderRadius: 10, padding: '8px 12px' }}>
              {/* Thumbnail */}
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: p.color, border: '1px solid var(--line)', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
                {img
                  ? <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>{p.icon}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                  {categories.find(c => c.id === p.cat)?.name} · {p.variations.length} variant · od {minPrice} Kč
                </div>
              </div>
              <button className="btn" style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }} onClick={() => openEdit(p)}>✏ Upravit</button>
              <button className="btn danger" style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }}
                onClick={() => { if (confirm(`Smazat "${p.name}"?`)) { deleteProduct(p.id); const np = { ...photos }; delete np[p.id]; updateShared({ photos: np }); } }}>🗑</button>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: 'var(--ink-mute)', textAlign: 'center', padding: 24 }}>Žádné produkty</div>}
      </div>

      {/* Edit form */}
      {editId && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--bronze-dim)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bronze-2)', marginBottom: 14 }}>
            {editId === '__new__' ? '+ Nový produkt' : `Úprava: ${form.name}`}
          </div>

          {/* Image upload */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
            <div
              style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', background: form.color || '#8a6a3a', border: '2px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
              title="Klikni pro nahrání obrázku"
            >
              {imgPreview
                ? <img src={imgPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 36 }}>{form.icon}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>Obrázek dlaždice (JPG, PNG, WebP — max 2 MB)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ fontSize: 12 }} onClick={() => fileRef.current?.click()}>📁 Nahrát obrázek</button>
                {imgPreview && <button className="btn danger" style={{ fontSize: 12 }} onClick={removeImage}>✕ Odebrat</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--ink-mute)', display: 'block', marginBottom: 4 }}>Barva pozadí</label>
              <input type="color" value={form.color || '#8a6a3a'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 48, height: 36, padding: 2, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-2)', cursor: 'pointer' }} />
            </div>
          </div>

          {/* Basic fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px 60px', gap: 8, marginBottom: 14 }}>
            <div>
              <label className="flabel">Název produktu *</label>
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Název produktu" style={{ width: '100%' }} />
            </div>
            <div>
              <label className="flabel">Kategorie</label>
              <select value={form.cat || ''} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} style={{ width: '100%' }}>
                {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="flabel">Ikona</label>
              <input value={form.icon || ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ width: '100%', textAlign: 'center', fontSize: 20 }} />
            </div>
            <div>
              <label className="flabel">DPH</label>
              <select value={form.vat ?? 12} onChange={e => setForm(f => ({ ...f, vat: Number(e.target.value) }))} style={{ width: '100%' }}>
                <option value={12}>12%</option>
                <option value={21}>21%</option>
                <option value={0}>0%</option>
              </select>
            </div>
          </div>

          {/* Variants */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bronze-2)' }}>Varianty a ceny</div>
              <button className="btn" style={{ fontSize: 11, padding: '5px 12px' }} onClick={addVar}>+ Přidat variantu</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(form.variations || []).map((v, i) => (
                <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 44px', gap: 8, alignItems: 'center', background: 'var(--bg-3)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--line)' }}>
                  <div>
                    <label className="flabel">Název varianty</label>
                    <input value={v.name} onChange={e => updateVar(i, { name: e.target.value })} placeholder="např. Velký, Malý, 0,33 l..." style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label className="flabel">Cena (Kč)</label>
                    <input
                      type="number" value={v.price} min={0} step={1}
                      onChange={e => updateVar(i, { price: Number(e.target.value) })}
                      style={{ width: '100%', fontWeight: 800, color: 'var(--bronze-2)', fontSize: 16 }}
                    />
                  </div>
                  <button
                    className="btn danger" style={{ padding: '8px', fontSize: 16, marginTop: 16, width: 44, height: 38 }}
                    onClick={() => removeVar(i)}
                    disabled={(form.variations?.length || 0) <= 1}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => { setEditId(null); setImgPreview(null); }}>Zrušit</button>
            <button className="btn primary" onClick={save} disabled={!form.name?.trim()}>
              ✓ Uložit produkt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   KATEGORIE
══════════════════════════════════════════════════════════ */
const AdminKategorie: React.FC = () => {
  const categories    = useSharedStore(s => s.shared.categories);
  const updateShared  = useSharedStore(s => s.updateShared);

  const upd = (id: string, patch: Partial<Category>) =>
    updateShared({ categories: categories.map(c => c.id === id ? { ...c, ...patch } : c) });

  const del = (id: string) => {
    if (id === 'all') return;
    if (confirm('Smazat kategorii?')) updateShared({ categories: categories.filter(c => c.id !== id) });
  };

  const add = () => updateShared({
    categories: [...categories, { id: `cat_${Date.now()}`, name: 'Nová kategorie', icon: '🍽' }],
  });

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {categories.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
          <input value={c.icon} onChange={e => upd(c.id, { icon: e.target.value })}
            style={{ width: 48, textAlign: 'center', fontSize: 20 }} disabled={c.id === 'all'} />
          <input value={c.name} onChange={e => upd(c.id, { name: e.target.value })}
            style={{ flex: 1 }} disabled={c.id === 'all'} />
          <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'monospace' }}>{c.id}</span>
          {c.id !== 'all' && (
            <button className="btn danger" style={{ padding: '6px 10px' }} onClick={() => del(c.id)}>🗑</button>
          )}
        </div>
      ))}
      <button className="btn primary" onClick={add}>+ Přidat kategorii</button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   PŘEHLED
══════════════════════════════════════════════════════════ */
const AdminPrehled: React.FC = () => {
  const todayRevenue = usePosStore(s => s.todayRevenue);
  const ordersDone   = usePosStore(s => s.ordersDone);
  const receiptSeq   = usePosStore(s => s.receiptSeq);
  const audit        = usePosStore(s => s.audit);
  const resetDay     = usePosStore(s => s.resetDay);
  const brightness   = usePosStore(s => s.brightness);
  const setBrightness = usePosStore(s => s.setBrightness);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="admin-grid">
        <div className="admin-card">
          <h4>📊 Dnešní tržby</h4>
          <div className="row"><span>Tržba</span><b>{fmtCZK(todayRevenue)}</b></div>
          <div className="row"><span>Účtenek</span><b>{ordersDone}</b></div>
          <div className="row"><span>Příští č.</span><b>#{receiptSeq + 1}</b></div>
          <button className="btn danger" style={{ marginTop: 10, width: '100%' }}
            onClick={() => { if (confirm('Opravdu resetovat den?')) resetDay(); }}>
            🔄 Reset dne
          </button>
        </div>
        <div className="admin-card">
          <h4>🔆 Jas displeje</h4>
          <div className="row"><span>Jas</span><b>{brightness}%</b></div>
          <input type="range" min={30} max={100} value={brightness} className="bri-slider"
            onChange={e => setBrightness(Number(e.target.value))} />
        </div>
      </div>
      <div className="admin-card">
        <h4>📋 Audit log</h4>
        <div className="audit-log">
          {audit.length === 0
            ? <div className="empty">Žádné záznamy</div>
            : [...audit].reverse().map((e, i) => (
              <div key={i} className="entry">
                <span className="t">{e.t}</span> — {e.a}{e.d ? ` (${e.d})` : ''}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   NASTAVENÍ — logo, účtenka, tiskárna, platby, PIN
══════════════════════════════════════════════════════════ */
const AdminNastaveni: React.FC = () => {
  const shared       = useSharedStore(s => s.shared);
  const updateShared = useSharedStore(s => s.updateShared);
  const [bizForm, setBizForm] = useState({ ...shared.business });
  const [saved, setSaved]     = useState(false);
  const [printerReady, setPrinterReady] = useState(isPrinterReady());
  const logoRef = useRef<HTMLInputElement>(null);

  const saveBusiness = () => {
    updateShared({ business: bizForm });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert('Logo je příliš velké. Max 500 KB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => updateShared({ logo: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handlePrinterSetup = async () => {
    const ok = await setupPrinter();
    setPrinterReady(ok);
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>

      {/* ── Logo & Účtenka ── */}
      <div className="admin-card">
        <h4>🧾 Logo & Účtenka</h4>

        {/* Logo upload */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14, padding: 12, background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
          <div
            style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--bronze-dim)', cursor: 'pointer', background: 'radial-gradient(circle at 30% 30%,#F2C46B,#CD7F32)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 36, fontWeight: 900, color: '#1a0e02' }}
            onClick={() => logoRef.current?.click()}
            title="Klikni pro nahrání loga"
          >
            {shared.logo
              ? <img src={shared.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : 'O'
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Logo restaurace</div>
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 8 }}>Zobrazuje se v TopBaru a na účtence. Max 500 KB, čtvercové.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => logoRef.current?.click()}>📁 Nahrát logo</button>
              {shared.logo && <button className="btn danger" onClick={() => updateShared({ logo: null })}>✕ Odebrat</button>}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </div>
        </div>

        {/* Texty na účtence */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <label className="flabel">Text v záhlaví účtenky (nepovinné)</label>
            <input
              value={shared.welcomeMsg || ''}
              onChange={e => updateShared({ welcomeMsg: e.target.value })}
              placeholder="např. Vítejte u Chef Osman!"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="flabel">Text v zápatí účtenky (poděkování)</label>
            <input
              value={shared.thanksMsg || ''}
              onChange={e => updateShared({ thanksMsg: e.target.value })}
              placeholder="Děkujeme a přejeme dobrou chuť!"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* ── Tiskárna ── */}
      <div className="admin-card">
        <h4>🖨 USB Tiskárna</h4>
        <div className="row" style={{ marginBottom: 10 }}>
          <span>Stav tiskárny</span>
          <span style={{ fontWeight: 700, color: printerReady ? 'var(--ok)' : 'var(--ink-mute)' }}>
            {printerReady ? '● Připojeno' : '○ Nepřipojeno'}
          </span>
        </div>
        <button className="btn primary" style={{ width: '100%' }} onClick={handlePrinterSetup}>
          🔌 Vybrat USB port (ESC/POS)
        </button>
        <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 8 }}>
          Podporuje Epson, Star, Bixolon, Sunmi a jiné ESC/POS tiskárny přes USB.<br />
          Vyžaduje <b>Chrome nebo Edge</b> na kase (Web Serial API).
        </div>
      </div>

      {/* ── Provozovna ── */}
      <div className="admin-card">
        <h4>🏢 Provozovna</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          {([
            ['name', 'Název (TopBar a účtenka)'],
            ['legal', 'Právní název'],
            ['address', 'Adresa'],
            ['ico', 'IČO'],
            ['pos', 'Označení pokladny'],
            ['user', 'Uživatel'],
          ] as [keyof typeof bizForm, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="flabel">{label}</label>
              <input value={bizForm[key] || ''} onChange={e => setBizForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%' }} />
            </div>
          ))}
        </div>
        <button className="btn primary" style={{ marginTop: 12 }} onClick={saveBusiness}>
          {saved ? '✓ Uloženo!' : 'Uložit'}
        </button>
      </div>

      {/* ── Platební metody ── */}
      <div className="admin-card">
        <h4>💳 Platební metody</h4>
        {([
          ['cashEnabled', '💵 Hotovost'],
          ['nfcEnabled', '📱 Android Tap to Pay (NFC)'],
          ['qrEnabled', '📷 QR platba (FIO/IBAN)'],
        ] as [keyof typeof shared.pay, string][]).map(([key, label]) => (
          <div key={key} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{label}</span>
            <div className={`switch ${shared.pay[key] ? 'on' : ''}`}
              onClick={() => updateShared({ pay: { ...shared.pay, [key]: !shared.pay[key] } })} />
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <div>
            <label className="flabel">🔑 SumUp Affiliate Key</label>
            <input
              value={shared.pay.sumupAffiliateKey || ''}
              onChange={e => updateShared({ pay: { ...shared.pay, sumupAffiliateKey: e.target.value } })}
              placeholder="sup_sk_xxxxxxxx"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 3 }}>SumUp Dashboard → Integrace → Affiliate</div>
          </div>
          <div>
            <label className="flabel">🏦 IBAN pro QR platbu</label>
            <input
              value={shared.iban || ''}
              onChange={e => updateShared({ iban: e.target.value })}
              placeholder="CZ65 0800 0000 1920 0014 5399"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 }}
            />
          </div>
        </div>
      </div>

      {/* ── PIN ── */}
      <div className="admin-card">
        <h4>🔐 PIN kód</h4>
        <div className="row">
          <span>Aktuální PIN</span>
          <input type="password" value={shared.pinCode} maxLength={6}
            onChange={e => updateShared({ pinCode: e.target.value })}
            style={{ width: 120, textAlign: 'center', letterSpacing: 8, fontSize: 20 }} />
        </div>
      </div>
    </div>
  );
};
