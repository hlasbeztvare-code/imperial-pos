import React, { useEffect, useState } from 'react';
import { usePosStore, fmtCZK } from '@/store/posStore';
import { hardware } from '@/utils/hardware';
import { useHardwareStatus } from '@/hooks/useHardwareStatus';

export const StatusBar: React.FC = () => {
  const hwStatus = useHardwareStatus();
  const displayConnected = usePosStore(s => s.displayConnected);
  const nfcConnected = usePosStore(s => s.nfcConnected);
  const todayRevenue = usePosStore(s => s.todayRevenue);
  const ordersDone = usePosStore(s => s.ordersDone);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <footer className="statusbar">
      <div className="stat">
        <i className={`dot ${isOnline ? 'ok' : 'warn'}`}></i>
        <b>Síť</b> <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>
      <div className="stat">
        <i className={`dot ${hwStatus.connected ? 'ok' : 'bad'}`}></i>
        <b>Hardware</b> 
        <span style={{ marginRight: '8px' }}>{hwStatus.status} ({hwStatus.platform})</span>
        <button className="btn-mini" onClick={() => hardware.print(window.btoa('TEST TISK\nChef Osman POS\n\n\n\n\n\n'))}>Tisk</button>
        <button className="btn-mini" onClick={() => hardware.openDrawer()}>Šuplík</button>
        {!hwStatus.connected && (
          <button className="btn-mini warn" onClick={hwStatus.reconnect}>Reset</button>
        )}
      </div>
      <div className="stat">
        <i className={`dot ${displayConnected ? 'ok' : 'bad'}`}></i>
        <b>Displej</b> <span>{displayConnected ? 'Připojen' : 'Nepřipojen'}</span>
      </div>
      <div className="stat">
        <i className={`dot ${nfcConnected ? 'ok' : 'bad'}`}></i>
        <b>NFC</b> <span>{nfcConnected ? 'Připojen' : 'Nepřipojen'}</span>
      </div>
      <div className="stat">
        <b>Uživatel</b> <span>Majitel</span>
      </div>
      <div className="stat">
        <b>POS</b> <span>POS 1</span>
      </div>
      <div className="spacer"></div>
      <div className="stat">
        <b>Účtenek</b> <span>{ordersDone}</span>
      </div>
      <div className="stat">
        <b>Tržba dnes</b> <span>{fmtCZK(todayRevenue)}</span>
      </div>
    </footer>
  );
};
