/**
 * usePrinter — Silent print via Android APK bridge.
 * Falls back to window.print() in non-APK environments.
 */
export function usePrinter() {
  const print = (receiptHtml: string) => {
    if (window.AndroidBridge?.print) {
      // Direct APK bridge — no system dialog
      window.AndroidBridge.print(receiptHtml);
    } else {
      // Fallback: browser print
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html><head>
            <style>
              body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
              @media print { body { margin: 0; } }
            </style>
          </head><body>${receiptHtml}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }
    }
  };

  const isAvailable = (): boolean => {
    return !!(window.AndroidBridge?.isAvailable?.());
  };

  return { print, isAvailable };
}
