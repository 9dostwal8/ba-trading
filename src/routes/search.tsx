import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Layers,
  QrCode,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { ProductCard } from "@/components/ProductCard";
import { effectivePrice, fetchStoreData, type Product } from "@/lib/store";
import { dedupeByCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SearchParams = {
  q?: string | undefined;
  cat?: string | undefined;
  brand?: string | undefined;
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    cat: typeof search["cat"] === "string" ? search["cat"] : undefined,
    brand: typeof search["brand"] === "string" ? search["brand"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "گەڕان لە بەرهەمەکان | دنتال ستور" },
      { name: "description", content: "گەڕان لە تەواوی پێداویستی و کەرەستەکانی پزیشکی ددان" },
    ],
  }),
  component: SearchPage,
});

const POPULAR_SEARCHES = [
  { ku: "دەستکێش نایتریل", ar: "قفازات نيتريل", en: "Nitrile Gloves" },
  { ku: "کۆمپۆزیت 3M", ar: "كومبوزيت 3M", en: "3M Composite" },
  { ku: "فایلەکانی ڕۆتەری", ar: "فايلات روتاري", en: "Rotary Files" },
  { ku: "بۆند", ar: "بوندينغ", en: "Bonding Agent" },
  { ku: "سیمێنت", ar: "اسمنت اسنان", en: "Dental Cement" },
  { ku: "بێهۆشکەر", ar: "تخدير موضعي", en: "Anesthesia" },
  { ku: "ئۆتۆکلەیڤ", ar: "اوتوكلاف", en: "Autoclave" },
];

