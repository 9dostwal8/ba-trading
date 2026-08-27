/** Paid marketing features billed to vendors. */
export type ChargeKind = "flash_deal" | "offer" | "bundle" | "badge";

export type VendorCharge = {
  id: string;
  vendor_id: string;
  kind: string;
  ref_id: string | null;
  label: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export const CHARGE_LABEL_KEY: Record<string, "chargeFlashDeal" | "chargeOffer" | "chargeBundle" | "chargeBadge" | "chargeBanner" | "chargeNearExpiry" | "chargeOutlet" | "chargeRewardPoints"> = {
  reward_points: "chargeRewardPoints",
  flash_deal: "chargeFlashDeal",
  offer: "chargeOffer",
  bundle: "chargeBundle",
  badge: "chargeBadge",
  banner: "chargeBanner",
  near_expiry: "chargeNearExpiry",
  outlet: "chargeOutlet",
};

/** Paid / unpaid / total sums for a list of charges. */
export function chargeTotals(rows: VendorCharge[] = []) {
  let paid = 0;
  let unpaid = 0;
  for (const r of rows) {
    const amt = Number(r.amount ?? 0);
    if (r.status === "paid") paid += amt;
    else unpaid += amt;
  }
  return { paid, unpaid, total: paid + unpaid };
}

/** "2026-08" -> year/month split used by the billing period picker. */
export type Period = { key: string; year: string; month: string };

/** Distinct year keys (newest first) present in the charges. */
export function chargeYears(rows: VendorCharge[] = []) {
  return [...new Set(rows.map((r) => (r.created_at ?? "").slice(0, 4)).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a),
  );
}

/** Distinct "YYYY-MM" keys (newest first), optionally limited to one year. */
export function chargeMonths(rows: VendorCharge[] = [], year?: string) {
  return [
    ...new Set(
      rows
        .filter((r) => !year || (r.created_at ?? "").slice(0, 4) === year)
        .map((r) => (r.created_at ?? "").slice(0, 7))
        .filter(Boolean),
    ),
  ].sort((a, b) => b.localeCompare(a));
}

/** Filter charges to a year ("2026") or a month ("2026-08"); "all" keeps everything. */
export function filterByPeriod(rows: VendorCharge[] = [], period: string) {
  if (!period || period === "all") return rows;
  return rows.filter((r) => (r.created_at ?? "").startsWith(period));
}

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_KU = ["کانوونی دووەم","شوبات","ئازار","نیسان","ئایار","حوزەیران","تەمووز","ئاب","ئەیلوول","تشرینی یەکەم","تشرینی دووەم","کانوونی یەکەم"];

/** Human label for a "YYYY-MM" or "YYYY" period key. */
export function periodLabel(key: string, lang: string) {
  if (!key || key === "all") return "";
  const [y, m] = key.split("-");
  if (!m) return y;
  const names = lang === "ku" ? MONTHS_KU : MONTHS_AR;
  return `${names[Number(m) - 1] ?? m} ${y}`;
}
