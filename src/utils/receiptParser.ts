export interface ParsedReceipt {
  amount: number | null;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

const TOTAL_LINE_HINTS =
  /grand\s*total|total\s*payable|amount\s*paid|total\s*paid|total\s*amount|to\s*pay|pay\s*now|bill\s*total|order\s*total|^total\s*[:.]?\s*$/i;
const WEAK_TOTAL_HINTS = /\btotal\b|payable|subtotal/i;
const NEGATIVE_LINE_HINTS =
  /saved\s|you\s+saved|discount|cashback|delivery\s*fee|platform\s*fee|packaging|gst\s*breakup|tax\s*summary/i;

function parseMoneyToken(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim();
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
  const rupee =
    /(?:₹|rs\.?\s*|inr\s*|r\s*s\s*|rs\s*)([\d,]+(?:\.\d{1,2})?)/gi;
  const dollar = /\$\s*([\d,]+\.?\d{0,2})\b/g;
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
    const loose = line.match(/\b(\d{1,6}(?:\.\d{1,2})?)\b/g);
    if (loose) {
      for (const t of loose) {
        const v = parseMoneyToken(t);
        if (v !== null && v >= 10) out.push(v); // skip years like 2024 unless large context
      }
    }
  }
  return out;
}

function lineScore(line: string): number {
  let s = 0;
  if (TOTAL_LINE_HINTS.test(line)) s += 4;
  else if (WEAK_TOTAL_HINTS.test(line)) s += 1;
  if (NEGATIVE_LINE_HINTS.test(line)) s -= 3;
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
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const merchant = detectMerchant(text);
  const description = merchant ? `${merchant} order` : 'Receipt / bill';

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
    warnings.push('No clear rupee or dollar amount was detected. Enter the total manually.');
    return {
      amount: null,
      description,
      confidence: 'low',
      warnings,
    };
  }

  cands.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.amount - a.amount;
  });

  const best = cands[0];
  const runnerUp = cands[1];

  if (best.score >= 3) {
    if (runnerUp && runnerUp.amount !== best.amount && Math.abs(runnerUp.amount - best.amount) < 3) {
      warnings.push('Multiple similar totals found—confirm the final paid amount.');
    }
    return {
      amount: best.amount,
      description,
      confidence: 'high',
      warnings,
    };
  }

  if (best.score >= 0) {
    warnings.push('Total inferred from text only—double-check against your receipt.');
    return {
      amount: best.amount,
      description,
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
    confidence: 'low',
    warnings,
  };
}
