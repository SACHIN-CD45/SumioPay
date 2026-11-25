export interface ParsedPaymentAlert {
  amount: number | null;
  utr: string | null;
  senderName: string | null;
  appName: string;
  isPaymentAlert: boolean;
}

/**
 * Universal Regex Engine to parse UPI payment SMS and Push Notifications
 * Supports: PhonePe, Paytm, Google Pay, BHIM, HDFC, ICICI, SBI, Axis, Kotak, PNB, BOB, etc.
 */
export function parseBankNotification(message: string, packageName?: string): ParsedPaymentAlert {
  const text = message.trim();
  let amount: number | null = null;
  let utr: string | null = null;
  let senderName: string | null = null;
  let detectedApp = packageName || 'UPI_APP';

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
  // Prefer "from <Name>" first, then "by <Name>" excluding transfer modes (UPI, IMPS, NEFT, RTGS)
  const isTransferKeyword = (s: string) => /^(?:upi|imps|neft|rtgs|netbanking|bank)/i.test(s.trim());
  const fromMatch = text.match(/from\s+([A-Za-z\s]{3,30})(?:\s+via|\s+on|\s+ref|\.|$)/i);
  if (fromMatch && fromMatch[1] && !isTransferKeyword(fromMatch[1])) {
    senderName = fromMatch[1].trim();
  } else {
    const byMatch = text.match(/by\s+([A-Za-z\s]{3,30})(?:\s+via|\s+on|\s+ref|\.|$)/i);
    if (byMatch && byMatch[1] && !isTransferKeyword(byMatch[1])) {
      senderName = byMatch[1].trim();
    }
  }

  // 4. Identify App Origin if not provided in packageName
  const lowerText = text.toLowerCase();
  if (lowerText.includes('phonepe')) detectedApp = 'PHONEPE';
  else if (lowerText.includes('paytm')) detectedApp = 'PAYTM';
  else if (lowerText.includes('google pay') || lowerText.includes('gpay')) detectedApp = 'GPAY';
  else if (lowerText.includes('bhim')) detectedApp = 'BHIM';
  else if (lowerText.includes('hdfc')) detectedApp = 'HDFC_BANK';
  else if (lowerText.includes('icici')) detectedApp = 'ICICI_BANK';
  else if (lowerText.includes('sbi')) detectedApp = 'SBI_BANK';
  else if (lowerText.includes('axis')) detectedApp = 'AXIS_BANK';

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
