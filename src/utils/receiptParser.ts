import { formatCurrency } from './helpers';

export interface ParsedReceipt {
  amount: number | null;
  description: string;
  notes: string;
  itemCount: number;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface ReceiptLineItem {
  name: string;
  amount: number;
  quantity?: number;
}

const TOTAL_LINE_HINTS =
  /grand\s*total|total\s*payable|amount\s*paid|total\s*paid|total\s*amount|to\s*pay|pay\s*now|bill\s*total|order\s*total|^total\s*[:.]?\s*$|^total\b\s*[:.-]?\s*(?:₹|rs\.?|inr|\$)?\s*[0-9OoQDIl|SsBb,\.\s]+(?:\/-)?\s*$/i;
const WEAK_TOTAL_HINTS = /\btotal\b|payable|subtotal/i;
const NEGATIVE_LINE_HINTS =
  /saved\s|you\s+saved|discount|cashback|delivery\s*fee|platform\s*fee|packaging|gst\s*breakup|tax\s*summary/i;
const NON_ITEM_LINE_HINTS =
  /total|subtotal|payable|paid|balance|change|discount|cashback|saved|tax|gst|cgst|sgst|igst|\bfee\b|\bcharge\b|delivery|platform|packaging|\btip\b|round\s*off|invoice|receipt|bill\s*no|order\s*id|order\s*no|token|date|time|phone|mobile|address|table|cashier|payment|upi|card|cash|wallet|thank\s*you|powered\s*by|fssai|store|shop|mall|center|road|street|city|state|pin|zip|email|website|gstin|vat|building|shop|store|mall|center|centre|lane|avenue|boulevard|drive|court|place|way|circle|square|terrace|town|village|district|zone|area|sector|near|opposite|behind|beside|next\s+to|contact|customer|server|waiter|table\s*no|order\s*no|invoice\s*no|gstn|pan|aadhar|license|registration|authorized|registered|head\s*office|branch|franchise|outlet|location|landmark|gps|coordinates|map|directions|route|distance|travel|transport|vehicle|parking|entry|exit|gate|door|floor|lift|elevator|escalator|stair|wing|block|tower|phase|sector|plot|survey|number|no\.|num|h\.no|house|apartment|flat|room|suite|unit|complex|society|colony|nagar|nagar|pura|pura|ganj|ganj|market|bazaar|mandi|mandi|chowk|chowk|chauraha|chauraha|cross|junction|signal|traffic|police|hospital|school|college|university|bank|atm|office|factory|industry|warehouse|godown|depot|terminal|station|airport|railway|bus|metro|train|flight|taxi|cab|auto|rickshaw|bike|cycle|walk|pedestrian|footpath|sidewalk|pavement|bridge|flyover|underpass|tunnel|highway|expressway|freeway|motorway|roadway|streetway|lane|alley|bylane|gully|path|track|trail|route|way|pass|cut|bypass|ring\s*road|outer\s*ring|inner\s*ring|marg|marg|link|road|service\s*road|main\s*road|arterial\s*road|local\s*road|colony\s*road|sector\s*road|plot\s*road|industrial\s*area|commercial\s*area|residential\s*area|business\s*district|shopping\s*complex|multiplex|theater|cinema|mall|plaza|arcade|court|forum|hub|center|centre/i;
const DATE_OR_TIME_HINTS =
  /\b(?:date|time|invoice|bill\s*no|order\s*id|order\s*no|token|phone|mobile|address|fssai)\b/i;
const DATE_OR_TIME_VALUE =
  /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}(?::\d{2})?)\b/;
const MONTH_NAME_VALUE =
  /\b\d{1,2}\s*(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/i;
const PIN_CODE_VALUE = /\b[1-9]\d{5}\b/;
const ADDRESS_CONTEXT_HINTS =
  /\b(?:pin|pincode|postal|zip|road|rd|street|st|lane|ln|avenue|ave|nagar|colony|area|city|district|state|chennai|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|kolkata|kochi|coimbatore|madurai|tamil\s*nadu|karnataka|kerala|maharashtra)\b/i;
const MERCHANT_REJECT_HINTS =
  /invoice|receipt|bill|order|token|date|time|phone|mobile|address|gst|tax|fssai|cashier|payment|total|subtotal|amount|qty|quantity|item|price|rate|thank/i;

function normalizeReceiptText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[−–—]/g, '-')
    .replace(/[×✕]/g, 'x')
    .replace(/[₹]/g, '₹')
    .replace(/[ ]{2,}/g, ' ');
}

