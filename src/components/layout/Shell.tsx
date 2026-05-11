import React from 'react';
import { usePosStore } from '@/store/posStore';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';

export const Shell: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => {
  const activePanel = usePosStore(s => s.activePanel);
  const setActivePanel = usePosStore(s => s.setActivePanel);
  const showMobileCart = usePosStore(s => s.showMobileCart);

  return (
    <div id="root" className={showMobileCart ? 'show-mobile-cart' : ''}>
      <TopBar />
      <main>
        <section className="workspace">
          <div className="tabs">
            <div className={`tab ${activePanel === 'floor' ? 'active' : ''}`} onClick={() => setActivePanel('floor')}>Půdorys</div>
            <div className={`tab ${activePanel === 'menu' ? 'active' : ''}`} onClick={() => setActivePanel('menu')}>Menu</div>
            <div className={`tab ${activePanel === 'orders' ? 'active' : ''}`} onClick={() => setActivePanel('orders')}>Objednávky</div>
          </div>
          {children}
        </section>
        <aside className={showMobileCart ? 'mobile-visible' : ''}>
          {aside}
        </aside>
      </main>
      <StatusBar />
    </div>
  );
};