function SearchPage() {
  const { q: initialQ, cat, brand } = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQ ?? "");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(brand ?? null);
  const [selectedCat, setSelectedCat] = useState<string | null>(cat ?? null);

  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Update query if URL param changes
  useEffect(() => {
    if (initialQ !== undefined) setQuery(initialQ);
  }, [initialQ]);

  const priceOf = (p: Product) =>
    effectivePrice(
      p,
      data?.offers ?? [],
      data?.offerProducts ?? [],
      1,
      data?.flashDeals ?? [],
      data?.clearanceRules ?? [],
    );

  const rows = data?.products ?? [];
  const categories = data?.categories ?? [];

  // Filter products by query, category, and brand
  const filteredProducts = rows.filter((p) => {
    if (selectedCat && p.category_id !== selectedCat) return false;
    if (selectedBrand && p.brand?.toLowerCase() !== selectedBrand.toLowerCase()) return false;

    if (!query.trim()) return true;
    const term = query.trim().toLowerCase();
    return (
      p.name_ar?.toLowerCase().includes(term) ||
      p.name_ku?.toLowerCase().includes(term) ||
      p.brand?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.description_ar?.toLowerCase().includes(term) ||
      p.description_ku?.toLowerCase().includes(term)
    );
  });

  // Matching Categories
  const matchedCategories = query.trim()
    ? categories.filter(
        (c) =>
          c.name_ar?.toLowerCase().includes(query.toLowerCase()) ||
          c.name_ku?.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  // Matching Brands
  const allBrands = Array.from(
    new Set(rows.map((p) => p.brand).filter((b): b is string => Boolean(b))),
  );
  const matchedBrands = query.trim()
    ? allBrands.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : allBrands.slice(0, 8);

  const grouped = dedupeByCatalog(filteredProducts, priceOf);
  const offersOf = new Map(grouped.map((g) => [g.product.id, g.offers]));
  const products = grouped.map((g) => g.product);

  const handleClear = () => {
    setQuery("");
    setSelectedBrand(null);
    setSelectedCat(null);
    inputRef.current?.focus();
  };

  return (
    <StoreLayout>
      <div className="min-h-[85vh] bg-slate-50/60 pb-28">
        
        {/* Sticky Search Header */}
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur-md shadow-xs">
          <div className="mx-auto max-w-4xl flex items-center gap-2">
            
            {/* Back Button */}
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition"
              aria-label="Back"
            >
              {lang === "ar" || lang === "ku" ? (
                <ArrowRight className="size-5" />
              ) : (
                <ArrowLeft className="size-5" />
              )}
            </button>

            {/* Live Search Input Box */}
            <div className="relative flex-1">
              <Search className="absolute top-1/2 start-3.5 size-4.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === "ar"
                    ? "ابحث عن أي منتج، ماركة، أو كود..."
                    : lang === "ku"
                    ? "گەڕان لە هەموو بەرهەم، براند، یان کۆد..."
                    : "Search any dental product, brand, or SKU..."
                }
                className="h-11 w-full rounded-2xl border border-slate-200/90 bg-slate-100/70 ps-10 pe-10 text-[13.5px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#007979] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007979]/20 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-1/2 end-3 -translate-y-1/2 flex size-6 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Quick QR Scanner Link */}
            <Link
              to="/scan"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary active:scale-95 transition shadow-xs"
              title="QR Scan"
            >
              <QrCode className="size-4.5" />
            </Link>

          </div>

          {/* Active Filter Chips Bar */}
          {(selectedBrand || selectedCat) && (
            <div className="mx-auto max-w-4xl mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400">
                {lang === "ar" ? "فلتەرە چالاکەکان:" : lang === "ku" ? "فلتەرە چالاکەکان:" : "Active:"}
              </span>
              {selectedCat && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-[#007979]">
                  <span>{categories.find((c) => c.id === selectedCat)?.[lang === "ar" ? "name_ar" : "name_ku"]}</span>
                  <button type="button" onClick={() => setSelectedCat(null)} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-[#007979]">
                  <span>{selectedBrand}</span>
                  <button type="button" onClick={() => setSelectedBrand(null)} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand(null);
                  setSelectedCat(null);
                }}
                className="text-[11px] font-black text-rose-600 hover:underline ms-auto"
              >
                {lang === "ar" ? "مسح الفلاتر" : lang === "ku" ? "سڕینەوەی فلتەرەکان" : "Clear filters"}
              </button>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-4xl px-3 pt-4 space-y-5">
          
          {/* Zero State: Show Popular Searches & Featured Brands when query is empty */}
          {!query.trim() && (
            <div className="space-y-6">
              
              {/* Popular Searches */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <TrendingUp className="size-4 text-[#007979]" />
                  <h3 className="text-[13.5px] font-black">
                    {lang === "ar" ? "عمليات البحث الشائعة" : lang === "ku" ? "گەڕانە باوەکان" : "Trending Searches"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((item, idx) => {
                    const label = lang === "ar" ? item.ar : lang === "ku" ? item.ku : item.en;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQuery(label)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:border-[#007979] hover:bg-teal-50 hover:text-[#007979] active:scale-95 transition"
                      >
                        <Search className="size-3 text-slate-400" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brands Quick Browse */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Tag className="size-4 text-[#007979]" />
                  <h3 className="text-[13.5px] font-black">
                    {lang === "ar" ? "تصفح حسب الماركة" : lang === "ku" ? "گەڕان بەپێی براند" : "Browse by Brand"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allBrands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(b);
                        setQuery(b);
                      }}
                      className="rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-[12px] font-black text-slate-800 hover:border-[#007979] hover:text-[#007979] active:scale-95 transition shadow-2xs"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Matching Categories & Brands when Query is typed */}
          {query.trim() && (matchedCategories.length > 0 || matchedBrands.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {matchedCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(selectedCat === c.id ? null : c.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11.5px] font-black transition active:scale-95",
                    selectedCat === c.id
                      ? "bg-[#007979] text-white border-[#007979] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50"
                  )}
                >
                  <Layers className="size-3.5" />
                  <span>{lang === "ar" ? c.name_ar : c.name_ku}</span>
                </button>
              ))}
              {matchedBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBrand(selectedBrand === b ? null : b)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11.5px] font-black transition active:scale-95",
                    selectedBrand === b
                      ? "bg-[#007979] text-white border-[#007979] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50"
                  )}
                >
                  <Tag className="size-3.5" />
                  <span>{b}</span>
                </button>
              ))}
            </div>
          )}

          {/* Results Summary Bar */}
          {query.trim() && (
            <div className="flex items-center justify-between px-1 text-[12px] font-bold text-slate-500">
              <span>
                {products.length > 0
                  ? lang === "ar"
                    ? `تم العثور على (${products.length}) منتج مطابقة`
                    : lang === "ku"
                    ? `(${products.length}) بەرهەمی هاوتا دۆزرایەوە`
                    : `Found (${products.length}) matching products`
                  : lang === "ar"
                  ? "لا توجد نتائج مطابقة"
                  : lang === "ku"
                  ? "هیچ بەرهەمێک نەدۆزرایەوە"
                  : "No products found"}
              </span>
            </div>
          )}

          {/* Product Results Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                offers={offersOf.get(p.id) ?? 1}
                price={priceOf(p)}
              />
            ))}
          </div>

          {/* Empty State */}
          {query.trim() && products.length === 0 && !isLoading && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xs space-y-3">
              <div className="text-5xl">🔍</div>
              <h3 className="text-[15px] font-black text-slate-800">
                {lang === "ar" ? "لم نتمكن من العثور على نتائج" : lang === "ku" ? "هیچ بەرهەمێک بەم ناوە نەدۆزرایەوە" : "No results found"}
              </h3>
              <p className="text-[12px] text-slate-500 max-w-sm mx-auto">
                {lang === "ar"
                  ? "تأكد من كتابة اسم المنتج بشكل صحيح أو جرب البحث باسم الماركة مثل 3M أو GC."
                  : lang === "ku"
                  ? "دڵنیابەوە لە ناوی بەرهەمەکە یان بەپێی ناوی براند وەک 3M یان GC بگەڕێ."
                  : "Check spelling or search for popular brands like 3M or GC."}
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#007979] px-5 text-[12.5px] font-black text-white shadow-sm hover:opacity-95 active:scale-95"
              >
                {lang === "ar" ? "تصفح كل المنتجات" : lang === "ku" ? "پیشاندانی هەموو بەرهەمەکان" : "Browse All"}
              </button>
            </div>
          )}

        </div>
      </div>
    </StoreLayout>
  );
}
