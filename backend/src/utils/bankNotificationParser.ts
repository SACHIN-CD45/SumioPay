export interface ParsedPaymentAlert {
  amount: number | null;
  utr: string | null;
  senderName: string | null;
  appName: string;
  isPaymentAlert: boolean;
}

const PACKAGE_APP_MAP: Record<string, string> = {
  'com.phonepe.app': 'PHONEPE',
  'com.phonepe.merchant': 'PHONEPE_BUSINESS',
  'com.phonepe.simulator': 'PHONEPE_SIMULATOR',
  'net.one97.paytm': 'PAYTM',
  'com.paytm.business': 'PAYTM_BUSINESS',
  'com.google.android.apps.nbu.paisa.user': 'GOOGLE_PAY',
  'com.google.android.apps.nbu.paisa.merchant': 'GPAY_BUSINESS',
  'in.org.npci.upiapp': 'BHIM',
  'com.snapwork.hdfc': 'HDFC_BANK',
  'com.csam.icici.bank.imobile': 'ICICI_BANK',
  'com.sbi.upi': 'SBI_BANK',
  'com.sbi.lotusintouch': 'SBI_BANK',
  'com.axis.mobile': 'AXIS_BANK',
  'com.msf.kopl': 'KOTAK_BANK',
  'com.dreamplug.androidapp': 'CRED',
  'com.google.android.apps.messaging': 'BANK_SMS',
  'com.samsung.android.messaging': 'BANK_SMS',
};

/**
 * Universal Regex Engine to parse UPI payment SMS and Push Notifications
 * Supports: PhonePe, Paytm, Google Pay, BHIM, HDFC, ICICI, SBI, Axis, Kotak, PNB, BOB, etc.
 */
export function parseBankNotification(message: string, packageName?: string): ParsedPaymentAlert {
  const text = message.trim();
  let amount: number | null = null;
  let utr: string | null = null;
  let senderName: string | null = null;
  let detectedApp = (packageName && PACKAGE_APP_MAP[packageName]) || packageName || 'UPI_APP';

  // 1. Amount Extraction Regex
  // Matches: "received Rs.999.47", "Rs 999.47", "INR 999.47", "₹ 999.47", "₹999.47 credited"
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /received\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /credited\s+(?:with\s+)?(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /paid\s+you\s+(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // 2. 12-digit UPI Reference / UTR Number Extraction
  // Matches: "UPI Ref: 432109876543", "UTR 432109876543", "Ref no 432109876543"
  const utrRegexes = [
    /(?:upi\s*ref(?:erence)?(?:\s*no\.?)?|utr(?:\s*no\.?)?|ref\s*no\.?)\s*[:#-]?\s*([0-9]{12})/i,
    /\b([0-9]{12})\b/, // Raw 12-digit fallback
  ];

  for (const regex of utrRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      utr = match[1];
      break;
    }
  }

  // 3. Sender Name Extraction
  // Supports "UPI/P2A/<UTR>/<Name>", "from <Name>", and "by <Name>"
  const isTransferKeyword = (s: string) => /^(?:upi|imps|neft|rtgs|netbanking|bank|p2a|p2m)/i.test(s.trim());
  const sbiSlashMatch = text.match(/UPI\/(?:P2A|P2M)\/[0-9]{12}\/([A-Za-z0-9\s._-]{2,30})(?:\s|\(|$)/i);
  const fromMatch = text.match(/from\s+([A-Za-z\s]{3,30})(?:\s+via|\s+on|\s+ref|\.|$)/i);
  const byMatch = text.match(/by\s+([A-Za-z\s]{3,30})(?:\s+via|\s+on|\s+ref|\.|$)/i);

  if (sbiSlashMatch && sbiSlashMatch[1] && !isTransferKeyword(sbiSlashMatch[1])) {
    senderName = sbiSlashMatch[1].trim();
  } else if (fromMatch && fromMatch[1] && !isTransferKeyword(fromMatch[1])) {
    senderName = fromMatch[1].trim();
  } else if (byMatch && byMatch[1] && !isTransferKeyword(byMatch[1])) {
    senderName = byMatch[1].trim();
  } else if (text.match(/^([A-Za-z\s]{3,30})\s+paid\s+you/i)) {
    senderName = text.match(/^([A-Za-z\s]{3,30})\s+paid\s+you/i)![1].trim();
  }

  // 4. Identify Bank / App Origin from message keywords when clear or SMS package
  const lowerText = text.toLowerCase();
  if (lowerText.includes('phonepe')) detectedApp = 'PHONEPE';
  else if (lowerText.includes('paytm')) detectedApp = 'PAYTM';
  else if (lowerText.includes('google pay') || lowerText.includes('gpay')) detectedApp = 'GPAY';
  else if (lowerText.includes('bhim')) detectedApp = 'BHIM';
  else if (lowerText.includes('hdfc')) detectedApp = 'HDFC_BANK';
  else if (lowerText.includes('icici')) detectedApp = 'ICICI_BANK';
  else if (lowerText.includes('sbi') || lowerText.includes('state bank')) detectedApp = 'SBI_BANK';
  else if (lowerText.includes('axis')) detectedApp = 'AXIS_BANK';
  else if (lowerText.includes('kotak')) detectedApp = 'KOTAK_BANK';
  else if (lowerText.includes('pnb') || lowerText.includes('punjab national')) detectedApp = 'PNB_BANK';
  else if (lowerText.includes('bank of baroda') || lowerText.includes('bob')) detectedApp = 'BOB_BANK';
  else if (lowerText.includes('canara')) detectedApp = 'CANARA_BANK';
  else if (lowerText.includes('indusind')) detectedApp = 'INDUSIND_BANK';
  else if (lowerText.includes('idfc')) detectedApp = 'IDFC_FIRST';
  else if (lowerText.includes('yes bank')) detectedApp = 'YES_BANK';
  else if (lowerText.includes('union bank')) detectedApp = 'UNION_BANK';

  // Verification whether message is genuinely an incoming credit alert
  const creditKeywords = ['received', 'credited', 'paid you', 'payment of', 'deposited'];
  const isCredit = creditKeywords.some((kw) => lowerText.includes(kw));

  return {
    amount,
    utr,
    senderName,
    appName: detectedApp,
    isPaymentAlert: !!(amount && isCredit),
  };
}
