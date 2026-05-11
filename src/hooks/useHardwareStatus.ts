import { useState, useEffect } from 'react';
import { LCodeNative, DeviceStatus } from '@/utils/hardware';

export function useHardwareStatus() {
  const [status, setStatus] = useState<DeviceStatus>({
    connected: false,
    status: 'Zjišťování...',
    platform: 'web'
  });

  useEffect(() => {
    const update = async () => {
      const s = await LCodeNative.getStatus();
      setStatus(s);
    };

    const handleHardwareError = (e: any) => {
      setStatus(prev => ({ ...prev, error: e.detail }));
    };

    window.addEventListener('hardwareError', handleHardwareError);
    update();
    const timer = setInterval(update, 5000); // Poll every 5s

    return () => {
      clearInterval(timer);
      window.removeEventListener('hardwareError', handleHardwareError);
    };
  }, []);

  return { ...status, reconnect: LCodeNative.reconnect };
}
