import { Link } from "@tanstack/react-router";
import {
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Truck,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AdCard, type AdCardData } from "@/components/banners/AdCard";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice, pick, pickName, useI18n } from "@/lib/i18n";
import type { Bundle, Category, FlashDeal, HomeSection, Product } from "@/lib/store";
import { type BrandCard, brandLogo } from "@/lib/brands";
import { categoryIcon, tintStyle } from "@/lib/category-icons";

type Data = {
  products: Product[];
  categories: Category[];
  banners: AdCardData[];
  brandCards: BrandCard[];
  flashDeals: FlashDeal[];
  bundles: Bundle[];
  homeSections: HomeSection[];
};

export function DesktopHome({
  data,
  priceOf,
}: {
  data: Data;
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { lang } = useI18n();

  // High-Resolution 8K Hero Banners
  const highResBanners: AdCardData[] = [
    {
      id: "hero-hr-1",
      title_ar: "تجهيزات ومعدات طب الأسنان الحديثة",
      title_ku: "کەرەستە و ئامێری پێشکەوتووی ددان",
      image_url: "/banners/hero-banner-1.jpg",
      link: "/products",
    },
    {
      id: "hero-hr-2",
      title_ar: "أفضل ماركات ومستلزمات طب الأسنان العالمية",
      title_ku: "باشترین براند و کەرەستەی ددانسازی جیهانی",
      image_url: "/banners/hero-banner-2.jpg",
      link: "/brands",
    },
    ...data.banners.filter((b) => b.image_url && !b.image_url.includes("assets-v1")),
  ];
  const heroBanners = highResBanners.slice(0, 5);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play hero slider
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  const byId = (id?: string | null) => data.products.find((p) => p.id === id);

  const dealProducts = data.flashDeals
    .map((d) => ({ deal: d, product: byId(d.product_id) }))
    .filter((item): item is { deal: FlashDeal; product: Product } => !!item.product)
    .slice(0, 10);

  const featured = data.products.filter((p) => p.is_featured).slice(0, 10);
  const newest = data.products.slice(0, 10);
  const bundles = data.bundles.slice(0, 4);

  // Countdown for Flash Deals
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 20 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] space-y-10 px-4 py-6 lg:px-8">
      
      {/* 1. Full-Width Wide Hero Banner Slider */}
      <section className="w-full">
        <div className="relative overflow-hidden rounded-3xl bg-slate-100 shadow-sm w-full group aspect-[16/7] sm:aspect-[21/8] lg:aspect-auto lg:h-[380px] xl:h-[420px]">
          {heroBanners.length > 0 ? (
            <>
              {heroBanners.map((b, idx) => (
                <div
                  key={b.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <AdCard ad={b} className="h-full w-full object-cover" />
                </div>
              ))}

              {/* Slider Dots */}
              {heroBanners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-md">
                  {heroBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentSlide ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Slider Navigation Arrows */}
              {heroBanners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white active:scale-95"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % heroBanners.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white active:scale-95"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-tr from-primary/20 to-primary/5 p-8">
              <span className="text-xl font-bold text-slate-600">BA Trading Dental Supplies</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. "عروض سريعة ومميزة" (Incredible Deals Carousel - GooshiShop Style) */}
      {dealProducts.length > 0 && (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#007979] via-[#008f8f] to-[#006666] p-4 sm:p-5 text-white shadow-xl">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
            
            {/* Countdown Box & Title on the side */}
            <div className="flex flex-row items-center justify-between lg:flex-col lg:items-center lg:justify-center lg:col-span-2 text-center gap-3">
              <div className="flex items-center gap-2 lg:flex-col">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                  <Zap className="size-7 text-amber-300 fill-amber-300" />
                </div>
                <div>
                  <h2 className="text-[17px] font-black leading-tight">
                    {lang === "ar" ? "عروض سريعة" : lang === "ku" ? "ئۆفەری خێرا" : "Flash Deals"}
                  </h2>
                  <p className="text-[11px] font-semibold text-teal-100 hidden lg:block mt-1">
                    {lang === "ar" ? "خصومات خاصة لفترة محدودة" : lang === "ku" ? "داشکاندنی کاتی سنووردار" : "Limited Time Offers"}
                  </p>
                </div>
              </div>

              {/* Timer Digits */}
              <div className="flex items-center gap-1 font-mono text-[13px] font-black" dir="ltr">
                <span className="rounded-lg bg-white/20 px-2 py-1 backdrop-blur-md">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="rounded-lg bg-white/20 px-2 py-1 backdrop-blur-md">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span>:</span>
                <span className="rounded-lg bg-white/20 px-2 py-1 backdrop-blur-md">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>

              <Link
                to="/deals"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[12px] font-extrabold text-[#007979] shadow-sm transition hover:bg-teal-50 active:scale-95"
              >
                <span>{lang === "ar" ? "مشاهدة الكل" : lang === "ku" ? "بینینی هەمووی" : "View All"}</span>
                <ChevronLeft className="size-3.5 ltr:rotate-180" />
              </Link>
            </div>

            {/* Horizontal Product Rail */}
            <div className="lg:col-span-10">
              <div className="no-scrollbar flex snap-x gap-3.5 overflow-x-auto pb-2">
                {dealProducts.map(({ deal, product }) => {
                  const currentPrice = priceOf(product.id, product.price);
                  const old = currentPrice < product.price ? product.price : product.compare_price;
                  const discountPercent = old ? Math.round((1 - currentPrice / Number(old)) * 100) : 0;

                  return (
                    <Link
                      key={deal.id}
                      to="/product/$id"
                      params={{ id: product.id }}
                      className="group flex w-[170px] shrink-0 snap-start flex-col rounded-2xl bg-white p-3 text-slate-800 shadow-md transition-all hover:scale-105"
                    >
                      {/* Product Image & Discount Badge */}
                      <div className="relative mb-2 flex h-32 w-full items-center justify-center rounded-xl bg-slate-50 p-2">
                        {discountPercent > 0 && (
                          <span className="absolute top-2 right-2 rounded-full bg-[#007979] px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
                            {discountPercent}%
                          </span>
                        )}
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={pickName(product, lang)}
                            className="h-full w-full object-contain transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <span className="text-4xl">🦷</span>
                        )}
                      </div>

                      {/* Product Title */}
                      <h4 className="line-clamp-2 min-h-[34px] text-[12px] font-bold leading-tight text-slate-800 group-hover:text-primary transition-colors">
                        {pickName(product, lang)}
                      </h4>

                      {/* Prices */}
                      <div className="mt-auto pt-2">
                        {old && (
                          <p className="text-[11px] font-bold text-slate-400 line-through">
                            {formatPrice(Number(old), lang)}
                          </p>
                        )}
                        <p className="text-[13.5px] font-black text-[#007979]">
                          {formatPrice(currentPrice, lang)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Circular Category Grid (GooshiShop Style) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary" />
            <h3 className="text-[18px] font-black text-slate-800">
              {lang === "ar" ? "أقسام وتصنيفات المتجر" : lang === "ku" ? "هاوپۆلەکانی فرۆشگا" : "Categories"}
            </h3>
          </div>
          <Link
            to="/products"
            className="text-[12.5px] font-bold text-primary hover:underline"
          >
            {lang === "ar" ? "عرض جميع الأقسام" : lang === "ku" ? "بینینی هەموو بەشەکان" : "View All"}
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {data.categories.map((c) => {
            const Icon = categoryIcon(c.icon);
            const hasValidImage = c.image_url && !c.image_url.startsWith("/__l5e");
            return (
              <Link
                key={c.id}
                to="/products"
                search={{ cat: c.id } as never}
                className="group flex flex-col items-center gap-2.5 rounded-2xl bg-white p-3 text-center transition-all hover:shadow-lg border border-slate-100/80 hover:-translate-y-1"
              >
                <div
                  style={tintStyle(c.hue, c.chroma)}
                  className="flex size-16 items-center justify-center rounded-2xl p-2.5 transition-transform group-hover:scale-110 shadow-sm border border-slate-100/60"
                >
                  {hasValidImage ? (
                    <img
                      src={c.image_url!}
                      alt={pickName(c, lang)}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="size-full items-center justify-center"
                    style={{ display: hasValidImage ? "none" : "flex" }}
                  >
                    <Icon
                      className="size-7"
                      strokeWidth={2}
                      style={{ color: "var(--tint-strong)" }}
                    />
                  </div>
                </div>
                <span className="line-clamp-2 text-[12px] font-extrabold text-slate-700 group-hover:text-primary transition-colors">
                  {pickName(c, lang)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Official Brand Showcase */}
      {data.brandCards.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-600" />
              <h3 className="text-[18px] font-black text-slate-800">
                {lang === "ar" ? "الماركات العالمية المعتمدة" : lang === "ku" ? "براندە جیهانییە پەسەندکراوەکان" : "Official Brands"}
              </h3>
            </div>
            <Link to="/brands" className="text-[12.5px] font-bold text-primary hover:underline">
              {lang === "ar" ? "عرض الكل" : lang === "ku" ? "بینینی هەمووی" : "View All"}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.brandCards.map((b) => {
              const logo = brandLogo(b, 200);
              return (
                <Link
                  key={b.id}
                  to="/products"
                  search={{ brand: b.name } as never}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex h-12 w-full items-center justify-center mb-2">
                    {logo ? (
                      <img
                        src={logo}
                        alt={b.name}
                        loading="lazy"
                        className="max-h-10 max-w-[110px] object-contain transition-transform group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = "block";
                          }
                        }}
                      />
                    ) : null}
                    <span
                      className="font-display text-[15px] font-black text-slate-800 group-hover:text-primary transition-colors"
                      style={{ display: logo ? "none" : "block" }}
                    >
                      {b.name}
                    </span>
                  </div>
                  <span className="truncate max-w-full text-[12px] font-extrabold text-slate-700 group-hover:text-primary transition-colors">
                    {b.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Featured Clinic Bundles */}
      {bundles.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Boxes className="size-5 text-amber-600" />
              <h3 className="text-[18px] font-black text-slate-800">
                {lang === "ar" ? "باقات العيادات التوفيرية" : lang === "ku" ? "پاکێجەکانی کلینیک" : "Clinic Packages"}
              </h3>
            </div>
            <Link to="/bundles" className="text-[12.5px] font-bold text-primary hover:underline">
              {lang === "ar" ? "عرض الباقات" : lang === "ku" ? "بینینی پاکێجەکان" : "View All"}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bundles.map((b) => (
              <Link
                key={b.id}
                to="/bundle/$id"
                params={{ id: b.id }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-amber-400/50 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative mb-3 flex h-40 w-full items-center justify-center rounded-2xl bg-amber-50/50 p-3">
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10.5px] font-black text-white shadow-sm">
                    {lang === "ar" ? "باقة خاصة" : lang === "ku" ? "پاکێجی تایبەت" : "Special Bundle"}
                  </span>
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt={pick(b.title_ar, b.title_ku, lang)}
                      className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <Boxes className="size-16 text-amber-500" />
                  )}
                </div>

                <h4 className="text-[13.5px] font-black text-slate-800 group-hover:text-primary transition-colors">
                  {pick(b.title_ar, b.title_ku, lang)}
                </h4>

                <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400">
                    {lang === "ar" ? "سعر الباقة" : lang === "ku" ? "نرخی پاکێج" : "Price"}
                  </span>
                  <span className="text-[14px] font-black text-slate-900">
                    {formatPrice(b.price, lang)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. Featured Products Grid (GooshiShop Minimalist Product Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-rose-500" />
            <h3 className="text-[18px] font-black text-slate-800">
              {lang === "ar" ? "المنتجات الأكثر طلباً في العيادات" : lang === "ku" ? "بەرهەمە پڕفرۆشەکان" : "Featured Dental Supplies"}
            </h3>
          </div>
          <Link to="/products" className="text-[12.5px] font-bold text-primary hover:underline">
            {lang === "ar" ? "تصفح كل المنتجات" : lang === "ku" ? "هەموو بەرهەمەکان" : "View All"}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
          ))}
        </div>
      </section>

      {/* 7. Newest Products Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="text-[18px] font-black text-slate-800">
              {lang === "ar" ? "وصل حديثاً" : lang === "ku" ? "نوێ گەیشتووە" : "New Arrivals"}
            </h3>
          </div>
          <Link to="/products" className="text-[12.5px] font-bold text-primary hover:underline">
            {lang === "ar" ? "عرض الكل" : lang === "ku" ? "بینینی هەمووی" : "View All"}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {newest.map((p) => (
            <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
          ))}
        </div>
      </section>

    </div>
  );
}
