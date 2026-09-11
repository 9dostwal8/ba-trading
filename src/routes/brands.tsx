import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  ChevronLeft,
  Search,
  Sparkles,
  ShieldCheck,
  Package,
  Layers,
  CheckCircle2,
  ExternalLink,
  Store,
  X,
  ArrowRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { brandLogo, type BrandCard } from "@/lib/brands";
import { pickName, useI18n } from "@/lib/i18n";
import { effectivePrice, fetchStoreData, type Product } from "@/lib/store";

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "الماركات المعتمدة | GC, 3M, Tokuyama وأكثر" },
      {
        name: "description",
        content: "تصفح ماركات طب الأسنان الأصلية المعتمدة: GC، 3M، Tokuyama وغيرها بأسعار وعروض خاصة.",
      },
      { property: "og:title", content: "الماركات المعتمدة | أوفردنت" },
      { property: "og:description", content: "منتجات أصلية من أشهر ماركات طب الأسنان العالمية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandsPage,
});

const L = {
  h1: {
    ar: "الماركات المعتمدة",
    ku: "براندە باوەڕپێکراوەکان",
    en: "Approved Brands",
  },
  sub: {
    ar: "منتجات أصلية ومضمونة 100% من أشهر الشركات العالمية لطب الأسنان",
    ku: "بەرهەمی ئەسڵی و ١٠٠٪ گەرەنتیکراو لە ناودارترین کۆمپانیا جیهانییەکانی پزیشکی ددان",
    en: "100% original dental products from world-leading dental manufacturers",
  },
  allBrands: {
    ar: "جميع الماركات",
    ku: "هەموو براندەکان",
    en: "All Brands",
  },
  searchPlaceholder: {
    ar: "ابحث عن ماركة أو منتج...",
    ku: "گەڕان بۆ براند یان بەرهەم...",
    en: "Search brand or product...",
  },
  allProductsByBrand: {
    ar: "عرض كل منتجات الماركة",
    ku: "بینینی هەموو بەرهەمەکانی ئەم براندە",
    en: "View all products by this brand",
  },
  productsCount: {
    ar: "منتج متوفر",
    ku: "بەرهەمی بەردەست",
    en: "products available",
  },
  empty: {
    ar: "لا توجد منتجات أو ماركات مطابقة لبحثك",
    ku: "هیچ براند یان بەرهەمێک نەدۆزرایەوە",
    en: "No brands or products found matching your search",
  },
  guaranteeBadge: {
    ar: "أصلي ومضمون 100%",
    ku: "١٠٠٪ ئەسڵی و دڵنیاکراو",
    en: "100% Genuine & Certified",
  },
  directSupplyBadge: {
    ar: "تجهيز مباشر للعيادات",
    ku: "دابینکردنی ڕاستەوخۆ بۆ کلینیک",
    en: "Direct Clinic Supply",
  },
};

interface MergedBrand {
  id: string;
  name: string;
  mark: string;
  matchKey: string;
  card?: BrandCard;
  products: Product[];
}