function normalizeNumberToken(value: string): string {
  let cleaned = value
    .replace(/(?:rs\.?|inr|r\s*s)\s*/gi, '')
    .replace(/[₹$]/g, '')
    .replace(/[/-]+$/g, '')
    .replace(/[OoQD]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[gq]/g, '9')
    .trim();

  if (!cleaned) return '';

  const spaceParts = cleaned.split(/\s+/).filter(Boolean);
  if (spaceParts.length > 1 && !/[.,]/.test(cleaned)) {
    const last = spaceParts[spaceParts.length - 1];
    const first = spaceParts.slice(0, -1).join('');
    cleaned =
      last.length === 2 && first.length >= 1 && first.length <= 5
        ? `${first}.${last}`
        : spaceParts.join('');
  } else {
    cleaned = cleaned.replace(/\s+/g, '');
  }

  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const decimalDigits = cleaned.length - lastComma - 1;
    if (decimalDigits > 0 && decimalDigits <= 2) {
      cleaned = `${cleaned.slice(0, lastComma).replace(/,/g, '')}.${cleaned.slice(lastComma + 1)}`;
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }

  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '');
  }

  return cleaned;
}

function parseMoneyToken(s: string): number | null {
  const cleaned = normalizeNumberToken(s);
  if (!/^\d+\.?\d*$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function isBarePinCodeToken(token: string): boolean {
  const cleaned = normalizeNumberToken(token);
  return /^[1-9]\d{5}$/.test(cleaned);
}

function isDateOrTimeLine(line: string): boolean {
  return (
    DATE_OR_TIME_VALUE.test(line) ||
    MONTH_NAME_VALUE.test(line) ||
    /\b(?:date|dte|ate|time)\s*[:.-]?\s*\d{1,2}\b/i.test(line)
  );
}

function isAddressOrPinLine(line: string): boolean {
  return PIN_CODE_VALUE.test(line) && (ADDRESS_CONTEXT_HINTS.test(line) || !/(?:₹|\$|rs\.?|inr)/i.test(line));
}

function shouldIgnoreMoneyLine(line: string): boolean {
  if (TOTAL_LINE_HINTS.test(line) || WEAK_TOTAL_HINTS.test(line)) return false;
  return isDateOrTimeLine(line) || isAddressOrPinLine(line);
}

function normalizeForMerchant(text: string): string {
  // OCR often swaps similar-looking characters. Normalize common confusions.
  // Keep it simple—this just helps merchant detection for receipts/screenshots.
  return text
    .toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAmountsFromLine(line: string): number[] {
  const out: number[] = [];
  if (shouldIgnoreMoneyLine(line)) return out;
  const hasDateOrTimeValue = DATE_OR_TIME_VALUE.test(line);
  const rupee =
    /(?:₹|rs\.?\s*|inr\s*|r\s*s\s*)([0-9OoQDIl|SsBb,\.\s]{1,18}(?:\/-)?)\b/gi;
  const dollar = /\$\s*([0-9OoQDIl|SsBb,\.\s]{1,18}(?:\/-)?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = rupee.exec(line)) !== null) {
    const v = parseMoneyToken(m[1]);
    if (v !== null) out.push(v);
  }
  while ((m = dollar.exec(line)) !== null) {
    const v = parseMoneyToken(m[1]);
    if (v !== null) out.push(v);
  }
  // lone decimals (last resort on same line as "342.50")
  if (out.length === 0) {
    const loose = line.match(/\b(?:[0-9OoQDIl|SsBb]{1,3}(?:,[0-9OoQDIl|SsBb]{2,3})+|[0-9OoQDIl|SsBb]{1,6})(?:[.,][0-9OoQDIl|SsBb]{1,2})?(?:\/-)?\b/g);
    if (loose) {
      for (const t of loose) {
        if (hasDateOrTimeValue && line.includes(t)) continue;
        if (DATE_OR_TIME_HINTS.test(line) && !WEAK_TOTAL_HINTS.test(line)) continue;
        if (isBarePinCodeToken(t)) continue;
        const v = parseMoneyToken(t);
        if (v !== null && v >= 10) out.push(v); // skip years like 2024 unless large context
      }
    }
  }
  return out;
}

function extractTrailingAmount(line: string): { amount: number; label: string; hadCurrency: boolean } | null {
  if (shouldIgnoreMoneyLine(line)) return null;
  // Try currency symbol first (most reliable)
  const currencyMatch = line.match(/^(.*?)(?:₹|rs\.?\s*|inr\s*|r\s*s\s*)([0-9OoQDIl|SsBb,\.\s]{1,18}(?:\/-)?)\s*$/i);
  if (currencyMatch) {
    const amount = parseMoneyToken(currencyMatch[2]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: currencyMatch[1], hadCurrency: true };
    }
  }

  // Try decimal format (e.g., "Item 123.45")
  const decimalMatch = line.match(/^(.*?)\s+([0-9OoQDIl|SsBb,]+[.,][0-9OoQDIl|SsBb]{1,2}|[0-9OoQDIl|SsBb]{2,5}\/-)\s*$/);
  if (decimalMatch) {
    const amount = parseMoneyToken(decimalMatch[2]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: decimalMatch[1], hadCurrency: false };
    }
  }

  // Try whole number with text (e.g., "Item 123")
  const wholeNumberMatch = line.match(/^(.*?)\s+([0-9OoQDIl|SsBb]{2,5})\s*$/);
  if (wholeNumberMatch && /[a-z]/i.test(wholeNumberMatch[1])) {
    const amount = parseMoneyToken(wholeNumberMatch[2]);
    if (amount !== null && amount >= 10 && amount <= 50_000) {
      return { amount, label: wholeNumberMatch[1], hadCurrency: false };
    }
  }

  // Try to find amount anywhere in line (for receipts with different formatting)
  const amountAnywhere = line.match(/^(.*?)\s*([0-9OoQDIl|SsBb,]+[.,][0-9OoQDIl|SsBb]{1,2}|[0-9OoQDIl|SsBb]{2,5}\/-)\s*(.*)$/);
  if (amountAnywhere && amountAnywhere[1].length > 0) {
    const amount = parseMoneyToken(amountAnywhere[2]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: amountAnywhere[1], hadCurrency: false };
    }
  }

  return null;
}

