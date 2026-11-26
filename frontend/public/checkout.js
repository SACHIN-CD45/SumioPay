/**
 * SumioPay Universal Drop-In Checkout SDK (v2.5 Enterprise)
 * Supports:
 * 1) Tamper-Proof Server-First SaaS Checkout: SumioPay.checkout({ orderId: 'ORD-...', onSuccess })
 * 2) Direct Quick Checkout: SumioPay.checkout({ apiKey: 'sp_live_...', amount: 499, metadata: {...}, onSuccess })
 * Corporate: SumioTech • contact@sumiotech.in • +91 9875182659
 */
(function(window) {
  'use strict';

  // Detect script origin dynamically
  var scriptOrigin = '';
  try {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && (scripts[i].src.indexOf('checkout.js') !== -1 || scripts[i].src.indexOf('sumiopay') !== -1)) {
        var a = document.createElement('a');
        a.href = scripts[i].src;
        scriptOrigin = a.protocol + '//' + a.host;
        break;
      }
    }
  } catch (e) {}

  var SumioPay = {
    checkout: function(options) {
      if (!options || (!options.orderId && !options.amount)) {
        console.error('[SumioPay] Provide either options.orderId (recommended for SaaS) or options.amount');
        return;
      }

      var existingOrderId = options.orderId || '';
      var apiKey = options.apiKey || '';
      var amount = options.amount || 0;
      var appName = options.appName || options.planName || 'STORE';
      var planName = options.planName || '';
      var userId = options.userId || 'guest_' + Math.floor(Math.random() * 100000);
      var customerEmail = options.customerEmail || '';
      var customerPhone = options.customerPhone || '';
      var callbackWebhookUrl = options.callbackWebhookUrl || '';
      var metadata = options.metadata || {};
      var isTest = options.isTest || false;

      // Auto-resolve API endpoint
      var apiBase = options.apiBase;
      if (!apiBase) {
        if (scriptOrigin) {
          apiBase = scriptOrigin + '/api';
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          apiBase = window.location.origin + '/api';
        } else {
          apiBase = 'https://apipay.sumiotech.in/api';
        }
      }
      apiBase = apiBase.replace(/\/+$/, '');

      // Remove existing modal if any
      var existingModal = document.getElementById('sumiopay-checkout-modal');
      if (existingModal) {
        existingModal.remove();
      }

      // 1. Create High-Z-Index Modal Overlay Container
      var overlay = document.createElement('div');
      overlay.id = 'sumiopay-checkout-modal';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.78)';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.style.webkitBackdropFilter = 'blur(6px)';
      overlay.style.zIndex = '9999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '16px';
      overlay.style.boxSizing = 'border-box';
      overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

      var card = document.createElement('div');
      card.style.background = '#ffffff';
      card.style.borderRadius = '24px';
      card.style.padding = '28px 24px';
      card.style.maxWidth = '390px';
      card.style.width = '100%';
      card.style.textAlign = 'center';
      card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.35)';
      card.style.position = 'relative';
      card.style.boxSizing = 'border-box';

      card.innerHTML = [
        '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">',
        '  <div style="width:20px;height:20px;border:3px solid #2563EB;border-top-color:transparent;border-radius:50%;animation:sumiopay-spin 0.8s linear infinite;"></div>',
        '  <span style="font-size:13px;font-weight:700;color:#1E293B;">' + (existingOrderId ? 'Loading Secure Payment Order...' : 'Generating Secure UPI Intent...') + '</span>',
        '</div>',
        amount ? '<div style="font-size:28px;font-weight:900;color:#0F172A;font-family:monospace;">₹' + Number(amount).toFixed(2) + '</div>' : '',
        '<style>@keyframes sumiopay-spin { to { transform: rotate(360deg); } }</style>'
      ].join('');

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      var pollTimer = null;

      var closeModal = function() {
        if (pollTimer) clearInterval(pollTimer);
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      };

      // 2. Fetch Existing Server-Created Order OR Create New Order
      var orderPromise;
      if (existingOrderId) {
        orderPromise = fetch(apiBase + '/v1/payments/orders/' + encodeURIComponent(existingOrderId))
          .then(function(res) { return res.json(); });
      } else {
        orderPromise = fetch(apiBase + '/v1/payments/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            baseAmount: Number(amount),
            appName: appName,
            customerUserId: userId,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
            callbackWebhookUrl: callbackWebhookUrl || undefined,
            metadata: metadata,
            isTest: isTest,
          }),
        }).then(function(res) { return res.json(); });
      }

      orderPromise
      .then(function(result) {
        if (!result.success || !result.data) {
          throw new Error(result.error ? result.error.message : (result.message || 'Payment initiation failed'));
        }

        var order = result.data;
        var resolvedAmount = typeof order.exactAmount === 'number'
          ? order.exactAmount
          : (typeof order.exactAmountInPaise === 'number' ? order.exactAmountInPaise / 100 : Number(amount));

        var qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=' + encodeURIComponent(order.upiIntentUrl);
        var displayItem = planName || order.appName || appName;

        card.innerHTML = [
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #F1F5F9;">',
          '  <div style="text-align:left;">',
          '    <div style="font-size:10px;font-weight:800;color:#2563EB;text-transform:uppercase;letter-spacing:0.5px;">' + displayItem + '</div>',
          '    <div style="font-size:11px;font-family:monospace;color:#64748B;">Order #' + order.orderId + '</div>',
          '  </div>',
          '  <button id="sumiopay-close-x" style="background:#F1F5F9;border:none;font-size:16px;width:28px;height:28px;border-radius:50%;cursor:pointer;color:#64748B;line-height:28px;display:flex;align-items:center;justify-content:center;">&times;</button>',
          '</div>',
          '<div style="font-size:32px;font-weight:900;color:#0F172A;font-family:monospace;letter-spacing:-0.5px;">₹' + Number(resolvedAmount).toFixed(2) + '</div>',
          '<div style="font-size:11px;color:#10B981;font-weight:700;margin:4px 0 16px;">Pay EXACT amount (Paise Locked for Auto-Verify)</div>',
          '<div style="display:inline-block;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;margin-bottom:12px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.03);">',
          '  <img src="' + qrImgUrl + '" width="180" height="180" style="display:block;border-radius:10px;" alt="UPI Payment QR" />',
          '</div>',
          '<div style="font-size:11px;color:#475569;margin-bottom:12px;">Scan with <strong>Google Pay, PhonePe, Paytm, CRED</strong></div>',
          '<div style="display:flex;flex-direction:column;gap:8px;">',
          '  <a href="' + order.upiIntentUrl + '" style="display:block;padding:12px;background:#2563EB;color:#ffffff;font-weight:700;font-size:13px;border-radius:12px;text-decoration:none;text-align:center;box-shadow:0 4px 12px rgba(37,99,235,0.25);">Open in UPI App</a>',
          '  <button id="sumiopay-copy-upi" style="padding:8px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;font-size:11px;color:#334155;font-family:monospace;cursor:pointer;">Copy UPI VPA: ' + (order.upiId || 'Direct UPI') + '</button>',
          '</div>',
          '<div style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:#10B981;font-weight:600;">',
          '  <span style="display:inline-block;width:7px;height:7px;background:#10B981;border-radius:50%;animation:sumiopay-pulse 1.2s infinite;"></span>',
          '  <span>Auto-verifying payment telemetry...</span>',
          '</div>',
          '<style>@keyframes sumiopay-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }</style>'
        ].join('');

        document.getElementById('sumiopay-close-x').onclick = closeModal;

        var copyBtn = document.getElementById('sumiopay-copy-upi');
        if (copyBtn && order.upiId) {
          copyBtn.onclick = function() {
            navigator.clipboard.writeText(order.upiId);
            copyBtn.innerText = 'Copied to Clipboard!';
            setTimeout(function() {
              copyBtn.innerText = 'Copy UPI VPA: ' + order.upiId;
            }, 2000);
          };
        }

        // 3. Auto-Polling for verification status every 2 seconds
        pollTimer = setInterval(function() {
          fetch(apiBase + '/v1/payments/orders/' + encodeURIComponent(order.orderId) + '/status')
            .then(function(sRes) { return sRes.json(); })
            .then(function(sData) {
              if (sData.success && sData.data && sData.data.status === 'PAID') {
                clearInterval(pollTimer);
                var utr = sData.data.utrNumber || sData.data.utr || 'Verified';
                card.innerHTML = [
                  '<div style="font-size:52px;color:#10B981;margin-bottom:8px;line-height:1;">&#10004;</div>',
                  '<h3 style="font-size:20px;font-weight:900;color:#0F172A;margin:0 0 6px 0;">Payment Confirmed!</h3>',
                  '<div style="font-size:12px;color:#64748B;font-family:monospace;margin-bottom:12px;">Bank UTR: ' + utr + '</div>',
                  '<div style="font-size:12px;color:#10B981;font-weight:700;background:#DCFCE7;padding:8px 12px;border-radius:10px;margin-bottom:16px;">Tax Invoice Sent to Your Email</div>',
                  '<div style="font-size:11px;color:#64748B;">Redirecting to your application...</div>'
                ].join('');

                setTimeout(function() {
                  closeModal();
                  if (typeof options.onSuccess === 'function') {
                    options.onSuccess(sData.data);
                  }
                }, 1800);
              } else if (sData.success && sData.data && (sData.data.status === 'EXPIRED' || sData.data.status === 'CANCELLED')) {
                clearInterval(pollTimer);
                card.innerHTML = [
                  '<div style="font-size:40px;color:#F59E0B;margin-bottom:8px;">&#9201;</div>',
                  '<div style="color:#0F172A;font-size:15px;font-weight:bold;">Payment Session ' + sData.data.status + '</div>',
                  '<p style="font-size:12px;color:#64748B;margin:8px 0 16px;">Please initiate a new payment request.</p>',
                  '<button id="sumiopay-close-exp" style="padding:10px 20px;background:#0F172A;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:bold;font-size:12px;">Close</button>'
                ].join('');
                document.getElementById('sumiopay-close-exp').onclick = closeModal;
              }
            })
            .catch(function() {});
        }, 2000);
      })
      .catch(function(err) {
        card.innerHTML = [
          '<div style="font-size:40px;color:#EF4444;margin-bottom:8px;">&times;</div>',
          '<div style="color:#EF4444;font-size:15px;font-weight:bold;">Payment Initiation Failed</div>',
          '<p style="font-size:12px;color:#64748B;margin:8px 0 16px;">' + (err.message || 'Network error') + '</p>',
          '<button id="sumiopay-close-err" style="padding:10px 20px;background:#F1F5F9;border:none;border-radius:10px;cursor:pointer;font-weight:bold;color:#334155;font-size:12px;">Close</button>'
        ].join('');
        document.getElementById('sumiopay-close-err').onclick = function() {
          closeModal();
          if (typeof options.onFailure === 'function') {
            options.onFailure(err);
          }
        };
      });
    }
  };

  window.SumioPay = SumioPay;
})(window);
