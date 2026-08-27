import { Link } from "@tanstack/react-router";
import { ChevronLeft, Plus } from "lucide-react";
import { Rail } from "@/components/home/HomeBlock";
import { formatPrice, pick, pickName, useI18n, label } from "@/lib/i18n";
import type { Bundle, Product } from "@/lib/store";

const copy = {
  pieces: { ar: "قطعة", ku: "دانە", en: "item",},
  kit: { ar: "سعر الحزمة", ku: "نرخی پاکێج", en: "Package Price",},
  offer: { ar: "عرض محدود", ku: "ئۆفەری سنووردار", en: "Limited Offer",},
  view: { ar: "احصل على الحزمة", ku: "پاکێجەکە وەرگرە", en: "Get the bundle",},
  inStock: { ar: "متوفر للتوصيل", ku: "بەردەستە بۆ گەیاندن", en: "Available for Delivery",},
};

/**
 * Bundle rail — integrated kit display card.
 * A clean white card with a 2×2 product grid joined by a central "+" connector,
 * a savings badge, the bundle title, kit price, and a primary CTA.
 * Tapping opens the bundle detail page.
 */
export function BundleRail({ bundles, products }: { bundles: Bundle[]; products: Product[] }) {
  const { lang, t } = useI18n();
  return (
    <Rail>
      {bundles.map((b) => {
        const items = (b.product_ids ?? [])
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean) as Product[];
        const compare = Number(b.compare_price ?? 0);
        const price = Number(b.price);
        const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
        const tiles = items.slice(0, 4);
        const extra = items.length - tiles.length;

        return (
          <Link
            key={b.id}
            to="/bundle/$id"
            params={{ id: b.id }}
            className="flex w-[72%] shrink-0 snap-start flex-col overflow-hidden rounded-[calc(var(--radius)+12px)] border border-border bg-card shadow-card active:scale-[0.985]"
          >
            {/* Header badges */}
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-tight text-accent-foreground">
                {label(copy.offer, lang)}
              </span>
              {off > 0 && (
                <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                  -{off}%
                </span>
              )}
            </div>

            {/* Product grid with central connector */}
            <div className="relative px-3.5">
              <div className="relative grid grid-cols-2 gap-2 rounded-[calc(var(--radius)+8px)] border border-border/60 bg-secondary/40 p-2">
                {(tiles.length
                  ? tiles
                  : ([{ id: "x", image_url: b.image_url } as unknown as Product])
                ).map((p, i) => (
                  <div
                    key={p.id + i}
                    className="grid aspect-square place-items-center overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border bg-card"
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name_ar ? pickName(p, lang) : ""}
                        loading="lazy"
                        className="h-full w-full object-contain p-1.5 product-art"
                      />
                    ) : (
                      <span className="text-xl">🦷</span>
                    )}
                  </div>
                ))}
                {extra > 0 && (
                  <span className="absolute bottom-2 end-2 rounded-md bg-foreground/80 px-1.5 py-0.5 text-[10px] font-extrabold text-background">
                    +{extra}
                  </span>
                )}
                {/* Connector */}
                <div className="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card shadow-sm">
                  <Plus className="size-4 text-muted-foreground" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-3.5">
              <div className="flex-1">
                <p className="line-clamp-2 text-[13px] font-extrabold leading-tight">
                  {pick(b.title_ar, b.title_ku, lang) || t("bundles")}
                </p>
                {items.length > 0 && (
                  <span className="mt-1 text-[10.5px] font-bold text-muted-foreground">
                    {items.length} {label(copy.pieces, lang)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-col">
                  {compare > price && (
                    <span className="text-[10.5px] font-bold text-muted-foreground line-through">
                      {formatPrice(compare, lang)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-[18px] font-black text-primary">{formatPrice(price, lang)}</span>
                  </div>
                </div>
                <span className="inline-flex h-9 items-center gap-1 rounded-xl bg-primary px-3 text-[11px] font-extrabold text-primary-foreground shadow-sm active:scale-95">
                  {label(copy.view, lang)}
                  <ChevronLeft className="size-3.5 rtl:rotate-180" strokeWidth={3} />
                </span>
              </div>
            </div>

            {/* Trust footer */}
            <div className="flex items-center gap-1.5 border-t border-border px-3.5 py-2">
              <span className="size-1.5 rounded-full bg-success" />
              <span className="text-[10px] font-bold text-muted-foreground">
                {label(copy.inStock, lang)}
              </span>
            </div>
          </Link>
        );
      })}
    </Rail>
  );
}
