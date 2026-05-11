import React, { useState, useRef, useCallback } from 'react';
import { useSharedStore, usePosStore, fmtCZKShort } from '@/store/posStore';
import type { TableConfig } from '@/types';

// Logical canvas size — table positions are stored in these px units
// but rendered as percentages of the actual container
const CW = 1200;
const CH = 800;

export const FloorCanvas: React.FC = () => {
  const tables = useSharedStore(s => s.shared.tables);
  const activeTable = usePosStore(s => s.activeTable);
  const setActiveTable = usePosStore(s => s.setActiveTable);
  const edit = usePosStore(s => s.edit);
  const snap = usePosStore(s => s.snap);
  const carts = usePosStore(s => s.carts);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag state (in logical CW×CH units)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPos, setTempPos] = useState<Record<string, { x: number; y: number }>>({});

  // Convert screen px → logical canvas units
  const toLogical = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent, t: TableConfig) => {
    if (!edit) {
      setActiveTable(t.id);
      return;
    }
    e.preventDefault();
    if (e.target instanceof HTMLElement && e.target.classList.contains('action-btn')) return;

    // Offset in logical units between pointer and table top-left
    const logicalPointer = toLogical(e.clientX, e.clientY);
    const offsetX = logicalPointer.x - t.x;
    const offsetY = logicalPointer.y - t.y;

    setDragId(t.id);
    setDragOffset({ x: offsetX, y: offsetY });
    setTempPos(prev => ({ ...prev, [t.id]: { x: t.x, y: t.y } }));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, t: TableConfig) => {
    if (dragId !== t.id || !edit) return;

    const logical = toLogical(e.clientX, e.clientY);
    let nx = logical.x - dragOffset.x;
    let ny = logical.y - dragOffset.y;

    // Clamp to canvas
    nx = Math.max(0, Math.min(nx, CW - t.w));
    ny = Math.max(0, Math.min(ny, CH - t.h));

    if (snap) {
      nx = Math.round(nx / 20) * 20;
      ny = Math.round(ny / 20) * 20;
    }

    setTempPos(prev => ({ ...prev, [t.id]: { x: nx, y: ny } }));
  };

  const handlePointerUp = (e: React.PointerEvent, t: TableConfig) => {
    if (dragId !== t.id || !edit) return;
    const newPos = tempPos[t.id];
    if (newPos) {
      useSharedStore.getState().updateTable(t.id, { x: newPos.x, y: newPos.y });
    }
    setDragId(null);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const deleteTable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Smazat stůl?')) {
      useSharedStore.getState().deleteTable(id);
    }
  };

  return (
    <div className="floor-canvas-wrap">
      <div className="floor-toolbar">
        <h2>Půdorys ({tables.length} stolů)</h2>
        <div className="legend">
          <span><i className="dot ok"></i> Volno</span>
          <span><i className="dot bad"></i> Obsazeno</span>
        </div>
        <div className="spacer"></div>
        {edit && (
          <>
            <button
              className={`tool-btn ${snap ? 'on' : ''}`}
              onClick={() => usePosStore.getState().setSnap(!snap)}
            >
              Mřížka
            </button>
            <button
              className="tool-btn primary"
              onClick={() =>
                useSharedStore.getState().addTable({
                  id: `t_${Date.now()}`,
                  num: '?',
                  label: 'Nový stůl',
                  shape: 'square',
                  x: 40,
                  y: 40,
                  w: 120,
                  h: 120,
                })
              }
            >
              + Přidat stůl
            </button>
          </>
        )}
        <div className="spacer"></div>
        {usePosStore.getState().user?.role === 'owner' && (
          <button
            className={`tool-btn ${edit ? 'on' : ''}`}
            onClick={() => usePosStore.getState().setEdit(!edit)}
          >
            ✏️ Upravit
          </button>
        )}
      </div>

      {/* Responsive canvas — fills all remaining space */}
      <div
        className={`floor-canvas ${edit ? 'edit grid-on' : ''}`}
        ref={canvasRef}
      >
        {tables.map(t => {
          const cart = carts[t.id] || [];
          const itemsCount = cart.reduce((a, c) => a + c.qty, 0);
          const total = cart.reduce((a, c) => a + c.qty * c.unitPrice, 0);
          const isBusy = itemsCount > 0;
          const pos = dragId === t.id && tempPos[t.id] ? tempPos[t.id] : { x: t.x, y: t.y };

          // Percentage-based positioning
          const style: React.CSSProperties = {
            left:   `${(pos.x / CW) * 100}%`,
            top:    `${(pos.y / CH) * 100}%`,
            width:  `${(t.w / CW) * 100}%`,
            height: `${(t.h / CH) * 100}%`,
            cursor: edit ? (dragId === t.id ? 'grabbing' : 'grab') : 'pointer',
            zIndex: dragId === t.id ? 50 : 10,
            touchAction: 'none',
          };

          return (
            <div
              key={t.id}
              className={`tbl shape-${t.shape} ${isBusy ? 'busy' : 'free'} ${
                activeTable === t.id && !edit ? 'selected' : ''
              }`}
              style={style}
              onPointerDown={e => handlePointerDown(e, t)}
              onPointerMove={e => handlePointerMove(e, t)}
              onPointerUp={e => handlePointerUp(e, t)}
            >
              <div className="tnum">{t.num}</div>
              <div className="tname">{t.label}</div>
              <div className="tstatus">{isBusy ? 'Obsazeno' : 'Volno'}</div>
              {isBusy && <div className="tprice">{fmtCZKShort(total)}</div>}
              {isBusy && <div className="titems">{itemsCount} ks</div>}
              {edit && (
                <>
                  <button className="action-btn delbtn" onClick={e => deleteTable(t.id, e)}>×</button>
                  <div className="resize"></div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
