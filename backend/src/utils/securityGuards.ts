import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';

/**
 * Constant-time string comparison resistant to length/prefix timing leaks.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) {
    // Perform equal-length dummy comparison to minimize timing side-channels
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates a cryptographically secure numeric OTP using CSPRNG (crypto.randomInt).
 */
export function generateNumericOtp(digits = 6): string {
  const min = Math.pow(10, Math.max(4, digits - 1));
  const max = Math.pow(10, Math.max(4, digits));
  return crypto.randomInt(min, max).toString();
}

/**
 * Returns true if the supplied IPv4 or IPv6 literal belongs to loopback, private RFC1918,
 * link-local / cloud metadata (169.254.169.254), carrier-grade NAT, or multicast ranges.
 */
export function isPrivateOrReservedIp(ipRaw: string): boolean {
  const ip = String(ipRaw || '').trim().replace(/^\[|\]$/g, '');
  if (!ip) return true;

  const lower = ip.toLowerCase();

  // Unwrap IPv4-mapped IPv6 addresses in dotted (::ffff:127.0.0.1) or WHATWG hex (::ffff:7f00:1) form
  if (lower.startsWith('::ffff:')) {
    const suffix = lower.slice(7);
    if (net.isIPv4(suffix)) return isPrivateOrReservedIp(suffix);
    const hexGroups = suffix.split(':');
    if (hexGroups.length === 2 && hexGroups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) {
      const hi = parseInt(hexGroups[0], 16);
      const lo = parseInt(hexGroups[1], 16);
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      return isPrivateOrReservedIp(v4);
    }
    return true;
  }

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8 "this network"
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // Multicast & reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    // Expand zero compression (::) cleanly to detect expanded ::, ::1, fc00::/7, fe80::/10, 64:ff9b::
    const halves = lower.split('::');
    if (halves.length <= 2) {
      const left = halves[0] ? halves[0].split(':') : [];
      const right = halves[1] ? halves[1].split(':') : [];
      const missing = halves.length === 2 ? Math.max(0, 8 - (left.length + right.length)) : 0;
      const full = [...left, ...Array(missing).fill('0'), ...right].map((h) =>
        parseInt(h || '0', 16)
      );
      if (full.length === 8 && !full.some(isNaN)) {
        const isAllZero = full.every((h) => h === 0);
        const isLoopback = full.slice(0, 7).every((h) => h === 0) && full[7] === 1;
        const isIpv4Mapped =
          full.slice(0, 5).every((h) => h === 0) && full[5] === 0xffff;
        if (isIpv4Mapped) {
          const v4 = `${(full[6] >> 8) & 0xff}.${full[6] & 0xff}.${(full[7] >> 8) & 0xff}.${full[7] & 0xff}`;
          return isPrivateOrReservedIp(v4);
        }
        if (isAllZero || isLoopback) return true;
        if ((full[0] & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
        if ((full[0] & 0xffc0) === 0xfe80) return true; // Link-local fe80::/10
        if ((full[0] & 0xff00) === 0xff00) return true; // Multicast ff00::/8
        if (full[0] === 0x0064 && full[1] === 0xff9b) return true; // NAT64 64:ff9b::/96
        return false;
      }
    }
    return true;
  }

  return true;
}

/**
 * Validates outbound webhook URLs syntactically to defend against SSRF against
 * localhost, internal LAN, cloud metadata (169.254.169.254), and embedded credentials.
 */
export function validateSafeWebhookUrl(rawUrl: unknown): {
  valid: boolean;
  url: string;
  reason?: string;
} {
  if (rawUrl === undefined || rawUrl === null || String(rawUrl).trim() === '') {
    return { valid: true, url: '' };
  }

  const trimmed = String(rawUrl).trim();
  if (trimmed.length > 500) {
    return { valid: false, url: '', reason: 'Webhook URL must be 500 characters or fewer.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, url: '', reason: 'Webhook URL is malformed.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, url: '', reason: 'Webhook URL must use https:// or http://' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, url: '', reason: 'Webhook URL must not contain embedded credentials.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host === 'ip6-localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa')
  ) {
    return {
      valid: false,
      url: '',
      reason: 'Webhook target cannot point to localhost or internal hostnames.',
    };
  }

  if (net.isIP(host) && isPrivateOrReservedIp(host)) {
    return {
      valid: false,
      url: '',
      reason: 'Webhook target cannot point to private, loopback, or cloud metadata IP ranges.',
    };
  }

  return { valid: true, url: trimmed };
}

/**
 * Performs syntactic check plus live DNS resolution check to prevent DNS-rebinding SSRF.
 */
export async function resolveAndAssertSafeWebhookUrl(rawUrl: string): Promise<string> {
  const check = validateSafeWebhookUrl(rawUrl);
  if (!check.valid || !check.url) {
    throw new Error(check.reason || 'Blocked unsafe webhook target URL');
  }

  const parsed = new URL(check.url);
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!net.isIP(host)) {
    const records = await dns.lookup(host, { all: true });
    if (!records.length) {
      throw new Error('Webhook hostname did not resolve to any public address');
    }
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        throw new Error('Webhook hostname resolved to a private or reserved network address');
      }
    }
  }

  return check.url;
}

/**
 * Escapes CSV cell values against spreadsheet formula injection (CWE-1236) and delimiter breaking.
 */
export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const formulaSafe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

/**
 * Extracts normalized client IP respecting trusted reverse proxy headers.
 */
export function getClientIp(headers: Record<string, any>, fallbackIp?: string): string {
  const xff = headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).split(',')[0].trim();
  }
  return String(fallbackIp || '').trim() || 'Unknown';
}

/**
 * Escapes special regex metacharacters from user query strings before passing to MongoDB $regex
 * to prevent malformed-regex 500 crashes and ReDoS attacks.
 */
export function escapeRegex(value: unknown): string {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

