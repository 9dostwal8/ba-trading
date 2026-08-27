import { CheckCircle2, Clock, PackageCheck, Truck, XCircle, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { Lang } from "./i18n";

/** Simple flow: a new order is either accepted (paid) or refused. */
export const ORDER_STATUSES = ["new", "confirmed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const LABELS: Record<string, { ar: string; ku: string; en: string }> = {
  new: { ar: "بانتظار القبول", ku: "چاوەڕوانی پەسەندکردن", en: "Awaiting Approval",},
  confirmed: { ar: "مقبول ومدفوع", ku: "پەسەندکراو و پارەدراو", en: "Approved & Paid",},
  shipped: { ar: "مقبول ومدفوع", ku: "پەسەندکراو و پارەدراو", en: "Approved & Paid",},
  done: { ar: "مقبول ومدفوع", ku: "پەسەندکراو و پارەدراو", en: "Approved & Paid",},
  cancelled: { ar: "مرفوض", ku: "ڕەتکراوە", en: "Rejected",},
};

/** Button labels for the accept / refuse actions. */
export const ACTION_LABELS: Record<"confirmed" | "cancelled", { ar: string; ku: string; en: string }> = {
  confirmed: { ar: "قبول الطلب", ku: "پەسەندکردنی داواکاری", en: "Approve Order",},
  cancelled: { ar: "رفض الطلب", ku: "ڕەتکردنی داواکاری", en: "Reject Order",},
};

/** Icon + oklch hue/chroma per status so badges stay themable. */
const META: Record<string, { icon: LucideIcon; hue: number; chroma: number }> = {
  new: { icon: Clock, hue: 250, chroma: 0.16 },
  confirmed: { icon: CheckCircle2, hue: 200, chroma: 0.14 },
  shipped: { icon: Truck, hue: 75, chroma: 0.15 },
  done: { icon: PackageCheck, hue: 150, chroma: 0.14 },
  cancelled: { icon: XCircle, hue: 25, chroma: 0.16 },
};

export function statusLabel(status: string, lang: Lang) {
  return LABELS[status]?.[lang] ?? status;
}

export function statusIcon(status: string): LucideIcon {
  return META[status]?.icon ?? Clock;
}

/** Tinted surface/text/border tokens for a status badge. */
export function statusStyle(status: string): CSSProperties {
  const meta = META[status] ?? { hue: 250, chroma: 0.16 };
  const { hue, chroma } = meta;
  return {
    "--tint-soft": `oklch(0.95 ${chroma * 0.35} ${hue})`,
    "--tint-strong": `oklch(0.5 ${chroma} ${hue})`,
    "--tint-border": `oklch(0.88 ${chroma * 0.5} ${hue})`,
  } as CSSProperties;
}
