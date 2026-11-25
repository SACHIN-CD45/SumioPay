package com.sumiotech.sumiopay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

/**
 * Enterprise Bank SMS Listener Receiver
 * Automatically intercepts incoming Bank SMS messages:
 * SBI, HDFC, ICICI, Axis, PNB, Bank of Baroda, Kotak, Paytm Payments Bank, etc.
 * When payment credit message is detected, instantly dispatches webhook to SumioPay Backend.
 */
public class SmsListenerReceiver extends BroadcastReceiver {

    private static final String TAG = "SumioPaySms";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle == null) return;

            try {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus == null || pdus.length == 0) return;

                String format = bundle.getString("format");
                StringBuilder fullMessage = new StringBuilder();
                String sender = "BankSMS";

                for (Object pdu : pdus) {
                    SmsMessage sms;
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        sms = SmsMessage.createFromPdu((byte[]) pdu, format);
                    } else {
                        sms = SmsMessage.createFromPdu((byte[]) pdu);
                    }

                    if (sms != null) {
                        if (sms.getDisplayOriginatingAddress() != null) {
                            sender = sms.getDisplayOriginatingAddress();
                        }
                        fullMessage.append(sms.getMessageBody());
                    }
                }

                String message = fullMessage.toString().trim();
                if (message.isEmpty()) return;

                String lower = message.toLowerCase();

                // Check for payment credit keywords
                if (lower.contains("credited") || lower.contains("received") ||
                    lower.contains("paid you") || lower.contains("rs.") ||
                    lower.contains("inr") || lower.contains("₹") ||
                    lower.contains("upi ref") || lower.contains("utr") ||
                    lower.contains("deposited")) {

                    Log.i(TAG, "[$] Bank SMS Credit Alert Intercepted from [" + sender + "]: " + message);

                    // Dispatch immediately to SumioPay Central Backend
                    WebhookDispatcher.dispatch(
                            context,
                            "bank.sms." + sender.replaceAll("[^a-zA-Z0-9_.-]", "_"),
                            sender,
                            message,
                            System.currentTimeMillis(),
                            (success, code, resMsg) -> {
                                Log.i(TAG, "Bank SMS Webhook dispatched. Success=" + success + " Code=" + code);
                            }
                    );
                }

            } catch (Exception e) {
                Log.e(TAG, "Error processing incoming SMS: " + e.getMessage());
            }
        }
    }
}
