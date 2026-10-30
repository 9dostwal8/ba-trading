import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Package, ShoppingCart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { formatPrice, pick, pickName, useI18n, label } from "@/lib/i18n";
import { bundleLines, fetchStoreData, type Product } from "@/lib/store";

const copy = {
  items: { ar: "محتويات الحزمة", ku: "ناوەڕۆکی پاکێج", en: "Package Contents" },
  kit: { ar: "سعر الحزمة", ku: "نرخی پاکێج", en: "Package Price" },
  save: { ar: "توفير", ku: "پاشەکەوت", en: "Save" },
  addAll: { ar: "أضف كل المحتويات للسلة", ku: "هەمووی بخە ناو سەبەتە", en: "Add all to cart" },
  added: { ar: "تمت الإضافة للسلة", ku: "زیادکرا بۆ سەبەتە", en: "Added to cart" },
  missing: { ar: "الحزمة غير متوفرة", ku: "پاکێج بەردەست نییە", en: "Package unavailable" },
  pieces: { ar: "قطع", ku: "دانە", en: "items" },
  specialBadge: { ar: "باقة عيادات خاصة", ku: "پاکێجی تایبەتی کلینیک", en: "Special Clinic Bundle" },
  included: { ar: "مشمول بالحزمة", ku: "لەناو پاکێجدایە", en: "Included in kit" },
  backToBundles: { ar: "العودة للحزم", ku: "گەڕانەوە بۆ پاکێجەکان", en: "Back to bundles" },
};

/**
 * Calculates dynamic rotation, translation and z-index Tailwind classes
 * for a hand-of-cards fanned display from the bottom origin.
 */
