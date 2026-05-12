package com.gasaan.pos;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import com.gasaan.pos.bridge.LCodeHardware;
import com.gasaan.pos.bridge.UsbHardwareManager;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final String ACTION_USB_PERMISSION = "com.gasaan.pos.USB_PERMISSION";

    private WebView mWebView;
    private UsbHardwareManager mUsbManager;
    private LCodeHardware mHardwareBridge;

    private final BroadcastReceiver mUsbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null) {
                            Log.i(TAG, "USB Permission granted for " + device.getDeviceName());
                            // Fix 3: Re-initialize connection now that we have permission
                            mUsbManager.initConnection();
                        }
                    } else {
                        Log.d(TAG, "USB Permission denied for " + device);
                    }
                }
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Fix 1: Enable WebChromeClient for potential dialogs (though we handle printing natively)
        mWebView.setWebChromeClient(new WebChromeClient());
        
        mUsbManager = new UsbHardwareManager(this);
        mHardwareBridge = new LCodeHardware(this, mWebView, mUsbManager);
        
        mWebView.addJavascriptInterface(mHardwareBridge, "LCodeHardware");

        // Register USB Receiver
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        registerReceiver(mUsbReceiver, filter);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        mWebView.loadUrl("https://gasaan-pos.vercel.app");
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(mUsbReceiver);
        if (mUsbManager != null) {
            mUsbManager.close();
        }
        super.onDestroy();
    }
}
