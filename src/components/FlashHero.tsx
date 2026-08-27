import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgePercent, Flame, ShoppingCart, Truck, Zap } from "lucide-react";
import { formatPrice, pick, pickName, useI18n } from "@/lib/i18n";
import { dealRuleChips } from "@/lib/offer-text";
import type { FlashDeal, Product } from "@/lib/store";

function useLeft(endsAt: string | null) {
  const [left, setLeft] = useState(() => (endsAt ? new Date(endsAt).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setLeft(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

function pad(v: number) {
  return String(v).padStart(2, "0");
}

/** Colourful glass countdown: separate boxed digits with labels. */
function GlassCountdown({ endsAt }: { endsAt: string }) {
  const { t } = useI18n();
  const left = useLeft(endsAt);
  if (left <= 0) return null;
  const total = Math.floor(left / 1000);
  const parts = [
    Math.floor(total / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-white/85">{t("endsIn")}</span>
      <div className="flex items-center gap-1">
        {parts.map((v, i) => (
          <span
            key={i}
            className="min-w-8 rounded-lg border border-white/30 bg-white/20 px-1.5 py-1 text-center font-mono text-[13px] font-black tabular-nums text-white backdrop-blur-md"
          >
            {pad(v)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * V6 hero card: full-colour brand gradient card, glossy white product stage,
 * glass badges + countdown, vivid discount medallion and a white pill CTA.
 */
export function FlashHero({
  deals,
  products,
  priceOf,
}: {
  deals: FlashDeal[];
  products: Product[];
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { lang, t } = useI18n();
  const live = deals ?? [];
  if (!live.length) return null;

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-4 pt-3">
      {live.map((d) => {
        const product = products.find((p) => p.id === d.product_id) ?? null;
        const qty = Math.max(1, Number(d.min_qty ?? 1));
        const base = product ? Number(product.price) : 0;
        const price = product ? priceOf(product.id, base, qty) : 0;
        const ref = product ? Number(product.compare_price ?? product.price) : 0;
        const percent = product && ref > price ? Math.round((1 - price / ref) * 100) : 0;
        const chips = dealRuleChips(d, lang, t).slice(0, 2);
        const image = d.image_url || product?.image_url || null;
        const stock = product ? Math.max(0, product.stock) : 0;
        const hue = Number(d.hue);
        const chroma = Number(d.chroma);

        const style = {
          "--h": `oklch(0.58 ${chroma} ${hue})`,
          "--h2": `oklch(0.52 ${chroma * 1.05} ${hue + 18})`,
          "--h3": `oklch(0.44 ${chroma * 0.9} ${hue + 38})`,
          "--ink": `oklch(0.42 ${chroma * 0.95} ${hue})`,
          "--soft": `oklch(0.96 ${chroma * 0.28} ${hue})`,
          "--tint": `oklch(0.9 ${chroma * 0.45} ${hue})`,
          "--shadowc": `oklch(0.5 ${chroma * 0.8} ${hue} / 0.5)`,
        } as React.CSSProperties;

        return (
          <article
            key={d.id}
            style={style}
            className="hero-card relative flex w-[92%] shrink-0 snap-start"
          >
            {/* full-height clear product photo panel on the outer edge */}
            <div className="absolute inset-y-3 end-3 w-[40%] overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-white/60">
              {image && (
                <img
                  src={image}
                  alt={pickName(product, lang)}
                  loading="eager"
                  className="h-full w-full object-contain p-2"
                />
              )}
            </div>
            <div className="hero-sheen" />

            {/* content column */}
            <div className="relative z-10 flex w-[58%] flex-col p-4">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full border border-white/35 bg-white/20 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white backdrop-blur-md">
                  <Flame className="size-3.5" />
                  {pick(d.badge_ar, d.badge_ku, lang) || t("flashDeal")}
                </span>
                {percent > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black tabular-nums shadow-md" style={{ color: "var(--ink)" }}>
                    <BadgePercent className="size-3.5" />
                    {percent}% OFF
                  </span>
                )}
              </div>

              <h2 className="line-clamp-3 text-[17px] font-black uppercase leading-tight text-white drop-shadow-sm">
                {pick(d.title_ar, d.title_ku, lang) || pickName(product, lang)}
              </h2>
              {pick(d.subtitle_ar, d.subtitle_ku, lang) && (
                <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-white/85">
                  {pick(d.subtitle_ar, d.subtitle_ku, lang)}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {chips.slice(0, 1).map((c) => (
                  <span
                    key={c}
                    className="flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[9.5px] font-bold text-white backdrop-blur"
                  >
                    <BadgePercent className="size-3" />
                    {c}
                  </span>
                ))}
                <span className="flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[9.5px] font-bold text-white backdrop-blur">
                  <Truck className="size-3" />
                  {t("fastDelivery")}
                </span>
                <span className="flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[9.5px] font-bold tabular-nums text-white backdrop-blur">
                  <Zap className="size-3" />
                  {stock} {t("left")}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
                <p className="font-display text-xl font-black tabular-nums leading-none text-white drop-shadow">
                  {formatPrice(price, lang)}
                </p>
                {percent > 0 && (
                  <p className="text-[11px] font-semibold tabular-nums text-white/70 line-through">
                    {formatPrice(ref, lang)}
                  </p>
                )}
              </div>

              {d.ends_at && (
                <div className="mt-2">
                  <GlassCountdown endsAt={d.ends_at} />
                </div>
              )}

              <Link
                to={product ? "/product/$id" : "/offers"}
                {...(product ? { params: { id: product.id } } : {})}
                className="relative z-10 mt-auto pt-3 block"
              >
                <div className="hero-cta py-2 text-[11px]">
                  <ShoppingCart className="size-4" />
                  {t("shopNow")}
                </div>
              </Link>

            </div>

            {product?.brand && (
              <span className="absolute bottom-5 end-5 z-20 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground/70 shadow-sm backdrop-blur">
                {product.brand}
              </span>
            )}
          </article>
        );

      })}
    </div>
  );
}
