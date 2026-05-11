# Keep the Hardware Bridge
-keepclassmembers class com.gasaan.pos.bridge.LCodeHardware {
   @android.webkit.JavascriptInterface <methods>;
}

# Keep the bridge package
-keep class com.gasaan.pos.bridge.** { *; }
