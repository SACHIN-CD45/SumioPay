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
