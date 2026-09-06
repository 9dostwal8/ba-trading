import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Heart, Hourglass, PackageOpen, Plus, ShoppingCart, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { ProductBadges } from "@/lib/badges";
import { isOutlet, monthsChip, monthsLeft, urgencyTone } from "@/lib/clearance";
import { tintStyle } from "@/lib/category-icons";
import { useCart } from "@/lib/cart";
import { formatPrice, pickName, useI18n, offPct } from "@/lib/i18n";
import { fetchVendors } from "@/lib/vendor-public";
import { useDesign } from "@/lib/design-store";
import { useFavorites } from "@/hooks/useFavorites";
import type { Product } from "@/lib/store";

/**
 * Marketplace catalog card: plain white photo area, brand line, two-line title,
 * bold price with struck MRP and a green "% off" note, plus an outlined
 * ADD TO CART action. Optimised for dense 2-per-row mobile grids and rails.
 */
export function ProductCard({
  product,
  price,
  offers = 1,
}: {
  product: Product;
  price: number;
  /** how many vendors sell this same catalog item */
  offers?: number;
}) {
  const { lang, t } = useI18n();
  const cart = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const design = useDesign();
  const dc = design.card;
  const base = product.compare_price && product.compare_price > price ? product.compare_price : null;
  const oldPrice = price < product.price ? product.price : base;
  const percent = oldPrice ? Math.round((1 - price / Number(oldPrice)) * 100) : 0;
  const { data: vendors } = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });
  const vendor = product.vendor_id
    ? (vendors ?? []).find((v) => v.id === product.vendor_id)
    : undefined;
  const months = monthsLeft(product.expiry_date);
  const nearExpiry = product.clearance_kind === "near_expiry" && months != null;
  const outlet = isOutlet(product);
  const tone = urgencyTone(months);
  const low = product.stock > 0 && product.stock <= 5;
  const out = product.stock <= 0;

  const add = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const ok = cart.add({
      id: product.id,
      name_ar: product.name_ar,
      name_ku: product.name_ku,
      price,
      image_url: product.image_url,
      vendor_id: product.vendor_id ?? null,
    });
    if (ok) {
      toast.success(t("added"));
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <article
      className="group relative flex h-full min-w-0 flex-col overflow-hidden border-border/60 bg-card transition-all duration-200 hover:shadow-md"
      style={{
        borderRadius: "var(--card-radius)",
        borderWidth: "var(--card-border-w)",
        borderStyle: "solid",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="relative" style={{ padding: "var(--card-pad)" }}>
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="block w-full transition-transform duration-300 group-hover:scale-105"
          style={{ aspectRatio: "var(--card-img-ratio)" }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={pickName(product, lang)}
              loading="lazy"
              className="h-full w-full"
              style={{ objectFit: "var(--card-img-fit)" as "contain" }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl">🦷</div>
          )}
        </Link>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={lang === "ku" ? "دڵخوازەکان" : "المفضلة"}
          className="absolute top-2.5 end-2.5 z-20 flex size-7 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-110 hover:text-rose-500 active:scale-95 cursor-pointer"
        >
          <Heart
            className={`size-4 transition-colors ${
              isFavorite(product.id)
                ? "fill-rose-500 text-rose-500"
                : "text-slate-400"
            }`}
          />
        </button>

        {/* Top-Start: Expiry & Custom Badges Overlay */}
        <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1 z-10 max-w-[65%]">
          {percent > 0 && (
            <span className="rounded-full bg-[#007979] px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
              {percent}% {lang === "ar" ? "خصم" : lang === "ku" ? "داشکاندن" : "OFF"}
            </span>
          )}

          {dc.show_expiry && (nearExpiry || outlet) && (
            <div
              className="flex min-w-0 items-center gap-1"
              style={tintStyle(nearExpiry ? tone.hue : 220, nearExpiry ? tone.chroma : 0.12)}
            >
              <span
                className="inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold shadow-sm backdrop-blur-sm"
                style={{ background: "var(--tint-soft)", color: "var(--tint-strong)" }}
              >
                {nearExpiry ? (
                  <Hourglass className="size-2.5 shrink-0" strokeWidth={3} />
                ) : (
                  <PackageOpen className="size-2.5 shrink-0" strokeWidth={3} />
                )}
                <span className="truncate">
                  {nearExpiry ? monthsChip(months, lang) : t("outlet")}
                </span>
              </span>
            </div>
          )}
          {dc.show_badges && !!product.badges?.length && (
            <div className="min-w-0">
              <ProductBadges badges={product.badges} lang={lang} max={2} />
            </div>
          )}
        </div>

        {out && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-900/80 py-1 text-center text-[10.5px] font-bold text-white backdrop-blur-sm z-10">
            {t("outOfStock")}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 pb-2.5">
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="line-clamp-2 text-[12px] font-semibold leading-[1.5] text-foreground hover:text-primary transition-colors"
        >
          {dc.show_brand && product.brand ? <span className="font-extrabold">{product.brand} </span> : null}
          {pickName(product, lang)}
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {dc.show_vendor && vendor && (
            <Link
              to="/vendor/$slug"
              params={{ slug: vendor.slug }}
              className="inline-flex min-w-0 items-center gap-1 text-[10px] font-bold text-muted-foreground active:opacity-70"
            >
              <span className="truncate">{vendor.name}</span>
              {vendor.is_verified && (
                <BadgeCheck
                  className="size-3 shrink-0 text-success"
                  strokeWidth={2.6}
                  aria-label={t("verified")}
                />
              )}
            </Link>
          )}
          {dc.show_rating && (
            <span className="ms-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              4.9
            </span>
          )}
        </div>

        {dc.show_sellers && offers > 1 && (
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="inline-flex w-fit items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-extrabold text-primary"
          >
            <Store className="size-2.5" strokeWidth={3} />
            {offers} {t("sellersCount")}
          </Link>
        )}

        <div className="mt-auto min-w-0 pt-1.5">
          <div
            className={`flex min-w-0 gap-1.5 ${
              dc.price_layout === "inline"
                ? "flex-row-reverse items-baseline justify-end"
                : "items-end justify-between"
            }`}
          >
            {dc.show_savings && percent > 0 ? (
              <span className="dk-off">{offPct(percent, lang)}</span>
            ) : (
              <span />
            )}
            <div className={`min-w-0 ${dc.price_layout === "inline" ? "flex items-baseline gap-1.5" : "text-end"}`}>
              {oldPrice && (
                <div className="text-[10px] font-bold leading-4 tabular-nums text-muted-foreground line-through">
                  {formatPrice(Number(oldPrice), lang)}
                </div>
              )}
              <div className="price-lg whitespace-nowrap text-[13.5px] leading-5">
                {formatPrice(price, lang)}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
            {low ? (
              <p className="text-[9.5px] font-bold text-primary">
                {product.stock} {t("stock")}
              </p>
            ) : (
              <span className="text-[9.5px] text-muted-foreground font-semibold">
                {out ? t("outOfStock") : t("availableNow")}
              </span>
            )}

            {!out && (
              <button
                type="button"
                onClick={add}
                aria-label={t("addToCart")}
                className="ms-auto flex h-7 items-center gap-1 rounded-lg bg-primary/10 px-2 text-[11px] font-black text-primary transition-all hover:bg-primary hover:text-white active:scale-95 cursor-pointer"
              >
                <Plus className="size-3" strokeWidth={3} />
                <span>{t("addToCart")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
