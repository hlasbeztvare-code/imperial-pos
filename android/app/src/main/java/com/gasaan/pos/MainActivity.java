package com.gasaan.pos;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import com.gasaan.pos.bridge.LCodeAuth;
import com.gasaan.pos.bridge.LCodeHardware;
import com.gasaan.pos.bridge.UsbHardwareManager;

public class MainActivity extends AppCompatActivity {
    private WebView mWebView;
    private UsbHardwareManager mUsbManager;
    private LCodeHardware mHardwareBridge;
    private LCodeAuth mAuthBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup WebView first so we can pass it to bridges
        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Initialize Hardware
        mUsbManager = new UsbHardwareManager(this);
        mHardwareBridge = new LCodeHardware(this, mWebView, mUsbManager);
        
        // Initialize Auth
        mAuthBridge = new LCodeAuth(this, mWebView);

        // Inject the Bridges
        mWebView.addJavascriptInterface(mHardwareBridge, "LCodeHardware");
        mWebView.addJavascriptInterface(mAuthBridge, "LCodeAuth");

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        // Load the Vercel Frontend
        mWebView.loadUrl("https://gasaan-pos.vercel.app");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (mAuthBridge != null) {
            mAuthBridge.handleActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    protected void onDestroy() {
        if (mUsbManager != null) {
            mUsbManager.close();
        }
        super.onDestroy();
    }
}

