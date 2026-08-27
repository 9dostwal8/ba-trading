import { Link } from "@tanstack/react-router";
import { ChevronLeft, Hourglass, TriangleAlert } from "lucide-react";
import { clearancePercent, monthsChip, monthsLeft, ruleFor, ruleLabel } from "@/lib/clearance";
import type { ClearanceRule } from "@/lib/clearance";
import { formatPrice, pick, pickName, useI18n, label, offPct } from "@/lib/i18n";
import type { Product } from "@/lib/store";

const copy = {
  title: { ar: "ينتهي قريباً", ku: "بەم زووانە کۆتایی دێت", en: "Ending Soon",},
  sub: { ar: "صالح للاستخدام — بسعر التصفية", ku: "بەکارهێنان دروستە — بە نرخی ڕاماڵین", en: "Usable — Clearance Price",},
  all: { ar: "كل عروض التصفية", ku: "هەموو ڕاماڵینەکان", en: "All Clearance Offers",},
  count: { ar: "قطعة", ku: "بەرهەم", en: "item",},
  shelf: { ar: "العمر المتبقي", ku: "تەمەنی ماوە", en: "Remaining Shelf Life",},
};

/**
 * Clearance list, deliberately unlike the flash-deal band: a white dashed
 * "ticket" with a striped warning-tape spine and vertical rows. Each row
 * carries a shelf-life meter that drains as the months remaining shrink, so
 * urgency reads through structure instead of a second colored hero field.
 */
export function ExpiringHero({
  products,
  rules,
  priceOf,
}: {
  products: Product[];
  rules: ClearanceRule[];
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { lang } = useI18n();
  const items = [...products]
    .filter((p) => p.clearance_kind === "near_expiry" && p.expiry_date)
    .sort((a, b) => (monthsLeft(a.expiry_date) ?? 99) - (monthsLeft(b.expiry_date) ?? 99));

  if (!items.length) return null;

  return (
    <div className="dk-ticket">
      <span aria-hidden className="dk-tape absolute inset-y-0 start-0 w-2" />

      <div className="ps-4">
        <div className="flex items-center gap-2 px-2.5 pt-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-clearance text-clearance-foreground">
            <Hourglass className="size-[17px]" strokeWidth={2.6} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-[15px] font-extrabold leading-tight text-foreground">
              {label(copy.title, lang)}
            </h2>
            <p className="truncate text-[10.5px] font-bold text-muted-foreground">
              {label(copy.sub, lang)}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-dashed border-clearance px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-clearance">
            {items.length} {label(copy.count, lang)}
          </span>
        </div>

        <ul className="mt-2 divide-y divide-dashed divide-border">
          {items.slice(0, 4).map((p) => {
            const months = monthsLeft(p.expiry_date);
            const rule = ruleFor(months, rules);
            const price = priceOf(p.id, p.price, 1);
            const percent =
              p.price > price
                ? Math.round((1 - price / Number(p.price)) * 100)
                : clearancePercent(p, rules);
            const life = Math.max(6, Math.min(100, Math.round(((months ?? 12) / 12) * 100)));
            const critical = (months ?? 12) <= 3;
            return (
              <li key={p.id}>
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-2.5 px-2.5 py-2 active:bg-muted/50"
                >
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted/60">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={pickName(p, lang)}
                        loading="lazy"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-2xl">🦷</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[11.5px] font-bold text-foreground">
                      {pickName(p, lang)}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold ${
                          critical ? "text-clearance" : "text-muted-foreground"
                        }`}
                      >
                        {critical ? <TriangleAlert className="size-2.5" strokeWidth={3} /> : null}
                        {monthsChip(months, lang)}
                      </span>
                      {rule ? (
                        <span className="truncate text-[9px] font-bold text-muted-foreground">
                          · {ruleLabel(rule, lang)}
                        </span>
                      ) : null}
                    </div>
                    <div className="dk-life mt-1.5">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${life}%`,
                          backgroundColor: critical
                            ? "var(--clearance)"
                            : "var(--expiry-soft)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 text-end">
                    {percent > 0 ? <span className="dk-off">{offPct(percent, lang)}</span> : null}
                    {price < p.price && (
                      <div className="mt-0.5 text-[9.5px] font-bold tabular-nums text-muted-foreground line-through">
                        {formatPrice(Number(p.price), lang)}
                      </div>
                    )}
                    <div className="price-lg text-[12px] text-foreground">
                      {formatPrice(price, lang)}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          to="/expiring"
          className="flex items-center justify-center gap-1 border-t border-dashed border-border py-2 text-[11.5px] font-extrabold text-clearance active:bg-muted/50"
        >
          {label(copy.all, lang)}
          <ChevronLeft className="size-4 ltr:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
