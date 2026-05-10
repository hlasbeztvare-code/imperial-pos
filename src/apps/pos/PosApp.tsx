import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { usePosStore } from '@/store/posStore';
import { FloorCanvas } from '@/components/floor/FloorCanvas';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { CartPanel } from '@/components/cart/CartPanel';

export const PosApp: React.FC = () => {
  const activePanel = usePosStore(s => s.activePanel);

  return (
    <Shell aside={<CartPanel />}>
      <div className={`panel ${activePanel === 'floor' ? 'active' : ''}`}>
        <FloorCanvas />
      </div>
      <div className={`panel ${activePanel === 'menu' ? 'active' : ''}`}>
        <MenuGrid />
      </div>
      <div className={`panel ${activePanel === 'orders' ? 'active' : ''}`}>
        <div style={{ padding: '20px', color: '#888' }}>Orders List Placeholder</div>
      </div>
    </Shell>
  );
};
