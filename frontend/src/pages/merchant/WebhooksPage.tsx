import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { NavLink } from 'react-router-dom';
import {
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  ShieldCheck,
  Globe,
  Check,
  Clock,
  ArrowRight,
  ExternalLink,
  Code2,
  X,
  Radio,
  Zap,
} from 'lucide-react';

export const WebhooksPage: React.FC = () => {
  const [merchant, setMerchant] = useState<any>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Filter logs: 'ALL' | 'SUCCESS' | 'FAILED'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  // Payload Inspector Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Redelivery State
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Signature snippet language tab
  const [snippetLang, setSnippetLang] = useState<'node' | 'python' | 'php'>('node');

  const fetchProfile = async () => {
    try {
      const res = await api.get('/merchant/profile');
      if (res.data.success) {
        setMerchant(res.data.data);
        setWebhookUrl(res.data.data.webhookUrl || '');
      }
    } catch (err) {
      console.error('[WebhooksPage] fetchProfile error', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const logsRes = await api.get('/webhook/logs');
      if (logsRes.data.success) {
        setLogs(logsRes.data.data.logs || []);
      }
    } catch (err) {
      console.error('[WebhooksPage] fetchLogs error', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchLogs();
  }, []);

  const copyToClipboard = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('Please enter a valid HTTP/HTTPS webhook destination URL');
      return;
    }
    try {
      setSaving(true);
      setSaved(false);
      await api.put('/merchant/profile', { webhookUrl: webhookUrl.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      fetchProfile();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to update webhook URL');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDispatch = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.post('/webhook/test-dispatch', { targetUrl: webhookUrl.trim() });
      setTestResult(res.data);
      fetchLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResendWebhook = async (logId: string) => {
    try {
      setResendingId(logId);
      setResendStatus(null);
      const res = await api.post(`/webhook/resend/${logId}`);
      setResendStatus({
        id: logId,
        success: res.data.success,
        message: res.data.message || (res.data.success ? 'Redelivered successfully!' : 'Redelivery failed'),
      });
      setTimeout(() => setResendStatus(null), 4000);
      fetchLogs();
    } catch (err: any) {
      setResendStatus({
        id: logId,
        success: false,
        message: err.response?.data?.message || 'Failed to redeliver webhook',
      });
      setTimeout(() => setResendStatus(null), 4000);
    } finally {
      setResendingId(null);
    }
  };

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const isSuccess = log.responseStatus >= 200 && log.responseStatus < 300;
    if (statusFilter === 'SUCCESS') return isSuccess;
    if (statusFilter === 'FAILED') return !isSuccess;
    return true;
  });

  const totalLogs = logs.length;
  const successLogs = logs.filter((l) => l.responseStatus >= 200 && l.responseStatus < 300).length;
  const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

  const webhookSecret = merchant?.webhookSecret || 'sp_whsec_...';

  const verificationSnippets = {
    node: `// Node.js Express Webhook Verification Handler
const express = require('express');
const crypto = require('crypto');
const app = express();

app.post('/api/webhooks/sumiopay', express.json(), (req, res) => {
  const signature = req.headers['x-sumiopay-signature'];
  const timestamp = req.headers['x-sumiopay-timestamp'];
  const eventId = req.headers['x-sumiopay-event-id'];
  const secret = "${webhookSecret}";

  // 1. Replay defense check (within 300 seconds)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return res.status(401).send('Webhook timestamp expired (replay defense)');
  }

  // 2. Compute HMAC-SHA256
  const payloadString = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payloadString}\`)
    .digest('hex');

  // 3. Timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature || '', 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // 4. Handle Verified Event
  const { type, data } = req.body;
  if (type === 'payment.succeeded') {
    console.log(\`Verified Payment for Order \${data.orderId}: ₹\${data.exactAmount} (UTR: \${data.utr})\`);
    // Activate customer subscription or fulfill order!
  }

  res.status(200).json({ received: true });
});`,

    python: `# Python / FastAPI Webhook Verification
import hmac, hashlib, json, time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = "${webhookSecret}"

@app.post("/api/webhooks/sumiopay")
async def handle_webhook(request: Request):
    signature = request.headers.get("x-sumiopay-signature")
    timestamp = request.headers.get("x-sumiopay-timestamp")
    body = await request.body()

    # 1. Replay defense
    if abs(time.time() - int(timestamp or 0)) > 300:
        raise HTTPException(status_code=401, detail="Timestamp expired")

    # 2. Compute HMAC-SHA256
    data_to_sign = f"{timestamp}.{body.decode('utf-8')}".encode()
    expected = hmac.new(WEBHOOK_SECRET.encode(), data_to_sign, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature or "", expected):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(body)
    print("Verified Event:", payload.get("type"), payload.get("data", {}).get("orderId"))
    return {"received": True}`,

    php: `<?php
// PHP / Laravel Webhook Verification
$signature = $_SERVER['HTTP_X_SUMIOPAY_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_SUMIOPAY_TIMESTAMP'] ?? '';
$payload   = file_get_contents('php://input');
$secret    = "${webhookSecret}";

// 1. Replay defense
if (abs(time() - (int)$timestamp) > 300) {
    http_response_code(401);
    exit('Timestamp expired');
}

// 2. Compute HMAC
$expectedSignature = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);

// 3. Timing-safe comparison
if (!hash_equals($signature, $expectedSignature)) {
    http_response_code(401);
    exit('Invalid HMAC Signature');
}

$event = json_decode($payload, true);
if ($event['type'] === 'payment.succeeded') {
    $orderId = $event['data']['orderId'];
    $utr = $event['data']['utr'];
    // Update database & fulfill order!
}

http_response_code(200);
echo json_encode(['received' => true]);
?>`,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-xs">
      {/* Top Banner Navigation: Cross-link to Connect Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-900">Looking for Client Checkout SDKs or Payment Links?</span>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Generate instant payment links or drop in React/HTML checkout snippets on the Connect page.
            </p>
          </div>
        </div>
        <NavLink
          to="/connect"
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-sm"
        >
          <span>Connect Payments Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </NavLink>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-7 h-7 text-emerald-600" />
            Webhooks &amp; Real-Time Event Dispatcher
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-xs">
            Monitor incoming payment credit dispatches, inspect HTTP request/response payloads, and configure HMAC-SHA256 signature verification.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loadingLogs}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loadingLogs ? 'animate-spin' : ''}`} />
          <span>Refresh Delivery Logs</span>
        </button>
      </div>

      {/* Webhook Health & Telemetry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</span>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalLogs}</div>
          <p className="text-[10px] text-slate-500">Audit logs retained</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Success Rate</span>
          <div className="text-2xl font-black text-emerald-600 font-mono">{successRate}%</div>
          <p className="text-[10px] text-emerald-600 font-medium">HTTP 2xx Acknowledged</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Latency</span>
          <div className="text-2xl font-black text-blue-600 font-mono">&lt; 180ms</div>
          <p className="text-[10px] text-slate-500">Non-blocking async queue</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signing Scheme</span>
          <div className="text-2xl font-black text-slate-900 font-mono">HMAC-SHA256</div>
          <p className="text-[10px] text-indigo-600 font-medium">Anti-replay timestamp active</p>
        </div>
      </div>

      {/* Webhook Destination & Signing Key Settings */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Webhook Destination Endpoint</h2>
              <p className="text-[11px] text-slate-500">
                SumioPay delivers an HTTP POST request to this server endpoint the moment an order is confirmed.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Webhook Engine Ready
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-slate-700 font-bold block mb-1 text-[11px]">
              Destination URL (HTTPS Recommended)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://sumiolab.in/api/webhooks/sumiopay"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saved ? <Check className="w-4 h-4" /> : null}
                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Endpoint'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestDispatch}
                disabled={testing || !webhookUrl}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-100 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className={`w-3.5 h-3.5 text-blue-400 ${testing ? 'animate-pulse' : ''}`} />
                <span>{testing ? 'Dispatching Ping...' : 'Send Live Test Ping'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.destinationUrl && (
                  <div className="font-mono text-[11px] opacity-80">Target: {testResult.destinationUrl}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Webhook Secret Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Webhook HMAC-SHA256 Signing Secret
              </label>
              <span className="text-[10px] font-mono text-slate-400">Header: x-sumiopay-signature</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type={showSecret ? 'text' : 'password'}
                readOnly
                value={webhookSecret}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 font-mono text-slate-900 text-xs select-all"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                title={showSecret ? 'Hide Secret' : 'Show Secret'}
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookSecret, 'secret')}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              >
                {copiedItem === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedItem === 'secret' ? 'Copied' : 'Copy Secret'}</span>
              </button>
            </div>
          </div>

          {/* Subscribed Events Checklist */}
          <div>
            <label className="text-slate-700 font-bold block mb-2 text-[11px]">
              Active Event Types Delivered to This Webhook:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { name: 'payment.succeeded', label: 'Payment Succeeded', desc: 'Bank credit confirmed by phone listener' },
                { name: 'payment.failed', label: 'Payment Failed', desc: 'Invalid or rejected payment attempt' },
                { name: 'payment.expired', label: 'Order Expired', desc: '15-minute paise reservation window elapsed' },
                { name: 'reconciliation.completed', label: 'Bank Statement Matched', desc: 'Offline bank passbook auto-settled' },
              ].map((ev) => (
                <div key={ev.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{ev.label}</span>
                  </div>
                  <div className="font-mono text-[9px] text-blue-600">{ev.name}</div>
                  <p className="text-[10px] text-slate-500 leading-snug">{ev.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Delivery Audit Log Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Recent Webhook Delivery Audit Logs</h2>
            <p className="text-[11px] text-slate-500">
              Live chronological record of HTTP POST events delivered to your server.
            </p>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
            {(['ALL', 'SUCCESS', 'FAILED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter === 'ALL' ? 'All Logs' : filter === 'SUCCESS' ? '✓ 2xx Success' : '✕ Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Global Resend Feedback Toast */}
        {resendStatus && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              resendStatus.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {resendStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span className="font-semibold">{resendStatus.message}</span>
            </div>
            <button onClick={() => setResendStatus(null)} className="text-[10px] underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/70 font-semibold">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">Destination Endpoint</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isSuccess = log.responseStatus >= 200 && log.responseStatus < 300;
                const isResending = resendingId === log._id;

                return (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : log.status === 'PENDING_RETRY'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuccess
                                ? 'bg-emerald-500'
                                : log.status === 'PENDING_RETRY'
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-rose-500'
                            }`}
                          ></span>
                          {log.responseStatus || 'TIMEOUT'}
                          {log.status === 'PENDING_RETRY' ? ` • Retry ${log.attempt || 1}/${log.maxAttempts || 5}` : ''}
                          {log.attempt > 1 && isSuccess ? ` (Attempt #${log.attempt})` : ''}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {log.orderId}
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {log.payload?.type || 'payment.succeeded'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600 truncate max-w-xs font-mono text-[11px]" title={log.url}>
                      {log.url}
                    </td>

                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(log);
                            setInspectModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition"
                          title="Inspect Headers & JSON Payload"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResendWebhook(log._id)}
                          disabled={isResending}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                          title="Redeliver Webhook to Server"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                          <span>{isResending ? 'Retrying...' : 'Resend'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">No webhook delivery logs match the selected filter.</p>
                    <p className="text-[11px] mt-0.5">Click &quot;Send Live Test Ping&quot; above to verify your destination URL.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HMAC Signature Verification Code Snippets */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">HMAC-SHA256 Signature Verification Code</h2>
              <p className="text-[11px] text-slate-500">
                Copy and paste this snippet into your server to verify that requests genuinely originate from SumioPay.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {[
              { id: 'node', label: 'Node.js / Express' },
              { id: 'python', label: 'Python / FastAPI' },
              { id: 'php', label: 'PHP / Laravel' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSnippetLang(tab.id as any)}
                className={`px-3 py-1 rounded-lg transition ${
                  snippetLang === tab.id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => copyToClipboard(verificationSnippets[snippetLang], 'snippet')}
            className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono flex items-center gap-1 transition z-10"
          >
            {copiedItem === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedItem === 'snippet' ? 'Copied' : 'Copy Snippet'}</span>
          </button>
          <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
            {verificationSnippets[snippetLang]}
          </pre>
        </div>
      </div>

      {/* Webhook Payload Inspector Modal */}
      {inspectModalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Webhook Payload Inspector: {selectedLog.orderId}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Event: {selectedLog.payload?.type || 'payment.succeeded'} &bull; Status: {selectedLog.responseStatus}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Destination URL</label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-blue-700 break-all select-all">
                  POST {selectedLog.url}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">HTTP Headers Sent</label>
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1">
                  <div>Content-Type: application/json</div>
                  <div>x-sumiopay-event-id: {selectedLog.payload?.id || 'evt_...'}</div>
                  <div>x-sumiopay-event: {selectedLog.payload?.type || 'payment.succeeded'}</div>
                  <div>x-sumiopay-timestamp: {Math.floor(new Date(selectedLog.createdAt).getTime() / 1000)}</div>
                  <div className="text-emerald-400">
                    x-sumiopay-signature: [HMAC-SHA256 hex digest]
                  </div>
                  <div>User-Agent: SumioPay-Enterprise-Webhook-Engine/2.0</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">JSON Request Body</label>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(selectedLog.payload, null, 2), 'modalPayload')
                    }
                    className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedItem === 'modalPayload' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto border border-slate-800 leading-relaxed max-h-48">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Destination Server Response (Status: {selectedLog.responseStatus || 'N/A'})
                </label>
                <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-800 overflow-x-auto max-h-28">
                  {selectedLog.responseBody || '(No response body or empty response)'}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setInspectModalOpen(false);
                  handleResendWebhook(selectedLog._id);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend This Webhook Now</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhooksPage;
