import { Link } from "@tanstack/react-router";
import { ChevronLeft, Tag } from "lucide-react";
import { tintStyle } from "@/lib/category-icons";
import { pick, pickName, useI18n } from "@/lib/i18n";
import type { Offer, Product } from "@/lib/store";

/**
 * Offer rows: a tinted card carrying the offer badge, title, subtitle and a
 * thumbnail strip of the products included in the promotion.
 */
export function PromoStrip({
  offers,
  productsFor,
}: {
  offers: Offer[];
  productsFor: (offer: Offer) => Product[];
}) {
  const { lang } = useI18n();
  return (
    <div className="space-y-2">
      {offers.map((o) => {
        const items = productsFor(o).slice(0, 3);
        const badge = pick(o.badge_ar, o.badge_ku, lang);
        return (
          <Link
            key={o.id}
            to="/offers"
            style={tintStyle(o.hue, o.chroma)}
            className="flex items-center gap-2.5 rounded-2xl border p-2.5 active:scale-[0.99]"
          >
            <span
              className="tile-icon size-11 shrink-0"
              style={{ color: "var(--tint-strong)" }}
            >
              <Tag className="size-5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 truncate text-[13px] font-extrabold leading-tight">
                  {pick(o.title_ar, o.title_ku, lang)}
                </p>
                {badge ? (
                  <span
                    className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-extrabold"
                    style={{ background: "var(--tint-strong)", color: "oklch(0.99 0 0)" }}
                  >
                    {badge}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] font-semibold text-muted-foreground">
                {pick(o.subtitle_ar, o.subtitle_ku, lang) || badge}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {items.map((p) =>
                p.image_url ? (
                  <img
                    key={p.id}
                    src={p.image_url}
                    alt={pickName(p, lang)}
                    loading="lazy"
                    className="size-9 rounded-lg border border-border/70 bg-card object-contain p-0.5"
                  />
                ) : null,
              )}
              <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
