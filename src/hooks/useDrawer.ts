/**
 * useDrawer — Cash drawer kick via RJ11 through APK bridge.
 * The Android APK sends a pulse to the RJ11 port on the receipt printer
 * which triggers the cash drawer solenoid.
 */
export function useDrawer() {
  const kick = () => {
    if (window.AndroidBridge?.openDrawer) {
      // Direct APK bridge — kick drawer via RJ11
      window.AndroidBridge.openDrawer();
      return true;
    }
    console.warn('[Drawer] No APK bridge available — drawer not connected');
    return false;
  };

  const isAvailable = (): boolean => {
    return !!(window.AndroidBridge?.openDrawer);
  };

  return { kick, isAvailable };
}
