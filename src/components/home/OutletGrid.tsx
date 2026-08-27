import { Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, Tag } from "lucide-react";
import { formatPrice, pick, pickName, useI18n, label, offPct } from "@/lib/i18n";
import type { Product } from "@/lib/store";

const copy = {
  sub: { ar: "مخزون فائض بسعر المصنع", ku: "کۆگای زیادە بە نرخی کارگە", en: "Excess stock at factory price",},
  all: { ar: "كل الأوتلت", ku: "هەموو ئاوتلێت", en: "All Outlet",},
  upto: { ar: "خصم حتى", ku: "داشکاندن تا", en: "Up to {n}% off",},
  save: { ar: "توفير", ku: "پاشەکەوت", en: "Save",},
};

function percentOf(p: Product, price: number) {
  return p.price > price ? Math.round((1 - price / Number(p.price)) * 100) : 0;
}

/**
 * Outlet block: a bright emerald/cyan "market stall" panel with confetti dots,
 * a torn zig-zag edge and yellow swing price tags on a horizontal snap rail —
 * deliberately unlike the red flash band and the white clearance ticket.
 */
export function OutletGrid({
  products,
  priceOf,
}: {
  products: Product[];
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { t, lang } = useI18n();
  const items = products
    .filter((p) => p.clearance_kind === "outlet" && Number(p.price) > 0)
    .map((p) => {
      const price = priceOf(p.id, p.price);
      return { p, price, percent: percentOf(p, price), save: Number(p.price) - price };
    })
    .filter((x) => x.price > 0)
    .sort((a, b) => b.percent - a.percent);
  if (!items.length) return null;
  const best = Math.max(0, ...items.map((x) => x.percent));

  return (
    <div className="dk-crate">
      <div className="flex items-center gap-2.5 px-3 pb-3.5 pt-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[oklch(1_0_0_/_35%)]">
          <Tag className="size-5" strokeWidth={2.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="dk-stencil truncate text-[19px] leading-none">{t("outlet")}</h2>
          <p className="mt-1 truncate text-[11px] font-extrabold opacity-75">
            {label(copy.sub, lang)}
          </p>
        </div>
        {best > 0 ? (
          <div className="dk-tag shrink-0 -rotate-3 flex-col !items-start gap-0 !px-2 !py-1 leading-none">
            <span className="text-[8.5px] font-extrabold uppercase opacity-80">
              {label(copy.upto, lang)}
            </span>
            <span className="text-[22px] font-black">{offPct(best, lang)}</span>
          </div>
        ) : null}
      </div>

      <div className="dk-zig" />

      <div className="rail-x bg-card px-2.5 py-3">
        {items.slice(0, 10).map(({ p, price, percent, save }) => (
          <Link
            key={p.id}
            to="/product/$id"
            params={{ id: p.id }}
            className="w-[128px] shrink-0 rounded-2xl border border-border bg-card p-1.5 shadow-[0_2px_0_color-mix(in_oklab,var(--primary)_18%,transparent)] active:scale-[0.99]"
          >
            <div className="relative grid h-[104px] place-items-center overflow-hidden rounded-xl bg-secondary">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={pickName(p, lang)}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-3xl">📦</span>
              )}
              {percent > 0 ? (
                <span className="dk-tag absolute start-1 top-1 -rotate-6 text-[10px]">
                  {offPct(percent, lang)}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 line-clamp-2 min-h-[2.1rem] text-[11px] font-bold leading-tight text-foreground">
              {pickName(p, lang)}
            </p>
            {price < p.price ? (
              <span className="block text-[10px] font-bold tabular-nums text-muted-foreground line-through">
                {formatPrice(Number(p.price), lang)}
              </span>
            ) : null}
            <span className="price-lg block text-[13px] text-foreground">
              {formatPrice(price, lang)}
            </span>
            {save > 0 ? (
              <span className="mt-1 flex items-center gap-1 text-[9.5px] font-extrabold text-primary">
                <Sparkles className="size-3" strokeWidth={3} />
                {label(copy.save, lang)} {formatPrice(save, lang)}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <Link
        to="/outlet"
        className="flex items-center justify-center gap-1 bg-card pb-3 text-[12px] font-extrabold text-foreground"
      >
        {label(copy.all, lang)}
        <ChevronLeft className="size-4 ltr:rotate-180" />
      </Link>
    </div>
  );
}
