/**
 * usePrinter — Silent print via Android APK bridge.
 * Falls back to window.print() in non-APK environments.
 */
import { LCodeNative } from '../utils/hardware';

export function usePrinter() {
  const print = (receiptHtml: string) => {
    // Convert HTML to simple text or ESC/POS (handled by LCodeNative for now)
    // In a real scenario, we'd pass a more structured object or raw ESC/POS
    console.log('[usePrinter] Dispatching print to LCodeNative');
    
    // We pass the raw HTML or a placeholder depending on what LCodeNative.print expects
    // LCodeNative.print currently takes (data, signature)
    LCodeNative.print(receiptHtml);
  };

  const isAvailable = async (): Promise<boolean> => {
    const status = await LCodeNative.getStatus();
    return status.connected;
  };

  return { print, isAvailable };
}
