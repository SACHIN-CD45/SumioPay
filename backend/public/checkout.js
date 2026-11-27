/**
 * SumioPay Universal Drop-In Checkout SDK (v2.9 Enterprise)
 * Seamless Razorpay-style Branded Checkout, Coupon/Bill Summary & First-Party SVG QR.
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

  function darkenHex(hex) {
    var clean = sanitizeHex(hex);
    var r = Math.max(0, parseInt(clean.slice(1, 3), 16) - 24);
    var g = Math.max(0, parseInt(clean.slice(3, 5), 16) - 24);
    var b = Math.max(0, parseInt(clean.slice(5, 7), 16) - 20);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
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

  var isMobileBrowser =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

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
        '  <div style="font-size:14px;font-weight:700;color:#1E293B;">Loading Checkout...</div>' +
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
            returnUrl: options.returnUrl || undefined,
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
        var baseAmount = Number(order.baseAmount || amount || 0);
        var resolvedAmount = typeof order.exactAmount === 'number'
          ? order.exactAmount
          : (typeof order.exactAmountInPaise === 'number' ? order.exactAmountInPaise / 100 : Number(amount));

        var siteName = order.websiteName || options.websiteName || order.merchantName || planName || appName;
        var logoUrl = sanitizeUrl(order.websiteLogoUrl || options.websiteLogoUrl);
        var brandHex = sanitizeHex(order.brandColor || options.brandColor);
        var brandDark = darkenHex(brandHex);
        var bill = order.billDetails || billDetails || {};
        var returnUrl = sanitizeUrl(order.returnUrl || bill.returnUrl || options.returnUrl);
        var qrImgUrl = apiBase + '/public/qr?data=' + encodeURIComponent(order.upiIntentUrl);

        var avatarHtml = logoUrl
          ? '<img src="' + escapeHtml(logoUrl) + '" alt="" style="width:44px;height:44px;border-radius:12px;background:#fff;padding:4px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.15);" />'
          : '<div style="width:44px;height:44px;border-radius:12px;background:#fff;color:#0F172A;font-weight:900;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);">' + escapeHtml(siteName.charAt(0).toUpperCase() || 'S') + '</div>';

        var rawDiscount = Number(bill.discountAmount || 0);
        var taxAmount = Number(bill.taxAmount || 0);
        var platformFee = Number(bill.platformFee || 0);
        var itemCount = Array.isArray(bill.items) ? bill.items.length : 0;
        var hasRichBreakdown = rawDiscount > 0 || taxAmount > 0 || platformFee > 0 || itemCount > 1;
        var displaySubtotal = bill.subtotal !== undefined
          ? Number(bill.subtotal)
          : (rawDiscount > 0
              ? Math.max(0, Number(((baseAmount || resolvedAmount) + rawDiscount - taxAmount - platformFee).toFixed(2)))
              : (baseAmount || resolvedAmount));

        var breakdownBlock = '';
        if (hasRichBreakdown) {
          var breakdownRows = '';
          if (Array.isArray(bill.items)) {
            for (var idx = 0; idx < Math.min(bill.items.length, 4); idx++) {
              var it = bill.items[idx];
              var q = Number(it.quantity || 1);
              breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>' + escapeHtml(it.label) + (q > 1 ? ' × ' + q : '') + '</span><span style="font-family:monospace;font-weight:600;">₹' + formatInr(Number(it.amount) * q) + '</span></div>';
            }
          }
          breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>Subtotal</span><span style="font-family:monospace;font-weight:600;">₹' + formatInr(displaySubtotal) + '</span></div>';
          if (bill.couponCode || rawDiscount > 0) {
            breakdownRows += '<div style="display:flex;justify-content:space-between;color:#047857;font-weight:700;margin-bottom:4px;"><span>Coupon ' + (bill.couponCode ? '(' + escapeHtml(bill.couponCode) + ')' : 'Applied') + '</span><span style="font-family:monospace;">-₹' + formatInr(rawDiscount) + '</span></div>';
          }
          if (taxAmount > 0) {
            breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>' + escapeHtml(bill.taxLabel || 'GST / Taxes') + '</span><span style="font-family:monospace;font-weight:600;">+₹' + formatInr(taxAmount) + '</span></div>';
          }
          if (platformFee > 0) {
            breakdownRows += '<div style="display:flex;justify-content:space-between;color:#475569;margin-bottom:4px;"><span>Convenience Fee</span><span style="font-family:monospace;font-weight:600;">+₹' + formatInr(platformFee) + '</span></div>';
          }
          if (rawDiscount > 0) {
            breakdownRows += '<div style="margin-top:6px;padding:5px 8px;border-radius:8px;background:#ECFDF5;color:#047857;font-size:10px;font-weight:800;display:flex;justify-content:space-between;"><span>Total Savings</span><span style="font-family:monospace;">You save ₹' + formatInr(rawDiscount) + '</span></div>';
          }
          breakdownBlock = '<div style="border-top:1px solid #F1F5F9;padding-top:8px;margin-top:8px;font-size:11px;">' + breakdownRows + '</div>';
        }

        var noteText = bill.note || ('To complete your payment for ' + (planName || siteName) + ', ₹' + formatInr(resolvedAmount) + ' will be processed securely via UPI.');
        var testBanner = order.isTest
          ? '<div style="background:#FBBF24;color:#0F172A;font-size:11px;font-weight:800;text-align:center;padding:6px 12px;">TEST MODE — No Real Money Is Charged</div>'
          : '';

        var mobileAppBtn = isMobileBrowser
          ? '<a href="' + escapeHtml(order.upiIntentUrl) + '" style="display:inline-block;margin-top:8px;padding:8px 14px;background:#0F172A;color:#fff;font-weight:700;font-size:11px;border-radius:8px;text-decoration:none;">Pay with UPI App</a>'
          : '';

        shell.innerHTML =
          '<style>@keyframes sumiopay-pulse{0%,100%{opacity:1}50%{opacity:0.3}}@media(max-width:740px){.sp-split{grid-template-columns:1fr!important}}</style>' +
          testBanner +
          '<div class="sp-split" style="display:grid;grid-template-columns:5fr 7fr;">' +
          '  <div style="background:linear-gradient(155deg,' + brandHex + ' 0%,' + brandDark + ' 100%);color:#fff;padding:26px;display:flex;flex-direction:column;justify-content:space-between;gap:20px;position:relative;overflow:hidden;">' +
          '    <svg viewBox="0 0 240 150" style="pointer-events:none;user-select:none;position:absolute;bottom:-6px;left:8px;width:185px;opacity:0.18;" aria-hidden="true">' +
          '      <rect x="22" y="42" width="68" height="84" rx="12" fill="white" />' +
          '      <path d="M40 42c0-15 32-15 32 0" stroke="white" stroke-width="7" fill="none" />' +
          '      <text x="56" y="88" text-anchor="middle" fill="white" font-size="18" font-weight="900">%</text>' +
          '      <rect x="104" y="24" width="76" height="98" rx="12" fill="white" fill-opacity="0.85" />' +
          '      <path d="M124 24c0-17 36-17 36 0" stroke="white" stroke-width="7" fill="none" />' +
          '    </svg>' +
          '    <div style="position:relative;z-index:1;">' +
          '      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:18px;">' +
                   avatarHtml +
          '        <div>' +
          '          <div style="font-size:18px;font-weight:800;line-height:1.2;">' + escapeHtml(siteName) + '</div>' +
          '          <div style="display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:3px 9px;border-radius:999px;background:rgba(15,23,42,0.34);border:1px solid rgba(255,255,255,0.2);font-size:11px;font-weight:600;">&#128737;&#65039; SumioPay Trusted Business</div>' +
          '        </div>' +
          '      </div>' +
          '      <div style="background:#fff;color:#0F172A;border-radius:16px;padding:16px 18px;box-shadow:0 12px 24px rgba(0,0,0,0.16);margin-bottom:14px;">' +
          '        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;font-weight:600;margin-bottom:4px;"><span>Price Summary</span><span style="font-family:monospace;">' + escapeHtml(order.orderId) + '</span></div>' +
          '        <div style="font-size:28px;font-weight:900;letter-spacing:-0.5px;">₹' + formatInr(resolvedAmount) + '</div>' +
                   breakdownBlock +
          '      </div>' +
          '      <div style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);border-radius:14px;padding:12px 14px;font-size:12px;line-height:1.45;color:rgba(255,255,255,0.95);">' + escapeHtml(noteText) + '</div>' +
          '    </div>' +
          '    <div style="position:relative;z-index:1;display:flex;align-items:center;font-size:11px;color:rgba(255,255,255,0.9);font-weight:600;">' +
          '      <span>&#128274; Secured by <strong>SumioPay</strong></span>' +
          '    </div>' +
          '  </div>' +
          '  <div style="background:#fff;display:flex;flex-direction:column;">' +
          '    <div style="padding:16px 22px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between;">' +
          '      <div style="font-size:15px;font-weight:800;color:#0F172A;">Payment Options</div>' +
          '      <button id="sumiopay-close-x" style="background:#F8FAFC;border:1px solid #E2E8F0;width:28px;height:28px;border-radius:8px;cursor:pointer;color:#64748B;font-size:16px;">&times;</button>' +
          '    </div>' +
          '    <div id="sp-payment-body" style="padding:20px 22px;flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:14px;">' +
          '      <div style="border:1px solid #E2E8F0;border-radius:16px;padding:16px;background:#F8FAFC;">' +
          '        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '          <span style="font-size:12px;font-weight:800;color:#0F172A;">UPI QR</span>' +
          '          <span id="sp-timer-badge" style="font-size:11px;font-family:monospace;font-weight:700;padding:3px 10px;border-radius:999px;background:#fff;border:1px solid #E2E8F0;color:#334155;">15:00</span>' +
          '        </div>' +
          '        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;">' +
          '          <div style="padding:8px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;">' +
          '            <img src="' + qrImgUrl + '" width="144" height="144" style="display:block;" alt="UPI Payment QR" />' +
          '          </div>' +
          '          <div style="flex:1;min-width:160px;">' +
          '            <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">Scan the QR using any UPI App</div>' +
          '            <div style="font-size:11px;color:#64748B;">GPay &bull; PhonePe &bull; Paytm &bull; BHIM &bull; CRED</div>' +
                       mobileAppBtn +
          '          </div>' +
          '        </div>' +
          '      </div>' +
          '      <div style="border:1px solid #E2E8F0;border-radius:16px;padding:16px;background:#fff;">' +
          '        <div style="font-size:12px;font-weight:800;color:#0F172A;margin-bottom:8px;">Pay with UPI ID / Number</div>' +
          '        <input id="sp-vpa-input" type="text" placeholder="example@okhdfcbank" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #CBD5E1;border-radius:10px;font-size:12px;margin-bottom:8px;" />' +
          '        <div id="sp-vpa-msg" style="font-size:11px;margin-bottom:8px;display:none;"></div>' +
          '        <button id="sp-verify-btn" style="width:100%;padding:11px;background:#0F172A;color:#fff;border:none;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">Verify and Pay</button>' +
          '      </div>' +
          '      <div style="border-top:1px solid #F1F5F9;padding-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748B;">' +
          '        <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;background:#10B981;border-radius:50%;display:inline-block;animation:sumiopay-pulse 1.2s infinite;"></span> Waiting for payment confirmation...</span>' +
          '        <span>256-bit TLS</span>' +
          '      </div>' +
          '    </div>' +
          '  </div>' +
          '</div>';

        document.getElementById('sumiopay-close-x').onclick = closeModal;

        var verifyBtn = document.getElementById('sp-verify-btn');
        var vpaInputEl = document.getElementById('sp-vpa-input');
        var vpaMsgEl = document.getElementById('sp-vpa-msg');
        if (verifyBtn && vpaInputEl) {
          verifyBtn.onclick = function() {
            var val = (vpaInputEl.value || '').trim();
            vpaMsgEl.style.display = 'block';
            var isValidVpa = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9]{2,}$/.test(val);
            var isValidPhone = /^\d{10}$/.test(val);
            if (isValidVpa || isValidPhone) {
              vpaMsgEl.style.color = '#047857';
              if (isMobileBrowser) {
                vpaMsgEl.innerText = 'Opening UPI app to complete payment of ₹' + formatInr(resolvedAmount) + '...';
                window.location.href = order.upiIntentUrl;
              } else {
                vpaMsgEl.innerText = 'UPI request initiated for ' + val + '. Approve the payment in your UPI app or scan the QR code above for instant completion.';
              }
            } else {
              vpaMsgEl.style.color = '#DC2626';
              vpaMsgEl.innerText = 'Enter a valid UPI ID (e.g. name@okhdfcbank) or 10-digit mobile number.';
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
                var utr = sData.data.utrNumber || sData.data.utr || 'Confirmed';
                var returnBtnHtml = returnUrl
                  ? '<a href="' + escapeHtml(returnUrl) + '" style="display:inline-block;margin-top:14px;padding:10px 20px;background:#0F172A;color:#fff;font-weight:800;font-size:12px;border-radius:10px;text-decoration:none;">Continue to ' + escapeHtml(siteName) + '</a>'
                  : '';
                var bodyEl = document.getElementById('sp-payment-body');
                if (bodyEl) {
                  bodyEl.innerHTML =
                    '<div style="text-align:center;padding:32px 16px;">' +
                    '  <div style="font-size:48px;color:#10B981;margin-bottom:8px;">&#10004;</div>' +
                    '  <h3 style="font-size:20px;font-weight:900;color:#0F172A;margin:0 0 6px;">Payment Successful!</h3>' +
                    '  <div style="font-size:12px;color:#64748B;font-family:monospace;margin-bottom:14px;">Reference ID: ' + escapeHtml(utr) + '</div>' +
                    '  <div style="font-size:12px;color:#047857;font-weight:700;background:#ECFDF5;padding:10px;border-radius:10px;">Paid to ' + escapeHtml(siteName) + '</div>' +
                       returnBtnHtml +
                    '</div>';
                }
                setTimeout(function() {
                  closeModal();
                  if (typeof options.onSuccess === 'function') options.onSuccess(sData.data);
                }, 1700);
              } else if (sData.success && sData.data && (sData.data.status === 'EXPIRED' || sData.data.status === 'CANCELLED')) {
                clearInterval(pollTimer);
                clearInterval(countdownTimer);
                var expBtnHtml = returnUrl
                  ? '<a href="' + escapeHtml(returnUrl) + '" style="display:inline-block;margin-top:12px;padding:9px 18px;background:#0F172A;color:#fff;font-weight:800;font-size:12px;border-radius:10px;text-decoration:none;">Return to ' + escapeHtml(siteName) + '</a>'
                  : '';
                var bodyEl = document.getElementById('sp-payment-body');
                if (bodyEl) {
                  bodyEl.innerHTML =
                    '<div style="text-align:center;padding:32px 16px;">' +
                    '  <div style="font-size:16px;font-weight:800;color:#DC2626;margin-bottom:6px;">Payment Session ' + escapeHtml(sData.data.status) + '</div>' +
                    '  <p style="font-size:12px;color:#64748B;">Please close and initiate a new checkout.</p>' +
                       expBtnHtml +
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
