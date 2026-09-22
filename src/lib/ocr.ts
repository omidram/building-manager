/** Convert Persian/Arabic-Indic digits to Latin digits */
export function toLatinDigits(input: string) {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normalizeReceiptText(rawText: string) {
  let text = toLatinDigits(rawText)
    .replace(/[,\u066C\u060C\u200F\u200E]/g, "")
    .replace(/\u00A0/g, " ");

  text = text.replace(/\b\d{1,3}(?:[.\s]\d{3})+\b/g, (chunk) => chunk.replace(/[.\s]/g, ""));
  text = text.replace(/٫/g, "");
  return text;
}

export function onlyDigits(value: string) {
  return toLatinDigits(value).replace(/\D/g, "");
}

/**
 * Extract likely transfer amounts (toman) from OCR text of Iranian bank receipts.
 */
export function extractAmountFromOcr(rawText: string): { amount: number | null; candidates: number[] } {
  const text = normalizeReceiptText(rawText);

  const keywordPattern =
    /(?:مبلغ|مبلغانتقال|مبلغتراکنش|amount|transfer|پرداختی|واریز|انتقال)[^\d]{0,24}(\d{4,12})/gi;
  const keywordHits: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = keywordPattern.exec(text)) !== null) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n >= 1000) keywordHits.push(n);
  }

  const allNumbers = [...text.matchAll(/\d{4,12}/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n) && n >= 10_000 && n <= 500_000_000);

  const candidates = [...new Set([...keywordHits, ...allNumbers])].sort((a, b) => b - a);

  if (keywordHits.length) {
    return { amount: Math.max(...keywordHits), candidates };
  }
  if (candidates.length) {
    return { amount: candidates[0], candidates };
  }
  return { amount: null, candidates: [] };
}

/** Extract card / account / sheba-like tokens from receipt OCR */
export function extractDestinationCandidates(rawText: string): {
  cards: string[];
  accounts: string[];
  shebas: string[];
} {
  const text = toLatinDigits(rawText).replace(/[–—]/g, "-");

  const cards = [
    ...text.matchAll(/\b(\d{4}(?:[\s\-*]{1,3}\d{4}){3})\b/g),
    ...text.matchAll(/\b(\d{4}(?:[\s\-*Xx]{1,4}){2,6}\d{4})\b/g),
    ...text.matchAll(/\b(\d{16})\b/g),
  ].map((m) => m[1].replace(/\s/g, ""));

  const shebas = [...text.matchAll(/\b(IR\d{22,26})\b/gi)].map((m) => m[1].toUpperCase());

  const accounts = [...text.matchAll(/\b(\d{8,16})\b/g)]
    .map((m) => m[1])
    .filter((n) => n.length < 16); // avoid treating full cards as accounts twice

  return {
    cards: [...new Set(cards)],
    accounts: [...new Set(accounts)],
    shebas: [...new Set(shebas)],
  };
}

function cardFingerprint(raw: string) {
  const digits = onlyDigits(raw);
  const stars = raw.replace(/[^\d*xX]/g, "");
  if (digits.length >= 16) {
    return { first4: digits.slice(0, 4), last4: digits.slice(-4), full: digits };
  }
  if (/\d{4}.+\d{4}/.test(stars) || digits.length >= 8) {
    const first4 = digits.slice(0, 4);
    const last4 = digits.slice(-4);
    return { first4, last4, full: digits.length === 16 ? digits : null };
  }
  return { first4: digits.slice(0, 4), last4: digits.slice(-4), full: null };
}

export function destinationTokenMatches(
  expected: string | null | undefined,
  found: string,
  kind: "card" | "account" | "sheba",
): boolean {
  if (!expected) return false;
  if (kind === "sheba") {
    const e = onlyDigits(expected);
    const f = onlyDigits(found);
    return e.length >= 10 && f.length >= 10 && (e === f || e.endsWith(f.slice(-10)) || f.endsWith(e.slice(-10)));
  }
  if (kind === "account") {
    const e = onlyDigits(expected);
    const f = onlyDigits(found);
    return e.length >= 6 && f.length >= 6 && (e === f || e.endsWith(f) || f.endsWith(e));
  }
  // card
  const e = cardFingerprint(expected);
  const f = cardFingerprint(found);
  if (e.full && f.full) return e.full === f.full;
  if (e.first4 && e.last4 && f.first4 && f.last4 && f.first4.length === 4 && f.last4.length === 4) {
    // classic masked card 6104-****-****-5678
    if (/\*/.test(found) || /x/i.test(found)) {
      return e.first4 === f.first4 && e.last4 === f.last4;
    }
  }
  // partial OCR: enough leading digits of the manager card
  const ed = onlyDigits(expected);
  const fd = onlyDigits(found);
  if (ed.length >= 16 && fd.length >= 6 && fd.length < 16 && ed.startsWith(fd)) {
    return true;
  }
  if (ed.length >= 16 && fd.length >= 4 && ed.endsWith(fd) && fd.length >= 4 && /\*/.test(found)) {
    return ed.slice(0, 4) === (found.match(/\d{4}/)?.[0] ?? "");
  }
  if (e.first4 && e.last4 && f.first4 && f.last4) {
    return e.first4 === f.first4 && e.last4 === f.last4;
  }
  return false;
}

