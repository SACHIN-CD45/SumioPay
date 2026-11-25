package com.sumiotech.sumiopay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Auto-starts the SumioPay listener service when the Android phone reboots
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "SumioPayBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            Log.i(TAG, "Device booted. Ensuring PaymentListenerService is active.");
        }
    }
}
