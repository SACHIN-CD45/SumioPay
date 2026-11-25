# SUMIOPAY — Security & Compliance Architecture Guide

## 1. Regulatory Context & Clear Positioning
SUMIOPAY is an enterprise software solution for payment orchestration, dynamic UPI verification, and automated reconciliation.

### Compliance Positioning Statement:
- **Non-Aggregator Declarative Status**: SUMIOPAY operates as a technology infrastructure provider. It is NOT a bank, Non-Banking Financial Company (NBFC), or authorized Payment Aggregator under the RBI Payment and Settlement Systems Act, 2007, unless explicit regulatory license is secured.
- **Direct Settlement**: Funds collect directly into merchant bank accounts via authorized payment gateways, approved UPI handles, or banking collection rails. SUMIOPAY never holds customer funds in escrow without appropriate licenses.

---

## 2. Zero-Credential Architecture
SUMIOPAY follows strict least-privilege zero-credential security principles:
1. **Never Collect UPI PINs**: UPI PINs must strictly be entered only inside official NPCI / Bank PSP applications on the customer device.
2. **Never Collect Banking Passwords**: Netbanking credentials, OTPs, and CVVs are strictly forbidden from entering SUMIOPAY servers or listener apps.
3. **Android Telemetry Scope**: The Android companion app functions exclusively via the standard Android `NotificationListenerService` API. It parses incoming SMS/notification alerts from verified banking apps and sends telemetry signals. It is NEVER granted root access, screen-scraping accessibility services, or banking session cookies.

---

## 3. Defense-in-Depth Security Controls

### Layer 1: Transport & Network Security
- All communications are enforced over **TLS 1.3 / HTTPS**.
- HTTP Strict Transport Security (HSTS) with `max-age=31536000; includeSubDomains; preload`.
- IP allowlisting capability for merchant API keys and admin consoles.

### Layer 2: Authentication & Token Lifecycle
- **JWT Access Tokens**: Short-lived (15 minutes), signed with asymmetric RSA-256 or high-entropy HS256 secret.
- **Refresh Token Rotation**: Refresh tokens stored hashed in database, single-use, invalidated upon reuse detection.
- **Super Admin Multi-Factor Authentication (MFA)**: TOTP (RFC 6238) enforced on Super Admin accounts.
- **Hardware Device Tokens**: Android listeners pair via one-time 6-digit numeric pairing code, exchanging for high-entropy `dev_...` tokens.

### Layer 3: Anti-Fraud & Anti-Tamper Controls
- **Duplicate UTR Locking**: Database compound unique index on `(merchantId, utrNumber)` for all settled orders. Attempted replay of an already-used UTR is instantly flagged as `DUPLICATE_UTR_REPLAY_ATTEMPT` with HTTP 409 Conflict.
- **Paise Differential Anti-Tamper**: If an incoming payment does not match the exact assigned paise for the active order, it is quarantined in `UnmappedPayment` rather than blindly unlocking the merchant service.
- **Replay Attack Window**: Webhook headers enforce timestamp verification (`Math.abs(Date.now()/1000 - timestamp) < 300`).
- **Timing Safe Comparisons**: All cryptographic signature checks utilize `crypto.timingSafeEqual` to eliminate timing attacks.

### Layer 4: Data Storage & Privacy
- Sensitive merchant credentials (API keys, webhook secrets, banking API secrets) are hashed using SHA-256 or encrypted using AES-256-GCM.
- Customer Personal Identifiable Information (PII) like phone numbers and emails are masked in general audit logs.
- Immutable audit log collection records all administrative and financial changes.