function BrandsPage() {
  const { lang, t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrandKey, setSelectedBrandKey] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
  });

  const allProducts = data?.products ?? [];
  const brandCards = (data?.brandCards ?? []).filter((b) => b.is_active !== false);

  // Price calculator
  const priceOf = (p: Product) => {
    return effectivePrice(
      p,
      data?.offers ?? [],
      data?.offerProducts ?? [],
      1,
      data?.flashDeals ?? [],
      data?.clearanceRules ?? []
    );
  };

  // Merge brand_cards with all unique brands found across products
  const mergedBrands = useMemo(() => {
    const brandMap = new Map<string, { card?: BrandCard; products: Product[]; displayName: string; mark: string }>();

    // 1. Seed with configured brand cards
    brandCards.forEach((b) => {
      const key = b.name.trim().toLowerCase();
      brandMap.set(key, {
        card: b,
        products: [],
        displayName: b.name.trim(),
        mark: b.mark || b.name.slice(0, 3).toUpperCase(),
      });
    });

    // 2. Discover from products
    allProducts.forEach((p) => {
      const raw = (p.brand || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();

      if (!brandMap.has(key)) {
        brandMap.set(key, {
          card: undefined,
          products: [p],
          displayName: raw,
          mark: raw.slice(0, 3).toUpperCase(),
        });
      } else {
        brandMap.get(key)!.products.push(p);
      }
    });

    // If card had explicit picked product_ids, honor them
    brandCards.forEach((b) => {
      const key = b.name.trim().toLowerCase();
      const entry = brandMap.get(key);
      if (entry && b.product_ids && b.product_ids.length > 0) {
        const picked = allProducts.filter((p) => b.product_ids.includes(p.id));
        if (picked.length > 0) {
          entry.products = picked;
        }
      }
    });

    const result: MergedBrand[] = [];
    brandMap.forEach((val, key) => {
      if (val.products.length > 0 || val.card) {
        result.push({
          id: val.card?.id || key,
          name: val.displayName,
          mark: val.mark,
          matchKey: key,
          card: val.card,
          products: val.products,
        });
      }
    });

    // Sort: Configured cards first, then by product count
    return result.sort((a, b) => {
      if (a.card && !b.card) return -1;
      if (!a.card && b.card) return 1;
      return b.products.length - a.products.length;
    });
  }, [brandCards, allProducts]);

  // Filtered brands based on search and selected brand chip
  const filteredBrands = useMemo(() => {
    let list = mergedBrands;

    // Filter by selected chip
    if (selectedBrandKey !== "all") {
      list = list.filter((b) => b.matchKey === selectedBrandKey);
    }

    // Filter by search keyword
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list
        .map((b) => {
          const brandMatches = b.name.toLowerCase().includes(q) || b.mark.toLowerCase().includes(q);
          const matchingProducts = b.products.filter(
            (p) =>
              (p.name_ar || "").toLowerCase().includes(q) ||
              (p.name_ku || "").toLowerCase().includes(q)
          );
          if (brandMatches) {
            return b;
          }
          if (matchingProducts.length > 0) {
            return { ...b, products: matchingProducts };
          }
          return null;
        })
        .filter(Boolean) as MergedBrand[];
    }

    return list;
  }, [mergedBrands, selectedBrandKey, searchTerm]);

  return (
    <StoreLayout>
      <PageBlocks page="brands" />

      {/* 1. HERO HEADER SECTION */}
      <div className="relative overflow-hidden border-b border-teal-500/10 bg-gradient-to-b from-teal-50/60 via-white to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 px-4 pt-6 pb-6 sm:pb-8">
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007979]/10 border border-[#007979]/20 px-3 py-1 text-xs font-black text-[#007979]">
                  <Award className="size-3.5" />
                  <span>{L.guaranteeBadge[lang]}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="size-3.5" />
                  <span>{L.directSupplyBadge[lang]}</span>
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {L.h1[lang]}
              </h1>

              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                {L.sub[lang]}
              </p>
            </div>

            {/* Quick Search Box */}
            <div className="w-full md:w-80 lg:w-96 shrink-0">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={L.searchPlaceholder[lang]}
                  className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 ps-10 pe-9 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs focus:border-[#007979] focus:outline-none focus:ring-2 focus:ring-[#007979]/20 transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* 2. INTERACTIVE BRAND CHIPS RAIL */}
          {mergedBrands.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                
                {/* 'All Brands' Pill */}
                <button
                  type="button"
                  onClick={() => setSelectedBrandKey("all")}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-black transition-all active:scale-95 shrink-0 ${
                    selectedBrandKey === "all"
                      ? "bg-[#007979] text-white shadow-md shadow-teal-700/20 scale-105"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="size-3.5" />
                  <span>{L.allBrands[lang]}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                    {mergedBrands.length}
                  </span>
                </button>

                {/* Individual Brand Chips */}
                {mergedBrands.map((b) => {
                  const logo = b.card ? brandLogo(b.card, 100) : null;
                  const isSelected = selectedBrandKey === b.matchKey;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBrandKey(isSelected ? "all" : b.matchKey)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition-all active:scale-95 shrink-0 ${
                        isSelected
                          ? "bg-[#007979] text-white shadow-md shadow-teal-700/20 scale-105"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800 hover:border-teal-500/40 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                        {logo ? (
                          <img src={logo} alt="" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <span className="text-[9px] font-black">{b.mark.slice(0, 2)}</span>
                        )}
                      </div>
                      <span>{b.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {b.products.length}
                      </span>
                    </button>
                  );
                })}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* 3. MAIN CONTENT: BRANDS & PRODUCTS CATALOG */}
      <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3.5 sm:px-6 py-5 sm:py-8 space-y-8">
        
        {/* Banner Slot */}
        <BannerSlot slot="offers_page" />

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-2xl" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="aspect-square rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredBrands.length === 0 && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-4 shadow-sm">
            <Award className="mx-auto size-14 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
              {L.empty[lang]}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {lang === "ku"
                ? "هیچ بەرهەمێک بەم ناونیشانە نەدۆزرایەوە. هەوڵبدە پیتەکان کەمتر بکەیتەوە یان هەموو براندەکان هەڵبژێرە."
                : "يرجى التحقق من صحة البحث أو اختيار ماركة أخرى من القائمة بالأعلى."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedBrandKey("all");
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#007979] text-white px-5 py-2.5 text-xs font-black shadow-sm transition active:scale-95"
            >
              <span>{L.allBrands[lang]}</span>
            </button>
          </div>
        )}

        {/* Brands Section List */}
        {!isLoading &&
          filteredBrands.map((brand) => {
            const logo = brand.card ? brandLogo(brand.card, 180) : null;
            const displayProducts = brand.products.slice(0, 10);

            return (
              <section
                key={brand.id}
                className="overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition hover:shadow-md"
              >
                
                {/* Brand Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 px-5 py-4">
                  
                  {/* Brand Brand & Mark */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xs font-display font-black text-[#007979]">
                      {logo ? (
                        <img
                          src={logo}
                          alt={brand.name}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-base">{brand.mark}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-lg font-black text-slate-900 dark:text-white">
                          {brand.name}
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-black text-[#007979]">
                          {brand.products.length} {L.productsCount[lang]}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {lang === "ku" ? "بەرهەمی ئەسڵی و باوەڕپێکراو" : "منتجات أصلية معتمدة"}
                      </p>
                    </div>
                  </div>

                  {/* View All Products of this Brand link */}
                  <Link
                    to="/products"
                    search={{ q: brand.name }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/60 dark:border-teal-800/60 px-3.5 py-2 text-xs font-black text-[#007979] dark:text-teal-300 transition active:scale-95 shrink-0 self-start sm:self-auto"
                  >
                    <span>{L.allProductsByBrand[lang]}</span>
                    <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                </div>

                {/* Products Grid for this Brand */}
                {displayProducts.length > 0 ? (
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                      {displayProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          price={priceOf(product)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs font-semibold text-slate-400">
                    {lang === "ku" ? "هیچ بەرهەمێک لەم بەشەدا نییە" : "لا توجد منتجات حالياً"}
                  </div>
                )}

              </section>
            );
          })}

      </div>

      <PageBlocks page="brands" position="bottom" />
    </StoreLayout>
  );
}
