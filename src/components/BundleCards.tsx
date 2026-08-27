import { Layers, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { formatPrice, pick, pickName, useI18n } from "@/lib/i18n";
import { bundleLines } from "@/lib/store";
import type { Bundle, Product } from "@/lib/store";


/** Money-saving product bundles: a fixed price for a set of products. */
export function BundleCards({
  bundles,
  products,
}: {
  bundles: Bundle[];
  products: Product[];
}) {
  const { lang, t } = useI18n();
  const cart = useCart();

  const cards = (bundles ?? [])
    .map((b) => ({
      b,
      items: (b.product_ids ?? [])
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    }))
    .filter((c) => c.items.length > 0);

  if (!cards.length) return null;

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4">
      {cards.map(({ b, items }) => {
        const full = Number(b.compare_price ?? items.reduce((s, p) => s + Number(p.price), 0));
        const price = Number(b.price);
        const save = full > price ? full - price : 0;
        const style = {
          "--h": `oklch(0.34 ${Number(b.chroma) * 0.9} ${b.hue})`,
          "--soft": `oklch(0.96 ${Number(b.chroma) * 0.22} ${b.hue})`,
        } as React.CSSProperties;

        return (
          <article
            key={b.id}
            style={style}
            className="tile-soft w-full shrink-0 snap-start overflow-hidden"
          >
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ background: "var(--soft)" }}
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-xl"
                style={{ background: "var(--h)", color: "oklch(1 0 0)" }}
              >
                <Layers className="size-4" />
              </span>
              <div className="min-w-0">
                <h3
                  className="truncate font-display text-[14px] font-extrabold"
                  style={{ color: "var(--h)" }}
                >
                  {pick(b.title_ar, b.title_ku, lang)}
                </h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  {pick(b.subtitle_ar, b.subtitle_ku, lang)}
                </p>
              </div>
            </div>

            <div className="flex items-stretch gap-1.5 px-3 pb-1 pt-2">
              {items.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="aspect-square flex-1 overflow-hidden rounded-2xl"
                  style={{ background: "var(--soft)" }}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={pickName(p, lang)}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Package className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>



            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[17px] font-extrabold text-primary">
                    {formatPrice(price, lang)}
                  </span>
                  {save > 0 && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {formatPrice(full, lang)}
                    </span>
                  )}
                </div>
                {save > 0 && (
                  <p className="text-[11px] font-bold text-success">
                    {t("yourSaving")} {formatPrice(save, lang)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  const lines = bundleLines(b, items);
                  cart.addBundle(
                    { id: b.id, title_ar: b.title_ar, title_ku: b.title_ku },
                    items.map((p) => ({
                      id: p.id,
                      name_ar: p.name_ar,
                      name_ku: p.name_ku,
                      price: lines.find((l) => l.id === p.id)?.price ?? Number(p.price),
                      image_url: p.image_url,
                      vendor_id: p.vendor_id ?? null,
                    })),
                  );
                  toast.success(t("added"));
                }}


                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-[12px] font-extrabold text-primary-foreground active:scale-95"
              >
                <Plus className="size-3.5" />
                {t("addBundleToCart")}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