function extractLeadingAmount(line: string): { amount: number; label: string; hadCurrency: boolean } | null {
  if (shouldIgnoreMoneyLine(line)) return null;
  const currencyMatch = line.match(/^\s*(?:₹|rs\.?\s*|inr\s*|r\s*s\s*)([0-9OoQDIl|SsBb,\.\s]{1,18}(?:\/-)?)\s+(.+)$/i);
  if (currencyMatch) {
    const amount = parseMoneyToken(currencyMatch[1]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: currencyMatch[2], hadCurrency: true };
    }
  }

  const decimalMatch = line.match(/^\s*([0-9OoQDIl|SsBb,]+[.,][0-9OoQDIl|SsBb]{1,2}|[0-9OoQDIl|SsBb]{2,5}\/-)\s+(.+)$/);
  if (decimalMatch) {
    const amount = parseMoneyToken(decimalMatch[1]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: decimalMatch[2], hadCurrency: false };
    }
  }

  return null;
}

function cleanItemLabel(raw: string): string {
  return raw
    .replace(/(?:₹|rs\.?\s*|inr\s*|r\s*s\s*)\s*[0-9OoQDIl|SsBb,\.\s]+(?:\/-)?/gi, ' ')
    .replace(/^\s*\d{1,2}\s*[).:-]\s*/, '')
    .replace(/^[\s*#.:;-]+|[\s*#.:;-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanItemName(raw: string): string {
  return cleanItemLabel(raw)
    .replace(/^\s*(?:item|name|product|description)\s*[:.-]?\s*/i, ' ')
    .replace(/\b(?:qty|quantity|nos?|pcs?|pieces?)\s*[:x-]?\s*\d+\b/gi, ' ')
    .replace(/\b\d+\s*(?:pcs?|pieces?|nos?)\b/gi, ' ')
    .replace(/\b(?:mrp|rate|price|amt|amount)\b/gi, ' ')
    .replace(/\s+\d{1,2}\s*$/g, ' ')
    .replace(/^[\s*#.:;-]+|[\s*#.:;-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    // Remove address-related words
    .replace(/\b(?:street|road|lane|avenue|boulevard|drive|court|place|way|circle|square|terrace|building|shop|store|mall|center|centre|town|village|city|state|district|zone|area|sector|near|opposite|behind|beside|next\s+to)\b/gi, ' ')
    .replace(/\b(?:phone|mobile|email|contact|address)\b/gi, ' ')
    .replace(/\b(?:gstin|vat|tax|invoice|bill|order)\b/gi, ' ')
    .trim();
}

function extractQuantity(name: string): { name: string; quantity?: number } {
  const explicit = name.match(/\b(?:qty|quantity|nos?|pcs?|pieces?)\s*[:x-]?\s*(\d{1,2})\b/i);
  if (explicit) {
    return {
      name: name.replace(explicit[0], ' ').replace(/\s{2,}/g, ' ').trim(),
      quantity: Number(explicit[1]),
    };
  }

  const prefix = name.match(/^(\d{1,2})\s*(?:[xX])?\s+(.+)$/);
  if (prefix) {
    return { name: prefix[2].trim(), quantity: Number(prefix[1]) };
  }

  const suffix = name.match(/^(.+?)\s*[xX]\s*(\d{1,2})$/);
  if (suffix) {
    return { name: suffix[1].trim(), quantity: Number(suffix[2]) };
  }

  const columnQty = name.match(/^(.+?)\s+(\d{1,2})$/);
  if (columnQty && /[a-z]{3,}/i.test(columnQty[1])) {
    return { name: columnQty[1].trim(), quantity: Number(columnQty[2]) };
  }

  return { name };
}

function isLikelyItemName(name: string): boolean {
  if (name.length < 2 || name.length > 80) return false;
  if (!/[a-z]/i.test(name)) return false;
  if (NON_ITEM_LINE_HINTS.test(name)) return false;
  if (isDateOrTimeLine(name) || isAddressOrPinLine(name)) return false;
  if (/^\d+(?:\.\d+)?$/.test(name)) return false;
  
  // Filter out address-like patterns
  if (/^\d+[\s,]*[a-z]+/i.test(name) && /\d{6}$/.test(name)) return false; // PIN codes
  if (/^\d+[\s,-]+[a-z]+[\s,-]+[a-z]+/i.test(name) && name.split(/[\s,-]+/).length >= 4) {
    // Likely address: number + street name + city/state + more
    return false;
  }
  
  // Filter out phone number patterns
  if (/^[\d+\-\(\)\s]{10,}$/.test(name)) return false;
  if (/^\+?\d{1,3}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}$/.test(name)) return false;
  
  // Filter out email patterns
  if (/@/.test(name)) return false;
  
  // Filter out URL patterns
  if (/https?:\/\//i.test(name)) return false;
  if (/www\./i.test(name)) return false;
  
  // Filter out GSTIN/PAN patterns (Indian tax IDs)
  if (/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/i.test(name)) return false;
  if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(name)) return false;
  
  // Filter out lines that are mostly numbers (but be more lenient)
  const numberCount = (name.match(/\d/g) || []).length;
  const letterCount = (name.match(/[a-z]/gi) || []).length;
  if (numberCount > letterCount * 2 && numberCount > 5) return false;
  
  // Allow short item names (2-3 chars) if they have letters
  if (name.length >= 2 && name.length <= 3 && /[a-z]/i.test(name)) return true;
  
  return true;
}

function extractLineItems(lines: string[], receiptTotal: number | null): ReceiptLineItem[] {
  const items: ReceiptLineItem[] = [];
  let pendingName: string | null = null;
  let pendingAmount: number | null = null;

  for (const line of lines) {
    if (TOTAL_LINE_HINTS.test(line) || WEAK_TOTAL_HINTS.test(line) || shouldIgnoreMoneyLine(line)) {
      pendingName = null;
      pendingAmount = null;
      continue;
    }

    const trailing = extractTrailingAmount(line) || extractLeadingAmount(line);

    if (trailing) {
      const rawName = cleanItemLabel(trailing.label);
      const fallbackName = rawName || pendingName || '';

      // Check if this is likely the total line (matches receipt total exactly)
      if (receiptTotal !== null && Math.abs(trailing.amount - receiptTotal) < 0.01 && rawName.length === 0) {
        pendingName = null;
        pendingAmount = null;
        continue;
      }

      if (
        fallbackName &&
        isLikelyItemName(cleanItemName(fallbackName)) &&
        !NON_ITEM_LINE_HINTS.test(line) &&
        (receiptTotal === null ||
          Math.abs(trailing.amount - receiptTotal) > 0.01 ||
          rawName.length > 0 ||
          !!pendingName)
      ) {
        const quantityResult = extractQuantity(fallbackName);
        const name = cleanItemName(quantityResult.name);
        if (isLikelyItemName(name)) {
          items.push({
            name,
            amount: trailing.amount,
            ...(quantityResult.quantity ? { quantity: quantityResult.quantity } : {}),
          });
        }
      }

      pendingName = null;
      pendingAmount = null;
      continue;
    }

    // Handle multi-line items: if we have a pending name and this line has an amount
    const amountsInLine = extractAmountsFromLine(line);
    if (amountsInLine.length > 0 && pendingName) {
      const amount = amountsInLine[0];
      if (receiptTotal === null || Math.abs(amount - receiptTotal) > 0.01) {
        const quantityResult = extractQuantity(pendingName);
        const name = cleanItemName(quantityResult.name);
        if (isLikelyItemName(name)) {
          items.push({
            name,
            amount,
            ...(quantityResult.quantity ? { quantity: quantityResult.quantity } : {}),
          });
        }
      }
      pendingName = null;
      pendingAmount = null;
      continue;
    }

    const maybeName = cleanItemName(line);
    if (isLikelyItemName(maybeName)) {
      pendingName = maybeName;
    }
  }

  // Deduplicate items
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.name.toLowerCase()}-${item.amount.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}

function formatReceiptAmount(amount: number): string {
  return formatCurrency(amount);
}

function buildReceiptNotes(items: ReceiptLineItem[], total: number | null): string {
  if (items.length === 0) return '';

  const orderedCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const itemLines = items.slice(0, 12).map((item, index) => {
    const quantity = item.quantity && item.quantity > 1 ? `${item.quantity} x ` : '';
    const unitPrice = item.quantity && item.quantity > 1 
      ? ` (${formatReceiptAmount(item.amount / item.quantity)} each)` 
      : '';
    return `${index + 1}. ${quantity}${item.name}${unitPrice} - ${formatReceiptAmount(item.amount)}`;
  });
  const remaining = items.length > itemLines.length ? items.length - itemLines.length : 0;

  const notes = [
    `Scanned receipt items (${orderedCount}):`,
    ...itemLines,
    ...(remaining > 0 ? [`...and ${remaining} more item${remaining === 1 ? '' : 's'}`] : []),
    ...(total !== null ? [`Receipt total: ${formatReceiptAmount(total)}`] : []),
    `Verify item names and prices before saving.`
  ].join('\n');

  if (notes.length <= 700) return notes;

  const compactLines = itemLines.slice(0, 8);
  return [
    `Scanned receipt items (${orderedCount}):`,
    ...compactLines,
    `...review receipt for remaining items`,
    ...(total !== null ? [`Receipt total: ${formatReceiptAmount(total)}`] : []),
  ].join('\n').slice(0, 700);
}

function countOrderedItems(items: ReceiptLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

function buildReceiptDescription(merchant: string | null, items: ReceiptLineItem[]): string {
  // Remove address-like patterns from item names
  const cleanItemName = (name: string): string => {
    return name
      .replace(/\b(?:street|road|lane|avenue|boulevard|drive|court|place|way|circle|square|terrace)\b/gi, '')
      .replace(/\b(?:city|town|village|state|country|district|zone|area|sector)\b/gi, '')
      .replace(/\b(?:pin|zip|postal|code)\b/gi, '')
      .replace(/\b(?:no|number)\s*\d+/gi, '')
      .replace(/\b(?:building|shop|store|mall|center|centre)\b/gi, '')
      .replace(/\b(?:near|opposite|behind|beside|next to)\b/gi, '')
      .replace(/\b(?:phone|mobile|email|contact)\b/gi, '')
      .replace(/\b(?:gstin|vat|tax)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  if (items.length > 0) {
    const itemSummary = items.slice(0, 3).map((item) => {
      const quantity = item.quantity && item.quantity > 1 ? `${item.quantity} x ` : '';
      return `${quantity}${cleanItemName(item.name)}`;
    });
    const suffix = items.length > itemSummary.length ? ` +${items.length - itemSummary.length} more` : '';
    const description = `${merchant ? `${merchant}: ` : ''}${itemSummary.filter(Boolean).join(', ')}${suffix}`;
    return description.length > 95 ? `${description.slice(0, 92).trim()}...` : description;
  }

  return merchant ? `${merchant} order` : 'Receipt / bill';
}

function cleanMerchantName(line: string): string {
  return line
    .replace(/(?:₹|rs\.?|inr|\$).*/gi, '')
    .replace(/[^a-z0-9&'(). -]/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function isLikelyMerchantLine(line: string): boolean {
  const cleaned = cleanMerchantName(line);
  if (cleaned.length < 3 || cleaned.length > 48) return false;
  if (!/[a-z]/i.test(cleaned)) return false;
  if (MERCHANT_REJECT_HINTS.test(cleaned)) return false;
  if (DATE_OR_TIME_VALUE.test(cleaned)) return false;
  if (/^\d/.test(cleaned)) return false;
  const letters = (cleaned.match(/[a-z]/gi) || []).length;
  const digits = (cleaned.match(/\d/g) || []).length;
  return letters >= 3 && digits <= letters;
}

function lineScore(line: string): number {
  let s = 0;
  if (TOTAL_LINE_HINTS.test(line)) s += 4;
  else if (WEAK_TOTAL_HINTS.test(line)) s += 1;
  if (NEGATIVE_LINE_HINTS.test(line)) s -= 3;
  if (DATE_OR_TIME_HINTS.test(line) || DATE_OR_TIME_VALUE.test(line)) s -= 2;
  if (/(?:₹|\$|rs\.?|inr)/i.test(line)) s += 0.5;
  return s;
}

function detectMerchant(text: string): string | null {
  const n = normalizeForMerchant(text);
  if (n.includes('zomato')) return 'Zomato';
  // common OCR noise can turn swiggy into swiggy-like spellings (e.g. 9 for g)
  if (n.includes('swiggy') || /sw[i1]g[g9]y/.test(n)) return 'Swiggy';
  if (n.includes('uber eats') || n.includes('ubereats')) return 'Uber Eats';
  if (n.includes('doordash')) return 'DoorDash';
  if (n.includes('dominos') || n.includes('domino')) return "Domino's";
  const lines = normalizeReceiptText(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const topMerchantLine = lines.slice(0, 8).find(isLikelyMerchantLine);
  return topMerchantLine ? cleanMerchantName(topMerchantLine) : null;
}

/** Turn noisy OCR text into amount + description; user should always verify. */
export function parseReceiptText(raw: string): ParsedReceipt {
  const warnings: string[] = [];
  const text = normalizeReceiptText(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const merchant = detectMerchant(text);

  type Cand = { amount: number; score: number; line: string };
  const cands: Cand[] = [];

  for (const line of lines) {
    const amounts = extractAmountsFromLine(line);
    const base = lineScore(line);
    for (const amount of amounts) {
      if (amount > 500_000) continue;
      cands.push({ amount, score: base + (amount >= 50 ? 0.1 : 0), line });
    }
  }

  if (cands.length === 0) {
    const items = extractLineItems(lines, null);
    const itemTotal =
      items.length > 0 ? items.reduce((sum, item) => sum + item.amount, 0) : null;
    if (itemTotal === null) {
      warnings.push('No clear rupee or dollar amount was detected. Enter the total manually.');
    } else {
      warnings.push('No clear total line was detected. Amount was estimated from scanned item prices.');
    }
    return {
      amount: itemTotal,
      description: buildReceiptDescription(merchant, items),
      notes: buildReceiptNotes(items, null),
      itemCount: countOrderedItems(items),
      confidence: itemTotal === null ? 'low' : 'medium',
      warnings,
    };
  }

  cands.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.amount - a.amount;
  });

  const best = cands[0];
  const runnerUp = cands[1];
  const items = extractLineItems(lines, best.amount);
  const notes = buildReceiptNotes(items, best.amount);
  const description = buildReceiptDescription(merchant, items);

  if (best.score >= 3) {
    if (runnerUp && runnerUp.amount !== best.amount && Math.abs(runnerUp.amount - best.amount) < 3) {
      warnings.push('Multiple similar totals found—confirm the final paid amount.');
    }
    return {
      amount: best.amount,
      description,
      notes,
      itemCount: countOrderedItems(items),
      confidence: 'high',
      warnings,
    };
  }

  if (best.score >= 0) {
    warnings.push('Total inferred from text only—double-check against your receipt.');
    return {
      amount: best.amount,
      description,
      notes,
      itemCount: countOrderedItems(items),
      confidence: 'medium',
      warnings,
    };
  }

  warnings.push(
    'Could not find a line labeled “total”. The largest amount was picked—please verify.',
  );
  return {
    amount: best.amount,
    description,
    notes,
    itemCount: countOrderedItems(items),
    confidence: 'low',
    warnings,
  };
}