export type DestinationCheck = {
  ok: boolean | null; // true match, false wrong, null unknown
  info: string;
  matchedWith?: string;
};

export function verifyDestination(
  ocrText: string,
  settings: {
    bankCardNumber?: string | null;
    bankAccountNumber?: string | null;
    shebaNumber?: string | null;
  },
): DestinationCheck {
  const { cards, accounts, shebas } = extractDestinationCandidates(ocrText || "");
  const expectedBits = [
    settings.bankCardNumber && `کارت ${settings.bankCardNumber}`,
    settings.bankAccountNumber && `حساب ${settings.bankAccountNumber}`,
    settings.shebaNumber && `شبا ${settings.shebaNumber}`,
  ].filter(Boolean);

  if (!settings.bankCardNumber && !settings.bankAccountNumber && !settings.shebaNumber) {
    return { ok: null, info: "اطلاعات حساب مدیریت در سیستم ثبت نشده است." };
  }

  for (const card of cards) {
    if (destinationTokenMatches(settings.bankCardNumber, card, "card")) {
      return { ok: true, info: `مقصد تأیید شد (کارت: ${card})`, matchedWith: card };
    }
  }
  for (const acc of accounts) {
    if (destinationTokenMatches(settings.bankAccountNumber, acc, "account")) {
      return { ok: true, info: `مقصد تأیید شد (حساب: ${acc})`, matchedWith: acc };
    }
    // OCR sometimes returns only the leading digits of a masked card
    const cardDigits = onlyDigits(settings.bankCardNumber || "");
    const accDigits = onlyDigits(acc);
    if (cardDigits.length >= 16 && accDigits.length >= 6 && cardDigits.startsWith(accDigits)) {
      return { ok: true, info: `مقصد تأیید شد (شروع کارت: ${acc})`, matchedWith: acc };
    }
  }
  for (const sheba of shebas) {
    if (destinationTokenMatches(settings.shebaNumber, sheba, "sheba")) {
      return { ok: true, info: `مقصد تأیید شد (شبا: ${sheba})`, matchedWith: sheba };
    }
  }

  const foundAny = cards.length + accounts.length + shebas.length > 0;
  if (!foundAny) {
    return {
      ok: null,
      info: `شماره مقصد در رسید خوانده نشد. باید به ${expectedBits.join(" / ")} واریز شود.`,
    };
  }

  return {
    ok: false,
    info: `مقصد رسید با حساب مدیریت مطابقت ندارد. یافت‌شده: ${[...cards, ...accounts, ...shebas].slice(0, 3).join(" ، ")}`,
  };
}

export type MatchResult = {
  matchStatus: "MATCH" | "SHORTFALL" | "OVERPAY" | "UNREADABLE" | "WRONG_DESTINATION";
  shortfall: number;
  surplus: number;
  chargeStatus: "PAID" | "PARTIAL" | "UNDER_REVIEW" | "REJECTED";
};

export function normalizePaidAmount(expected: number, paid: number): number {
  if (paid > expected * 5 && Math.abs(paid / 10 - expected) < Math.abs(paid - expected)) {
    return Math.round(paid / 10);
  }
  return paid;
}

export function matchPayment(expected: number, paid: number | null): MatchResult {
  if (paid == null || paid <= 0) {
    return { matchStatus: "UNREADABLE", shortfall: expected, surplus: 0, chargeStatus: "UNDER_REVIEW" };
  }

  const normalized = normalizePaidAmount(expected, paid);
  const tolerance = Math.max(1000, Math.round(expected * 0.005));
  if (Math.abs(normalized - expected) <= tolerance) {
    return { matchStatus: "MATCH", shortfall: 0, surplus: 0, chargeStatus: "PAID" };
  }
  if (normalized < expected - tolerance) {
    return {
      matchStatus: "SHORTFALL",
      shortfall: expected - normalized,
      surplus: 0,
      chargeStatus: "PARTIAL",
    };
  }
  return {
    matchStatus: "OVERPAY",
    shortfall: 0,
    surplus: normalized - expected,
    chargeStatus: "PAID",
  };
}
