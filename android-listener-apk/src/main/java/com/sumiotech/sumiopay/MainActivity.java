package com.sumiotech.sumiopay;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * SumioPay Enterprise Android Listener Activity
 * Bridges Capacitor-style HTML5/CSS3 Web UI with native Android SMS and Notification listeners.
 */
public class MainActivity extends Activity {

    private static final String TAG = "SumioPayActivity";
    private static final int SMS_PERMISSION_REQ_CODE = 1001;

    private WebView webView;
    private final ScheduledExecutorService heartbeatScheduler = Executors.newSingleThreadScheduledExecutor();

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new SumioNativeBridge(this), "SumioNativeBridge");

        setContentView(webView);
        webView.loadUrl("file:///android_asset/public/index.html");

        startHeartbeatLoop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        notifyWebUiStateChange();
    }

    private void notifyWebUiStateChange() {
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript("if (window.onNativeStateChanged) window.onNativeStateChanged();", null));
        }
    }

    private void startHeartbeatLoop() {
        heartbeatScheduler.scheduleWithFixedDelay(() -> {
            SharedPreferences prefs = getSharedPreferences(WebhookDispatcher.PREFS_NAME, Context.MODE_PRIVATE);
            String token = prefs.getString("device_token", "");
            String server = prefs.getString("server_url", "https://apipay.sumiotech.in");

            if (token == null || token.isEmpty()) return;

            try {
                URL url = new URL(server.trim() + "/api/device/heartbeat");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("x-device-token", token);
                conn.setConnectTimeout(5000);
                conn.setDoOutput(true);

                BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
                int batLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : 100;

                JSONObject payload = new JSONObject();
                payload.put("batteryPercent", batLevel);
                payload.put("isCharging", true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                conn.getResponseCode();
            } catch (Exception e) {
                Log.d(TAG, "Heartbeat failed: " + e.getMessage());
            }
        }, 10, 45, TimeUnit.SECONDS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQ_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                Toast.makeText(this, "SMS Interception Access Granted!", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "SMS Permission was denied.", Toast.LENGTH_SHORT).show();
            }
            notifyWebUiStateChange();
        }
    }

    /**
     * Native JavaScript Bridge exposed to the Capacitor Web UI
     */
    public class SumioNativeBridge {
        private final Activity activity;

        public SumioNativeBridge(Activity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public String getStatus() {
            try {
                JSONObject json = new JSONObject();

                // 1. Notification Permission Check
                boolean notifGranted = isNotificationServiceEnabled();
                json.put("isNotificationGranted", notifGranted);
                json.put("isSmsGranted", notifGranted);

                // 3. Battery Optimization Check
                PowerManager pm = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
                boolean ignoringBattery = (pm == null) || pm.isIgnoringBatteryOptimizations(activity.getPackageName());
                json.put("isBatteryIgnoring", ignoringBattery);

                // 4. Stored Preferences
                SharedPreferences prefs = activity.getSharedPreferences(WebhookDispatcher.PREFS_NAME, Context.MODE_PRIVATE);
                String deviceToken = prefs.getString("device_token", "");
                String serverUrl = prefs.getString("server_url", "https://apipay.sumiotech.in");
                json.put("isPaired", !deviceToken.isEmpty());
                json.put("deviceToken", deviceToken);
                json.put("serverUrl", serverUrl);

                // 5. Battery percentage
                BatteryManager bm = (BatteryManager) activity.getSystemService(BATTERY_SERVICE);
                int batLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : 100;
                json.put("batteryPercent", batLevel);

                return json.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            activity.startActivity(intent);
        }

        @JavascriptInterface
        public void requestSmsPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                activity.requestPermissions(
                        new String[]{"android.permission.POST_NOTIFICATIONS"},
                        SMS_PERMISSION_REQ_CODE
                );
            }
            Toast.makeText(activity, "UPI & Bank SMS alerts are auto-captured via Notification Listener!", Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public void openAppSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + activity.getPackageName()));
                activity.startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error opening app settings: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void disableBatteryOptimization() {
            try {
                PowerManager pm = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(activity.getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + activity.getPackageName()));
                    activity.startActivity(intent);
                } else {
                    Toast.makeText(activity, "Battery optimization already disabled!", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Log.e(TAG, "Error opening battery optimization: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public String getClipboardText() {
            try {
                ClipboardManager cm = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null && cm.hasPrimaryClip() && cm.getPrimaryClip().getItemCount() > 0) {
                    CharSequence text = cm.getPrimaryClip().getItemAt(0).getText();
                    return text != null ? text.toString().trim() : "";
                }
            } catch (Exception ignored) {}
            return "";
        }

        @JavascriptInterface
        public void pairDevice(String serverUrl, String pairingToken) {
            String rawUrl = serverUrl != null && !serverUrl.trim().isEmpty() ? serverUrl.trim() : "https://apipay.sumiotech.in";
            String cleanUrl = rawUrl.replaceAll("/+$", "");
            String cleanToken = pairingToken != null ? pairingToken.trim() : "";

            SharedPreferences prefs = activity.getSharedPreferences(WebhookDispatcher.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString("server_url", cleanUrl).apply();

            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    URL url = new URL(cleanUrl + "/api/device/pair");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setConnectTimeout(8000);
                    conn.setDoOutput(true);

                    BatteryManager bm = (BatteryManager) activity.getSystemService(BATTERY_SERVICE);
                    int batLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : 100;

                    JSONObject body = new JSONObject();
                    body.put("pairingToken", cleanToken);
                    body.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
                    body.put("androidVersion", Build.VERSION.RELEASE);
                    body.put("batteryPercent", batLevel);
                    body.put("isCharging", true);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    int code = conn.getResponseCode();
                    if (code == 200) {
                        java.io.InputStream is = conn.getInputStream();
                        java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
                        String resStr = s.hasNext() ? s.next() : "";
                        JSONObject json = new JSONObject(resStr);

                        if (json.optBoolean("success")) {
                            String deviceToken = json.getJSONObject("data").getString("deviceToken");
                            prefs.edit().putString("device_token", deviceToken).apply();

                            activity.runOnUiThread(() -> {
                                Toast.makeText(activity, "Device Paired Successfully!", Toast.LENGTH_LONG).show();
                                notifyWebUiStateChange();
                            });
                            return;
                        }
                    }

                    // Extract actual error description from server
                    String errMsg = "Pairing Failed (HTTP " + code + ")";
                    try {
                        java.io.InputStream es = conn.getErrorStream();
                        if (es != null) {
                            java.util.Scanner s = new java.util.Scanner(es).useDelimiter("\\A");
                            String errStr = s.hasNext() ? s.next() : "";
                            JSONObject json = new JSONObject(errStr);
                            if (json.has("message")) {
                                errMsg = json.getString("message");
                            }
                        }
                    } catch (Exception ignored) {}

                    final String finalErrMsg = errMsg;
                    activity.runOnUiThread(() -> {
                        Toast.makeText(activity, finalErrMsg, Toast.LENGTH_LONG).show();
                        notifyWebUiStateChange();
                    });

                } catch (Exception e) {
                    activity.runOnUiThread(() -> {
                        Toast.makeText(activity, "Connection error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        notifyWebUiStateChange();
                    });
                }
            });
        }

        @JavascriptInterface
        public void unpairDevice() {
            SharedPreferences prefs = activity.getSharedPreferences(WebhookDispatcher.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove("device_token").apply();
            activity.runOnUiThread(() -> {
                Toast.makeText(activity, "Device disconnected. Paste a new pairing token to link.", Toast.LENGTH_SHORT).show();
                notifyWebUiStateChange();
            });
        }

        @JavascriptInterface
        public String getLogs() {
            SharedPreferences prefs = activity.getSharedPreferences(WebhookDispatcher.PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getString("intercept_logs", "[]");
        }

        @JavascriptInterface
        public void simulateTestAlert(double amount, String utr) {
            String testMessage = "Rs." + String.format(java.util.Locale.US, "%.2f", amount) +
                    " credited to your A/c XX8920 on " + new java.util.Date() +
                    " by UPI/" + utr + " (PhonePe Test Alert)";

            WebhookDispatcher.dispatch(
                    activity,
                    "com.phonepe.simulator",
                    "Credit Alert",
                    testMessage,
                    System.currentTimeMillis(),
                    (success, code, resMsg) -> {
                        activity.runOnUiThread(() -> {
                            if (success) {
                                Toast.makeText(activity, "Simulated Webhook Dispatched (HTTP " + code + ")!", Toast.LENGTH_LONG).show();
                            } else {
                                Toast.makeText(activity, "Dispatch Failed: " + resMsg, Toast.LENGTH_LONG).show();
                            }
                            notifyWebUiStateChange();
                        });
                    }
            );
        }

        private boolean isNotificationServiceEnabled() {
            String pkgName = activity.getPackageName();
            final String flat = Settings.Secure.getString(activity.getContentResolver(), "enabled_notification_listeners");
            if (!TextUtils.isEmpty(flat)) {
                final String[] names = flat.split(":");
                for (String name : names) {
                    final ComponentName cn = ComponentName.unflattenFromString(name);
                    if (cn != null && TextUtils.equals(pkgName, cn.getPackageName())) {
                        return true;
                    }
                }
            }
            return false;
        }
    }
}
