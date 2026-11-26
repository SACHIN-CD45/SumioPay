/**
 * SumioPay Companion Web UI Controller (Capacitor / Android Bridge)
 */
(function() {
  'use strict';

  function getBridge() {
    return window.SumioNativeBridge || null;
  }

  function refreshState() {
    const bridge = getBridge();
    if (!bridge) {
      console.warn('SumioNativeBridge not found (Running in standalone browser)');
      return;
    }

    try {
      const statusRaw = bridge.getStatus();
      const status = typeof statusRaw === 'string' ? JSON.parse(statusRaw) : statusRaw;

      // Update Battery
      if (status.batteryPercent !== undefined) {
        document.getElementById('batteryLevel').innerText = status.batteryPercent + '%';
      }

      // Update Notifications Badge & Button
      const notifBadge = document.getElementById('notifBadge');
      const btnNotif = document.getElementById('btnNotif');
      if (notifBadge && btnNotif) {
        if (status.isNotificationGranted) {
          notifBadge.className = 'perm-status badge-success';
          notifBadge.innerText = 'Active';
          btnNotif.className = 'btn btn-sm btn-outline';
          btnNotif.innerText = 'Granted';
          btnNotif.disabled = true;
        } else {
          notifBadge.className = 'perm-status badge-warn';
          notifBadge.innerText = 'Disabled';
          btnNotif.className = 'btn btn-sm btn-primary';
          btnNotif.innerText = 'Enable Access';
          btnNotif.disabled = false;
        }
      }

      // Update Battery Opt Badge
      const batteryBadge = document.getElementById('batteryBadge');
      const btnBattery = document.getElementById('btnBattery');
      if (batteryBadge && btnBattery) {
        if (status.isBatteryIgnoring) {
          batteryBadge.className = 'perm-status badge-success';
          batteryBadge.innerText = 'Unrestricted';
          btnBattery.className = 'btn btn-sm btn-outline';
          btnBattery.innerText = 'Allowed';
          btnBattery.disabled = true;
        } else {
          batteryBadge.className = 'perm-status badge-warn';
          batteryBadge.innerText = 'Optimized';
          btnBattery.className = 'btn btn-sm btn-outline';
          btnBattery.innerText = 'Allow';
          btnBattery.disabled = false;
        }
      }

      // Update Pairing and Overall Status
      const statusDot = document.getElementById('statusDot');
      const statusHeading = document.getElementById('statusHeading');
      const statusDesc = document.getElementById('statusDesc');
      const deviceBadge = document.getElementById('deviceBadge');
      const pairedInfo = document.getElementById('pairedInfo');
      const deviceTokenDisplay = document.getElementById('deviceTokenDisplay');

      if (status.serverUrl) {
        document.getElementById('serverUrl').value = status.serverUrl;
      }

      const isPaired = status.isPaired && status.deviceToken;

      if (!status.isNotificationGranted) {
        statusDot.className = 'status-indicator';
        statusHeading.innerText = 'Notification Access Required';
        statusDesc.innerText = 'Enable Notification Access above to capture UPI & Bank SMS alerts.';
        deviceBadge.className = 'badge badge-disconnected';
        deviceBadge.innerText = 'NO ACCESS';
      } else if (!isPaired) {
        statusDot.className = 'status-indicator';
        statusHeading.innerText = 'Device Not Paired';
        statusDesc.innerText = 'Enter your pairing token from merchant dashboard below.';
        deviceBadge.className = 'badge badge-warn';
        deviceBadge.innerText = 'NOT PAIRED';
      } else {
        statusDot.className = 'status-indicator active';
        statusHeading.innerText = 'ACTIVE & LISTENING';
        statusDesc.innerText = 'Auto-intercepting Bank SMS & UPI Notifications 24x7.';
        deviceBadge.className = 'badge badge-connected';
        deviceBadge.innerText = 'ONLINE';
      }

      if (status.isPaired && status.deviceToken) {
        pairedInfo.classList.remove('hidden');
        deviceTokenDisplay.innerText = status.deviceToken.substring(0, 16) + '...';
      } else if (pairedInfo) {
        pairedInfo.classList.add('hidden');
      }

    } catch (e) {
      console.error('Error parsing status from bridge:', e);
    }

    loadLogs();
  }

  window.openNotifSettings = function() {
    const bridge = getBridge();
    if (bridge && bridge.openNotificationSettings) {
      bridge.openNotificationSettings();
    } else {
      alert('Open Android Settings -> Notification Access to enable SumioPay.');
    }
  };

  window.requestSmsAccess = function() {
    const bridge = getBridge();
    if (bridge && bridge.requestSmsPermission) {
      bridge.requestSmsPermission();
    } else {
      alert('Open Android Settings -> App Permissions -> SMS to enable.');
    }
  };

  window.disableBatteryOpt = function() {
    const bridge = getBridge();
    if (bridge && bridge.disableBatteryOptimization) {
      bridge.disableBatteryOptimization();
    } else {
      alert('Set Battery to Unrestricted in Android Settings.');
    }
  };

  window.openAppSettings = function() {
    const bridge = getBridge();
    if (bridge && bridge.openAppSettings) {
      bridge.openAppSettings();
    } else {
      alert('Open phone Settings -> Apps -> SumioPay Listener -> 3 dots -> Allow restricted settings.');
    }
  };

  window.pasteToken = async function() {
    try {
      const bridge = getBridge();
      if (bridge && bridge.getClipboardText) {
        const clip = bridge.getClipboardText();
        if (clip && clip.trim()) {
          document.getElementById('pairingToken').value = clip.trim();
          return;
        }
      }

      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          document.getElementById('pairingToken').value = text.trim();
          return;
        }
      }
    } catch (e) {}

    const manual = prompt('Paste your Pairing Token (e.g. pair_xxxx):');
    if (manual && manual.trim()) {
      document.getElementById('pairingToken').value = manual.trim();
    }
  };

  window.pairDevice = function() {
    const serverUrl = document.getElementById('serverUrl').value.trim();
    const pairingToken = document.getElementById('pairingToken').value.trim();

    if (!serverUrl || !pairingToken) {
      alert('Please enter both Server URL and Pairing Token.');
      return;
    }

    const btn = document.getElementById('btnPair');
    btn.disabled = true;
    btn.innerText = 'Connecting to Server...';

    const bridge = getBridge();
    if (bridge && bridge.pairDevice) {
      bridge.pairDevice(serverUrl, pairingToken);
    } else {
      alert('Bridge not available. Standalone preview.');
      btn.disabled = false;
      btn.innerText = 'Complete Device Pairing';
    }
  };

  window.unpairDevice = function() {
    if (!confirm('Disconnect this phone from the current merchant console?')) return;
    const bridge = getBridge();
    if (bridge && bridge.unpairDevice) {
      bridge.unpairDevice();
    }
  };

  // --- Built-in QR Code Scanner (Camera Stream + Screenshot Decode Fallback) ---
  let qrStream = null;
  let qrScanRaf = null;
  let qrScanningActive = false;

  function applyScannedQrText(rawText) {
    const raw = (rawText || '').trim();
    if (!raw) return false;

    let token = '';
    let server = '';

    // Format 1: Deep link sumiopay://pair?token=pair_...&server=https://...
    if (raw.toLowerCase().indexOf('sumiopay://pair') === 0) {
      try {
        const qIdx = raw.indexOf('?');
        const params = new URLSearchParams(qIdx >= 0 ? raw.slice(qIdx + 1) : '');
        token = (params.get('token') || '').trim();
        server = (params.get('server') || '').trim();
      } catch (e) {}
    }

    // Format 2: JSON payload { serverUrl, pairingToken }
    if (!token && raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        token = (parsed.pairingToken || parsed.token || '').trim();
        server = (parsed.serverUrl || '').trim();
      } catch (e) {}
    }

    // Format 3: Raw pairing token pair_...
    if (!token && raw.indexOf('pair_') === 0) {
      token = raw;
    }

    if (!token) {
      const statusEl = document.getElementById('qrScannerStatus');
      if (statusEl) statusEl.innerText = 'Scanned QR does not contain a SumioPay pairing token.';
      return false;
    }

    if (server) {
      document.getElementById('serverUrl').value = server;
    }
    document.getElementById('pairingToken').value = token;

    window.stopQrScanner();
    window.pairDevice();
    return true;
  }

  window.startQrScanner = function() {
    const bridge = getBridge();
    if (bridge && bridge.requestCameraAndStartScan) {
      bridge.requestCameraAndStartScan();
    } else {
      window.onCameraPermissionGranted();
    }
  };

  window.onCameraPermissionGranted = async function() {
    const overlay = document.getElementById('qrScannerOverlay');
    const video = document.getElementById('qrVideo');
    const statusEl = document.getElementById('qrScannerStatus');
    if (!overlay || !video) return;

    overlay.classList.remove('hidden');
    if (statusEl) statusEl.innerText = 'Point camera inside blue frame...';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusEl) statusEl.innerText = 'Live camera unavailable here. Use "Upload Pairing QR Screenshot" below.';
      return;
    }

    try {
      try {
        qrStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (innerErr) {
        qrStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      video.srcObject = qrStream;
      await video.play();
      qrScanningActive = true;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const detector =
        typeof window.BarcodeDetector === 'function'
          ? new window.BarcodeDetector({ formats: ['qr_code'] })
          : null;

      const tick = async function() {
        if (!qrScanningActive) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
          if (detector) {
            try {
              const codes = await detector.detect(video);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                if (applyScannedQrText(codes[0].rawValue)) return;
              }
            } catch (e) {}
          }

          if (typeof window.jsQR === 'function' && ctx) {
            const w = Math.min(720, video.videoWidth);
            const h = Math.round((video.videoHeight / video.videoWidth) * w);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const code = window.jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
            if (code && code.data) {
              if (applyScannedQrText(code.data)) return;
            }
          }
        }
        qrScanRaf = requestAnimationFrame(tick);
      };

      qrScanRaf = requestAnimationFrame(tick);
    } catch (err) {
      if (statusEl) {
        statusEl.innerText = 'Camera blocked or busy. Use "Upload Pairing QR Screenshot" below or paste token.';
      }
    }
  };

  window.stopQrScanner = function() {
    qrScanningActive = false;
    if (qrScanRaf) {
      cancelAnimationFrame(qrScanRaf);
      qrScanRaf = null;
    }
    if (qrStream) {
      qrStream.getTracks().forEach(function(t) { t.stop(); });
      qrStream = null;
    }
    const overlay = document.getElementById('qrScannerOverlay');
    if (overlay) overlay.classList.add('hidden');
  };

  window.handleQrImageUpload = function(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const statusEl = document.getElementById('qrScannerStatus');
    if (statusEl) statusEl.innerText = 'Decoding QR screenshot...';

    const reader = new FileReader();
    reader.onload = function() {
      const img = new Image();
      img.onload = function() {
        const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        if (typeof window.jsQR === 'function') {
          const code = window.jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (code && code.data && applyScannedQrText(code.data)) {
            return;
          }
        }
        if (statusEl) statusEl.innerText = 'Could not detect pairing QR in this image.';
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  window.simulateTestPayment = function() {
    const bridge = getBridge();
    if (bridge && bridge.simulateTestAlert) {
      bridge.simulateTestAlert(500.14, '412345678901');
    } else {
      alert('Simulated test webhook fired! In production app, this sends direct HTTP POST.');
    }
  };

  window.loadLogs = function() {
    const bridge = getBridge();
    const feed = document.getElementById('logsFeed');
    if (!bridge || !bridge.getLogs) return;

    try {
      const logsRaw = bridge.getLogs();
      const logs = typeof logsRaw === 'string' ? JSON.parse(logsRaw) : logsRaw;

      if (!logs || logs.length === 0) {
        feed.innerHTML = '<div class="empty-feed">No transactions intercepted yet. Waiting for bank credits...</div>';
        return;
      }

      feed.innerHTML = logs.map(function(item) {
        const d = new Date(item.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isOk = item.success;
        return `
          <div class="log-item">
            <div class="log-header">
              <span class="log-source">${item.source || 'UPI'}</span>
              <span class="log-time">${timeStr}</span>
            </div>
            <div class="log-message">${item.message || item.title || ''}</div>
            <div class="log-status ${isOk ? 'log-success' : 'log-fail'}">
              ${isOk ? 'Webhook Dispatched (HTTP ' + item.code + ')' : 'Dispatch Failed (HTTP ' + item.code + ')'}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('Error rendering logs:', e);
    }
  };

  // Callback from native side when pairing finishes or permission changes
  window.onNativeStateChanged = function() {
    const btn = document.getElementById('btnPair');
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Complete Device Pairing';
    }
    refreshState();
  };

  // Poll state every 3 seconds while active
  window.addEventListener('DOMContentLoaded', function() {
    refreshState();
    setInterval(refreshState, 3000);
  });

})();
