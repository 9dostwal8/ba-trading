import type { Lang } from "@/lib/i18n";
/**
 * Clearance engine — the core of the marketplace concept.
 *
 * Iraqi dental vendors list two kinds of discounted stock:
 *  - `near_expiry`: items with a real expiry date. The discount ladder is
 *    automatic: the closer the expiry, the deeper the markdown (see
 *    `clearance_rules`, editable by the admin).
 *  - `outlet`: slow-moving stock that sat in the warehouse for a long time.
 *    Price is set manually by the vendor (list price vs. outlet price).
 *
 * Dentists never see the exact expiry date — only the months remaining.
 */

export type ClearanceKind = "none" | "near_expiry" | "outlet";

export type ClearanceRule = {
  id: string;
  months_left: number;
  discount_percent: number;
  label_ar: string;
  label_ku: string;
  hue: number;
  chroma: number;
  sort_order: number;
  is_active: boolean;
};

export type ClearanceItem = {
  expiry_date?: string | null;
  clearance_kind?: string | null;
  stocked_since?: string | null;
};

const DAY = 86_400_000;
const MONTH_DAYS = 30.44;

/** Whole days until the expiry date (never negative). `null` when no date. */
export function daysLeft(expiry?: string | null): number | null {
  if (!expiry) return null;
  const ts = new Date(expiry).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.ceil((ts - Date.now()) / DAY));
}

/** Whole months until expiry (rounded down). `null` when no date. */
export function monthsLeft(expiry?: string | null): number | null {
  const d = daysLeft(expiry);
  return d == null ? null : Math.max(0, Math.floor(d / MONTH_DAYS));
}

/** How long the item has been sitting in stock, in days. */
export function stockAgeDays(item: ClearanceItem): number | null {
  if (!item.stocked_since) return null;
  const ts = new Date(item.stocked_since).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / DAY));
}

export function isNearExpiry(item: ClearanceItem) {
  return item.clearance_kind === "near_expiry" && !!item.expiry_date;
}

export function isOutlet(item: ClearanceItem) {
  return item.clearance_kind === "outlet";
}

export function isClearance(item: ClearanceItem) {
  return isNearExpiry(item) || isOutlet(item);
}

/** Strictest matching rule: the smallest `months_left` step the item fell into. */
export function ruleFor(months: number | null, rules: ClearanceRule[] = []) {
  if (months == null) return null;
  const hits = rules
    .filter((r) => r.is_active && months <= r.months_left)
    .sort((a, b) => a.months_left - b.months_left);
  return hits[0] ?? null;
}

/** Automatic markdown percent for a near-expiry item (0 for anything else). */
export function clearancePercent(item: ClearanceItem, rules: ClearanceRule[] = []) {
  if (!isNearExpiry(item)) return 0;
  const rule = ruleFor(monthsLeft(item.expiry_date), rules);
  return rule ? Math.min(90, Math.max(0, Number(rule.discount_percent) || 0)) : 0;
}

/** Rule (label + color) that currently governs an item. */
export function clearanceRule(item: ClearanceItem, rules: ClearanceRule[] = []) {
  return isNearExpiry(item) ? ruleFor(monthsLeft(item.expiry_date), rules) : null;
}

/** List price after the automatic clearance markdown. */
export function clearanceUnitPrice(base: number, percent: number) {
  const pct = Math.min(90, Math.max(0, percent));
  return Math.max(0, Math.round(base - (base * pct) / 100));
}

/** Clearance-adjusted base price of an item, before offers/deals/tiers. */
export function clearanceBase(
  item: ClearanceItem & { price: number },
  rules: ClearanceRule[] = [],
) {
  return clearanceUnitPrice(Number(item.price) || 0, clearancePercent(item, rules));
}

/** "6 months left" / "less than a month" — never reveals the exact date. */
export function monthsLabel(months: number | null, lang: Lang) {
  if (months == null) return "";
  if (months <= 0) {
    if (lang === "en") return "Less than a month left";
    return lang === "ar" ? "أقل من شهر" : "کەمتر لە مانگێک";
  }
  if (months === 1) {
    if (lang === "en") return "1 month left";
    return lang === "ar" ? "شهر واحد متبقي" : "١ مانگ ماوە";
  }
  if (months === 2) {
    if (lang === "en") return "2 months left";
    return lang === "ar" ? "شهران متبقيان" : "٢ مانگ ماوە";
  }
  if (lang === "en") return `${months} months left`;
  return lang === "ar" ? `${months} أشهر متبقية` : `${months} مانگ ماوە`;
}

/** Compact chip text: "6 mo". */
export function monthsChip(months: number | null, lang: Lang) {
  if (months == null) return "";
  const unit = lang === "en" ? "mo" : lang === "ar" ? "شهر" : "مانگ";
  return `${Math.max(0, months)} ${unit}`;
}

export function ruleLabel(rule: ClearanceRule | null, lang: Lang) {
  if (!rule) return "";
  const primary = lang === "ku" ? rule.label_ku : rule.label_ar;
  return primary || rule.label_ar || rule.label_ku;
}

/** Urgency tone driven by months remaining, used for chips and hero cards. */
export function urgencyTone(months: number | null) {
  if (months == null) return { hue: 220, chroma: 0.12 };
  if (months <= 1) return { hue: 25, chroma: 0.19 };
  if (months <= 3) return { hue: 42, chroma: 0.18 };
  if (months <= 6) return { hue: 70, chroma: 0.16 };
  return { hue: 150, chroma: 0.14 };
}
