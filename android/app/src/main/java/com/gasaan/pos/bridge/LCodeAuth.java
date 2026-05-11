package com.gasaan.pos.bridge;

import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.gasaan.pos.MainActivity;
import org.json.JSONObject;

public class LCodeAuth {
    private static final String TAG = "LCodeAuth";
    private static final int RC_SIGN_IN = 9001;
    
    private MainActivity mActivity;
    private WebView mWebView;
    private GoogleSignInClient mGoogleSignInClient;

    public LCodeAuth(MainActivity activity, WebView webView) {
        this.mActivity = activity;
        this.mWebView = webView;

        // Configure Google Sign-In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .requestIdToken("20856244890-5l6ptei4q6i6615c2jq0g9h7t3q7v8ct.apps.googleusercontent.com")
                .build();

        mGoogleSignInClient = GoogleSignIn.getClient(activity, gso);
    }

    @JavascriptInterface
    public void signIn() {
        Log.d(TAG, "signIn: Starting Google Sign-In flow");
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        mActivity.startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    @JavascriptInterface
    public void signOut() {
        mGoogleSignInClient.signOut().addOnCompleteListener(mActivity, task -> {
            sendToWeb("onSignOut", "success");
        });
    }

    public void handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    JSONObject result = new JSONObject();
                    result.put("email", account.getEmail());
                    result.put("displayName", account.getDisplayName());
                    result.put("idToken", account.getIdToken());
                    result.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);
                    
                    sendToWeb("onSignInSuccess", result.toString());
                }
            } catch (Exception e) {
                Log.e(TAG, "signInResult:failed code=" + e.getMessage());
                sendToWeb("onSignInFailure", e.getMessage());
            }
        }
    }

    private void sendToWeb(final String callback, final String payload) {
        mActivity.runOnUiThread(() -> {
            String script = String.format("window.LCodeNative.%s(%s);", callback, payload.startsWith("{") ? payload : "'" + payload + "'");
            mWebView.evaluateJavascript(script, null);
        });
    }
}
