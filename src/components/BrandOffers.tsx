import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Tag } from "lucide-react";
import { formatPrice, pickName, useI18n, type Lang } from "@/lib/i18n";
import { brandLogo, brandProducts, type BrandCard } from "@/lib/brands";
import type { Product } from "@/lib/store";

type Item = { p: Product; price: number; percent: number };
type Card = BrandCard & { items: Item[]; best: number };

/** Big faded transparent brand logo used as the card background watermark. */
function LogoWatermark({ brand }: { brand: BrandCard }) {
  const [failed, setFailed] = useState(false);
  const src = brandLogo(brand, 480);

  return (
    <div className="pointer-events-none absolute inset-y-0 end-0 w-[58%] overflow-hidden">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setFailed(true)}
          className="product-art-faded absolute -end-6 top-1/2 h-[175%] w-auto max-w-none -translate-y-1/2"
        />
      ) : (
        <span
          className="absolute end-2 top-1/2 -translate-y-1/2 font-display text-[64px] font-black leading-none tracking-tight"
          style={{ color: "oklch(1 0 0 / 18%)" }}
        >
          {brand.mark || brand.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Product image, or the brand logo watermark when the product has no photo. */
function ItemMedia({ p, brand, lang }: { p: Product; brand: BrandCard; lang: Lang }) {
  const [failed, setFailed] = useState(false);
  const logo = brandLogo(brand, 160);

  if (p.image_url) {
    return (
      <img
        src={p.image_url}
        alt={pickName(p, lang)}
        loading="lazy"
        className="product-shot h-full w-full scale-[1.06]"
      />
    );
  }
  if (logo && !failed) {
    return (
      <div
        className="grid h-full w-full place-items-center p-4"
        style={{ background: "oklch(1 0 0)" }}
      >
        <img
          src={logo}
          alt={`${brand.name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="product-art-faded max-h-full w-full scale-110"
        />
      </div>
    );
  }
  return <div className="grid h-full w-full place-items-center text-2xl">🦷</div>;
}

export function BrandOffers({
  products,
  priceOf,
  brands,
}: {
  products: Product[];
  priceOf: (id: string, price: number) => number;
  brands?: BrandCard[];
}) {
  const { lang, t } = useI18n();

  const cards = useMemo<Card[]>(() => {
    return (brands ?? [])
      .filter((b) => b.is_active)
      .map((b) => {
        const items: Item[] = brandProducts(b, products).map((p) => {
          const price = priceOf(p.id, p.price);
          const ref =
            p.compare_price && p.compare_price > price ? Number(p.compare_price) : p.price;
          const percent = price < ref ? Math.round((1 - price / ref) * 100) : 0;
          return { p, price, percent };
        });
        if (!(b.product_ids ?? []).length) items.sort((x, y) => y.percent - x.percent);
        return { ...b, items, best: items.reduce((m, i) => Math.max(m, i.percent), 0) };
      })
      .filter((b) => b.items.length > 0)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [brands, products, priceOf]);

  return (
    <div className="space-y-4">
      {cards.map((g) => {
        const style = {
          "--brand": `oklch(0.53 ${g.chroma} ${g.hue})`,
          "--brand-soft": `oklch(0.96 ${Number(g.chroma) * 0.22} ${g.hue})`,
          "--brand-deep": `oklch(0.34 ${Number(g.chroma) * 0.9} ${g.hue})`,
        } as React.CSSProperties;

        return (
          <section
            key={g.id}
            style={style}
            className="overflow-hidden rounded-2xl border border-border shadow-card"
          >
            {/* Header: brand gradient with the big faded logo watermark behind */}
            <div
              className="relative overflow-hidden p-3.5 pe-24"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, var(--brand-deep), var(--brand) 65%, var(--brand))",
              }}
            >
              <LogoWatermark brand={g} />
              <span
                className="pointer-events-none absolute -bottom-10 -start-6 size-32 rounded-full"
                style={{ background: "oklch(1 0 0 / 8%)" }}
              />
              <span
                className="relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                style={{ background: "oklch(1 0 0 / 22%)", color: "oklch(1 0 0)" }}
              >
                <Tag className="size-3" />
                {t("brandOffers")}
              </span>
              <h3
                className="relative mt-1.5 truncate font-display text-[17px] font-extrabold leading-tight"
                style={{ color: "oklch(1 0 0)" }}
              >
                {g.name}
              </h3>
              {g.best > 0 && (
                <p
                  className="relative mt-0.5 text-[11px] font-bold"
                  style={{ color: "oklch(1 0 0 / 85%)" }}
                >
                  {t("upTo")} -{g.best}%
                </p>
              )}
            </div>

            {/* products, horizontally scrollable */}
            <div
              className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto p-3"
              style={{ background: "var(--brand-soft)" }}
            >
              {g.items.slice(0, 12).map(({ p, price, percent }) => (
                <Link
                  key={p.id}
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="w-[42%] max-w-40 shrink-0 snap-start overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm"
                >
                  <div
                    className="relative aspect-[1/1.08] w-full overflow-hidden"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 50% 52%, var(--card) 0%, color-mix(in oklab, var(--brand-soft) 60%, var(--card)) 72%, var(--brand-soft) 100%)",
                    }}
                  >
                    <ItemMedia p={p} brand={g} lang={lang} />
                    {percent > 0 && (
                      <span
                        className="absolute top-1.5 start-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold"
                        style={{ background: "var(--brand)", color: "oklch(1 0 0)" }}
                      >
                        -{percent}%
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-bold leading-4">
                      {pickName(p, lang)}
                    </p>
                    <p
                      className="mt-1 text-[12px] font-extrabold"
                      style={{ color: "var(--brand-deep)" }}
                    >
                      {formatPrice(price, lang)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              to="/products"
              search={{ q: g.name }}
              className="flex items-center justify-center gap-1 border-t border-border bg-card py-2.5 text-[12px] font-bold"
              style={{ color: "var(--brand-deep)" }}
            >
              {t("viewAll")}
              <ChevronLeft className="size-3.5" />
            </Link>
          </section>
        );
      })}
    </div>
  );
}
