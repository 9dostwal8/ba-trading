import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Award,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Package,
  PackageCheck,
  PackageX,
  Search,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brandLogo, type BrandCard } from "@/lib/brands";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { fetchVendors } from "@/lib/vendor-public";
import type { Product } from "@/lib/store";
import type { Vendor } from "@/lib/vendors";

type FilterTab = "all" | "featured" | "in_stock" | "out_of_stock";
type SortOption = "most_products" | "name_asc" | "highest_stock" | "highest_price";

interface BrandAggregation {
  id?: string;
  name: string;
  mark: string;
  matchKey: string;
  card?: BrandCard;
  isFeatured: boolean;
  totalProducts: number;
  inStockCount: number;
  outOfStockCount: number;
  minPrice: number;
  maxPrice: number;
  vendors: string[];
  products: Product[];
}

export function AdminBrands() {
  const { lang, t } = useI18n();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("most_products");
  const [selectedBrandForModal, setSelectedBrandForModal] = useState<BrandAggregation | null>(null);
  const [modalProductSearch, setModalProductSearch] = useState("");

  // 1. Fetch all configured Brand Cards from Supabase
  const { data: brandCards = [], isLoading: brandCardsLoading } = useQuery({
    queryKey: ["admin-brand-cards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_cards")
        .select("*")
        .order("sort_order", { ascending: true });
      return (data ?? []) as unknown as BrandCard[];
    },
  });

  // 2. Fetch all products to automatically detect all existing brands in the catalog
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin-brand-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, name_ku, brand, image_url, price, stock, vendor_id, category_id")
        .order("name_ar", { ascending: true });
      return (data ?? []) as unknown as Product[];
    },
  });

  // 3. Fetch Vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
  });

  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v: Vendor) => {
      map.set(v.id, v.store_name || v.name);
    });
    return map;
  }, [vendors]);

  // 4. Toggle Feature / Showcase mutation
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ brandName, currentCard }: { brandName: string; currentCard?: BrandCard }) => {
      if (currentCard) {
        // Toggle active status
        const nextActive = !currentCard.is_active;
        const { error } = await supabase
          .from("brand_cards")
          .update({ is_active: nextActive })
          .eq("id", currentCard.id);
        if (error) throw error;
        return { name: brandName, is_active: nextActive };
      } else {
        // Create a new brand card for this detected brand
        const mark = brandName.trim().slice(0, 3).toUpperCase();
        const { error } = await supabase.from("brand_cards").insert({
          name: brandName.trim(),
          mark: mark,
          match_key: brandName.trim().toLowerCase(),
          is_active: true,
          sort_order: brandCards.length + 1,
          hue: 200,
          chroma: 0.15,
          product_ids: [],
        });
        if (error) throw error;
        return { name: brandName, is_active: true };
      }
    },
    onSuccess: (res) => {
      toast.success(
        res.is_active
          ? lang === "ku"
            ? `براندی "${res.name}" خرایە ناو پێڕستی فرۆشگا`
            : `تم تفعيل ماركة "${res.name}" في المتجر`
          : lang === "ku"
          ? `براندی "${res.name}" لە پێڕستی فرۆشگا لادرا`
          : `تم إخفاء ماركة "${res.name}" من المتجر`
      );
      qc.invalidateQueries({ queryKey: ["admin-brand-cards"] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || t("error"));
    },
  });

  // 5. Aggregate all unique brands from products + brandCards
  const brandList = useMemo(() => {
    const brandMap = new Map<string, { products: Product[]; card?: BrandCard }>();

    // Index from brandCards first
    brandCards.forEach((b) => {
      const normKey = b.name.trim().toLowerCase();
      if (!brandMap.has(normKey)) {
        brandMap.set(normKey, { products: [], card: b });
      } else {
        brandMap.get(normKey)!.card = b;
      }
    });

    // Populate from products catalog
    products.forEach((p) => {
      const rawBrand = (p.brand || "").trim();
      if (!rawBrand) return;
      const normKey = rawBrand.toLowerCase();

      if (!brandMap.has(normKey)) {
        brandMap.set(normKey, { products: [p], card: undefined });
      } else {
        brandMap.get(normKey)!.products.push(p);
      }
    });

    const aggregated: BrandAggregation[] = [];

    brandMap.forEach((entry, key) => {
      const brandProducts = entry.products;
      const card = entry.card;
      const brandName = card?.name || (brandProducts[0]?.brand ? brandProducts[0].brand.trim() : key);
      const mark = card?.mark || brandName.slice(0, 3).toUpperCase();
      const isFeatured = card ? card.is_active !== false : false;

      let inStockCount = 0;
      let outOfStockCount = 0;
      let minPrice = Infinity;
      let maxPrice = 0;
      const vendorNames = new Set<string>();

      brandProducts.forEach((p) => {
        if (p.stock > 0) inStockCount++;
        else outOfStockCount++;

        if (p.price > 0) {
          if (p.price < minPrice) minPrice = p.price;
          if (p.price > maxPrice) maxPrice = p.price;
        }

        if (p.vendor_id && vendorMap.has(p.vendor_id)) {
          vendorNames.add(vendorMap.get(p.vendor_id)!);
        }
      });

      if (minPrice === Infinity) minPrice = 0;

      aggregated.push({
        id: card?.id,
        name: brandName,
        mark,
        matchKey: card?.match_key || brandName.toLowerCase(),
        card,
        isFeatured,
        totalProducts: brandProducts.length,
        inStockCount,
        outOfStockCount,
        minPrice,
        maxPrice,
        vendors: Array.from(vendorNames),
        products: brandProducts,
      });
    });

    return aggregated;
  }, [brandCards, products, vendorMap]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalBrands = brandList.length;
    const featuredBrands = brandList.filter((b) => b.isFeatured).length;
    const brandedProducts = products.filter((p) => (p.brand || "").trim().length > 0).length;
    const totalProducts = products.length;
    const coveragePct = totalProducts > 0 ? Math.round((brandedProducts / totalProducts) * 100) : 0;
    const unbrandedProducts = totalProducts - brandedProducts;

    return {
      totalBrands,
      featuredBrands,
      brandedProducts,
      totalProducts,
      coveragePct,
      unbrandedProducts,
    };
  }, [brandList, products]);

  // Filtered and sorted brands
  const filteredBrands = useMemo(() => {
    let result = [...brandList];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.mark.toLowerCase().includes(q) ||
          b.vendors.some((v) => v.toLowerCase().includes(q))
      );
    }

    // Tab filter
    if (activeTab === "featured") {
      result = result.filter((b) => b.isFeatured);
    } else if (activeTab === "in_stock") {
      result = result.filter((b) => b.inStockCount > 0);
    } else if (activeTab === "out_of_stock") {
      result = result.filter((b) => b.totalProducts > 0 && b.inStockCount === 0);
    }

    // Sort
    if (sortBy === "most_products") {
      result.sort((a, b) => b.totalProducts - a.totalProducts);
    } else if (sortBy === "name_asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "highest_stock") {
      result.sort((a, b) => b.inStockCount - a.inStockCount);
    } else if (sortBy === "highest_price") {
      result.sort((a, b) => b.maxPrice - a.maxPrice);
    }

    return result;
  }, [brandList, searchQuery, activeTab, sortBy]);

  // Modal filtered products
  const modalProducts = useMemo(() => {
    if (!selectedBrandForModal) return [];
    if (!modalProductSearch.trim()) return selectedBrandForModal.products;
    const q = modalProductSearch.toLowerCase().trim();
    return selectedBrandForModal.products.filter(
      (p) =>
        (p.name_ar || "").toLowerCase().includes(q) ||
        (p.name_ku || "").toLowerCase().includes(q)
    );
  }, [selectedBrandForModal, modalProductSearch]);

  const isLoading = brandCardsLoading || productsLoading;

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-br from-white via-teal-50/30 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#007979]/10 px-3 py-1 text-xs font-black text-[#007979]">
              <Award className="size-4" />
              <span>{lang === "ku" ? "بەڕێوەبردنی سیستەم" : "إدارة النظام"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {lang === "ku"
                ? "پێڕستی براندەکانی سیستەم"
                : lang === "ar"
                ? "دليل وماركات النظام"
                : "System Brands Directory"}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {lang === "ku"
                ? "پیشاندانی هەموو ئەو براندانەی کە لەناو بەرهەمەکان و کۆگای دنتال ستۆردا تۆمارکراون لەگەڵ ئامار و بڕی بەردەست."
                : lang === "ar"
                ? "استعراض شامل وتلقائي لجميع الماركات والعلامات التجارية المتوفرة في كتالوج المنتجات ومخزونها."
                : "Automatic discovery and overview of all brands present in the product catalog with inventory health."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/brands"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-teal-700/20 transition active:scale-95"
            >
              <ExternalLink className="size-4" />
              <span>{lang === "ku" ? "بینینی پەڕەی براندەکان لە ماڵپەڕ" : "عرض صفحة الماركات بالمتجر"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Total Brands */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {lang === "ku" ? "کۆی براندەکان" : "إجمالي الماركات"}
            </span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-teal-500/10 text-[#007979]">
              <Building2 className="size-4.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalBrands}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {lang === "ku" ? "براندی دۆزراوە لە سیستەم" : "علامة تجارية مسجلة"}
          </p>
        </div>

        {/* Card 2: Featured Brands in Store */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {lang === "ku" ? "چالاک لە فرۆشگا" : "المعروضة بالمتجر"}
            </span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Eye className="size-4.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.featuredBrands}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {lang === "ku" ? "پێشاندراو لە پەڕەی براندەکان" : "ماركات مفعلة بالواجهة"}
          </p>
        </div>

        {/* Card 3: Total Branded Products */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {lang === "ku" ? "بەرهەمە براندکراوەکان" : "منتجات ذات ماركة"}
            </span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
              <Boxes className="size-4.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.brandedProducts}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {lang === "ku" ? `لە کۆی ${stats.totalProducts} بەرهەم` : `من أصل ${stats.totalProducts} منتج`}
          </p>
        </div>

        {/* Card 4: Catalog Coverage */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {lang === "ku" ? "ڕێژەی داپۆشین" : "نسبة التغطية"}
            </span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600">
              <TrendingUp className="size-4.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
            {stats.coveragePct}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">
            {lang === "ku" ? "بەرهەمەکان براندیان هەیە" : "من المنتجات مصنفة بماركة"}
          </p>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "ku"
                ? "گەڕان بەپێی ناوی براند، کورتکراوە یان فرۆشیار..."
                : "بحث عن ماركة، رمز أو المورّد..."
            }
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 ps-10 pe-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#007979] focus:outline-none focus:ring-2 focus:ring-[#007979]/20 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {lang === "ku" ? "هەموو" : "الكل"} ({brandList.length})
            </button>
            <button
              onClick={() => setActiveTab("featured")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "featured"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {lang === "ku" ? "چالاک لە فرۆشگا" : "المعروضة"} ({stats.featuredBrands})
            </button>
            <button
              onClick={() => setActiveTab("in_stock")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "in_stock"
                  ? "bg-white dark:bg-slate-900 text-[#007979] shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {lang === "ku" ? "بەردەست" : "متوفر"}
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#007979]/20"
          >
            <option value="most_products">{lang === "ku" ? "زۆرترین بەرهەم" : "الأكثر منتجات"}</option>
            <option value="name_asc">{lang === "ku" ? "ئەلفوبێ (A - Z)" : "أبجدياً (A - Z)"}</option>
            <option value="highest_stock">{lang === "ku" ? "زۆرترین بڕی کۆگا" : "الأعلى مخزوناً"}</option>
            <option value="highest_price">{lang === "ku" ? "بەرزترین نرخ" : "الأعلى سعراً"}</option>
          </select>
        </div>

      </div>

      {/* 4. Brands Grid / Directory */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <Award className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {lang === "ku" ? "هیچ براندێک نەدۆزرایەوە" : "لم يتم العثور على ماركات مطابقة"}
          </h3>
          <p className="text-xs text-slate-400">
            {lang === "ku"
              ? "دڵنیابە لە نووسینی ناوی براندەکە یان بەرهەمەکان لە بەشی بەرهەمەکان براندیان پێوە لکێنراوە."
              : "تأكد من صحة البحث أو أن المنتجات تحتوي على اسم الماركة في بياناتها."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => {
            const logo = brand.card ? brandLogo(brand.card, 160) : null;
            const isFeatured = brand.isFeatured;

            return (
              <div
                key={brand.name}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition-all hover:border-teal-500/40 hover:shadow-md"
              >
                
                {/* Top: Brand Identity & Toggle */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      
                      {/* Brand Logo or Stylized Mark */}
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 shadow-inner">
                        {logo ? (
                          <img
                            src={logo}
                            alt={brand.name}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="font-display text-base font-black text-[#007979]">
                            {brand.mark}
                          </span>
                        )}
                      </div>

                      {/* Brand Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate font-display text-base font-black text-slate-900 dark:text-white">
                            {brand.name}
                          </h3>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 truncate">
                          {brand.vendors.length > 0
                            ? `${brand.vendors.length} ${lang === "ku" ? "فرۆشیار" : "مورّد"}: ${brand.vendors.slice(0, 2).join(", ")}`
                            : lang === "ku"
                            ? "بەرهەمی سیستەم"
                            : "منتجات النظام"}
                        </p>
                      </div>
                    </div>

                    {/* Feature on Storefront Switch Button */}
                    <button
                      type="button"
                      disabled={toggleFeatureMutation.isPending}
                      onClick={() =>
                        toggleFeatureMutation.mutate({
                          brandName: brand.name,
                          currentCard: brand.card,
                        })
                      }
                      title={
                        isFeatured
                          ? lang === "ku"
                            ? "چالاکە لە فرۆشگا — کرتە بکە بۆ ناچالاککردن"
                            : "معروض بالمتجر — اضغط للتعطيل"
                          : lang === "ku"
                          ? "ناچالاکە — کرتە بکە بۆ پیشاندان لە فرۆشگا"
                          : "مخفي — اضغط للعرض بالمتجر"
                      }
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-black transition active:scale-95 shrink-0 ${
                        isFeatured
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isFeatured ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          <span>{lang === "ku" ? "لە فرۆشگا" : "معروض"}</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5" />
                          <span>{lang === "ku" ? "ناچالاک" : "مخفي"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Metric Pills */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-100 dark:border-slate-800">
                      <span className="block text-[10px] font-bold text-slate-400">
                        {lang === "ku" ? "کۆی بەرهەمەکان" : "إجمالي المواد"}
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {brand.totalProducts} {lang === "ku" ? "کاڵا" : "منتج"}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-100 dark:border-slate-800">
                      <span className="block text-[10px] font-bold text-slate-400">
                        {lang === "ku" ? "بڕی بەردەست" : "المتوفر بالمخزن"}
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {brand.inStockCount} {lang === "ku" ? "بەردەست" : "متوفر"}
                      </span>
                    </div>
                  </div>

                  {/* Product Mini Photo Rail */}
                  {brand.products.length > 0 && (
                    <div className="mt-3.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {brand.products.slice(0, 5).map((p) => (
                          <div
                            key={p.id}
                            title={pickName(p, lang)}
                            className="size-9 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 p-0.5"
                          >
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-slate-100 dark:bg-slate-700 text-[9px] font-black text-slate-400">
                                {brand.mark.slice(0, 2)}
                              </div>
                            )}
                          </div>
                        ))}
                        {brand.products.length > 5 && (
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500">
                            +{brand.products.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrandForModal(brand);
                      setModalProductSearch("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#007979] hover:underline"
                  >
                    <Package className="size-3.5" />
                    <span>{lang === "ku" ? "بینینی بەرهەمەکان" : "عرض قائمة المنتجات"}</span>
                    <span className="text-[10px] bg-teal-500/10 px-1.5 py-0.5 rounded-full">
                      {brand.totalProducts}
                    </span>
                  </button>

                  <Link
                    to="/products"
                    search={{ q: brand.name }}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <span>{lang === "ku" ? "لە فرۆشگا" : "بالواجهة"}</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. Brand Products Explorer Modal */}
      <Dialog
        open={!!selectedBrandForModal}
        onOpenChange={(open) => {
          if (!open) setSelectedBrandForModal(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl">
          {selectedBrandForModal && (
            <>
              {/* Modal Header */}
              <DialogHeader className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-3 pe-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs font-display font-black text-[#007979]">
                      {selectedBrandForModal.mark}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                        {lang === "ku" ? `بەرهەمەکانی براندی ${selectedBrandForModal.name}` : `منتجات ماركة ${selectedBrandForModal.name}`}
                      </DialogTitle>
                      <p className="text-xs font-semibold text-slate-400">
                        {selectedBrandForModal.totalProducts} {lang === "ku" ? "بەرهەم تۆمارکراوە" : "منتجات مسجلة"} · {selectedBrandForModal.inStockCount} {lang === "ku" ? "بەردەست لە کۆگا" : "متوفر بالمخزن"}
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/products"
                    search={{ q: selectedBrandForModal.name }}
                    target="_blank"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-bold transition"
                  >
                    <span>{lang === "ku" ? "کردنەوە لە فرۆشگا" : "فتح بالمتجر"}</span>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>

                {/* Modal Search Bar */}
                <div className="mt-3 relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={modalProductSearch}
                    onChange={(e) => setModalProductSearch(e.target.value)}
                    placeholder={lang === "ku" ? "گەڕان لەناو بەرهەمەکانی ئەم براندە..." : "بحث داخل منتجات هذه الماركة..."}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 ps-9 pe-3 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007979]/20"
                  />
                </div>
              </DialogHeader>

              {/* Modal Products List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                {modalProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">
                    {lang === "ku" ? "هیچ بەرهەمێک نەدۆزرایەوە" : "لا توجد نتائج مطابقة"}
                  </div>
                ) : (
                  modalProducts.map((p) => {
                    const isAvailable = p.stock > 0;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 pt-2 first:pt-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-12 shrink-0 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 p-0.5">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt=""
                                className="h-full w-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-slate-100 text-[10px] text-slate-400 font-bold">
                                {selectedBrandForModal.mark}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <Link
                              to="/product/$id"
                              params={{ id: p.id }}
                              target="_blank"
                              className="line-clamp-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-[#007979] hover:underline"
                            >
                              {pickName(p, lang)}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <span className="font-black text-[#007979]">
                                {formatPrice(p.price, lang)}
                              </span>
                              {p.vendor_id && vendorMap.has(p.vendor_id) && (
                                <span className="text-slate-400">
                                  · {vendorMap.get(p.vendor_id)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isAvailable
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            }`}
                          >
                            {isAvailable
                              ? lang === "ku"
                                ? `${p.stock} دانە`
                                : `${p.stock} بالمخزن`
                              : lang === "ku"
                              ? "نەماوە"
                              : "نفذ"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400">
                  {modalProducts.length} {lang === "ku" ? "بەرهەم پیشاندراوە" : "منتجات معروضة"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBrandForModal(null)}
                >
                  {lang === "ku" ? "داخستن" : "إغلاق"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
