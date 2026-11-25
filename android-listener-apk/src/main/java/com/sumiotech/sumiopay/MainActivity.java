package com.sumiotech.sumiopay;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {

    private static final String TAG = "SumioPayMain";
    private TextView tvStatus, tvDeviceInfo;
    private EditText etServerUrl, etPairingToken;
    private Button btnGrantPermission, btnPair, btnBatteryOptimization;
    private final ScheduledExecutorService heartbeatScheduler = Executors.newSingleThreadScheduledExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Simple programmatic modern UI
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(48, 64, 48, 48);
        layout.setBackgroundColor(0xFF0F172A); // Dark slate background

        TextView title = new TextView(this);
        title.setText("SumioPay Android Listener");
        title.setTextSize(22);
        title.setTextColor(0xFFFFFFFF);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        layout.addView(title);

        tvStatus = new TextView(this);
        tvStatus.setText("Status: Checking permissions...");
        tvStatus.setTextSize(13);
        tvStatus.setTextColor(0xFF94A3B8);
        tvStatus.setPadding(0, 16, 0, 32);
        layout.addView(tvStatus);

        btnGrantPermission = new Button(this);
        btnGrantPermission.setText("1. Grant Notification Access");
        btnGrantPermission.setBackgroundColor(0xFF2563EB);
        btnGrantPermission.setTextColor(0xFFFFFFFF);
        btnGrantPermission.setOnClickListener(v -> openNotificationSettings());
        layout.addView(btnGrantPermission);

        btnBatteryOptimization = new Button(this);
        btnBatteryOptimization.setText("2. Disable Battery Optimization");
        btnBatteryOptimization.setBackgroundColor(0xFF334155);
        btnBatteryOptimization.setTextColor(0xFFFFFFFF);
        btnBatteryOptimization.setPadding(0, 16, 0, 16);
        btnBatteryOptimization.setOnClickListener(v -> requestIgnoreBatteryOptimization());
        layout.addView(btnBatteryOptimization);

        TextView labelServer = new TextView(this);
        labelServer.setText("\nServer URL:");
        labelServer.setTextColor(0xFFCBD5E1);
        layout.addView(labelServer);

        etServerUrl = new EditText(this);
        etServerUrl.setText(getServerUrl());
        etServerUrl.setTextColor(0xFFFFFFFF);
        layout.addView(etServerUrl);

        TextView labelToken = new TextView(this);
        labelToken.setText("Pairing Token (From Merchant Console):");
        labelToken.setTextColor(0xFFCBD5E1);
        layout.addView(labelToken);

        etPairingToken = new EditText(this);
        etPairingToken.setHint("pair_xxxxxxxxxxxx");
        etPairingToken.setTextColor(0xFFFFFFFF);
        layout.addView(etPairingToken);

        btnPair = new Button(this);
        btnPair.setText("Complete Device Pairing");
        btnPair.setBackgroundColor(0xFF059669);
        btnPair.setTextColor(0xFFFFFFFF);
        btnPair.setOnClickListener(v -> completeDevicePairing());
        layout.addView(btnPair);

        tvDeviceInfo = new TextView(this);
        tvDeviceInfo.setTextColor(0xFF6EE7B7);
        tvDeviceInfo.setPadding(0, 32, 0, 0);
        layout.addView(tvDeviceInfo);

        setContentView(layout);

        checkStatus();
        startHeartbeatLoop();
    }

    private void openNotificationSettings() {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        startActivity(intent);
    }

    private void requestIgnoreBatteryOptimization() {
        try {
            Intent intent = new Intent();
            String packageName = getPackageName();
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + packageName));
                startActivity(intent);
            } else {
                Toast.makeText(this, "Battery optimization already disabled!", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization: " + e.getMessage());
        }
    }

    private boolean isNotificationServiceEnabled() {
        String pkgName = getPackageName();
        final String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
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

    private void checkStatus() {
        boolean enabled = isNotificationServiceEnabled();
        SharedPreferences prefs = getSharedPreferences("SumioPayPrefs", Context.MODE_PRIVATE);
        String deviceToken = prefs.getString("device_token", "");

        if (!enabled) {
            tvStatus.setText("🔴 Notification Access NOT granted. Click Button 1.");
            tvStatus.setTextColor(0xFFF87171);
        } else if (deviceToken.isEmpty()) {
            tvStatus.setText("🟡 Notification Access Active. Device Not Paired.");
            tvStatus.setTextColor(0xFFFBBF24);
        } else {
            tvStatus.setText("🟢 ACTIVE & LISTENING for Bank Credits!");
            tvStatus.setTextColor(0xFF34D399);
            tvDeviceInfo.setText("Paired Token: " + deviceToken.substring(0, Math.min(deviceToken.length(), 14)) + "...");
        }
    }

    private void completeDevicePairing() {
        String urlStr = etServerUrl.getText().toString().trim();
        String pairingToken = etPairingToken.getText().toString().trim();

        if (urlStr.isEmpty() || pairingToken.isEmpty()) {
            Toast.makeText(this, "Please enter Server URL & Pairing Token", Toast.LENGTH_SHORT).show();
            return;
        }

        saveServerUrl(urlStr);

        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                URL url = new URL(urlStr + "/api/device/pair");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(8000);
                conn.setDoOutput(true);

                BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
                int batLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : 100;

                JSONObject body = new JSONObject();
                body.put("pairingToken", pairingToken);
                body.put("deviceModel", android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL);
                body.put("androidVersion", android.os.Build.VERSION.RELEASE);
                body.put("batteryPercent", batLevel);
                body.put("isCharging", true);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }

                if (conn.getResponseCode() == 200) {
                    java.io.InputStream is = conn.getInputStream();
                    java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
                    String resStr = s.hasNext() ? s.next() : "";
                    JSONObject json = new JSONObject(resStr);

                    if (json.optBoolean("success")) {
                        String deviceToken = json.getJSONObject("data").getString("deviceToken");
                        SharedPreferences prefs = getSharedPreferences("SumioPayPrefs", Context.MODE_PRIVATE);
                        prefs.edit().putString("device_token", deviceToken).apply();

                        runOnUiThread(() -> {
                            Toast.makeText(MainActivity.this, "Device Paired Successfully!", Toast.LENGTH_LONG).show();
                            checkStatus();
                        });
                    }
                }
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Pairing error: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void startHeartbeatLoop() {
        heartbeatScheduler.scheduleWithFixedDelay(() -> {
            SharedPreferences prefs = getSharedPreferences("SumioPayPrefs", Context.MODE_PRIVATE);
            String token = prefs.getString("device_token", "");
            String server = prefs.getString("server_url", "https://apipay.sumiotech.in");

            if (token.isEmpty()) return;

            try {
                URL url = new URL(server + "/api/device/heartbeat");
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

    private String getServerUrl() {
        return getSharedPreferences("SumioPayPrefs", Context.MODE_PRIVATE)
                .getString("server_url", "https://apipay.sumiotech.in");
    }

    private void saveServerUrl(String url) {
        getSharedPreferences("SumioPayPrefs", Context.MODE_PRIVATE)
                .edit().putString("server_url", url).apply();
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkStatus();
    }
}
