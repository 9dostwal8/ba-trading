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
  Sparkles,
  Truck,
  Wallet,
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

  const activeCategory = data?.categories?.find((c) => c.id === cat);

  return (
    <StoreLayout>
      <PageBlocks page="products" />

      {/* Streamlined Store Banner & Category Quick Bar */}
      <div className="bg-white border-b border-slate-100 px-3.5 py-3 shadow-xs">
        
        {/* Title & Product Count */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h1 className="text-[14.5px] sm:text-[16px] font-black text-slate-900">
              {activeCategory ? (lang === "ar" ? activeCategory.name_ar : activeCategory.name_ku) : (lang === "ar" ? "فرۆشگای پێداویستی ددان" : lang === "ku" ? "فرۆشگای پێداویستی ددان" : "Dental Store")}
            </h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">
              {products.length}
            </span>
          </div>

          {/* In-Stock Toggle Switch */}
          <button
            type="button"
            onClick={() => setOnlyInStock(!onlyInStock)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition-all border shadow-xs active:scale-95",
              onlyInStock
                ? "bg-[#007979] text-white border-[#007979]"
                : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
            )}
          >
            <span className={cn("size-2 rounded-full", onlyInStock ? "bg-white" : "bg-emerald-500")} />
            <span>{lang === "ar" ? "المتوفر فقط" : lang === "ku" ? "تەنها بەردەست" : "In Stock"}</span>
          </button>
        </div>

        {/* Single Swipeable Category Rail */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => navigate({ search: {} })}
            className={cn(
              "shrink-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11.5px] font-black transition-all shadow-xs active:scale-95",
              !cat
                ? "bg-[#007979] text-white shadow-teal-700/20"
                : "bg-slate-100/80 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
            )}
          >
            <Layers className="size-3.5" />
            <span>{lang === "ar" ? "كل الأقسام" : lang === "ku" ? "هەموو بەشەکان" : "All Categories"}</span>
          </button>

          {(data?.categories ?? []).map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate({ search: active ? {} : { cat: c.id } })}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-1.5 text-[11.5px] font-extrabold transition-all shadow-xs active:scale-95",
                  active
                    ? "bg-[#007979] text-white shadow-teal-700/20"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80"
                )}
              >
                {lang === "ar" ? c.name_ar : c.name_ku}
              </button>
            );
          })}
        </div>

      </div>

      {/* Modern Filter & Sort Toolbar */}
      <div className="bg-slate-50/90 border-b border-slate-200/60 px-3 py-2">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {sortChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSort(c.key)}
              className={cn(
                "shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all active:scale-95",
                sort === c.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-100"
              )}
            >
              <c.icon className="size-3" strokeWidth={2.5} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Brand Filter Chips if available */}
        {availableBrands.length > 0 && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pt-1.5 border-t border-slate-200/50 mt-1.5">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              {lang === "ar" ? "الماركة:" : lang === "ku" ? "براند:" : "Brand:"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedBrand(null)}
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-black transition-colors",
                !selectedBrand ? "bg-[#007979]/15 text-[#007979]" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {lang === "ar" ? "الكل" : lang === "ku" ? "هەموو" : "All"}
            </button>
            {availableBrands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrand(selectedBrand === b ? null : b)}
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-black transition-colors",
                  selectedBrand === b ? "bg-[#007979] text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200/60 hover:bg-slate-100"
                )}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

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

