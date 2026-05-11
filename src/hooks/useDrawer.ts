import { LCodeNative } from '@/utils/hardware';

/**
 * useDrawer — Cash drawer kick via RJ11 through APK bridge.
 */
export function useDrawer() {
  const kick = () => {
    try {
      LCodeNative.openDrawer();
      return true;
    } catch (e) {
      console.warn('[Drawer]', e);
      return false;
    }
  };

  const isAvailable = (): boolean => {
    return LCodeNative.getPlatform() === 'android';
  };

  return { kick, isAvailable };
}
