/** Persian (Jalali) date/time helpers using Intl calendar */

const shamsiDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shamsiDateShort = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const shamsiTime = new Intl.DateTimeFormat("fa-IR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const shamsiDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shamsiWeekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
});

function asDate(date: Date | string) {
  return typeof date === "string" ? new Date(date) : date;
}

export function formatToman(amount: number) {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

/** تاریخ شمسی کامل مثلاً ۱۲ شهریور ۱۴۰۴ */
export function formatDate(date: Date | string) {
  return shamsiDate.format(asDate(date));
}

/** تاریخ شمسی کوتاه */
export function formatDateShort(date: Date | string) {
  return shamsiDateShort.format(asDate(date));
}

/** تاریخ و ساعت شمسی */
export function formatDateTime(date: Date | string) {
  return shamsiDateTime.format(asDate(date));
}

/** فقط ساعت */
export function formatTime(date: Date | string) {
  return shamsiTime.format(asDate(date));
}

/** برچسب زنده: سه‌شنبه ۱۲ شهریور ۱۴۰۴ — ۱۴:۳۰:۰۵ */
export function formatLiveShamsi(date: Date | string = new Date()) {
  const d = asDate(date);
  return `${shamsiWeekday.format(d)} ${shamsiDate.format(d)} — ${shamsiTime.format(d)}`;
}

export const chargeStatusLabel: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  UNDER_REVIEW: "در حال بررسی رسید",
  PAID: "پرداخت کامل",
  PARTIAL: "کسری پرداخت",
  OVERDUE: "معوق",
  REJECTED: "رد شده",
};

export const receiptMatchLabel: Record<string, string> = {
  MATCH: "مبلغ مطابق",
  SHORTFALL: "کسری پرداخت",
  OVERPAY: "مازاد پرداخت",
  UNREADABLE: "نیاز به بررسی",
  WRONG_DESTINATION: "مقصد نامعتبر",
};

export function formatCardNumber(card?: string | null) {
  if (!card) return "—";
  const digits = card.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

export const ticketStatusLabel: Record<string, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال بررسی",
  RESOLVED: "حل‌شده",
  CLOSED: "بسته",
};
