import React, { useState } from 'react';
import { usePosStore, useSharedStore } from '@/store/posStore';
import { AdminPanel } from '@/components/admin/AdminPanel';

export const TopBar: React.FC = () => {
  const setTheme = usePosStore(s => s.setTheme);
  const theme = usePosStore(s => s.theme);
  const toggleTheme = React.useCallback(
    () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    [setTheme, theme]
  );
  const activePanel = usePosStore(s => s.activePanel);
  const session = usePosStore(s => s.ordersDone + 1);
  const { business, logo } = useSharedStore(s => s.shared);

  const [adminOpen, setAdminOpen] = useState(false);

  const [time, setTime] = React.useState('');
  const [date, setDate] = React.useState('');

  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      const pad = (x: number) => String(x).padStart(2, '0');
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      setDate(`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const panelNames = { floor: 'Půdorys', menu: 'Menu', orders: 'Objednávky' };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="crest">
            {logo ? <img src={logo} alt="Logo" /> : 'O'}
          </div>
          <div className="name">
            <b>{business.name.split('//')[0]?.trim() || 'Chef Osman'}</b>
            <span>{business.name.split('//')[1]?.trim() || 'Crispy Shawarma'} · POS</span>
          </div>
        </div>
        <div className="crumbs">
          <span>POS</span>
          <span className="sep">›</span>
          <b>Směna #{session}</b>
          <span className="sep">›</span>
          <em>{panelNames[activePanel]}</em>
        </div>
        <div className="spacer"></div>
        <div className="clock">
          <b>{time}</b>
          <span>{date}</span>
        </div>
        <button className="theme-btn" onClick={toggleTheme} title="Změnit téma">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button className="icon-btn" onClick={() => setAdminOpen(true)} title="Administrace">
          ⚙
        </button>
      </header>

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </>
  );
};
