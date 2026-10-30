import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Hourglass, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { monthsLeft } from "@/lib/clearance";
import { useI18n, label } from "@/lib/i18n";
import { effectivePrice, fetchStoreData, type Product } from "@/lib/store";

const copy = {
  h1: { ar: "منتجات قاربت على الانتهاء", ku: "بەرهەمی نزیک لە بەسەرچوون", en: "Expiring Soon Products" },
  sub: {
    ar: "صالحة للاستخدام بالكامل ومضمونة — أسعار تصفية مخفضة. تسوّق قبل نفاد الكمية",
    ku: "بە تەواوی شیاوی بەکارهێنانە — بە نرخی ڕاماڵینی تایبەت. پەلە بکە پێش تەواوبوون",
    en: "100% genuine and fully usable dental supplies at steep clearance discounts",
  },
  count: { ar: "منتج بسعر التصفية", ku: "بەرهەم بە نرخی ڕاماڵین", en: "clearance items" },
  safe: {
    ar: "أصلية ومخزّنة بشكل سليم",
    ku: "ئەسڵین و بە دروستی هەڵگیراون",
    en: "100% Genuine & properly stored",
  },
  all: { ar: "كل المنتجات", ku: "هەموو بەرهەمەکان", en: "All Products" },
  soon: { ar: "٣ أشهر أو أقل", ku: "٣ مانگ یان کەمتر", en: "3 months or less" },
  mid: { ar: "٤ – ٦ أشهر", ku: "٤ – ٦ مانگ", en: "4 – 6 months" },
  later: { ar: "٧ أشهر وأكثر", ku: "٧ مانگ و زیاتر", en: "7+ months" },
  empty: { ar: "لا توجد منتجات تصفية حالياً", ku: "ئێستا هیچ بەرهەمی ڕاماڵین نییە", en: "No clearance products currently" },
  more: { ar: "تصفح كل المتجر", ku: "هەموو فرۆشگاکە ببینە", en: "Browse full catalog" },
};

export const Route = createFileRoute("/expiring")({
  head: () => ({
    meta: [
      { title: "منتجات قاربت على الانتهاء | أسعار تصفية — BA Trading" },
      {
        name: "description",
        content:
          "مستلزمات أسنان أصلية قاربت على انتهاء الصلاحية بأسعار تصفية مخفضة من BA Trading.",
      },
      { property: "og:title", content: "منتجات قاربت على الانتهاء | أسعار تصفية — BA Trading" },
      {
        property: "og:description",
        content: "خصومات تصفية خاصة على مستلزمات طب الأسنان قبل انتهاء الصلاحية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpiringPage,
});

function ExpiringPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const [activeFilter, setActiveFilter] = useState<"all" | "soon" | "mid" | "later">("all");

  const rules = data?.clearanceRules ?? [];
  const products = data?.products ?? [];

  const priceOf = (id: string, price: number, qty = 1) => {
    const product = products.find((p) => p.id === id);
    return effectivePrice(
      { ...(product ?? {}), id, price },
      data?.offers ?? [],
      data?.offerProducts ?? [],
      qty,
      data?.flashDeals ?? [],
      rules,
    );
  };

  const items = products
    .filter((p) => (p.clearance_kind === "near_expiry" || Boolean(p.expiry_date)) && p.expiry_date)
    .sort((a, b) => (monthsLeft(a.expiry_date) ?? 99) - (monthsLeft(b.expiry_date) ?? 99));

  const filteredItems = items.filter((p) => {
    if (activeFilter === "all") return true;
    const m = monthsLeft(p.expiry_date) ?? 99;
    if (activeFilter === "soon") return m <= 3;
    if (activeFilter === "mid") return m > 3 && m <= 6;
    if (activeFilter === "later") return m > 6;
    return true;
  });

  const soonCount = items.filter((p) => (monthsLeft(p.expiry_date) ?? 99) <= 3).length;
  const midCount = items.filter((p) => {
    const m = monthsLeft(p.expiry_date) ?? 99;
    return m > 3 && m <= 6;
  }).length;
  const laterCount = items.filter((p) => (monthsLeft(p.expiry_date) ?? 99) > 6).length;

  const isRtl = lang === "ar" || lang === "ku";
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <StoreLayout>
      <PageBlocks page="expiring" />

      <div className="mx-auto w-full max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        
        {/* 1. Cleaned-up Hero Section: Contained Red Clearance Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 p-5 sm:p-7 text-white shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="grid size-11 place-items-center rounded-2xl bg-white/20 backdrop-blur-md shadow-sm">
                  <Hourglass className="size-5.5 text-amber-200 animate-pulse" strokeWidth={2.4} />
                </span>
                <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-black text-amber-200">
                  {lang === "ar" ? "تصفية خاصة" : lang === "ku" ? "داشکاندنی تایبەت" : "Clearance Hub"}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
                {label(copy.h1, lang)}
              </h1>

              <p className="text-xs sm:text-sm font-medium text-rose-100 max-w-xl leading-relaxed">
                {label(copy.sub, lang)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1.5 text-xs font-extrabold tabular-nums text-white">
                {items.length} {label(copy.count, lang)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1.5 text-xs font-extrabold text-white">
                <ShieldCheck className="size-4 text-emerald-300" strokeWidth={2.8} />
                {label(copy.safe, lang)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. Contained Promotional Banners Directly Below Header */}
        <div className="overflow-hidden rounded-2xl">
          <BannerSlot slot="offers_page" />
        </div>

        {/* 3. Urgency Filter Tabs */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
                activeFilter === "all"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label(copy.all, lang)} ({items.length})
            </button>

            {soonCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter("soon")}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all ${
                  activeFilter === "soon"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <TriangleAlert className="size-3.5 text-rose-500" />
                {label(copy.soon, lang)} ({soonCount})
              </button>
            )}

            {midCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter("mid")}
                className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
                  activeFilter === "mid"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label(copy.mid, lang)} ({midCount})
              </button>
            )}

            {laterCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter("later")}
                className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
                  activeFilter === "later"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {label(copy.later, lang)} ({laterCount})
              </button>
            )}
          </div>
        )}

        {/* 4. Loading Skeleton Grid */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        )}

        {/* 5. Empty State */}
        {!isLoading && !items.length && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-xs">
            <Hourglass className="mx-auto size-12 text-slate-400 stroke-[1.5]" />
            <p className="mt-3 text-sm font-bold text-slate-600">
              {label(copy.empty, lang)}
            </p>
          </div>
        )}

        {/* 6. Standard Catalog Product Grid (Crucial Update) */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                price={priceOf(p.id, p.price)}
              />
            ))}
          </div>
        )}

        {/* 7. Bottom Navigation to Full Catalog */}
        <div className="pt-2">
          <Link
            to="/products"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs sm:text-sm font-extrabold text-slate-700 shadow-xs hover:border-primary/40 hover:text-primary transition-all active:scale-[0.99]"
          >
            <span>{label(copy.more, lang)}</span>
            <ArrowIcon className="size-4" />
          </Link>
        </div>

      </div>

      <PageBlocks page="expiring" position="bottom" />
    </StoreLayout>
  );
}
