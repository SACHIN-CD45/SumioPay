package com.sumiotech.sumiopay;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Enterprise Webhook Dispatcher
 * Dispatches intercepted SMS and Notification credit alerts to the SumioPay Central Backend.
 * Also keeps an in-app audit log for the Capacitor Web UI.
 */
public class WebhookDispatcher {

    private static final String TAG = "SumioPayDispatcher";
    public static final String PREFS_NAME = "SumioPayPrefs";
    private static final ExecutorService EXECUTOR = Executors.newFixedThreadPool(2);

    public interface DispatchCallback {
        void onResult(boolean success, int responseCode, String message);
    }

    public static void dispatch(Context context, String packageName, String title, String message, long postTime, DispatchCallback callback) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String serverUrl = prefs.getString("server_url", "https://apipay.sumiotech.in");
        String deviceToken = prefs.getString("device_token", "");

        if (deviceToken == null || deviceToken.trim().isEmpty()) {
            Log.w(TAG, "Device not paired yet. Skipping webhook dispatch.");
            if (callback != null) callback.onResult(false, 401, "Device not paired");
            return;
        }

        EXECUTOR.execute(() -> {
            HttpURLConnection conn = null;
            int responseCode = -1;
            boolean success = false;
            String resultMsg = "";

            try {
                URL url = new URL(serverUrl.trim() + "/api/central-payment/verify-webhook");
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
                payload.put("package_name", packageName != null ? packageName : "generic.payment");
                payload.put("title", title != null ? title : "");
                payload.put("message", message);
                payload.put("post_time", postTime > 0 ? postTime : System.currentTimeMillis());

                byte[] postData = payload.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(postData);
                    os.flush();
                }

                responseCode = conn.getResponseCode();
                success = (responseCode >= 200 && responseCode < 300);
                resultMsg = "HTTP " + responseCode;
                Log.i(TAG, "[$] Dispatched to " + serverUrl + " -> " + responseCode);

                // Save to local UI audit log
                saveLog(context, packageName, title, message, success, responseCode);

            } catch (Exception e) {
                Log.e(TAG, "Failed to dispatch webhook: " + e.getMessage());
                resultMsg = e.getMessage();
                saveLog(context, packageName, title, message, false, 500);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }

            if (callback != null) {
                callback.onResult(success, responseCode, resultMsg);
            }
        });
    }

    private static synchronized void saveLog(Context context, String pkg, String title, String message, boolean success, int code) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String logsStr = prefs.getString("intercept_logs", "[]");
            JSONArray logs = new JSONArray(logsStr);

            JSONObject item = new JSONObject();
            item.put("timestamp", System.currentTimeMillis());
            item.put("source", pkg);
            item.put("title", title);
            item.put("message", message);
            item.put("success", success);
            item.put("code", code);

            // Keep max 25 recent items
            JSONArray updated = new JSONArray();
            updated.put(item);
            for (int i = 0; i < Math.min(logs.length(), 24); i++) {
                updated.put(logs.get(i));
            }

            prefs.edit().putString("intercept_logs", updated.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error saving log: " + e.getMessage());
        }
    }
}
