package com.sumiotech.sumiopay;

import android.app.Notification;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.BatteryManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * SumioPay Enterprise Central Payment Listener Service
 * Intercepts incoming UPI credit notifications across all banking & UPI apps:
 * PhonePe, Paytm, Google Pay, BHIM, HDFC, ICICI, SBI, Axis, and Bank SMS.
 * Automatically posts to the SumioPay Central Backend Gateway.
 */
public class PaymentListenerService extends NotificationListenerService {

    private static final String TAG = "SumioPayListener";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // Whitelisted Banking & UPI Package Names
    private static final Set<String> MONITORED_PACKAGES = new HashSet<>(Arrays.asList(
            "com.phonepe.app",                                // PhonePe Personal
            "com.phonepe.merchant",                          // PhonePe Business
            "net.one97.paytm",                               // Paytm
            "com.google.android.apps.nbu.paisa.user",        // Google Pay
            "in.org.npci.upiapp",                            // BHIM NPCI
            "com.snapwork.hdfc",                             // HDFC Mobile
            "com.csam.icici.bank.imobile",                   // ICICI iMobile
            "com.sbi.upi",                                   // SBI Yono / UPI
            "com.axis.mobile",                               // Axis Mobile
            "com.msf.kopl",                                  // Kotak 811
            "com.google.android.apps.messaging",             // Android Default SMS
            "com.samsung.android.messaging"                  // Samsung SMS
    ));

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Extract Notification Content
        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = extras.getString(Notification.EXTRA_TITLE, "");
        CharSequence charSeqText = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence charSeqBigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String message = charSeqBigText != null ? charSeqBigText.toString() :
                (charSeqText != null ? charSeqText.toString() : "");

        if (message.isEmpty() && title.isEmpty()) return;

        String combined = (title + " " + message).toLowerCase();

        // Fast Filter: Only process if message contains payment keywords
        if (combined.contains("received") || combined.contains("credited") ||
                combined.contains("paid you") || combined.contains("rs.") ||
                combined.contains("inr") || combined.contains("₹") ||
                combined.contains("upi ref") || combined.contains("utr")) {

            Log.i(TAG, "[$] Intercepted UPI Alert from " + packageName + ": " + message);
            WebhookDispatcher.dispatch(this, packageName, title, message, sbn.getPostTime(), (success, code, resMsg) -> {
                Log.i(TAG, "Notification Webhook dispatched. Success=" + success + " Code=" + code);
            });
        }
    }

    private void dispatchToCentralBackend(String packageName, String title, String message, long postTime) {
        SharedPreferences prefs = getSharedPreferences("SumioPayPrefs", Context.MODE_PRIVATE);
        String serverUrl = prefs.getString("server_url", "https://apipay.sumiotech.in");
        String deviceToken = prefs.getString("device_token", "");

        if (deviceToken.isEmpty()) {
            Log.w(TAG, "Device not paired yet. Skipping webhook dispatch.");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                // Post to Central Backend endpoint
                URL url = new URL(serverUrl + "/api/central-payment/verify-webhook");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("x-device-token", deviceToken);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("secret_key", deviceToken);
                payload.put("deviceToken", deviceToken);
                payload.put("package_name", packageName);
                payload.put("title", title);
                payload.put("message", message);
                payload.put("post_time", postTime);

                byte[] postData = payload.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(postData);
                    os.flush();
                }

                int responseCode = conn.getResponseCode();
                Log.i(TAG, "Webhook dispatched successfully. Response Code: " + responseCode);

            } catch (Exception e) {
                Log.e(TAG, "Failed to send webhook to central server: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "PaymentListenerService connected and active!");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "PaymentListenerService disconnected. Re-requesting bind.");
        requestRebind(new android.content.ComponentName(this, PaymentListenerService.class));
    }
}
