import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { brandLogo, type BrandCard } from "@/lib/brands";
import { useI18n } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";

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
  empty: {
    ar: "لا توجد ماركات حالياً",
    ku: "هیچ براندێک نییە لە ئێستادا",
    en: "No brands available",
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

  return (
    <StoreLayout>
      <PageBlocks page="brands" />

      {/* 1. HERO HEADER: ONLY THE TITLE CENTERED */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 sm:py-9 px-4 text-center shadow-2xs">
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          {L.h1[lang]}
        </h1>
      </div>

      {/* 2. BRANDS GRID (BIGGER LOGOS & NAMES ONLY) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-200 bg-white animate-pulse space-y-4 h-48"
              >
                <Skeleton className="size-24 rounded-2xl" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && brandsList.length === 0 && (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm font-bold text-slate-400">
            {L.empty[lang]}
          </div>
        )}

        {/* Grid of Brand Tiles (Bigger Logo + Name Only) */}
        {!isLoading && brandsList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {brandsList.map((b) => {
              const logo = b.card ? brandLogo(b.card, 240) : null;

              return (
                <Link
                  key={b.id}
                  to="/products"
                  search={{ q: b.name }}
                  className="group relative flex flex-col items-center justify-center text-center p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-[#007979] hover:shadow-xl hover:shadow-teal-700/10 hover:-translate-y-1.5 transition-all duration-200 active:scale-95 min-h-[170px] sm:min-h-[190px]"
                >
                  
                  {/* Brand Logo or Initials Icon (Larger) */}
                  <div className="flex size-20 sm:size-24 md:size-28 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-3 group-hover:scale-105 transition-transform duration-200">
                    {logo ? (
                      <img
                        src={logo}
                        alt={b.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="font-display text-2xl sm:text-3xl font-black text-[#007979]">
                        {b.mark}
                      </span>
                    )}
                  </div>

                  {/* Brand Name (Prominent & Clean) */}
                  <h3 className="mt-3.5 line-clamp-1 font-display text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-[#007979] transition-colors">
                    {b.name}
                  </h3>

                  {/* Subtle chevron indicator on hover */}
                  <div className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="grid size-6 place-items-center rounded-full bg-teal-50 dark:bg-teal-950 text-[#007979]">
                      <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
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
