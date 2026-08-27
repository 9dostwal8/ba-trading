import { Link } from "@tanstack/react-router";
import { ChevronLeft, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { formatPrice, pick, pickName, useI18n, label, offPct } from "@/lib/i18n";
import type { FlashDeal, Product } from "@/lib/store";

const copy = {
  title: { ar: "عروض مذهلة", ku: "پێشنیاری سەرسوڕهێنەر", en: "Amazing Offers",},
  all: { ar: "مشاهدة الكل", ku: "بینینی هەمووی", en: "View All",},
  ends: { ar: "ينتهي بعد", ku: "کۆتایی دێت لە", en: "Ends in",},
};

/** Countdown to the soonest deal end, rendered as Digikala's digit boxes. */
function Countdown({ to }: { to: string | null }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!to) return;
    const tick = () => setLeft(Math.max(0, new Date(to).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  if (!to || left <= 0) return null;
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {parts.map((p, i) => (
        <span key={i} className="dk-count">
          {String(p).padStart(2, "0")}
        </span>
      ))}
    </div>
  );
}

/**
 * Digikala's signature "amazing offers" strip: a saturated red field carrying a
 * lightning title block with a live countdown, then a horizontal rail of small
 * white product tiles each with a red % pill and struck original price.
 */
export function AmazingRail({
  deals,
  products,
  priceOf,
}: {
  deals: FlashDeal[];
  products: Product[];
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { lang } = useI18n();
  const rows = deals
    .map((d) => ({ deal: d, product: products.find((p) => p.id === d.product_id) }))
    .filter((r): r is { deal: FlashDeal; product: Product } => Boolean(r.product));
  if (!rows.length) return null;

  const soonest =
    rows
      .map((r) => r.deal.ends_at)
      .filter((v): v is string => Boolean(v))
      .sort()[0] ?? null;

  return (
    <div className="dk-amazing px-2.5 py-3">
      <div className="flex items-center gap-2 px-1 pb-2.5">
        <Zap className="size-5 shrink-0 fill-current" strokeWidth={0} />
        <h2 className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold">
          {label(copy.title, lang)}
        </h2>
        <Countdown to={soonest} />
      </div>

      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-0.5">
        {rows.map(({ deal, product }) => {
          const price = priceOf(product.id, product.price);
          const old = price < product.price ? product.price : product.compare_price;
          const percent = old ? Math.round((1 - price / Number(old)) * 100) : 0;
          return (
            <Link
              key={deal.id}
              to="/product/$id"
              params={{ id: product.id }}
              className="dk-deal-card w-[126px] shrink-0 snap-start active:scale-[0.98]"
            >
              <div className="grid h-[104px] place-items-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={pickName(product, lang)}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-3xl">🦷</span>
                )}
              </div>
              <p className="line-clamp-2 min-h-[2.1rem] text-[10.5px] font-semibold leading-tight text-foreground">
                {pickName(product, lang)}
              </p>
              <div className="mt-auto flex items-center justify-between gap-1">
                {percent > 0 ? <span className="dk-off">{offPct(percent, lang)}</span> : <span />}
                <div className="min-w-0 text-end">
                  {old && (
                    <div className="text-[9.5px] font-bold tabular-nums text-muted-foreground line-through">
                      {formatPrice(Number(old), lang)}
                    </div>
                  )}
                  <div className="price-lg truncate text-[11.5px] text-foreground">
                    {formatPrice(price, lang)}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        <Link
          to="/deals"
          className="grid w-[86px] shrink-0 place-items-center rounded-[0.625rem] bg-primary-foreground/12 text-center text-[11px] font-extrabold text-primary-foreground"
        >
          <span className="px-2">
            {label(copy.all, lang)}
            <ChevronLeft className="mx-auto mt-1 size-4 ltr:rotate-180" />
          </span>
        </Link>
      </div>
    </div>
  );
}
