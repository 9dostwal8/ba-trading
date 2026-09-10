import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Search,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  PackageSearch,
  Trash2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/lib/cart";
import { formatPrice, useI18n } from "@/lib/i18n";
import { effectivePrice, fetchStoreData, type Product } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/profile_/favorites")({
  head: () => ({
    meta: [
      { title: "بەرهەمە دڵخوازەکان | المفضلة" },
      {
        name: "description",
        content: "لیستی ئەو بەرهەمە دڵخوازانەی پاشەکەوتت کردوون بۆ کڕینی ئاسان.",
      },
      { property: "og:title", content: "بەرهەمە دڵخوازەکان | دڵخوازەکان" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: FavoritesPage,
});

const L = {
  title: {
    ar: "قائمة المفضلة",
    ku: "بەرهەمە دڵخوازەکان",
    en: "Favorite Products",
  },
  sub: {
    ar: "المنتجات التي قمت بحفظها لسهولة الوصول إليها والشراء لاحقاً",
    ku: "ئەو بەرهەمانەی پاشەکەوتت کردوون بۆ ئەوەی بە ئاسانی بیانکڕیت",
    en: "Products you saved for quick access and later purchase",
  },
  emptyTitle: {
    ar: "قائمة المفضلة فارغة حالياً",
    ku: "لیستی دڵخوازەکانت بەتاڵە",
    en: "Your favorites list is empty",
  },
  emptyHint: {
    ar: "اضغط على أيقونة القلب ❤️ على أي منتج أثناء التصفح لإضافته إلى قائمتك هنا.",
    ku: "لە کاتی گەڕاندا لەسەر ئایکۆنی دڵ ❤️ لە هەر بەرهەمێک بدە بۆ ئەوەی لێرە پاشەکەوت بکرێت.",
    en: "Click the heart ❤️ icon on any product while browsing to save it here.",
  },
  browseBtn: {
    ar: "تصفح جميع المنتجات",
    ku: "گەڕان لە هەموو بەرهەمەکان",
    en: "Browse All Products",
  },
  searchPlaceholder: {
    ar: "بحث في المفضلة...",
    ku: "گەڕان لە دڵخوازەکان...",
    en: "Search favorites...",
  },
  addAllToCart: {
    ar: "إضافة الكل إلى السلة",
    ku: "زیادکردنی هەموو بۆ سەبەتە",
    en: "Add All to Cart",
  },
  addedAllSuccess: {
    ar: "تمت إضافة جميع المنتجات المتوفرة إلى السلة بنجاح!",
    ku: "هەموو بەرهەمە بەردەستەکان بە سەرکەوتوویی زیادکران بۆ سەبەتە!",
    en: "All available products added to cart!",
  },
  itemCount: {
    ar: "منتج محفوظ",
    ku: "بەرهەمی پاشەکەوتکراو",
    en: "saved items",
  },
  inStock: {
    ar: "متوفر للشراء",
    ku: "بەردەستە بۆ کڕین",
    en: "In stock",
  },
};

function FavoritesPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { favoriteIds, isLoading: favsLoading } = useFavorites();
  const cart = useCart();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: storeData, isLoading: storeLoading } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
  });

  const allProducts = storeData?.products ?? [];

  // Filter products by favoriteIds
  const favoriteProducts = useMemo(() => {
    if (!favoriteIds || favoriteIds.length === 0) return [];
    return allProducts.filter((p) => favoriteIds.includes(p.id));
  }, [allProducts, favoriteIds]);

  // Search filter
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return favoriteProducts;
    const q = searchTerm.toLowerCase().trim();
    return favoriteProducts.filter((p) => {
      const nameAr = (p.name_ar || "").toLowerCase();
      const nameKu = (p.name_ku || "").toLowerCase();
      const descAr = (p.description_ar || "").toLowerCase();
      return nameAr.includes(q) || nameKu.includes(q) || descAr.includes(q);
    });
  }, [favoriteProducts, searchTerm]);

  const inStockCount = useMemo(() => {
    return favoriteProducts.filter((p) => p.stock > 0).length;
  }, [favoriteProducts]);

  const handleAddAllToCart = () => {
    const available = favoriteProducts.filter((p) => p.stock > 0);
    if (available.length === 0) {
      toast.info(
        lang === "ku"
          ? "هیچ بەرهەمێکی بەردەست لە کۆگا نییە بۆ زیادکردن"
          : "لا توجد منتجات متوفرة في المخزون حالياً للإضافة"
      );
      return;
    }

    available.forEach((p) => {
      cart.add({
        id: p.id,
        name_ar: p.name_ar,
        name_ku: p.name_ku,
        price: effectivePrice(p),
        image_url: p.image_url,
        vendor_id: p.vendor_id ?? null,
      });
    });

    toast.success(L.addedAllSuccess[lang]);
  };

  const isLoading = favsLoading || storeLoading;

  return (
    <StoreLayout>
      <div className="min-h-[75vh] bg-slate-50/60 dark:bg-slate-950/60 pb-16">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                aria-label="Back to Profile"
                className="grid size-10 place-items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 active:scale-95"
              >
                <ArrowRight className="size-5 rtl:rotate-0 ltr:rotate-180" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {L.title[lang]}
                  </h1>
                  <span className="flex size-6 items-center justify-center rounded-full bg-rose-500/15 text-xs font-black text-rose-600 dark:text-rose-400">
                    {favoriteProducts.length}
                  </span>
                </div>
                <p className="hidden xs:block text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {L.sub[lang]}
                </p>
              </div>
            </div>

            {favoriteProducts.length > 0 && inStockCount > 0 && (
              <button
                type="button"
                onClick={handleAddAllToCart}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 sm:px-4 py-2 text-xs font-black text-primary-foreground shadow-sm shadow-primary/20 transition hover:opacity-95 active:scale-95 shrink-0"
              >
                <ShoppingBag className="size-4" />
                <span className="hidden sm:inline">{L.addAllToCart[lang]}</span>
                <span className="sm:hidden">{lang === "ku" ? "کڕینی هەموو" : "شراء الكل"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="mx-auto max-w-5xl px-3.5 sm:px-6 py-5 sm:py-7 space-y-5">
          
          {/* Top Search & Filter Bar (Only if there are favorite items) */}
          {favoriteProducts.length > 2 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={L.searchPlaceholder[lang]}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ps-10 pe-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {inStockCount} {L.inStock[lang]}
                </span>
              </div>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                >
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Products Grid */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  price={effectivePrice(product)}
                />
              ))}
            </div>
          )}

          {/* Search with no match in favorites */}
          {!isLoading && favoriteProducts.length > 0 && filteredProducts.length === 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3 shadow-xs">
              <PackageSearch className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {lang === "ku"
                  ? "هیچ بەرهەمێک بەم ناوەوە نەدۆزرایەوە لە دڵخوازەکانتدا"
                  : "لم يتم العثور على نتائج مطابقة لبحثك في المفضلة"}
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-xs font-black text-rose-500 hover:underline"
              >
                {lang === "ku" ? "پاککردنەوەی گەڕان" : "مسح البحث"}
              </button>
            </div>
          )}

          {/* Empty State: When user has zero favorites */}
          {!isLoading && favoriteProducts.length === 0 && (
            <div className="relative overflow-hidden rounded-3xl border border-rose-100 dark:border-rose-950/40 bg-gradient-to-b from-white via-rose-50/20 to-white dark:from-slate-900 dark:via-rose-950/10 dark:to-slate-900 p-8 sm:p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500 shadow-inner">
                <Heart className="size-10 fill-rose-500/30 text-rose-500 animate-pulse" />
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {L.emptyTitle[lang]}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                {L.emptyHint[lang]}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white px-5 py-3 text-xs sm:text-sm font-black shadow-lg shadow-teal-700/20 transition active:scale-95"
                >
                  <Sparkles className="size-4" />
                  <span>{L.browseBtn[lang]}</span>
                </Link>
                <Link
                  to="/deals"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-3 text-xs sm:text-sm font-black transition hover:bg-slate-50 active:scale-95"
                >
                  <span>{lang === "ku" ? "داشکاندن و ئۆفەرەکان" : "العروض والتخفيضات"}</span>
                </Link>
              </div>
            </div>
          )}

        </div>

      </div>
    </StoreLayout>
  );
}
