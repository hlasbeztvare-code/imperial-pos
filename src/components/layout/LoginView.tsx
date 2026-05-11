import React, { useState } from 'react';
import { usePosStore } from '@/store/posStore';
import { useSharedStore } from '@/store/posStore';
import { LCodeNative } from '@/utils/hardware';
import '@/styles/imperial.css';

export const LoginView: React.FC = () => {
  const setUser = usePosStore(s => s.setUser);
  const shared = useSharedStore(s => s.shared);
  const logo = shared.logo;
  const showToast = usePosStore(s => s.showToast);
  
  const [pin, setPin] = useState('');
  const MASTER_PIN = shared.ownerPin || '2022';
  const STAFF_PIN = shared.staffPin || '0000';

  const handleKey = (key: string) => {
    if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      
      if (newPin === MASTER_PIN) {
        setTimeout(() => {
          setUser({
            email: 'majitel@imperial.pos',
            displayName: 'Majitel',
            idToken: 'owner-token',
            role: 'owner',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Imperial'
          });
          showToast('Vítejte v systému, pane majiteli', 'ok');
        }, 300);
      } else if (newPin === STAFF_PIN) {
        setTimeout(() => {
          setUser({
            email: 'obsluha@imperial.pos',
            displayName: 'Obsluha',
            idToken: 'staff-token',
            role: 'staff',
            photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Staff'
          });
          showToast('Vítejte v systému', 'ok');
        }, 300);
      } else if (newPin.length === 4) {
        setTimeout(() => {
          showToast('Nesprávný PIN', 'err');
          setPin('');
        }, 300);
      }
    }
  };

  const isNative = LCodeNative.getPlatform() !== 'web';

  return (
    <div className="login-screen">
      <div 
        className="login-background" 
        style={{ 
          backgroundImage: logo ? `url(${logo})` : 'none',
          filter: 'blur(20px) brightness(0.3)',
        }} 
      />
      
      <div className="login-content">
        <div className="login-logo-container">
          {logo ? (
            <img src={logo} alt="Gasaan Logo" className="login-logo-main" />
          ) : (
            <div className="login-logo-placeholder">IMPERIAL</div>
          )}
        </div>

        <div className="login-card glass">
          <h1>Imperial POS</h1>
          <p className="login-subtitle">Zadejte PIN pro přístup</p>
          
          <div className="pin-display">
            {pin.padEnd(4, '·').split('').map((char, i) => (
              <span key={i} className={pin[i] ? 'typed' : ''}>{char}</span>
            ))}
          </div>

          <div className="pin-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map(key => (
              <button 
                key={key} 
                onClick={() => {
                  if (key === 'C') setPin('');
                  else if (key === '←') setPin(pin.slice(0, -1));
                  else handleKey(String(key));
                }}
                className={typeof key === 'string' ? 'util' : ''}
              >
                {key}
              </button>
            ))}
          </div>

          {!isNative && (
            <p className="login-warning">
              Pro plnou funkčnost hardwaru (tisk, šuplík) použijte nativní aplikaci.
            </p>
          )}

          <div className="login-footer">
            <span>IMPERIAL EDITION</span>
            <span className="version">v1.0.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