function getFanCardClass(index: number, total: number): string {
  if (total <= 1) {
    return "rotate-0 translate-x-0 z-10";
  }
  if (total === 2) {
    return index === 0
      ? "-rotate-6 -translate-x-6 sm:-translate-x-8 z-10"
      : "rotate-6 translate-x-6 sm:translate-x-8 z-20";
  }
  if (total === 3) {
    if (index === 0) return "-rotate-12 -translate-x-10 sm:-translate-x-14 z-10";
    if (index === 1) return "rotate-0 translate-x-0 z-20";
    return "rotate-12 translate-x-10 sm:translate-x-14 z-10";
  }
  if (total === 4) {
    if (index === 0) return "-rotate-12 -translate-x-12 sm:-translate-x-16 z-10";
    if (index === 1) return "-rotate-6 -translate-x-4 sm:-translate-x-6 z-20";
    if (index === 2) return "rotate-6 translate-x-4 sm:translate-x-6 z-20";
    return "rotate-12 translate-x-12 sm:translate-x-16 z-10";
  }
  // total === 5
  if (index === 0) return "-rotate-12 -translate-x-16 sm:-translate-x-20 z-10";
  if (index === 1) return "-rotate-6 -translate-x-8 sm:-translate-x-10 z-20";
  if (index === 2) return "rotate-0 translate-x-0 z-30";
  if (index === 3) return "rotate-6 translate-x-8 sm:translate-x-10 z-20";
  return "rotate-12 translate-x-16 sm:translate-x-20 z-10";
}

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
    .filter(Boolean) as Product[];

  const price = Number(bundle?.price ?? 0);
  const compare = Number(bundle?.compare_price ?? 0);
  const save = compare > price ? compare - price : 0;

  const productImages = items
    .map((p) => p.image_url)
    .filter((url): url is string => Boolean(url && url.trim().length > 0));

  const displayImages = (
    productImages.length > 0
      ? productImages
      : bundle?.image_url
        ? [bundle.image_url]
        : []
  ).slice(0, 5);

  const addAll = () => {
    if (!bundle) return;
    const lines = bundleLines(bundle, items);
    const ok = cart.addBundle(
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
    if (ok) {
      toast.success(label(copy.added, lang));
    }
  };

  const isRtl = lang === "ar" || lang === "ku";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8 p-3.5 sm:p-6 lg:p-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/bundles"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <BackIcon className="size-4" />
          {label(copy.backToBundles, lang)}
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : !bundle ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
            <Package className="mx-auto size-12 text-muted-foreground/60 stroke-[1.5]" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">
              {label(copy.missing, lang)}
            </p>
          </div>
        ) : (
          <>
            {/* 1. Redesigned Hero Section (CSS Grid) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
              {/* Column A (Text & Actions) */}
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-700">
                    <Sparkles className="size-3.5 text-amber-600" />
                    {label(copy.specialBadge, lang)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">
                    {items.length} {label(copy.pieces, lang)}
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                    {pick(bundle.title_ar, bundle.title_ku, lang)}
                  </h1>
                  {(bundle.subtitle_ar || bundle.subtitle_ku) && (
                    <p className="mt-2 text-sm sm:text-base font-medium text-slate-500 leading-relaxed">
                      {pick(bundle.subtitle_ar, bundle.subtitle_ku, lang)}
                    </p>
                  )}
                </div>

                {/* Price & Savings */}
                <div className="flex flex-wrap items-baseline gap-3 pt-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {label(copy.kit, lang)}
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {formatPrice(price, lang)}
                    </span>
                  </div>

                  {compare > price && (
                    <span className="text-base sm:text-lg font-bold tabular-nums text-slate-400 line-through">
                      {formatPrice(compare, lang)}
                    </span>
                  )}

                  {save > 0 && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs sm:text-sm font-extrabold text-emerald-700 border border-emerald-200/60">
                      {label(copy.save, lang)} {formatPrice(save, lang)}
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="h-12 w-full sm:w-auto px-8 gap-2.5 text-sm sm:text-base font-extrabold shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
                    onClick={addAll}
                  >
                    <ShoppingCart className="size-5" strokeWidth={2.4} />
                    {label(copy.addAll, lang)}
                  </Button>
                </div>
              </div>

              {/* Column B (Visuals: Fanned Cards / Polaroids UI) */}
              <div className="relative flex h-64 sm:h-72 md:h-80 w-full items-center justify-center rounded-2xl bg-amber-50/50 p-4 overflow-hidden border border-amber-100/60">
                {displayImages.length > 0 ? (
                  <div className="relative flex justify-center items-end h-48 sm:h-56 md:h-60 w-full">
                    {displayImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`w-24 h-32 sm:w-28 sm:h-38 md:w-32 md:h-44 bg-white rounded-xl shadow-md border border-gray-200/90 p-1.5 flex items-center justify-center shrink-0 origin-bottom transition-all duration-300 -mx-4 sm:-mx-5 md:-mx-6 ${getFanCardClass(idx, displayImages.length)}`}
                      >
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-contain pointer-events-none"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-100/70 text-amber-600 shadow-inner">
                    <Package className="size-11 stroke-[1.8]" />
                  </div>
                )}
              </div>
            </section>

            {/* 2. Redesigned Package Contents List (2-Column Grid) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary" />
                  <h2 className="text-lg sm:text-xl font-black text-slate-800">
                    {label(copy.items, lang)} ({items.length})
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((p) => (
                  <Link
                    key={p.id}
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="group flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="grid size-18 sm:size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-2 group-hover:scale-105 transition-transform">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={pickName(p, lang)}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">🦷</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {p.brand && (
                        <span className="text-[11px] font-extrabold text-slate-400 truncate block">
                          {p.brand}
                        </span>
                      )}
                      <h3 className="line-clamp-2 text-[13px] sm:text-[14px] font-bold leading-snug text-slate-800 group-hover:text-primary transition-colors">
                        {pickName(p, lang)}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                          <Check className="size-3 text-emerald-600" strokeWidth={3} />
                          {label(copy.included, lang)}
                        </span>
                        <span className="text-[13px] font-black text-slate-700">
                          {formatPrice(Number(p.price), lang)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
