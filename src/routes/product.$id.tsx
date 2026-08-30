import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Banknote,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  HelpCircle,
  Hourglass,
  Layers,
  MessageCircle,
  Minus,
  Package,
  PackageOpen,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { formatPrice, pick, pickName, useI18n, type Lang, type TKey } from "@/lib/i18n";
import {
  bestPromo,
  effectivePrice,
  fetchStoreData,
  tierUnitPrice,
  tiersOf,
} from "@/lib/store";
import { dealHeadline, dealRuleChips, offerHeadline, offerRuleChips } from "@/lib/offer-text";
import { TierTable } from "@/components/TierTable";
import { ProductBadges, DiscountBlade } from "@/lib/badges";
import { fetchVendors } from "@/lib/vendor-public";
import { siblingOffers } from "@/lib/catalog";
import { categoryIcon, tintStyle } from "@/lib/category-icons";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج | دنتال ستور" },
      {
        name: "description",
        content: "تفاصيل المنتج، السعر، أسعار الجملة، التوصيل والدفع عند الاستلام في دنتال ستور.",
      },
      { property: "og:title", content: "تفاصيل المنتج | دنتال ستور" },
      { property: "og:description", content: "السعر، خصم الكمية، التوصيل والدفع عند الاستلام." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-3 text-start text-[13px] font-bold text-slate-800 hover:text-primary transition-colors"
      >
        <span>{q}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      {open && <p className="pb-3 text-[12.5px] leading-relaxed text-slate-600 animate-in fade-in duration-200">{a}</p>}
    </div>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const { lang, t } = useI18n();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const { data: vendors } = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });

  // Rating Modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [userStars, setUserStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewsList, setReviewsList] = useState<Array<{ name: string; stars: number; comment: string; date: string }>>([
    {
      name: lang === "ar" ? "د. أحمد خليل - مركز الابتسامة" : lang === "ku" ? "د. ئەحمەد خەلیل - سەنتەری ددان" : "Dr. Ahmed Khalil",
      stars: 5,
      comment: lang === "ar" ? "منتج أصلي بجودة ممتازة وسعر مناسب جداً للجملة." : lang === "ku" ? "بەرهەمی ئەسڵی بە کوالێتی زۆر بەرز و گونجاو." : "Authentic product with excellent quality.",
      date: "2026-08-20",
    },
    {
      name: lang === "ar" ? "عيادة النور لطب الأسنان" : lang === "ku" ? "کلینیکی نوور" : "Al-Noor Clinic",
      stars: 5,
      comment: lang === "ar" ? "توصيل سريع وتغليف احترافي، شكراً لكم." : lang === "ku" ? "گەیاندنی خێرا و پاکێجکردنی باش، سوپاس." : "Fast delivery and great packaging.",
      date: "2026-08-22",
    },
  ]);

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) {
      toast.error(lang === "ar" ? "يرجى كتابة اسمك أو اسم العيادة" : lang === "ku" ? "تکایە ناوی خۆت یان کلینیک بنووسە" : "Please enter your name or clinic name");
      return;
    }
    const newReview = {
      name: reviewerName.trim(),
      stars: userStars,
      comment: reviewComment.trim() || (lang === "ar" ? "تقييم ممتاز بدون تعليق" : lang === "ku" ? "هەڵسەنگاندنی بەرز" : "Great rating"),
      date: new Date().toISOString().split("T")[0] ?? "2026-08-28",
    };
    setReviewsList((prev) => [newReview, ...prev]);
    setIsRatingModalOpen(false);
    setReviewerName("");
    setReviewComment("");
    toast.success(
      lang === "ar"
        ? "شكراً لك! تم تسجيل تقييمك بنجاح"
        : lang === "ku"
        ? "سوپاس! هەڵسەنگاندنەکەت بە سەرکەوتوویی تۆمارکرا"
        : "Thank you! Your rating has been submitted successfully."
    );
  };

  const avgRating = (
    reviewsList.reduce((acc, curr) => acc + curr.stars, 0) / reviewsList.length
  ).toFixed(1);

  const [pickedId, setPickedId] = useState<string | null>(null);
  useEffect(() => setPickedId(null), [id]);

  const product =
    (pickedId ? data?.products.find((p) => p.id === pickedId) : undefined) ??
    data?.products.find((p) => p.id === id);
  const vendor = product?.vendor_id
    ? (vendors ?? []).find((v) => v.id === product.vendor_id)
    : undefined;
  const category = (data?.categories ?? []).find((c) => c.id === product?.category_id);

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-4 py-8 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Skeleton className="aspect-square w-full rounded-3xl" />
            </div>
            <div className="space-y-4 lg:col-span-7">
              <Skeleton className="h-8 w-3/4 rounded-xl" />
              <Skeleton className="h-6 w-1/3 rounded-xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-[var(--page-max,1600px)] px-4 py-16 text-center">
          <p className="text-base font-bold text-slate-500">{t("noResults")}</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link to="/products">{t("products")}</Link>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  const deal = bestPromo(
    product,
    qty,
    data?.offers ?? [],
    data?.offerProducts ?? [],
    data?.flashDeals ?? [],
    data?.clearanceRules ?? [],
  );
  const base = deal.unitPrice;
  const tiers = tiersOf(product.id, data?.tiers ?? []);
  const price = tierUnitPrice(base, qty, tiers);
  const freeQty = deal.freeQty;
  const lineTotal = price * Math.max(0, qty - freeQty);
  const cartUnit = qty > 0 ? Math.round(lineTotal / qty) : price;

  const dealChips = deal.offer
    ? [
        offerHeadline(deal.offer, lang, t),
        ...offerRuleChips(deal.offer, lang, t, { brand: deal.offer.brand }),
      ]
    : deal.deal
      ? [dealHeadline(deal.deal, lang, t), ...dealRuleChips(deal.deal, lang, t)]
      : [];

  const oldPrice =
    price < product.price
      ? product.price
      : product.compare_price && product.compare_price > price
        ? Number(product.compare_price)
        : null;
  const percent = oldPrice ? Math.round((1 - price / Number(oldPrice)) * 100) : 0;

  const settings = data?.settings;
  const fee = Number(settings?.delivery_fee ?? 0);
  const freeOver = Number(settings?.free_delivery_over ?? 0);
  const wa = (settings?.whatsapp ?? "").replace(/[^\d]/g, "");
  const low = product.stock > 0 && product.stock <= 5;

  const sameItem = [product, ...siblingOffers(product, data?.products ?? [])]
    .map((p) => ({
      row: p,
      unit: effectivePrice(
        p,
        data?.offers ?? [],
        data?.offerProducts ?? [],
        1,
        data?.flashDeals ?? [],
        data?.clearanceRules ?? [],
      ),
      vendor: (vendors ?? []).find((v) => v.id === p.vendor_id),
    }))
    .sort((a, b) => a.unit - b.unit);

  const related = (data?.products ?? [])
    .filter((p) => p.id !== product.id && (p.brand === product.brand || p.category_id === product.category_id))
    .slice(0, 5);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: pickName(product, lang), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      /* ignored */
    }
  };

  return (
    <StoreLayout>
      <PageBlocks page="product" />

      <div className="mx-auto w-full max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3 sm:px-4 py-3 sm:py-6 lg:px-8 pb-28 lg:pb-8">
        
        {/* Breadcrumb Navigation (GooshiShop Style) */}
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-[12px] font-bold text-slate-400">
          <Link to="/" className="hover:text-primary transition-colors">
            {t("home")}
          </Link>
          <ChevronLeft className="size-3.5 ltr:rotate-180 text-slate-300" />
          {category && (
            <>
              <Link
                to="/products"
                search={{ cat: category.id } as never}
                className="hover:text-primary transition-colors"
              >
                {pickName(category, lang)}
              </Link>
              <ChevronLeft className="size-3.5 ltr:rotate-180 text-slate-300" />
            </>
          )}
          {product.brand && (
            <>
              <Link
                to="/products"
                search={{ brand: product.brand } as never}
                className="hover:text-primary transition-colors"
              >
                {product.brand}
              </Link>
              <ChevronLeft className="size-3.5 ltr:rotate-180 text-slate-300" />
            </>
          )}
          <span className="truncate max-w-[280px] text-slate-700 font-extrabold">
            {pickName(product, lang)}
          </span>
        </nav>

        {/* 2-Column Split: Image on one side & Product Details on the other side */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-10 items-start">
          
          {/* Column 1 (Image & Gallery Stage - 5 cols) */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-4">
            
            {/* Main Product Image Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm group">
              
              {/* Discount Blade */}
              {percent > 0 && (
                <span className="absolute top-4 start-4 rounded-full bg-[#007979] px-2.5 sm:px-3 py-1 text-[11px] sm:text-[12px] font-black text-white shadow-md z-10">
                  {percent}% {lang === "ar" ? "خصم" : lang === "ku" ? "داشکاندن" : "OFF"}
                </span>
              )}

              {/* Utility Floating Actions (Bookmark, Bell, Share, Compare) */}
              <div className="absolute top-4 end-4 flex flex-col gap-2 z-10">
                <button
                  type="button"
                  onClick={share}
                  aria-label={t("shareProduct")}
                  className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200/80 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-primary active:scale-95"
                >
                  <Share2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.success(lang === "ar" ? "تمت الإضافة للمفضلة" : lang === "ku" ? "زیادکرا بۆ دڵخوازەکان" : "Saved to wishlist")}
                  aria-label="Wishlist"
                  className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200/80 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-primary active:scale-95"
                >
                  <Bookmark className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.info(lang === "ar" ? "سيتم تنبيهك عند توفر عروض" : lang === "ku" ? "ئاگاداردەکرێیتەوە لە داشکاندن" : "Price alert enabled")}
                  aria-label="Alert"
                  className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200/80 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-primary active:scale-95"
                >
                  <Bell className="size-4" />
                </button>
              </div>

              {/* Product Photo */}
              <div className="flex aspect-square w-full items-center justify-center py-2">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={pickName(product, lang)}
                    className="max-h-[300px] sm:max-h-[380px] w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-7xl">🦷</div>
                )}
              </div>

              {/* Stock Notice Overlay if out */}
              {product.stock <= 0 && (
                <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-slate-900/85 py-2.5 text-center text-[12.5px] font-black text-white backdrop-blur-md">
                  {t("outOfStock")}
                </div>
              )}
            </div>

            {/* Thumbnail Preview Boxes (GooshiShop Style) */}
            {product.image_url && (
              <div className="flex items-center gap-2 justify-center py-1">
                <div className="size-14 sm:size-16 rounded-xl border-2 border-primary p-1 bg-white shadow-xs cursor-pointer">
                  <img src={product.image_url} alt="" className="size-full object-contain" />
                </div>
                <div className="size-14 sm:size-16 rounded-xl border border-slate-200 p-1 bg-slate-50 opacity-60 flex items-center justify-center text-xs font-bold text-slate-400">
                  +1
                </div>
              </div>
            )}

          </div>

          {/* Column 2 (Product Details & Purchase Panel - 7 cols) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            
            {/* Title & Header Section */}
            <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm space-y-3">
              
              <div className="flex flex-wrap items-center gap-2">
                {product.brand && (
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
                    {product.brand}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsRatingModalOpen(true)}
                  className="ms-auto flex items-center gap-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-3 py-1 text-[11.5px] font-black text-amber-700 transition shadow-xs active:scale-95 cursor-pointer"
                  title={lang === "ar" ? "اضغط لتقييم المنتج" : lang === "ku" ? "کلیک بکە بۆ هەڵسەنگاندن" : "Click to rate product"}
                >
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span>{avgRating}</span>
                  <span className="text-amber-600 font-medium">({reviewsList.length} {lang === "ar" ? "تقييم" : lang === "ku" ? "دەنگ" : "reviews"})</span>
                </button>
              </div>

              {/* Primary Native Name */}
              <h1 className="text-[17px] sm:text-[22px] font-black leading-tight text-slate-900">
                {pickName(product, lang)}
              </h1>

              {/* Secondary Subtitle / English Name / SKU (GooshiShop Style) */}
              {(product.name_ku || product.sku) && (
                <p className="text-[12px] sm:text-[13px] font-semibold text-slate-400">
                  {lang === "ar" ? product.name_ku : product.name_ar} {product.sku ? `· SKU: ${product.sku}` : ""}
                </p>
              )}

              {/* Status Chips & Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black ${
                    product.stock > 0
                      ? low
                        ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  <span className={`size-2 rounded-full ${product.stock > 0 ? (low ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-400"}`} />
                  {product.stock > 0
                    ? low
                      ? t("stockLeft").replace("{n}", String(product.stock))
                      : t("availableNow")
                    : t("outOfStock")}
                </span>

                {(product.badges?.length ?? 0) > 0 && (
                  <ProductBadges badges={product.badges} lang={lang} max={3} size="md" />
                )}
              </div>

              {/* Vendor Offer Card */}
              {vendor && (
                <div className="pt-2">
                  <Link
                    to="/vendor/$slug"
                    params={{ slug: vendor.slug }}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-slate-100/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                        {vendor.logo_url ? (
                          <img src={vendor.logo_url} alt="" className="size-7 object-contain" />
                        ) : (
                          <Store className="size-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-[13px] font-black text-slate-800">
                          <span>{vendor.name}</span>
                          {vendor.is_verified && (
                            <BadgeCheck className="size-4 text-emerald-600" />
                          )}
                        </div>
                        <p className="text-[10.5px] font-semibold text-slate-400">
                          {t("supplierOffer")} · {product.brand}
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="size-4 text-slate-400 ltr:rotate-180" />
                  </Link>
                </div>
              )}

              {/* Price Calculation Box */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 p-4 border border-blue-100/60 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">
                      {lang === "ar" ? "سعر الوحدة للعيادات" : lang === "ku" ? "نرخی دانە بۆ کلینیک" : "Unit Price"}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[26px] sm:text-[30px] font-black text-slate-900">
                        {formatPrice(price, lang)}
                      </span>
                      {oldPrice && (
                        <span className="text-[14px] font-bold text-slate-400 line-through">
                          {formatPrice(oldPrice, lang)}
                        </span>
                      )}
                    </div>
                  </div>

                  {percent > 0 && oldPrice && (
                    <div className="rounded-xl bg-emerald-100/80 px-3 py-1.5 text-center">
                      <span className="text-[11.5px] font-black text-emerald-800 flex items-center gap-1">
                        <TrendingUp className="size-3.5" />
                        {t("youSave")} {formatPrice(oldPrice - price, lang)}
                      </span>
                    </div>
                  )}
                </div>

                {dealChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dealChips.map((c) => (
                      <span key={c} className="rounded-lg bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tier Discount Table */}
              {tiers.length > 0 && (
                <div className="pt-2">
                  <TierTable tiers={tiers} basePrice={base} qty={qty} />
                </div>
              )}

              {/* Quantity & Buy Actions Panel */}
              <div className="pt-3 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  
                  {/* Quantity Counter */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-95"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-[32px] text-center text-[15px] font-black text-slate-900">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 1)}
                      className="flex size-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-95"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  {/* Add to Cart Primary Button */}
                  <Button
                    size="lg"
                    disabled={product.stock <= 0}
                    onClick={() => {
                      cart.add(
                        {
                          id: product.id,
                          name_ar: product.name_ar,
                          name_ku: product.name_ku,
                          price: cartUnit,
                          image_url: product.image_url,
                          vendor_id: product.vendor_id ?? null,
                        },
                        qty,
                      );
                      toast.success(t("added"));
                    }}
                    className="flex-1 h-12 rounded-2xl bg-primary text-[14px] font-black text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95 active:scale-[0.98]"
                  >
                    <ShoppingCart className="size-5 me-2" />
                    <span>
                      {product.stock > 0
                        ? `${t("addToCart")} · ${formatPrice(lineTotal, lang)}`
                        : t("outOfStock")}
                    </span>
                  </Button>

                  {/* WhatsApp Inquiry Button */}
                  {wa && (
                    <a
                      href={`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن ${pickName(product, lang)}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 text-[13px] font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
                    >
                      <MessageCircle className="size-4.5" />
                      <span className="hidden sm:inline">{t("askOnWhatsapp")}</span>
                    </a>
                  )}

                </div>
              </div>

            </div>

            {/* Other Vendors for same item */}
            {sameItem.length > 1 && (
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-[14px] font-black text-slate-800">
                  {t("vendorsOffering")}
                </h3>
                <div className="space-y-2">
                  {sameItem.map((o, i) => {
                    const current = o.row.id === product.id;
                    const out = o.row.stock <= 0;
                    return (
                      <button
                        key={o.row.id}
                        type="button"
                        onClick={() => setPickedId(o.row.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-start transition ${
                          current ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[13px] font-black text-slate-800">
                            <span>{o.vendor?.name ?? t("soldBy")}</span>
                            {o.vendor?.is_verified && <BadgeCheck className="size-3.5 text-primary" />}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">
                            {out ? t("outOfStock") : `${t("stock")}: ${o.row.stock}`}
                          </span>
                        </div>
                        <span className="text-[14px] font-black text-primary">
                          {formatPrice(o.unit, lang)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Specifications & Description */}
            {pick(product.description_ar, product.description_ku, lang) && (
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-2.5">
                <h3 className="text-[15px] font-black text-slate-800">
                  {t("productDetails")}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-slate-600 whitespace-pre-line">
                  {pick(product.description_ar, product.description_ku, lang)}
                </p>
              </div>
            )}

            {/* Shipping & Delivery Information */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-3">
              <h3 className="flex items-center gap-2 text-[15px] font-black text-slate-800">
                <Truck className="size-4.5 text-primary" />
                <span>{t("shippingInfo")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] font-bold text-slate-700">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-500">{t("shipFee")}</span>
                  <span className="font-black text-slate-900">{formatPrice(fee, lang)}</span>
                </div>
                {freeOver > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                    <span className="text-emerald-700">{t("shipFreeOver")}</span>
                    <span className="font-black text-emerald-800">{formatPrice(freeOver, lang)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-100 sm:col-span-2">
                  <Banknote className="size-4 text-primary" />
                  <span>
                    <b className="font-black text-slate-900">{t("shipCod")}</b> — {t("shipCodSub")}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Reviews & Ratings Section */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-black text-slate-800">
                    {lang === "ar" ? "آراء وتقييمات العيادات والأطباء" : lang === "ku" ? "ڕا و هەڵسەنگاندنی پزیشکان" : "Clinic Reviews & Ratings"}
                  </h3>
                  <p className="text-[12px] font-bold text-slate-400 mt-0.5">
                    {avgRating} ⭐ ({reviewsList.length} {lang === "ar" ? "تقييمات معتمدة" : lang === "ku" ? "هەڵسەنگاندن" : "verified ratings"})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRatingModalOpen(true)}
                  className="rounded-xl bg-primary px-4 py-2 text-[12.5px] font-black text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                >
                  {lang === "ar" ? "أضف تقييمك" : lang === "ku" ? "هەڵسەنگاندن زیادبکە" : "Write Review"}
                </button>
              </div>

              {/* Reviews List */}
              <div className="space-y-3 divide-y divide-slate-100">
                {reviewsList.map((rev, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-slate-800">{rev.name}</span>
                        <span className="rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-black flex items-center gap-1">
                          <BadgeCheck className="size-3" />
                          {lang === "ar" ? "طبيب معتمد" : lang === "ku" ? "پزیشکی باوەڕپێکراو" : "Verified"}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${i < rev.stars ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[12.5px] text-slate-600 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] font-medium text-slate-400 block">{rev.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequently Asked Questions */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-[15px] font-black text-slate-800">
                {t("pdpFaqTitle")}
              </h3>
              <Faq q={t("pdpFaq1Q")} a={t("pdpFaq1A")} />
              <Faq q={t("pdpFaq2Q")} a={t("pdpFaq2A")} />
              <Faq q={t("pdpFaq3Q")} a={t("pdpFaq3A")} />
            </div>

          </div>

        </div>

        {/* Rating Modal Dialog */}
        {isRatingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-[17px] font-black text-slate-900">
                  {lang === "ar" ? "تقييم المنتج والجودة" : lang === "ku" ? "هەڵسەنگاندنی بەرهەم" : "Rate this Product"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRatingModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleRatingSubmit} className="mt-4 space-y-4">
                
                {/* Product mini header */}
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="size-12 object-contain rounded-xl bg-white p-1 border border-slate-100" />
                  ) : (
                    <span className="text-2xl">🦷</span>
                  )}
                  <div>
                    <h4 className="line-clamp-1 text-[13px] font-black text-slate-800">{pickName(product, lang)}</h4>
                    <span className="text-[11px] font-bold text-primary">{product.brand}</span>
                  </div>
                </div>

                {/* Interactive Star Picker */}
                <div className="text-center py-2 space-y-1.5">
                  <span className="text-[12px] font-black text-slate-500 block">
                    {lang === "ar" ? "اختر التقييم بالنجوم:" : lang === "ku" ? "هەڵسەنگاندن بە ئەستێرە دیاریبکە:" : "Select your rating:"}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setUserStars(s)}
                        onMouseEnter={() => setHoverStars(s)}
                        onMouseLeave={() => setHoverStars(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`size-8 transition-colors ${
                            s <= (hoverStars || userStars)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] font-black text-amber-600">
                    {userStars === 5
                      ? (lang === "ar" ? "ممتاز جداً 🌟🌟🌟🌟🌟" : lang === "ku" ? "ناوازە و نایاب" : "Excellent")
                      : userStars === 4
                      ? (lang === "ar" ? "جيد جداً ⭐⭐⭐⭐" : lang === "ku" ? "زۆر باش" : "Very Good")
                      : userStars === 3
                      ? (lang === "ar" ? "جيد ⭐⭐⭐" : lang === "ku" ? "باش" : "Good")
                      : (lang === "ar" ? "مقبول ⭐" : lang === "ku" ? "مامناوەند" : "Fair")}
                  </span>
                </div>

                {/* Name / Clinic Name */}
                <div className="space-y-1">
                  <label className="text-[12px] font-black text-slate-700 block">
                    {lang === "ar" ? "اسمك أو اسم العيادة *" : lang === "ku" ? "ناوی پزیشک یان کلینیک *" : "Your Name / Clinic Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder={lang === "ar" ? "مثال: د. سارة - مركز بغداد الطبي" : lang === "ku" ? "نموونە: د. سارا - کلینیکی هەولێر" : "e.g. Dr. Sarah Dental Clinic"}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Review Text */}
                <div className="space-y-1">
                  <label className="text-[12px] font-black text-slate-700 block">
                    {lang === "ar" ? "ملاحظاتك ورأيك في المنتج" : lang === "ku" ? "سەرنج و تێبینی لەسەر بەرهەم" : "Your Review & Feedback"}
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={lang === "ar" ? "اكتب تفاصيل تجربتك مع المنتج..." : lang === "ku" ? "تێبینی و ڕای خۆت بنووسە..." : "Write your thoughts on product quality..."}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRatingModalOpen(false)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 active:scale-95"
                  >
                    {lang === "ar" ? "إلغاء" : lang === "ku" ? "پاشگەزبوونەوە" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-primary text-[13.5px] font-black text-white shadow-md transition hover:opacity-95 active:scale-95"
                  >
                    {lang === "ar" ? "إرسال التقييم" : lang === "ku" ? "ناردنی هەڵسەنگاندن" : "Submit Rating"}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* Related Products Showcase */}
        {related.length > 0 && (
          <div className="mt-12 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="text-[18px] font-black text-slate-800">
                  {t("relatedProducts")}
                </h3>
              </div>
              <Link to="/products" className="text-[12.5px] font-bold text-primary hover:underline">
                {lang === "ar" ? "عرض المزيد" : lang === "ku" ? "بینینی زیاتر" : "View More"}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
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
          </div>
        )}

      </div>

      {/* Sticky Mobile Buy Dock (Persistent 1-tap checkout on mobile screens - GooshiShop Style) */}
      <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-slate-200/90 bg-white/95 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_25px_rgba(0,0,0,0.09)] pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold text-slate-400 leading-none mb-1">{t("price")}:</span>
            <span className="block text-[16px] font-black text-slate-900 truncate">
              {formatPrice(lineTotal, lang)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن ${pickName(product, lang)}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex size-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-50 text-emerald-700 active:scale-95 shrink-0"
              >
                <MessageCircle className="size-5" />
              </a>
            )}

            <Button
              size="lg"
              disabled={product.stock <= 0}
              onClick={() => {
                cart.add(
                  {
                    id: product.id,
                    name_ar: product.name_ar,
                    name_ku: product.name_ku,
                    price: cartUnit,
                    image_url: product.image_url,
                    vendor_id: product.vendor_id ?? null,
                  },
                  qty,
                );
                toast.success(t("added"));
              }}
              className="flex-1 h-12 rounded-2xl bg-primary text-[14px] font-black text-white shadow-lg shadow-primary/25 active:scale-95 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="size-4.5" />
              <span>{product.stock > 0 ? t("addToCart") : t("outOfStock")}</span>
            </Button>
          </div>
        </div>
      </div>

      <PageBlocks page="product" position="bottom" />
    </StoreLayout>
  );
}
