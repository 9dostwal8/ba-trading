import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Package, ShoppingCart, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { formatPrice, pick, useI18n, label } from "@/lib/i18n";
import { bundleLines, fetchStoreData, type Product } from "@/lib/store";

const copy = {
  kit: { ar: "سعر الحزمة", ku: "نرخی پاکێج", en: "Package Price" },
  save: { ar: "توفير", ku: "پاشەکەوت", en: "Save" },
  addAll: { ar: "أضف كل المحتويات للسلة", ku: "هەمووی بخە ناو سەبەتە", en: "Add all to cart" },
  added: { ar: "تمت الإضافة للسلة", ku: "زیادکرا بۆ سەبەتە", en: "Added to cart" },
  missing: { ar: "الحزمة غير متوفرة", ku: "پاکێج بەردەست نییە", en: "Package unavailable" },
  pieces: { ar: "قطع", ku: "دانە", en: "items" },
  specialBadge: { ar: "باقة عيادات خاصة", ku: "پاکێجی تایبەتی کلینیک", en: "Special Clinic Bundle" },
  backToBundles: { ar: "العودة للحزم", ku: "گەڕانەوە بۆ پاکێجەکان", en: "Back to bundles" },
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

  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const bundle = data?.bundles.find((b) => b.id === id);
  const items = (bundle?.product_ids ?? [])
    .map((pid) => data?.products.find((p) => p.id === pid))
    .filter(Boolean) as Product[];

  const price = Number(bundle?.price ?? 0);
  const compare = Number(bundle?.compare_price ?? 0);
  const save = compare > price ? compare - price : 0;

  // Extract all product image URLs from items, plus bundle cover image if unique
  const itemImages = items
    .map((p) => p.image_url)
    .filter((url): url is string => Boolean(url && url.trim().length > 0));

  const allImages = Array.from(
    new Set([
      ...(bundle?.image_url ? [bundle.image_url] : []),
      ...itemImages,
    ]),
  );

  const totalImages = allImages.length;

  const prevImage = () => {
    if (totalImages <= 1) return;
    setCurrentImgIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const nextImage = () => {
    if (totalImages <= 1) return;
    setCurrentImgIndex((prev) => (prev + 1) % totalImages);
  };

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
      <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6 p-3.5 sm:p-6 lg:p-8">
        {/* Navigation Breadcrumb */}
        <Link
          to="/bundles"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          <BackIcon className="size-4" />
          {label(copy.backToBundles, lang)}
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
            <Skeleton className="h-80 w-full rounded-xl" />
            <div className="space-y-4 py-2">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-10 w-4/5 rounded-xl" />
              <Skeleton className="h-5 w-2/3 rounded-lg" />
              <Skeleton className="h-12 w-48 rounded-xl" />
              <Skeleton className="h-12 w-full sm:w-44 rounded-xl" />
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
          /* Single Hero Card */
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
            {/* Column 1: Image Carousel (Left Column) */}
            <div className="w-full h-80 bg-white rounded-xl flex items-center justify-center relative overflow-hidden border border-gray-100 shadow-inner group">
              {totalImages > 0 ? (
                <>
                  <img
                    src={allImages[currentImgIndex]}
                    alt={`${pick(bundle.title_ar, bundle.title_ku, lang)} - ${currentImgIndex + 1}`}
                    className="h-full w-full object-contain p-2 select-none transition-all duration-300"
                    loading="eager"
                  />

                  {/* Navigation Arrows */}
                  {totalImages > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous image"
                        onClick={(e) => {
                          e.preventDefault();
                          prevImage();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 border border-gray-100"
                      >
                        <ChevronLeft className="size-5" />
                      </button>

                      <button
                        type="button"
                        aria-label="Next image"
                        onClick={(e) => {
                          e.preventDefault();
                          nextImage();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex size-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition-all hover:bg-slate-50 hover:scale-105 active:scale-95 border border-gray-100"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  )}

                  {/* Indicator Dots */}
                  {totalImages > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 backdrop-blur-sm">
                      {allImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`Slide ${idx + 1}`}
                          onClick={() => setCurrentImgIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentImgIndex
                              ? "w-5 bg-white shadow-sm"
                              : "w-2 bg-white/60 hover:bg-white/80"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Counter Badge */}
                  {totalImages > 1 && (
                    <div className="absolute top-3 left-3 z-20 rounded-md bg-slate-900/60 px-2 py-0.5 text-[10.5px] font-bold text-white backdrop-blur-sm tabular-nums">
                      {currentImgIndex + 1} / {totalImages}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                  <Package className="size-11 stroke-[1.8]" />
                </div>
              )}
            </div>

            {/* Column 2: Text & Actions */}
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
          </section>
        )}
      </div>
    </StoreLayout>
  );
}
