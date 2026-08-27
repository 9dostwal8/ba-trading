import { Award, BadgePercent, Crown, Flame, Gem, Gift, Sparkles, Timer, TrendingUp, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lang } from "@/lib/i18n";

export type BadgeKey =
  | "discount"
  | "premium"
  | "hot"
  | "special"
  | "new"
  | "bestseller"
  | "freeship"
  | "limited"
  | "gift"
  | "trending";

export type BadgeDef = {
  key: BadgeKey;
  icon: LucideIcon;
  label_ar: string;
  label_ku: string;
  label_en: string;
  /** single accent colour; tint + hairline border are derived from it */
  ink: string;
};

/**
 * Sticker catalogue shared by the storefront cards and the admin product form.
 * Visual language: clean, readable pills with a soft tint pad and a crisp
 * hairline border. Colours are OKLCH-based so they stay legible on every
 * theme.
 */
export const PRODUCT_BADGES: BadgeDef[] = [
  { key: "discount", icon: BadgePercent, label_ar: "خصم", label_ku: "داشکاندن", label_en: "Discount", ink: "oklch(0.55 0.2 22)" },
  { key: "premium", icon: Crown, label_ar: "بريميوم", label_ku: "پرێمیۆم", label_en: "Premium", ink: "oklch(0.52 0.14 290)" },
  { key: "hot", icon: Flame, label_ar: "الأكثر مبيعاً", label_ku: "فرۆشی گەرم", label_en: "Hot Sale", ink: "oklch(0.56 0.18 40)" },
  { key: "special", icon: Sparkles, label_ar: "عرض خاص", label_ku: "تایبەت", label_en: "Special", ink: "oklch(0.52 0.17 320)" },
  { key: "new", icon: Gem, label_ar: "جديد", label_ku: "نوێ", label_en: "New", ink: "oklch(0.5 0.13 195)" },
  { key: "bestseller", icon: Award, label_ar: "الأفضل", label_ku: "باشترین", label_en: "Best Seller", ink: "oklch(0.5 0.14 250)" },
  { key: "freeship", icon: Truck, label_ar: "توصيل مجاني", label_ku: "گەیاندنی خۆڕایی", label_en: "Free Shipping", ink: "oklch(0.48 0.13 155)" },
  { key: "limited", icon: Timer, label_ar: "كمية محدودة", label_ku: "بەرتەسک", label_en: "Limited", ink: "oklch(0.53 0.15 55)" },
  { key: "gift", icon: Gift, label_ar: "هدية", label_ku: "دیاری", label_en: "Gift", ink: "oklch(0.53 0.16 350)" },
  { key: "trending", icon: TrendingUp, label_ar: "رائج", label_ku: "پڕفرۆش", label_en: "Trending", ink: "oklch(0.5 0.16 285)" },
];

export const badgeByKey = (key: string) => PRODUCT_BADGES.find((b) => b.key === key);

export const badgeLabel = (b: BadgeDef, lang: Lang) =>
  lang === "ar" ? b.label_ar : lang === "ku" ? b.label_ku : b.label_en;

/** Soft tinted chip used on product cards. */
export function ProductBadge({
  badge,
  lang,
  size = "sm",
}: {
  badge: BadgeDef;
  lang: Lang;
  size?: "sm" | "md";
}) {
  const Icon = badge.icon;
  const isMd = size === "md";
  return (
    <span
      style={{
        backgroundColor: `oklch(from ${badge.ink} 0.94 calc(c * 0.34) h)`,
        borderColor: `oklch(from ${badge.ink} 0.78 calc(c * 0.55) h)`,
        color: `oklch(from ${badge.ink} 0.42 calc(c * 0.95) h)`,
      }}
      className={`inline-flex max-w-full min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-bold leading-none tracking-tight ${
        isMd ? "px-2.5 py-1 text-[11.5px]" : "px-2 py-[5px] text-[10px]"
      }`}
    >
      <Icon className={isMd ? "size-3.5 shrink-0" : "size-3 shrink-0"} strokeWidth={2.4} />
      <span className="truncate">{badgeLabel(badge, lang)}</span>
    </span>
  );
}

/** Renders the badge stack for a product, capped to keep cards tidy. */
export function ProductBadges({
  badges,
  lang,
  max = 3,
  size = "sm",
}: {
  badges: string[] | null | undefined;
  lang: Lang;
  max?: number;
  size?: "sm" | "md";
}) {
  const defs = (badges ?? []).map(badgeByKey).filter(Boolean).slice(0, max) as BadgeDef[];
  if (!defs.length) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {defs.map((b) => (
        <ProductBadge key={b.key} badge={b} lang={lang} size={size} />
      ))}
    </div>
  );
}

/**
 * Glass "blade" discount sticker: flush with the outer edge of the photo,
 * percentage stacked over a small caption.
 */
export function DiscountBlade({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="absolute top-2 end-0 flex flex-col items-center rounded-s-lg border-y border-s border-white/25 bg-[oklch(0.55_0.2_22/90%)] px-2.5 py-1 text-white shadow-lg backdrop-blur-md">
      <span className="text-[12px] font-black leading-none tabular-nums">{percent}%</span>
      <span className="text-[7px] font-bold leading-tight tracking-tight opacity-90">{label}</span>
    </div>
  );
}
