import React from 'react';
import { usePosStore } from '@/store/posStore';
import { useSharedStore } from '@/store/posStore';
import { LCodeNative } from '@/utils/hardware';
import '@/styles/imperial.css';

export const LoginView: React.FC = () => {
  const setUser = usePosStore(s => s.setUser);
  const logo = useSharedStore(s => s.shared.logo);
  const showToast = usePosStore(s => s.showToast);

  const handleGoogleLogin = () => {
    LCodeNative.signInWithGoogle(
      (user) => {
        setUser(user);
        showToast(`Vítejte, ${user.displayName}`, 'ok');
      },
      (err) => {
        showToast(`Chyba přihlášení: ${err}`, 'err');
      }
    );
  };

  // If not native, we might want a fallback or just a message
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
            <div className="login-logo-placeholder">GASAAN POS</div>
          )}
        </div>

        <div className="login-card glass">
          <h1>Gasaan POS</h1>
          <p className="login-subtitle">Prémiový pokladní systém</p>
          
          <button 
            className="btn btn-primary login-google-btn"
            onClick={handleGoogleLogin}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="google-icon"
            />
            <span>Přihlásit se přes Google</span>
          </button>

          <button 
            className="btn btn-secondary login-demo-btn"
            style={{ marginTop: '1rem', width: '100%', opacity: 0.8 }}
            onClick={() => {
              setUser({
                email: 'demo@osman.pos',
                displayName: 'Chef Osman (DEMO)',
                idToken: 'demo-mode',
                photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Osman'
              });
              showToast('Spuštěno v DEMO režimu', 'ok');
            }}
          >
            <span>Vstoupit jako DEMO</span>
          </button>

          {!isNative && (
            <p className="login-warning">
              Spuštěno v prohlížeči. Pro plnou funkčnost (tisk, šuplík) použijte Gasaan APK.
            </p>
          )}

          <div className="login-footer">
            <span>CHEF OSMAN EDITION</span>
            <span className="version">v1.0.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
