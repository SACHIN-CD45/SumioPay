import type { CheckoutOrderPayload } from '../components/checkout/SumioCheckoutCard';

function escapeHtml(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  return Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generates an XSS-escaped, print-optimized Direct UPI & GST Tax Receipt / Invoice window
 * so customers and merchants can Save as PDF cleanly via native browser print.
 */
export function openPrintableReceipt(
  order: Partial<CheckoutOrderPayload> & {
    customerEmail?: string;
    customerPhone?: string;
    customerUserId?: string;
    senderName?: string;
    bankAppName?: string;
    merchantGstin?: string;
  }
): void {
  const siteName = order.websiteName || order.metadata?.websiteName || order.merchantName || order.appName || 'Verified Merchant';
  const gstin = order.merchantGstin || '';
  const bill = order.billDetails || order.metadata?.billDetails || null;
  const orderId = order.orderId || 'N/A';
  const utr = order.utrNumber || order.utr || 'Bank Reference Confirmed';
  const paidDate = order.paidAt
    ? new Date(order.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const paidTotal = Number(order.exactAmount || order.baseAmount || 0);
  const rawDiscount = Number(bill?.discountAmount || 0);
  const taxAmount = Number(bill?.taxAmount || 0);
  const platformFee = Number(bill?.platformFee || 0);
  const subtotal =
    bill?.subtotal !== undefined
      ? Number(bill.subtotal)
      : rawDiscount > 0
      ? Math.max(0, Number(((order.baseAmount || paidTotal) + rawDiscount - taxAmount - platformFee).toFixed(2)))
      : Number(order.baseAmount || paidTotal);

  const itemsHtml =
    Array.isArray(bill?.items) && bill.items.length > 0
      ? bill.items
          .map((it: any) => {
            const qty = Number(it.quantity || 1);
            const lineTotal = Number(it.amount || 0) * qty;
            return `<tr>
              <td>${escapeHtml(it.label)}</td>
              <td style="text-align:center;">${qty}</td>
              <td style="text-align:right;font-family:monospace;">₹${formatInr(lineTotal)}</td>
            </tr>`;
          })
          .join('')
      : `<tr>
          <td>${escapeHtml(order.metadata?.planName || order.appName || 'Payment Receipt')}</td>
          <td style="text-align:center;">1</td>
          <td style="text-align:right;font-family:monospace;">₹${formatInr(subtotal)}</td>
        </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt ${escapeHtml(orderId)} - ${escapeHtml(siteName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; margin: 0; padding: 32px; background: #F8FAFC; }
    .sheet { max-width: 720px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(15,23,42,0.06); }
    .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #F1F5F9; padding-bottom: 20px; margin-bottom: 20px; gap: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ECFDF5; color: #047857; font-size: 11px; font-weight: 800; border: 1px solid #A7F3D0; text-transform: uppercase; }
    h1 { margin: 4px 0; font-size: 22px; }
    .muted { color: #64748B; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
    .kv-label { color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 2px; }
    .kv-val { font-weight: 700; word-break: break-all; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #CBD5E1; padding: 10px 8px; }
    td { padding: 12px 8px; border-bottom: 1px solid #F1F5F9; }
    .totals { max-width: 320px; margin-left: auto; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .totals-final { border-top: 2px solid #0F172A; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 900; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px dashed #CBD5E1; font-size: 11px; color: #64748B; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .actions { text-align: right; max-width: 720px; margin: 0 auto 14px; }
    .btn { background: #0F172A; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border: none; padding: 12px; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn" onclick="window.print()">Print / Save PDF Receipt</button>
  </div>
  <div class="sheet">
    <div class="top">
      <div>
        <div class="badge">${order.isTest ? 'TEST MODE RECEIPT' : 'PAID • DIRECT UPI RECEIPT'}</div>
        <h1>${escapeHtml(siteName)}</h1>
        ${gstin ? `<div class="muted"><strong>GSTIN:</strong> ${escapeHtml(gstin)}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-weight:800;font-size:15px;">BILL-${escapeHtml(orderId)}</div>
        <div class="muted">Date: ${escapeHtml(paidDate)} IST</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <span class="kv-label">Order ID</span>
        <span class="kv-val" style="font-family:monospace;">${escapeHtml(orderId)}</span>
      </div>
      <div>
        <span class="kv-label">Bank UTR / Reference</span>
        <span class="kv-val" style="font-family:monospace;color:#047857;">${escapeHtml(utr)}</span>
      </div>
      <div>
        <span class="kv-label">Customer</span>
        <span class="kv-val">${escapeHtml(order.senderName || order.customerEmail || order.customerUserId || 'Direct Payer')}</span>
      </div>
      <div>
        <span class="kv-label">Payment Channel</span>
        <span class="kv-val">${escapeHtml(order.bankAppName || 'UPI Direct Bank Settlement')}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description / Item</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span style="font-family:monospace;">₹${formatInr(subtotal)}</span></div>
      ${
        rawDiscount > 0
          ? `<div class="totals-row" style="color:#047857;"><span>Coupon ${bill?.couponCode ? `(${escapeHtml(bill.couponCode)})` : 'Discount'}</span><span style="font-family:monospace;">-₹${formatInr(rawDiscount)}</span></div>`
          : ''
      }
      ${
        taxAmount > 0
          ? `<div class="totals-row"><span>${escapeHtml(bill?.taxLabel || 'GST / Taxes')}</span><span style="font-family:monospace;">+₹${formatInr(taxAmount)}</span></div>`
          : ''
      }
      ${
        platformFee > 0
          ? `<div class="totals-row"><span>Convenience Fee</span><span style="font-family:monospace;">+₹${formatInr(platformFee)}</span></div>`
          : ''
      }
      <div class="totals-row totals-final">
        <span>Total Paid (INR)</span>
        <span style="font-family:monospace;">₹${formatInr(paidTotal)}</span>
      </div>
    </div>

    <div class="footer">
      <div>Direct bank-to-bank settlement verified via SumioPay automation (₹0.00 held in escrow).</div>
      <div>Powered by SumioPay &bull; SumioTech</div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=840,height=920');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        // User can use the on-page Print button
      }
    }, 350);
    return;
  }

  // Fallback if browser blocks popups: open safe HTML blob download
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sumiopay-receipt-${orderId}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
