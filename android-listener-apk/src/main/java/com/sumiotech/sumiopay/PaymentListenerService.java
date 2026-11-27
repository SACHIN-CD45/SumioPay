package com.sumiotech.sumiopay;

import android.app.Notification;
import android.content.ComponentName;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

/**
 * SumioPay Enterprise Central Payment Listener Service
 * Intercepts incoming UPI credit notifications across all banking & UPI apps:
 * PhonePe, Paytm, Google Pay, BHIM, HDFC, ICICI, SBI, Axis, and Bank SMS.
 * Automatically posts to the SumioPay Central Backend Gateway.
 */
public class PaymentListenerService extends NotificationListenerService {

    private static final String TAG = "SumioPayListener";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || packageName.equals(getPackageName())) return;

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

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "PaymentListenerService connected and active!");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "PaymentListenerService disconnected. Re-requesting bind.");
        requestRebind(new ComponentName(this, PaymentListenerService.class));
    }
}
