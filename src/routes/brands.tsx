import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Search,
  ShieldCheck,
  Building2,
  ChevronLeft,
  X,
  Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { brandLogo, type BrandCard } from "@/lib/brands";
import { useI18n } from "@/lib/i18n";
import { fetchStoreData, type Product } from "@/lib/store";

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "الماركات المعتمدة | GC, 3M, Tokuyama وأكثر" },
      {
        name: "description",
        content: "دليل ماركات ومصنعي طب الأسنان الأصلية المعتمدة في دنتال ستور: 3M، GC، Tokuyama وغيرها.",
      },
      { property: "og:title", content: "الماركات المعتمدة | دنتال ستور" },
      { property: "og:description", content: "دليل أشهر الماركات العالمية المتوفرة في المتجر." },
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
    ar: "دليل شامل لأشهر ماركات ومصنعي طب الأسنان الأصلية المتوفرة في المتجر",
    ku: "پێڕستی هەموو براند و کۆمپانیا جیهانییە باوەڕپێکراوەکانی پزیشکی ددان لە دنتال ستۆر",
    en: "Complete directory of trusted, original dental manufacturers and brands",
  },
  searchPlaceholder: {
    ar: "ابحث عن اسم الماركة...",
    ku: "گەڕان بۆ ناوی براند...",
    en: "Search brand name...",
  },
  productsCount: {
    ar: "منتج",
    ku: "بەرهەم",
    en: "products",
  },
  empty: {
    ar: "لم يتم العثور على ماركة مطابقة لبحثك",
    ku: "هیچ براندێک بەم ناوە نەدۆزرایەوە",
    en: "No brands found matching your search",
  },
  clearSearch: {
    ar: "عرض كل الماركات",
    ku: "پیشاندانی هەموو براندەکان",
    en: "Show all brands",
  },
  guaranteeBadge: {
    ar: "أصلي ومضمون 100%",
    ku: "١٠٠٪ ئەسڵی و باوەڕپێکراو",
    en: "100% Genuine Certified",
  },
  totalBrandsBadge: {
    ar: "ماركة مسجلة",
    ku: "براندی تۆمارکراو",
    en: "Registered Brands",
  },
};

interface BrandItem {
  id: string;
  name: string;
  mark: string;
  matchKey: string;
  card?: BrandCard;
  count: number;
}

function BrandsPage() {
  const { lang } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
  });

  const allProducts = data?.products ?? [];
  const brandCards = (data?.brandCards ?? []).filter((b) => b.is_active !== false);

  // Discover and aggregate all unique brands from products + brandCards
  const brandsList = useMemo(() => {
    const brandMap = new Map<string, { card?: BrandCard; count: number; name: string; mark: string }>();

    // 1. Seed with configured brand cards
    brandCards.forEach((b) => {
      const key = b.name.trim().toLowerCase();
      brandMap.set(key, {
        card: b,
        count: 0,
        name: b.name.trim(),
        mark: b.mark || b.name.slice(0, 3).toUpperCase(),
      });
    });

    // 2. Aggregate from products
    allProducts.forEach((p) => {
      const raw = (p.brand || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();

      if (!brandMap.has(key)) {
        brandMap.set(key, {
          card: undefined,
          count: 1,
          name: raw,
          mark: raw.slice(0, 3).toUpperCase(),
        });
      } else {
        brandMap.get(key)!.count += 1;
      }
    });

    const result: BrandItem[] = [];
    brandMap.forEach((val, key) => {
      result.push({
        id: val.card?.id || key,
        name: val.name,
        mark: val.mark,
        matchKey: key,
        card: val.card,
        count: val.count,
      });
    });

    // Sort by product count (most popular brands first), then alphabetically
    return result.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [brandCards, allProducts]);

  // Filter by search
  const filteredBrands = useMemo(() => {
    if (!searchTerm.trim()) return brandsList;
    const q = searchTerm.toLowerCase().trim();
    return brandsList.filter(
      (b) => b.name.toLowerCase().includes(q) || b.mark.toLowerCase().includes(q)
    );
  }, [brandsList, searchTerm]);

  return (
    <StoreLayout>
      <PageBlocks page="brands" />

      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-teal-50/60 via-white to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 px-4 pt-6 pb-6 sm:pb-8">
        <div className="mx-auto max-w-6xl space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title & Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007979]/10 border border-[#007979]/20 px-3 py-1 text-xs font-black text-[#007979]">
                  <Award className="size-3.5" />
                  <span>{L.guaranteeBadge[lang]}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <Building2 className="size-3.5 text-slate-500" />
                  <span>{brandsList.length} {L.totalBrandsBadge[lang]}</span>
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {L.h1[lang]}
              </h1>

              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                {L.sub[lang]}
              </p>
            </div>

            {/* Brand Search Bar */}
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

        </div>
      </div>

      {/* 2. BRANDS GRID (LOGOS & NAMES ONLY) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-5 rounded-3xl border border-slate-200 bg-white animate-pulse space-y-3 h-36"
              >
                <Skeleton className="size-14 rounded-2xl" />
                <Skeleton className="h-4 w-20" />
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
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#007979] text-white px-5 py-2.5 text-xs font-black shadow-sm transition active:scale-95"
            >
              <span>{L.clearSearch[lang]}</span>
            </button>
          </div>
        )}

        {/* Grid of Brand Tiles (Logo + Name + Count) */}
        {!isLoading && filteredBrands.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredBrands.map((b) => {
              const logo = b.card ? brandLogo(b.card, 200) : null;

              return (
                <Link
                  key={b.id}
                  to="/products"
                  search={{ q: b.name }}
                  className="group relative flex flex-col items-center justify-center text-center p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-[#007979] hover:shadow-lg hover:shadow-teal-700/10 hover:-translate-y-1 transition-all duration-200 active:scale-95"
                >
                  
                  {/* Brand Logo or Initials Icon */}
                  <div className="flex size-16 sm:size-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-2.5 group-hover:scale-105 transition-transform duration-200">
                    {logo ? (
                      <img
                        src={logo}
                        alt={b.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="font-display text-lg sm:text-xl font-black text-[#007979]">
                        {b.mark}
                      </span>
                    )}
                  </div>

                  {/* Brand Name */}
                  <h3 className="mt-3 line-clamp-1 font-display text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-[#007979] transition-colors">
                    {b.name}
                  </h3>

                  {/* Products Count Badge */}
                  {b.count > 0 ? (
                    <span className="mt-1 inline-block text-[11px] font-bold text-slate-400 group-hover:text-teal-600 transition-colors">
                      {b.count} {L.productsCount[lang]}
                    </span>
                  ) : (
                    <span className="mt-1 inline-block text-[10px] font-bold text-slate-300 dark:text-slate-600">
                      —
                    </span>
                  )}

                  {/* Subtle chevron indicator on hover */}
                  <div className="absolute top-2.5 end-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="grid size-5 place-items-center rounded-full bg-teal-50 text-[#007979]">
                      <ChevronLeft className="size-3 rtl:rotate-0 ltr:rotate-180" />
                    </span>
                  </div>

                </Link>
              );
            })}
          </div>
        )}

      </div>

      <PageBlocks page="brands" position="bottom" />
    </StoreLayout>
  );
}
