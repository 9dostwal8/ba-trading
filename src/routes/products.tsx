import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Flame,
  Hourglass,
  PackageOpen,
  Layers,
  Percent,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { gridClass } from "@/lib/design";
import { useDesign } from "@/lib/design-store";
import { ProductCard } from "@/components/ProductCard";
import { CategoryChipRow } from "@/components/CategoryChips";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { dedupeByCatalog } from "@/lib/catalog";
import { monthsLeft } from "@/lib/clearance";
import { effectivePrice, fetchStoreData, type Product } from "@/lib/store";
import { cn } from "@/lib/utils";


type ProductsSearch = {
  cat?: string | undefined;
  q?: string | undefined;
  clearance?: string | undefined;
};

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => ({
    cat: typeof search["cat"] === "string" ? search["cat"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    clearance: typeof search["clearance"] === "string" ? search["clearance"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "المنتجات | دنتال ستور" },
      {
        name: "description",
        content: "تصفح كل أدوات ومواد وأجهزة طب الأسنان مع أسعار محدثة وخصومات فعّالة.",
      },
      { property: "og:title", content: "المنتجات | دنتال ستور" },
      { property: "og:description", content: "كل مستلزمات عيادة الأسنان في مكان واحد." },
    ],
  }),
  component: ProductsPage,
});

type SortKey = "all" | "expiring" | "outlet" | "deals" | "cheapest" | "saving";

