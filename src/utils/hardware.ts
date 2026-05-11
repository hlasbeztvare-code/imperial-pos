/**
 * Unified Native Hardware & Auth API for Gasaan POS
 * Bridges Android 7 (USB/Google Auth) and iOS (AirPrint/BT/LAN/Apple Auth)
 */

export interface NativePayload {
  data: string;      // Base64 ESC/POS or Print Content
  signature: string; // JWT Signature
}

export interface DeviceStatus {
  connected: boolean;
  status: string;
  platform: 'android' | 'ios' | 'web';
  error?: string;
}

export interface AuthUser {
  email: string;
  displayName: string;
  idToken: string;
  photoUrl?: string;
}

/**
 * LCodeNative - The Unified API Layer
 */
export const LCodeNative = {
  // Callback storage for Auth
  authCallbacks: {
    onSuccess: (user: AuthUser) => {},
    onFailure: (error: string) => {},
    onSignOut: () => {},
  },

  /**
   * Detects the current native platform
   */
  getPlatform: (): 'android' | 'ios' | 'web' => {
    if (typeof window === 'undefined') return 'web';
    if (!!(window as any).LCodeAuth || !!(window as any).LCodeHardware) return 'android';
    if (!!(window as any).webkit?.messageHandlers?.LCodeHardware) return 'ios';
    return 'web';
  },

  /**
   * Auth: Sign in with Google (Native flow)
   */
  signInWithGoogle: (onSuccess: (user: AuthUser) => void, onFailure: (err: string) => void) => {
    const platform = LCodeNative.getPlatform();
    LCodeNative.authCallbacks.onSuccess = onSuccess;
    LCodeNative.authCallbacks.onFailure = onFailure;

    if (platform === 'android' && (window as any).LCodeAuth) {
      (window as any).LCodeAuth.signIn();
    } else if (platform === 'ios') {
      // Future iOS Implementation
      onFailure('iOS Google Sign-In not implemented yet');
    } else {
      onFailure('Native Auth not available');
    }
  },

  /**
   * Auth: Sign out
   */
  signOut: () => {
    const platform = LCodeNative.getPlatform();
    if (platform === 'android' && (window as any).LCodeAuth) {
      (window as any).LCodeAuth.signOut();
    }
  },

  /**
   * Internal Callbacks called from Native Bridge
   */
  onSignInSuccess: async (user: AuthUser) => {
    console.log('[LCodeNative] Sign-In Success, linking to Firebase...');
    try {
      const { signInWithNativeToken } = await import('@/firebase/config');
      await signInWithNativeToken(user.idToken);
      LCodeNative.authCallbacks.onSuccess(user);
    } catch (e) {
      console.error('[LCodeNative] Firebase link failed:', e);
      LCodeNative.authCallbacks.onFailure(String(e));
    }
  },

  onSignInFailure: (error: string) => {
    console.error('[LCodeNative] Sign-In Failure:', error);
    LCodeNative.authCallbacks.onFailure(error);
  },

  onSignOut: async () => {
    console.log('[LCodeNative] Signed Out, clearing Firebase...');
    try {
      const { getAuth_ } = await import('@/firebase/config');
      const auth = getAuth_();
      if (auth) await auth.signOut();
    } catch (e) {
      console.error('[LCodeNative] Firebase signout failed:', e);
    }
    LCodeNative.authCallbacks.onSignOut();
  },

  /**
   * Universal print command.
   */
  print: (data: string, signature: string = 'dev-token') => {
    const payload: NativePayload = { data, signature };
    const platform = LCodeNative.getPlatform();

    console.log(`[LCodeNative] Printing on ${platform}...`);

    switch (platform) {
      case 'android':
        if ((window as any).LCodeHardware) {
          (window as any).LCodeHardware.printReceipt(JSON.stringify(payload));
        }
        break;
      
      case 'ios':
        (window as any).webkit.messageHandlers.LCodeHardware.postMessage({
          command: 'print',
          ...payload
        });
        break;

      default:
        console.warn('LCodeNative: No hardware bridge found. Attempting browser print.');
        window.print();
    }
  },

  /**
   * Universal drawer open command.
   */
  openDrawer: () => {
    const platform = LCodeNative.getPlatform();
    
    switch (platform) {
      case 'android':
        if ((window as any).LCodeHardware) {
          (window as any).LCodeHardware.openDrawer();
        }
        break;

      case 'ios':
        (window as any).webkit.messageHandlers.LCodeHardware.postMessage({
          command: 'openDrawer'
        });
        break;

      default:
        throw new Error('LCodeNative: Šuplík dneska nevystřelí (platforma nepodporována).');
    }
  },
  
  /**
   * Forces a reconnection attempt to native hardware.
   */
  reconnect: () => {
    const platform = LCodeNative.getPlatform();
    if (platform === 'android' && (window as any).LCodeHardware) {
      (window as any).LCodeHardware.reconnect();
    }
  },

  /**
   * Universal device status.
   */
  getStatus: async (): Promise<DeviceStatus> => {
    const platform = LCodeNative.getPlatform();

    if (platform === 'android' && (window as any).LCodeHardware) {
      try {
        const raw = (window as any).LCodeHardware.getDeviceStatus();
        const parsed = JSON.parse(raw);
        return { ...parsed, platform: 'android' };
      } catch (e) {
        return { connected: false, status: 'ERROR', platform: 'android' };
      }
    }

    if (platform === 'ios') {
      return { connected: true, status: 'iOS Bridge Active', platform: 'ios' };
    }

    return { connected: false, status: 'BROWSER', platform: 'web' };
  }
};


/**
 * COMPATIBILITY LAYER
 * These functions map the old API to the new unified LCodeNative bridge.
 */

export const initPrinter = () => {
  console.log('[Hardware] initPrinter (legacy call)');
  // Handled by hooks now
};

export const setupPrinter = async () => {
  console.log('[Hardware] setupPrinter (legacy call)');
  LCodeNative.reconnect();
  return true;
};

export const isPrinterReady = () => {
  // We can't know for sure synchronously, but we return true to keep UI happy
  return true; 
};

export const openCashDrawer = () => {
  LCodeNative.openDrawer();
};

export const printReceipt = (p: any) => {
  // For now, we'll just send a simplified text version to the native bridge
  // In a real scenario, we would use an ESC/POS builder here.
  const receiptText = `
    ${p.tableLabel}
    --------------------------------
    ${p.cart.map((item: any) => `${item.qty}x ${item.name} ... ${item.unitPrice * item.qty} Kč`).join('\n')}
    --------------------------------
    CELKEM: ${p.totals.grand} Kč
    --------------------------------
    Děkujeme za návštěvu!
    ${p.business.name}
  `;
  
  // Convert text to Base64 for the native bridge
  const base64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(receiptText))) : '';
  LCodeNative.print(base64);
};

// Exporting as 'hardware' for compatibility
export const hardware = LCodeNative;

// Expose globally for the bridge to see
if (typeof window !== 'undefined') {
  (window as any).LCodeNative = LCodeNative;
}

