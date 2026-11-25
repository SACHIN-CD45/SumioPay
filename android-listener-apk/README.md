# SumioPay Android Payment Listener APK

This native Android application intercepts incoming UPI payment push alerts and bank SMS notifications and dispatches them in real-time (< 2 seconds) to your **SumioPay Central Gateway**.

---

### Key Capabilities
1. **Zero-Delay Notification Interceptor**: Uses Android `NotificationListenerService` to immediately capture push alerts from PhonePe, Paytm, Google Pay, BHIM, and bank SMS (HDFC, ICICI, SBI, Axis, etc.).
2. **Auto-Start on Boot**: Uses `BootReceiver` so the service restarts automatically if the phone restarts.
3. **Heartbeat & Battery Monitoring**: Transmits battery level (%) and online state to your SumioPay dashboard every 45 seconds.
4. **Universal Multi-App Support**: One single phone installation verifies payments across **all** SumioTech products (`SumioLab`, `SumioBilling`, `SumioBook`, `SumioJewel`, ERP) and any external SaaS clients.

---

### Setup & Installation
1. Open this directory in **Android Studio** (or compile via Gradle: `./gradlew assembleRelease`).
2. Install the generated `.apk` on any Android smartphone receiving payments on your merchant UPI ID.
3. Open the app on the phone:
   - Tap **1. Grant Notification Access** and toggle ON **SumioPay Listener**.
   - Tap **2. Disable Battery Optimization** so Android background managers don't kill the service.
   - Enter your **Server URL** (e.g., `https://your-domain.com` or `http://192.168.1.100:8090`).
   - Enter your **Pairing Token** (generated from the SumioPay Merchant Console -> Listener Phones).
   - Tap **Complete Device Pairing**.
4. The status turns **GREEN (ACTIVE & LISTENING)**. Keep the phone plugged into a charger or active on Wi-Fi/4G. All customer UPI payments are now 100% automated!
