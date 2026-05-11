import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PosApp } from './apps/pos/PosApp';
import { TerminalView } from './components/terminal/TerminalView';
import { LoginView } from './components/layout/LoginView';
import { usePosStore } from './store/posStore';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { initPrinter } from './utils/hardware';
import './styles/imperial.css';

export function App() {
  // Init Firebase Sync at the very root level so it stays active
  useFirebaseSync();

  const theme = usePosStore(s => s.theme);
  const brightness = usePosStore(s => s.brightness);
  const user = usePosStore(s => s.user);

  // Apply theme and brightness globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.filter = `brightness(${brightness / 100})`;
  }, [theme, brightness]);

  // Auto-connect to USB printer
  useEffect(() => {
    initPrinter();
  }, []);

  if (!user) {
    return <LoginView />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PosApp />} />
        {/* Terminal view — Android 14 NFC phone */}
        <Route path="/terminal" element={<TerminalView />} />
        {/* Admin and Display apps — future */}
        <Route path="/admin" element={<PosApp />} />
        <Route path="/display" element={<div>Display TODO</div>} />
      </Routes>
    </BrowserRouter>
  );
}