function ProductsPage() {
  const { cat, q, clearance } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t, lang } = useI18n();
  const design = useDesign();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const [term, setTerm] = useState(q ?? "");
  const [sort, setSort] = useState<SortKey>(
    clearance === "outlet" ? "outlet" : clearance === "near_expiry" ? "expiring" : "all",
  );

  const [onlyInStock, setOnlyInStock] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const rows = data?.products ?? [];

  // Extract unique available brands
  const availableBrands = Array.from(
    new Set(rows.map((p) => p.brand).filter((b): b is string => Boolean(b))),
  ).slice(0, 10);

  const priceOf = (p: Product) =>
    effectivePrice(
      p,
      data?.offers ?? [],
      data?.offerProducts ?? [],
      1,
      data?.flashDeals ?? [],
      data?.clearanceRules ?? [],
    );
  const filtered = rows.filter((p) => {
    if (cat && p.category_id !== cat) return false;
    if (selectedBrand && p.brand !== selectedBrand) return false;
    if (onlyInStock && p.stock <= 0) return false;
    if (!term.trim()) return true;
    const s = term.trim().toLowerCase();
    return [p.name_ar, p.name_ku, p.brand, p.sku].some((v) => v?.toLowerCase().includes(s));
  });

  const savingOf = (p: Product) => {
    const price = priceOf(p);
    const ref = Math.max(Number(p.compare_price ?? 0), p.price);
    return ref > price ? (ref - price) / ref : 0;
  };

  const scoped =
    sort === "deals"
      ? filtered.filter((p) => savingOf(p) > 0.001)
      : sort === "expiring"
        ? filtered.filter((p) => p.clearance_kind === "near_expiry" && p.expiry_date)
        : sort === "outlet"
          ? filtered.filter((p) => p.clearance_kind === "outlet")
          : [...filtered];

  const grouped = dedupeByCatalog(scoped, priceOf);
  const offersOf = new Map(grouped.map((g) => [g.product.id, g.offers]));
  const products = grouped.map((g) => g.product).sort((a, b) => {
    if (sort === "cheapest") return priceOf(a) - priceOf(b);
    if (sort === "saving") return savingOf(b) - savingOf(a);
    if (sort === "expiring")
      return (monthsLeft(a.expiry_date) ?? 99) - (monthsLeft(b.expiry_date) ?? 99);
    return 0;
  });

  const dealCount = filtered.filter((p) => savingOf(p) > 0.001).length;

  const sortChips: { key: SortKey; label: string; icon: typeof Percent }[] = [
    { key: "all", label: lang === "ar" ? "الكل" : lang === "ku" ? "هەموو" : "All", icon: Layers },
    { key: "deals", label: lang === "ar" ? "عروض وخصومات" : lang === "ku" ? "داشکاندنەکان" : "Deals", icon: Percent },
    { key: "cheapest", label: lang === "ar" ? "الأقل سعراً" : lang === "ku" ? "هەرزانترین" : "Lowest Price", icon: Wallet },
    { key: "saving", label: lang === "ar" ? "الأكثر توفيراً" : lang === "ku" ? "پاشەکەوت" : "Top Savings", icon: Flame },
    { key: "expiring", label: lang === "ar" ? "قريب الانتهاء" : lang === "ku" ? "بەمزوانە بەسەردەچێت" : "Near Expiry", icon: Hourglass },
    { key: "outlet", label: lang === "ar" ? "أوتلت مخفض" : lang === "ku" ? "ئۆتڵێت" : "Outlet", icon: PackageOpen },
  ];

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const activeCategory = data?.categories?.find((c) => c.id === cat);
  const hasActiveFilters = Boolean(cat || selectedBrand || onlyInStock || sort !== "all");

  const clearAllFilters = () => {
    navigate({ search: {} });
    setSelectedBrand(null);
    setOnlyInStock(false);
    setSort("all");
  };

  return (
    <StoreLayout>
      <PageBlocks page="products" />

      {/* Ultra-Clean Single 1-Line Header & Filter Control Bar */}
      <div className="bg-white border-b border-slate-100 px-3.5 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          
          {/* Left: Category Title & Count */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[14.5px] sm:text-[16px] font-black text-slate-900 truncate">
              {activeCategory
                ? (lang === "ar" ? activeCategory.name_ar : activeCategory.name_ku)
                : (lang === "ar" ? "فرۆشگای پێداویستی ددان" : lang === "ku" ? "فرۆشگای پێداویستی ددان" : "Dental Store")}
            </h1>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">
              {products.length}
            </span>
          </div>

          {/* Right: Filter & Sort Button */}
          <div className="flex items-center gap-2">
            {/* Quick In-Stock Switch */}
            <button
              type="button"
              onClick={() => setOnlyInStock(!onlyInStock)}
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-black transition-all border shadow-xs active:scale-95",
                onlyInStock
                  ? "bg-[#007979] text-white border-[#007979]"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
              )}
            >
              <span className={cn("size-2 rounded-full", onlyInStock ? "bg-white" : "bg-emerald-500")} />
              <span>{lang === "ar" ? "المتوفر فقط" : lang === "ku" ? "تەنها بەردەست" : "In Stock"}</span>
            </button>

            {/* Filter Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-black transition-all shadow-xs active:scale-95 border",
                hasActiveFilters
                  ? "bg-[#007979] text-white border-[#007979] shadow-teal-700/20"
                  : "bg-slate-100/90 text-slate-800 border-slate-200/70 hover:bg-slate-200"
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>{lang === "ar" ? "فلتەر و ڕیزبەندی" : lang === "ku" ? "فلتەر و ڕیزبەندی" : "Filter & Sort"}</span>
              {hasActiveFilters && (
                <span className="flex size-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

        </div>

        {/* Active Filter Chips Summary (Shows ONLY if a filter is active) */}
        {hasActiveFilters && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pt-2.5 mt-2 border-t border-slate-100">
            {cat && activeCategory && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200/80 px-2 py-0.5 text-[11px] font-bold text-[#007979]">
                <span>{lang === "ar" ? activeCategory.name_ar : activeCategory.name_ku}</span>
                <button type="button" onClick={() => navigate({ search: {} })} className="hover:opacity-75">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {selectedBrand && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200/80 px-2 py-0.5 text-[11px] font-bold text-[#007979]">
                <span>{selectedBrand}</span>
                <button type="button" onClick={() => setSelectedBrand(null)} className="hover:opacity-75">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {onlyInStock && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200/80 px-2 py-0.5 text-[11px] font-bold text-[#007979]">
                <span>{lang === "ar" ? "متوفر" : lang === "ku" ? "بەردەست" : "In Stock"}</span>
                <button type="button" onClick={() => setOnlyInStock(false)} className="hover:opacity-75">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {sort !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                <span>{sortChips.find((s) => s.key === sort)?.label}</span>
                <button type="button" onClick={() => setSort("all")} className="hover:opacity-75">
                  <X className="size-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] font-extrabold text-rose-600 hover:underline ms-auto shrink-0 px-1"
            >
              {lang === "ar" ? "مسح الكل" : lang === "ku" ? "سڕینەوەی هەمووی" : "Clear All"}
            </button>
          </div>
        )}
      </div>

      {/* Slide-Up Filter & Sort Bottom Sheet / Modal */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-[#007979]" />
                <h3 className="text-[16px] font-black text-slate-900">
                  {lang === "ar" ? "فلتەر و ڕیزبەندی" : lang === "ku" ? "فلتەر و ڕیزبەندی" : "Filter & Sort"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <h4 className="text-[12.5px] font-black text-slate-500">
                {lang === "ar" ? "ترتيب حسب" : lang === "ku" ? "ڕیزبەندی بەپێی" : "Sort By"}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {sortChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSort(c.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl p-2.5 text-[12px] font-extrabold transition-all border text-start",
                      sort === c.key
                        ? "bg-[#007979] text-white border-[#007979] shadow-sm"
                        : "bg-slate-50/80 text-slate-700 border-slate-200/60 hover:bg-slate-100"
                    )}
                  >
                    <c.icon className="size-4 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories Selector */}
            <div className="space-y-2">
              <h4 className="text-[12.5px] font-black text-slate-500">
                {lang === "ar" ? "الأقسام" : lang === "ku" ? "بەشەکان" : "Categories"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate({ search: {} })}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-[11.5px] font-extrabold border transition-all",
                    !cat
                      ? "bg-[#007979] text-white border-[#007979]"
                      : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                  )}
                >
                  {lang === "ar" ? "كل الأقسام" : lang === "ku" ? "هەموو بەشەکان" : "All"}
                </button>
                {(data?.categories ?? []).map((c) => {
                  const active = cat === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate({ search: active ? {} : { cat: c.id } })}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-[11.5px] font-extrabold border transition-all",
                        active
                          ? "bg-[#007979] text-white border-[#007979]"
                          : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                      )}
                    >
                      {lang === "ar" ? c.name_ar : c.name_ku}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brands Selector */}
            {availableBrands.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[12.5px] font-black text-slate-500">
                  {lang === "ar" ? "الماركات" : lang === "ku" ? "براندەکان" : "Brands"}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBrand(null)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-[11.5px] font-extrabold border transition-all",
                      !selectedBrand
                        ? "bg-[#007979] text-white border-[#007979]"
                        : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                    )}
                  >
                    {lang === "ar" ? "كل الماركات" : lang === "ku" ? "هەموو براندەکان" : "All"}
                  </button>
                  {availableBrands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBrand(selectedBrand === b ? null : b)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-[11.5px] font-extrabold border transition-all",
                        selectedBrand === b
                          ? "bg-[#007979] text-white border-[#007979]"
                          : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* In-Stock Switch in Modal */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
              <span className="text-[13px] font-extrabold text-slate-800">
                {lang === "ar" ? "إظهار المنتجات المتوفرة فقط" : lang === "ku" ? "تەنها بەرهەمە بەردەستەکان" : "Show In-Stock Only"}
              </span>
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="size-5 rounded text-[#007979] focus:ring-[#007979]"
              />
            </div>

            {/* Apply & Close Button */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-1/3 h-11 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-bold text-slate-600 hover:bg-slate-100"
              >
                {lang === "ar" ? "إعادة تعيين" : lang === "ku" ? "سڕینەوە" : "Reset"}
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 h-11 rounded-xl bg-[#007979] text-[13.5px] font-black text-white shadow-md active:scale-95"
              >
                {lang === "ar" ? `عرض (${products.length}) منتج` : lang === "ku" ? `پیشاندانی (${products.length}) بەرهەم` : `Show (${products.length}) Products`}
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="px-3 pt-2.5">
        <BannerSlot slot="products_top" />
      </div>

      <div
        className={`${gridClass(design)} items-stretch px-3 py-2.5 pb-24 lg:pb-8`}
        style={{ gap: "var(--grid-gap)" }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))
          : products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                offers={offersOf.get(p.id) ?? 1}
                price={effectivePrice(
                  p,
                  data?.offers ?? [],
                  data?.offerProducts ?? [],
                  1,
                  data?.flashDeals ?? [],
                  data?.clearanceRules ?? [],
                )}
              />
            ))}
      </div>
      {!isLoading && products.length === 0 && (
        <div className="dk-block mx-3 my-6 p-8 text-center">
          <p className="text-sm font-bold text-muted-foreground">{t("noResults")}</p>
        </div>
      )}

      <PageBlocks page="products" position="bottom" />
    </StoreLayout>
  );
}

