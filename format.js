// Null-safe formatting. In finance.json every null means "unknown", so it renders as DASH, never 0.

export const DASH = "—";

const LOCALE = "en-IE";
const moneyFormatters = new Map();

export function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function moneyFormatter(currency, cents) {
  const key = currency + (cents ? ":c" : ":w");
  if (!moneyFormatters.has(key)) {
    moneyFormatters.set(
      key,
      new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency,
        minimumFractionDigits: cents ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0,
      })
    );
  }
  return moneyFormatters.get(key);
}

/** money(1234.5) -> "€1,234.50"; money(null) -> "—". */
export function money(v, { currency = "EUR", cents = true } = {}) {
  if (!isNum(v)) return DASH;
  return moneyFormatter(currency, cents).format(v);
}

/** signedMoney(12) -> "+€12.00"; signedMoney(-12) -> "−€12.00"; signedMoney(null) -> "—". */
export function signedMoney(v, opts) {
  if (!isNum(v)) return DASH;
  const abs = money(Math.abs(v), opts);
  if (v > 0) return "+" + abs;
  if (v < 0) return "\u2212" + abs;
  return abs;
}

/** pct(25) -> "25%"; pct(null) -> "—". Input is already a percentage, not a fraction. */
export function pct(v, digits = 0) {
  if (!isNum(v)) return DASH;
  return v.toFixed(digits) + "%";
}

/** tone(v) -> "pos" | "neg" | "zero" | "unknown", for the .tone-* classes. */
export function tone(v) {
  if (!isNum(v)) return "unknown";
  if (v > 0) return "pos";
  if (v < 0) return "neg";
  return "zero";
}

function parseIsoDate(iso) {
  if (typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Fixed names: en-IE in Chrome abbreviates September as "Sept", other engines as "Sep".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** date("2026-10-05") -> "5 Oct 2026"; date(null) -> "—". */
export function date(iso) {
  const d = parseIsoDate(iso);
  if (!d) return DASH;
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
}

/** dateTime("2026-10-16T10:05:00+01:00") -> local "16 Oct 2026, 10:05"; invalid -> "—". */
export function dateTime(iso) {
  if (typeof iso !== "string") return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleString(LOCALE, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** monthLabel("2026-07") -> "Jul 2026"; monthLabel("2026-07", { short: true }) -> "Jul". */
export function monthLabel(ym, { short = false } = {}) {
  const m = typeof ym === "string" ? /^(\d{4})-(\d{2})$/.exec(ym) : null;
  const name = m ? MONTHS[+m[2] - 1] : undefined;
  if (!name) return DASH;
  return short ? name : name + " " + m[1];
}

const PER_MONTH = {
  daily: 365 / 12,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  bimonthly: 1 / 2,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  yearly: 1 / 12,
  annual: 1 / 12,
  annually: 1 / 12,
};

/** monthlyEquivalent(10, "weekly") -> 43.33…; unknown amount or cadence -> null. */
export function monthlyEquivalent(amount, cadence) {
  if (!isNum(amount)) return null;
  const factor = PER_MONTH[String(cadence || "").toLowerCase()];
  return factor === undefined ? null : amount * factor;
}

/** sumKnown([1, null, 2]) -> { total: 3, unknown: 1 }; all unknown -> { total: null, unknown: n }. */
export function sumKnown(values) {
  let total = 0;
  let known = 0;
  let unknown = 0;
  for (const v of values || []) {
    if (isNum(v)) {
      total += v;
      known += 1;
    } else {
      unknown += 1;
    }
  }
  return { total: known ? total : null, unknown };
}

/** ratio(750, 3000) -> 0.25, clamped to [0, 1]; null if either side is unknown or goal <= 0. */
export function ratio(current, goal) {
  if (!isNum(current) || !isNum(goal) || goal <= 0) return null;
  return Math.min(1, Math.max(0, current / goal));
}
