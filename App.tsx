import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, BackHandler } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

/**
 * Imperial POS - iOS Native Shell
 * This shell wraps the web application and provides access to native hardware.
 */

const PRODUCTION_URL = 'https://gasaan-pos.vercel.app';

export default function App() {
  const webViewRef = useRef<WebView>(null);

  // Handle Android back button
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, []);

  const injectedJavaScript = `
    (function() {
      if (!window.webkit) window.webkit = {};
      if (!window.webkit.messageHandlers) window.webkit.messageHandlers = {};
      
      window.webkit.messageHandlers.LCodeHardware = {
        postMessage: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      };

      window.LCodeHardware = {
        printReceipt: function(payload) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ command: 'print', payload: payload }));
        },
        openDrawer: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ command: 'openDrawer' }));
        },
        getDeviceStatus: function() {
          return JSON.stringify({ connected: true, status: 'iOS_SHELL' });
        }
      };

      console.log('Imperial POS Native Bridge Initialized');
    })();
    true;
  `;

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Native] Received message:', data);

      switch (data.command) {
        case 'print':
          console.log('[Native] Printing receipt...', data.payload);
          break;
        case 'openDrawer':
          console.log('[Native] Opening cash drawer...');
          break;
        default:
          console.warn('[Native] Unknown command:', data.command);
      }
    } catch (e) {
      console.error('[Native] Failed to parse message:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: PRODUCTION_URL }}
          style={styles.webview}
          injectedJavaScript={injectedJavaScript}
          onMessage={onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsBackForwardNavigationGestures={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webviewContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
