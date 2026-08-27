import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { formatPrice, pick, pickName, useI18n, label } from "@/lib/i18n";
import { bundleLines, fetchStoreData } from "@/lib/store";

const copy = {
  items: { ar: "محتويات الحزمة", ku: "ناوەڕۆکی پاکێج", en: "Package Contents",},
  kit: { ar: "سعر الحزمة", ku: "نرخی پاکێج", en: "Package Price",},
  save: { ar: "توفير", ku: "پاشەکەوت", en: "Save",},
  addAll: { ar: "أضف كل المحتويات للسلة", ku: "هەمووی بخە ناو سەبەتە", en: "Add all to cart",},
  added: { ar: "تمت الإضافة للسلة", ku: "زیادکرا بۆ سەبەتە", en: "Added to cart",},
  missing: { ar: "الحزمة غير متوفرة", ku: "پاکێج بەردەست نییە", en: "Package unavailable",},
};

export const Route = createFileRoute("/bundle/$id")({
  head: () => ({
    meta: [
      { title: "Bundle Kit — OfferDent" },
      { name: "description", content: "Dental bundle kit contents, kit price and savings." },
      { property: "og:title", content: "Bundle Kit — OfferDent" },
      { property: "og:description", content: "See every item inside this dental kit and its bundle price." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BundlePage,
});

function BundlePage() {
  const { id } = Route.useParams();
  const { lang } = useI18n();
  const cart = useCart();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const bundle = data?.bundles.find((b) => b.id === id);
  const items = (bundle?.product_ids ?? [])
    .map((pid) => data?.products.find((p) => p.id === pid))
    .filter(Boolean) as NonNullable<typeof data>["products"];

  const price = Number(bundle?.price ?? 0);
  const compare = Number(bundle?.compare_price ?? 0);
  const save = compare > price ? compare - price : 0;

  const addAll = () => {
    if (!bundle) return;
    const lines = bundleLines(bundle, items);
    cart.addBundle(
      { id: bundle.id, title_ar: bundle.title_ar, title_ku: bundle.title_ku },
      items.map((p) => ({
        id: p.id,
        name_ar: p.name_ar,
        name_ku: p.name_ku,
        price: lines.find((l) => l.id === p.id)?.price ?? Number(p.price),
        image_url: p.image_url,
        vendor_id: p.vendor_id ?? null,
      })),
    );
    toast.success(label(copy.added, lang));
  };



  return (
    <StoreLayout>
      <div className="space-y-3 p-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </>
        ) : !bundle ? (
          <p className="py-16 text-center text-sm font-bold text-muted-foreground">
            {label(copy.missing, lang)}
          </p>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
              <h1 className="text-[15px] font-extrabold">
                {pick(bundle.title_ar, bundle.title_ku, lang)}
              </h1>
              {(bundle.subtitle_ar || bundle.subtitle_ku) && (
                <p className="mt-1 text-[11.5px] font-semibold text-muted-foreground">
                  {pick(bundle.subtitle_ar, bundle.subtitle_ku, lang)}
                </p>
              )}
              <div className="mt-2.5 flex items-end gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {label(copy.kit, lang)}
                  </span>
                  <span className="price-lg text-[19px] leading-none">
                    {formatPrice(price, lang)}
                  </span>
                </div>
                {compare > price && (
                  <span className="text-[11px] font-bold tabular-nums text-muted-foreground line-through">
                    {formatPrice(compare, lang)}
                  </span>
                )}
                {save > 0 && (
                  <span className="ms-auto rounded-lg bg-success/12 px-2 py-1 text-[11px] font-extrabold text-success">
                    {label(copy.save, lang)} {formatPrice(save, lang)}
                  </span>
                )}
              </div>
              <Button className="mt-3 h-11 w-full gap-2 text-[13px] font-extrabold" onClick={addAll}>
                <ShoppingCart className="size-4" strokeWidth={2.6} />
                {label(copy.addAll, lang)}
              </Button>
            </section>

            <h2 className="px-1 pt-1 text-[13px] font-extrabold">
              {label(copy.items, lang)} ({items.length})
            </h2>
            <ul className="space-y-2">
              {items.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-2 shadow-soft active:scale-[0.99]"
                  >
                    <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-secondary">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={pickName(p, lang)}
                          loading="lazy"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-xl">🦷</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] font-bold leading-tight">
                        {pickName(p, lang)}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold tabular-nums text-muted-foreground">
                        <Check className="size-3 text-success" strokeWidth={3} />
                        {formatPrice(Number(p.price), lang)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
