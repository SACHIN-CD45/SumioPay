/**
 * SumioPay Universal Drop-In Checkout SDK
 * Works on Shopify, WooCommerce, WordPress, Webflow, Custom PHP & HTML websites.
 */
(function(window) {
  'use strict';

  var SumioPay = {
    checkout: function(options) {
      if (!options || !options.amount) {
        console.error('[SumioPay] options.amount is required');
        return;
      }

      var apiKey = options.apiKey || '';
      var amount = options.amount;
      var appName = options.appName || 'STORE';
      var userId = options.userId || 'guest_' + Math.floor(Math.random() * 10000);
      var apiBase = options.apiBase || 'https://apipay.sumiotech.in/api';

      // 1. Create Modal Overlay Container
      var overlay = document.createElement('div');
      overlay.id = 'sumiopay-checkout-modal';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.75)';
      overlay.style.backdropFilter = 'blur(4px)';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      var card = document.createElement('div');
      card.style.background = '#ffffff';
      card.style.borderRadius = '24px';
      card.style.padding = '32px';
      card.style.maxWidth = '400px';
      card.style.width = '90%';
      card.style.textAlign = 'center';
      card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';

      card.innerHTML = '<div style="font-size:14px;color:#64748B;font-weight:600;">Generating Secure UPI Payment...</div><div style="margin-top:16px;font-size:24px;font-weight:900;color:#0F172A;">₹' + amount + '</div>';
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // 2. Request Order from SumioPay Core
      fetch(apiBase + '/v1/payments/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          baseAmount: amount,
          appName: appName,
          customerUserId: userId,
        }),
      })
      .then(function(res) { return res.json(); })
      .then(function(result) {
        if (!result.success || !result.data) {
          throw new Error(result.error ? result.error.message : 'Order generation failed');
        }

        var order = result.data;
        var qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(order.upiIntentUrl);

        card.innerHTML = [
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">',
          '  <span style="font-size:12px;font-weight:800;color:#2563EB;text-transform:uppercase;">' + appName + '</span>',
          '  <button id="sumiopay-close-btn" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94A3B8;">&times;</button>',
          '</div>',
          '<div style="font-size:28px;font-weight:900;color:#0F172A;font-family:monospace;">₹' + order.exactAmount.toFixed(2) + '</div>',
          '<div style="font-size:11px;color:#10B981;font-weight:700;margin-bottom:16px;">Pay Exact Amount (Paise Locked for Auto-Verify)</div>',
          '<div style="display:inline-block;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;">',
          '  <img src="' + qrImgUrl + '" width="180" height="180" style="display:block;border-radius:8px;" alt="UPI QR" />',
          '</div>',
          '<div style="margin-top:16px;">',
          '  <a href="' + order.upiIntentUrl + '" style="display:block;padding:12px;background:#2563EB;color:#fff;font-weight:bold;font-size:13px;border-radius:12px;text-decoration:none;">Open in PhonePe / GPay / Paytm</a>',
          '</div>',
          '<div style="margin-top:12px;font-size:11px;color:#64748B;">Auto-verifying payment in background...</div>'
        ].join('');

        document.getElementById('sumiopay-close-btn').onclick = function() {
          clearInterval(pollTimer);
          overlay.remove();
        };

        // 3. Auto-Polling for verification status
        var pollTimer = setInterval(function() {
          fetch(apiBase + '/v1/payments/orders/' + order.orderId + '/status')
            .then(function(sRes) { return sRes.json(); })
            .then(function(sData) {
              if (sData.success && sData.data && sData.data.status === 'PAID') {
                clearInterval(pollTimer);
                card.innerHTML = [
                  '<div style="font-size:48px;color:#10B981;margin-bottom:12px;">&#10004;</div>',
                  '<h3 style="font-size:18px;font-weight:900;color:#0F172A;margin:0;">Payment Confirmed!</h3>',
                  '<p style="font-size:12px;color:#64748B;margin:8px 0 16px;">UTR: ' + (sData.data.utrNumber || 'Verified') + '</p>',
                  '<div style="font-size:11px;color:#10B981;font-weight:700;">Redirecting to your order...</div>'
                ].join('');

                setTimeout(function() {
                  overlay.remove();
                  if (options.onSuccess) {
                    options.onSuccess(sData.data);
                  }
                }, 1500);
              }
            })
            .catch(function() {});
        }, 2000);
      })
      .catch(function(err) {
        card.innerHTML = [
          '<div style="color:#EF4444;font-size:13px;font-weight:bold;">Payment Failed</div>',
          '<p style="font-size:11px;color:#64748B;">' + err.message + '</p>',
          '<button id="sumiopay-close-err" style="margin-top:12px;padding:8px 16px;background:#F1F5F9;border:none;border-radius:8px;cursor:pointer;">Close</button>'
        ].join('');
        document.getElementById('sumiopay-close-err').onclick = function() {
          overlay.remove();
        };
      });
    }
  };

  window.SumioPay = SumioPay;
})(window);
