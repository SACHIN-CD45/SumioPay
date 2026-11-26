/**
 * SumioPay Universal Drop-In Checkout SDK (v2.7 Enterprise)
 * Supports Razorpay-style Branded Checkout Modal, Coupon/Bill Summary, and Trusted Business Badge.
 * Corporate: SumioTech • contact@sumiotech.in • +91 9875182659
 */
(function(window) {
  'use strict';

  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeHex(hex) {
    return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim())
      ? hex.trim()
      : '#4F3DF5';
  }

  function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    var trimmed = url.trim();
    if (trimmed.indexOf('https://') === 0 || trimmed.indexOf('http://') === 0 || trimmed.indexOf('/') === 0) {
      return trimmed;
    }
    return '';
  }

  function formatInr(num) {
    var val = Number(num || 0);
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

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
      if (!options || (!options.orderId && !options.amount && !(options.billDetails && options.billDetails.subtotal))) {
        console.error('[SumioPay] Provide options.orderId or options.amount / options.billDetails.subtotal');
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
      var billDetails = options.billDetails || null;
      var isTest = Boolean(options.isTest);

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

      var existingModal = document.getElementById('sumiopay-checkout-modal');
      if (existingModal) existingModal.remove();

      var overlay = document.createElement('div');
      overlay.id = 'sumiopay-checkout-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;';

      var shell = document.createElement('div');
      shell.style.cssText = 'background:#fff;border-radius:22px;max-width:860px;width:100%;box-shadow:0 25px 60px -15px rgba(0,0,0,0.42);overflow:hidden;position:relative;color:#0F172A;margin:auto;';
      shell.innerHTML =
        '<div style="padding:48px 24px;text-align:center;">' +
        '  <div style="width:28px;height:28px;border:3px solid #4F3DF5;border-top-color:transparent;border-radius:50%;margin:0 auto 12px;animation:sumiopay-spin 0.8s linear infinite;"></div>' +
        '  <div style="font-size:14px;font-weight:700;color:#1E293B;">Loading SumioPay Trusted Checkout...</div>' +
        '</div>' +
        '<style>@keyframes sumiopay-spin{to{transform:rotate(360deg)}}@media(max-width:740px){.sp-split{grid-template-columns:1fr!important}.sp-inner{grid-template-columns:1fr!important}}</style>';

      overlay.appendChild(shell);
      document.body.appendChild(overlay);

      var pollTimer = null;
      var countdownTimer = null;

      var closeModal = function() {
        if (pollTimer) clearInterval(pollTimer);
        if (countdownTimer) clearInterval(countdownTimer);
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof options.onClose === 'function') options.onClose();
      };

      var orderPromise;
      if (existingOrderId) {
        orderPromise = fetch(apiBase + '/order/status/' + encodeURIComponent(existingOrderId))
          .then(function(res) { return res.json(); });
      } else {
        orderPromise = fetch(apiBase + '/order/create', {
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
            websiteName: options.websiteName || undefined,
            websiteLogoUrl: options.websiteLogoUrl || undefined,
            brandColor: options.brandColor || undefined,
            billDetails: billDetails || undefined,
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

        var siteName = order.websiteName || options.websiteName || order.merchantName || planName || appName;
        var logoUrl = sanitizeUrl(order.websiteLogoUrl || options.websiteLogoUrl);
        var brandHex = sanitizeHex(order.brandColor || options.brandColor);
        var bill = order.billDetails || billDetails || {};
        var paiseOffset = typeof order.paiseOffset === 'number'
          ? order.paiseOffset
          : Math.max(0, Number((resolvedAmount - Number(order.baseAmount || amount || resolvedAmount)).toFixed(2)));
        var qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=' + encodeURIComponent(order.upiIntentUrl);

        var avatarHtml = logoUrl
          ? '<img src="' + escapeHtml(logoUrl) + '" alt="" style="width:44px;height:44px;border-radius:12px;background:#fff;padding:4px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.15);" />'
          : '<div style="width:44px;height:44px;border-radius:12px;background:#fff;color:#0F172A;font-weight:900;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);">' + escapeHtml(siteName.charAt(0).toUpperCase() || 'S') + '</div>';

        var breakdownRows = '';
        if (Array.isArray(bill.items)) {
          for (var idx = 0; idx < Math.min(bill.items.length, 4); idx++) {
            var it = bill.items[idx];
            var q = Number(it.quantity || 1);
            breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>' + escapeHtml(it.label) + (q > 1 ? ' × ' + q : '') + '</span><span style="font-family:monospace;font-weight:600;">₹' + formatInr(Number(it.amount) * q) + '</span></div>';
          }
        }
        if (bill.subtotal !== undefined) {
          breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>Subtotal</span><span style="font-family:monospace;font-weight:600;">₹' + formatInr(bill.subtotal) + '</span></div>';
        } else {
          breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>' + escapeHtml(planName || 'Order Amount') + '</span><span style="font-family:monospace;font-weight:600;">₹' + formatInr(order.baseAmount || resolvedAmount) + '</span></div>';
        }
        if (bill.couponCode || (bill.discountAmount !== undefined && Number(bill.discountAmount) > 0)) {
          breakdownRows += '<div style="display:flex;justify-content:space-between;color:#047857;font-weight:700;margin-bottom:4px;"><span>Coupon ' + (bill.couponCode ? '(' + escapeHtml(bill.couponCode) + ')' : 'Applied') + '</span><span style="font-family:monospace;">-₹' + formatInr(bill.discountAmount || 0) + '</span></div>';
        }
        if (bill.taxAmount !== undefined && Number(bill.taxAmount) > 0) {
          breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>' + escapeHtml(bill.taxLabel || 'GST / Taxes') + '</span><span style="font-family:monospace;font-weight:600;">+₹' + formatInr(bill.taxAmount) + '</span></div>';
        }
        if (paiseOffset > 0) {
          breakdownRows += '<div style="display:flex;justify-content:space-between;color:#B45309;"><span>Unique Verify Offset</span><span style="font-family:monospace;font-weight:600;">+₹' + paiseOffset.toFixed(2) + '</span></div>';
        }

        var noteText = bill.note || ('Paying ' + siteName + ' directly via SumioPay Zero-MDR UPI Gateway. Order #' + order.orderId + '.');
        var trustBadgeText = order.kycVerified ? 'SumioPay KYC Verified Business' : 'SumioPay Trusted Business';

        shell.innerHTML =
          '<style>@keyframes sumiopay-pulse{0%,100%{opacity:1}50%{opacity:0.3}}@media(max-width:740px){.sp-split{grid-template-columns:1fr!important}.sp-inner{grid-template-columns:1fr!important}}</style>' +
          '<div class="sp-split" style="display:grid;grid-template-columns:5fr 7fr;">' +
          '  <div style="background:linear-gradient(155deg,' + brandHex + ' 0%,#2E1F9E 100%);color:#fff;padding:26px;display:flex;flex-direction:column;justify-content:space-between;gap:20px;">' +
          '    <div>' +
          '      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:18px;">' +
                   avatarHtml +
          '        <div>' +
          '          <div style="font-size:18px;font-weight:800;line-height:1.2;">' + escapeHtml(siteName) + '</div>' +
          '          <div style="display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 9px;border-radius:999px;background:rgba(15,23,42,0.34);border:1px solid rgba(255,255,255,0.2);font-size:11px;font-weight:600;">&#128737;&#65039; ' + escapeHtml(trustBadgeText) + '</div>' +
          '        </div>' +
          '      </div>' +
          '      <div style="background:#fff;color:#0F172A;border-radius:16px;padding:16px 18px;box-shadow:0 12px 24px rgba(0,0,0,0.16);margin-bottom:14px;">' +
          '        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;font-weight:600;margin-bottom:4px;"><span>Price Summary</span><span style="font-family:monospace;">' + escapeHtml(order.orderId) + '</span></div>' +
          '        <div style="font-size:28px;font-weight:900;letter-spacing:-0.5px;margin-bottom:10px;">₹' + formatInr(resolvedAmount) + '</div>' +
          '        <div style="border-top:1px solid #F1F5F9;padding-top:8px;font-size:11px;">' + breakdownRows + '</div>' +
          '      </div>' +
          '      <div style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);border-radius:14px;padding:12px 14px;font-size:12px;line-height:1.45;color:rgba(255,255,255,0.95);">' + escapeHtml(noteText) + '</div>' +
          '    </div>' +
          '    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,0.9);font-weight:700;">' +
          '      <span>&#128274; Secured by <strong>SumioPay</strong></span>' +
          '      <span style="font-family:monospace;background:rgba(255,255,255,0.16);padding:3px 8px;border-radius:999px;">0% MDR</span>' +
          '    </div>' +
          '  </div>' +
          '  <div style="background:#fff;display:flex;flex-direction:column;">' +
          '    <div style="padding:16px 22px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between;">' +
          '      <div style="font-size:15px;font-weight:800;color:#0F172A;">Payment Options</div>' +
          '      <div style="display:flex;align-items:center;gap:10px;">' +
          '        <span id="sp-timer-badge" style="font-size:11px;font-family:monospace;font-weight:700;padding:4px 10px;border-radius:999px;background:#F1F5F9;border:1px solid #E2E8F0;color:#334155;">15:00</span>' +
          '        <button id="sumiopay-close-x" style="background:#F8FAFC;border:1px solid #E2E8F0;width:28px;height:28px;border-radius:8px;cursor:pointer;color:#64748B;font-size:16px;">&times;</button>' +
          '      </div>' +
          '    </div>' +
          '    <div id="sp-payment-body" style="padding:20px 22px;flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:14px;">' +
          '      <div style="border:1px solid #E2E8F0;border-radius:16px;padding:16px;background:#F8FAFC;display:flex;flex-wrap:wrap;align-items:center;gap:16px;">' +
          '        <div style="padding:8px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;">' +
          '          <img src="' + qrImgUrl + '" width="144" height="144" style="display:block;" alt="UPI Payment QR" />' +
          '        </div>' +
          '        <div style="flex:1;min-width:160px;">' +
          '          <div style="font-size:12px;font-weight:800;color:#0F172A;margin-bottom:4px;">Scan the QR using any UPI App</div>' +
          '          <div style="font-size:11px;color:#64748B;margin-bottom:10px;">GPay &bull; PhonePe &bull; Paytm &bull; BHIM &bull; CRED</div>' +
          '          <div style="display:flex;flex-wrap:wrap;gap:6px;">' +
          '            <a href="' + escapeHtml(order.upiIntentUrl) + '" style="display:inline-block;padding:8px 12px;background:#0F172A;color:#fff;font-weight:700;font-size:11px;border-radius:8px;text-decoration:none;">Open UPI App</a>' +
          '            <button id="sumiopay-copy-upi" style="padding:8px 10px;background:#fff;border:1px solid #CBD5E1;border-radius:8px;font-size:11px;color:#334155;font-family:monospace;cursor:pointer;">' + escapeHtml(order.upiId || 'Copy UPI') + '</button>' +
          '          </div>' +
          '        </div>' +
          '      </div>' +
          '      <div style="border:1px solid #E2E8F0;border-radius:16px;padding:16px;background:#fff;">' +
          '        <div style="font-size:12px;font-weight:800;color:#0F172A;margin-bottom:8px;">Pay with UPI ID / Verify 12-Digit UTR</div>' +
          '        <input id="sp-vpa-or-utr" type="text" placeholder="example@okhdfcbank or 12-digit UTR" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #CBD5E1;border-radius:10px;font-size:12px;margin-bottom:8px;" />' +
          '        <div id="sp-vpa-msg" style="font-size:11px;margin-bottom:8px;display:none;"></div>' +
          '        <button id="sp-verify-btn" style="width:100%;padding:11px;background:#0F172A;color:#fff;border:none;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">Verify and Pay ₹' + formatInr(resolvedAmount) + '</button>' +
          '      </div>' +
          '      <div style="border-top:1px solid #F1F5F9;padding-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;">' +
          '        <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;background:#10B981;border-radius:50%;display:inline-block;animation:sumiopay-pulse 1.2s infinite;"></span> Listening for instant bank confirmation...</span>' +
          '        <span style="font-family:monospace;">UPI Auto-Match</span>' +
          '      </div>' +
          '    </div>' +
          '  </div>' +
          '</div>';

        document.getElementById('sumiopay-close-x').onclick = closeModal;

        var copyBtn = document.getElementById('sumiopay-copy-upi');
        if (copyBtn && order.upiId) {
          copyBtn.onclick = function() {
            navigator.clipboard.writeText(order.upiId);
            copyBtn.innerText = 'Copied!';
            setTimeout(function() { copyBtn.innerText = order.upiId; }, 2000);
          };
        }

        var verifyBtn = document.getElementById('sp-verify-btn');
        var vpaInputEl = document.getElementById('sp-vpa-or-utr');
        var vpaMsgEl = document.getElementById('sp-vpa-msg');
        if (verifyBtn && vpaInputEl) {
          verifyBtn.onclick = function() {
            var val = (vpaInputEl.value || '').trim();
            vpaMsgEl.style.display = 'block';
            if (/^\d{12}$/.test(val)) {
              vpaMsgEl.style.color = '#334155';
              vpaMsgEl.innerText = 'Verifying 12-digit UTR with bank feed...';
              fetch(apiBase + '/order/submit-utr/' + encodeURIComponent(order.orderId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ utrNumber: val }),
              })
                .then(function(r) { return r.json(); })
                .then(function(rData) {
                  vpaMsgEl.style.color = rData.success ? '#047857' : '#DC2626';
                  vpaMsgEl.innerText = rData.message || 'UTR checked.';
                })
                .catch(function() {
                  vpaMsgEl.style.color = '#DC2626';
                  vpaMsgEl.innerText = 'Could not submit UTR right now.';
                });
            } else if (/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9]{2,}$/.test(val)) {
              vpaMsgEl.style.color = '#047857';
              vpaMsgEl.innerText = 'Valid UPI ID! Opening UPI app to pay exact ₹' + formatInr(resolvedAmount) + '...';
              window.location.href = order.upiIntentUrl;
            } else {
              vpaMsgEl.style.color = '#DC2626';
              vpaMsgEl.innerText = 'Enter a valid UPI ID (e.g. name@okhdfcbank) or 12-digit numeric UTR.';
            }
          };
        }

        var remaining = order.expiresAt
          ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000))
          : 900;
        var timerBadge = document.getElementById('sp-timer-badge');
        countdownTimer = setInterval(function() {
          if (remaining > 0) remaining -= 1;
          var m = String(Math.floor(remaining / 60));
          var s = String(remaining % 60);
          if (m.length < 2) m = '0' + m;
          if (s.length < 2) s = '0' + s;
          if (timerBadge) timerBadge.innerText = m + ':' + s;
        }, 1000);

        pollTimer = setInterval(function() {
          fetch(apiBase + '/order/status/' + encodeURIComponent(order.orderId))
            .then(function(sRes) { return sRes.json(); })
            .then(function(sData) {
              if (sData.success && sData.data && sData.data.status === 'PAID') {
                clearInterval(pollTimer);
                clearInterval(countdownTimer);
                var utr = sData.data.utrNumber || sData.data.utr || 'Verified';
                var bodyEl = document.getElementById('sp-payment-body');
                if (bodyEl) {
                  bodyEl.innerHTML =
                    '<div style="text-align:center;padding:32px 16px;">' +
                    '  <div style="font-size:48px;color:#10B981;margin-bottom:8px;">&#10004;</div>' +
                    '  <h3 style="font-size:20px;font-weight:900;color:#0F172A;margin:0 0 6px;">Payment Confirmed!</h3>' +
                    '  <div style="font-size:12px;color:#64748B;font-family:monospace;margin-bottom:14px;">Bank UTR: ' + escapeHtml(utr) + '</div>' +
                    '  <div style="font-size:12px;color:#047857;font-weight:700;background:#ECFDF5;padding:10px;border-radius:10px;">Verified for ' + escapeHtml(siteName) + '</div>' +
                    '</div>';
                }
                setTimeout(function() {
                  closeModal();
                  if (typeof options.onSuccess === 'function') options.onSuccess(sData.data);
                }, 1700);
              } else if (sData.success && sData.data && (sData.data.status === 'EXPIRED' || sData.data.status === 'CANCELLED')) {
                clearInterval(pollTimer);
                clearInterval(countdownTimer);
                var bodyEl = document.getElementById('sp-payment-body');
                if (bodyEl) {
                  bodyEl.innerHTML =
                    '<div style="text-align:center;padding:32px 16px;">' +
                    '  <div style="font-size:16px;font-weight:800;color:#DC2626;margin-bottom:6px;">Payment Session ' + escapeHtml(sData.data.status) + '</div>' +
                    '  <p style="font-size:12px;color:#64748B;">Please close and initiate a new checkout.</p>' +
                    '</div>';
                }
              }
            })
            .catch(function() {});
        }, 2200);
      })
      .catch(function(err) {
        shell.innerHTML =
          '<div style="padding:36px 24px;text-align:center;">' +
          '  <div style="font-size:36px;color:#EF4444;margin-bottom:8px;">&times;</div>' +
          '  <div style="color:#DC2626;font-size:15px;font-weight:800;">Payment Initiation Failed</div>' +
          '  <p style="font-size:12px;color:#64748B;margin:8px 0 16px;">' + escapeHtml(err.message || 'Network error') + '</p>' +
          '  <button id="sumiopay-close-err" style="padding:10px 20px;background:#0F172A;border:none;border-radius:10px;cursor:pointer;font-weight:700;color:#fff;font-size:12px;">Close</button>' +
          '</div>';
        document.getElementById('sumiopay-close-err').onclick = function() {
          closeModal();
          if (typeof options.onFailure === 'function') options.onFailure(err);
        };
      });
    }
  };

  window.SumioPay = SumioPay;
})(window);
