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
  /grand\s*total|total\s*payable|amount\s*paid|total\s*paid|total\s*amount|to\s*pay|pay\s*now|bill\s*total|order\s*total|^total\s*[:.]?\s*$/i;
const WEAK_TOTAL_HINTS = /\btotal\b|payable|subtotal/i;
const NEGATIVE_LINE_HINTS =
  /saved\s|you\s+saved|discount|cashback|delivery\s*fee|platform\s*fee|packaging|gst\s*breakup|tax\s*summary/i;
const NON_ITEM_LINE_HINTS =
  /total|subtotal|payable|paid|balance|change|discount|cashback|saved|tax|gst|cgst|sgst|igst|\bfee\b|\bcharge\b|delivery|platform|packaging|\btip\b|round\s*off|invoice|receipt|bill\s*no|order\s*id|order\s*no|token|date|time|phone|mobile|address|table|cashier|payment|upi|card|cash|wallet|thank\s*you|powered\s*by|fssai/i;
const DATE_OR_TIME_HINTS =
  /\b(?:date|time|invoice|bill\s*no|order\s*id|order\s*no|token|phone|mobile|address|fssai)\b/i;
const DATE_OR_TIME_VALUE =
  /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}:\d{2}(?::\d{2})?)\b/;

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
        const v = parseMoneyToken(t);
        if (v !== null && v >= 10) out.push(v); // skip years like 2024 unless large context
      }
    }
  }
  return out;
}

function extractTrailingAmount(line: string): { amount: number; label: string; hadCurrency: boolean } | null {
  const currencyMatch = line.match(/^(.*?)(?:₹|rs\.?\s*|inr\s*|r\s*s\s*)([0-9OoQDIl|SsBb,\.\s]{1,18}(?:\/-)?)\s*$/i);
  if (currencyMatch) {
    const amount = parseMoneyToken(currencyMatch[2]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: currencyMatch[1], hadCurrency: true };
    }
  }

  const decimalMatch = line.match(/^(.*?)\s+([0-9OoQDIl|SsBb,]+[.,][0-9OoQDIl|SsBb]{1,2}|[0-9OoQDIl|SsBb]{2,5}\/-)\s*$/);
  if (decimalMatch) {
    const amount = parseMoneyToken(decimalMatch[2]);
    if (amount !== null && amount >= 1 && amount <= 50_000) {
      return { amount, label: decimalMatch[1], hadCurrency: false };
    }
  }

  const wholeNumberMatch = line.match(/^(.*?)\s+([0-9OoQDIl|SsBb]{2,5})\s*$/);
  if (wholeNumberMatch && /[a-z]/i.test(wholeNumberMatch[1])) {
    const amount = parseMoneyToken(wholeNumberMatch[2]);
    if (amount !== null && amount >= 10 && amount <= 50_000) {
      return { amount, label: wholeNumberMatch[1], hadCurrency: false };
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
    .replace(/\b(?:qty|quantity|nos?|pcs?|pieces?)\s*[:x-]?\s*\d+\b/gi, ' ')
    .replace(/\b\d+\s*(?:pcs?|pieces?|nos?)\b/gi, ' ')
    .replace(/\s+\d{1,2}\s*$/g, ' ')
    .replace(/^[\s*#.:;-]+|[\s*#.:;-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
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
  if (name.length < 3 || name.length > 80) return false;
  if (!/[a-z]/i.test(name)) return false;
  if (NON_ITEM_LINE_HINTS.test(name)) return false;
  if (/^\d+(?:\.\d+)?$/.test(name)) return false;
  return true;
}

function extractLineItems(lines: string[], receiptTotal: number | null): ReceiptLineItem[] {
  const items: ReceiptLineItem[] = [];
  let pendingName: string | null = null;

  for (const line of lines) {
    if (TOTAL_LINE_HINTS.test(line) || WEAK_TOTAL_HINTS.test(line)) {
      pendingName = null;
      continue;
    }

    const trailing = extractTrailingAmount(line);

    if (trailing) {
      const rawName = cleanItemLabel(trailing.label);
      const fallbackName = rawName || pendingName || '';

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
      continue;
    }

    const maybeName = cleanItemName(line);
    if (isLikelyItemName(maybeName)) {
      pendingName = maybeName;
    }
  }

  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = `${item.name.toLowerCase()}-${item.amount.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function formatReceiptAmount(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function buildReceiptNotes(items: ReceiptLineItem[], total: number | null): string {
  if (items.length === 0) return '';

  const orderedCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const itemLines = items.map((item, index) => {
    const quantity = item.quantity && item.quantity > 1 ? `${item.quantity} x ` : '';
    return `${index + 1}. ${quantity}${item.name} - ${formatReceiptAmount(item.amount)}`;
  });

  return [
    `Scanned order details`,
    `Items ordered: ${orderedCount}`,
    ...itemLines,
    ...(total !== null ? [`Receipt total: ${formatReceiptAmount(total)}`] : []),
  ].join('\n');
}

function countOrderedItems(items: ReceiptLineItem[]): number {
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

function buildReceiptDescription(merchant: string | null, items: ReceiptLineItem[]): string {
  if (items.length > 0) {
    const itemSummary = items.slice(0, 3).map((item) => {
      const quantity = item.quantity && item.quantity > 1 ? `${item.quantity} x ` : '';
      return `${quantity}${item.name}`;
    });
    const suffix = items.length > itemSummary.length ? ` +${items.length - itemSummary.length} more` : '';
    const description = `${merchant ? `${merchant}: ` : ''}${itemSummary.join(', ')}${suffix}`;
    return description.length > 95 ? `${description.slice(0, 92).trim()}...` : description;
  }

  return merchant ? `${merchant} order` : 'Receipt / bill';
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
  return null;
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
