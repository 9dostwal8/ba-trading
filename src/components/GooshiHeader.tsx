import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Menu,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { fetchStoreData } from "@/lib/store";
import { formatPrice, pick, pickName, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCanOrder } from "@/hooks/useCanOrder";
import { NotificationBell } from "@/components/NotificationBell";
import { decodeQrFile, inAppPath } from "@/lib/qr-scan";
import { fetchVendor, parseVendorScan } from "@/lib/vendor-public";
import { categoryIcon, tintStyle } from "@/lib/category-icons";
import { toast } from "sonner";

export function GooshiHeader() {
  const { t, lang, setLang } = useI18n();
  const { isStaff, isAdmin, canOrder } = useCanOrder();
  const panelTo = (isAdmin ? "/admin" : "/brand") as "/admin" | "/brand";
  const cart = useCart();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const s = data?.settings;
  const categories = data?.categories ?? [];
  const products = data?.products ?? [];

  // Search & Promo state
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isPromoDismissed, setIsPromoDismissed] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (catMenuRef.current && !catMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products for live suggestions
  const suggestions = query.trim()
    ? products
        .filter((p) => {
          const q = query.toLowerCase();
          return (
            (p.name_ar && p.name_ar.toLowerCase().includes(q)) ||
            (p.name_ku && p.name_ku.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearchOpen(false);
    navigate({ to: "/products", search: { q: query.trim() } as never });
  };

  // QR Scan Handler
  const handleQrUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      const found = await decodeQrFile(file);
      if (!found) {
        toast.error(lang === "ar" ? "لم يتم العثور على رمز QR" : lang === "ku" ? "کۆدی QR نەدۆزرا" : "No QR code found");
        return;
      }
      const path = inAppPath(found);
      if (path && path !== "/") {
        navigate({ to: path });
        return;
      }
      const vendor = await fetchVendor(parseVendorScan(found));
      if (!vendor) {
        toast.error(lang === "ar" ? "الرمز غير معروف" : lang === "ku" ? "کۆد نەناسراوە" : "Unknown QR Code");
        return;
      }
      navigate({ to: "/vendor/$slug", params: { slug: vendor.slug } });
    } catch {
      toast.error(lang === "ar" ? "خطأ في قراءة الرمز" : lang === "ku" ? "هەڵە لە خوێندنەوە" : "Error reading QR");
    }
  };

  // Language cycle (Arabic, Kurdish, English only - strict)
  const order: Array<"ar" | "ku" | "en"> = ["ar", "ku", "en"];
  const enabled = order.filter((l) =>
    !s ? true : Boolean((s as unknown as Record<string, boolean>)[`lang_${l}_enabled`]),
  );
  const activeLangs: Array<"ar" | "ku" | "en"> = enabled.length ? enabled : ["ar"];
  const nextLang = activeLangs[(activeLangs.indexOf(lang) + 1) % activeLangs.length]!;
  const nextLabel = nextLang === "ku" ? "کوردی" : nextLang === "en" ? "English" : "العربية";

  const brandLogoNode = (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
      {s?.logo_url ? (
        <img
          src={s.logo_url}
          alt={pick(s.site_name_ar, s.site_name_ku, lang) || "BA Trading"}
          className="size-9 rounded-xl object-contain lg:size-11 transition-transform group-hover:scale-105"
        />
      ) : (
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-primary to-primary-deep text-lg text-primary-foreground shadow-sm lg:size-11 lg:text-2xl transition-transform group-hover:scale-105">
          {s?.logo_emoji || "🦷"}
        </span>
      )}
      <div className="flex flex-col">
        <span className="font-display text-[15px] font-black tracking-tight text-foreground lg:text-[18px] leading-tight">
          {(s && pick(s.site_name_ar, s.site_name_ku, lang)) || "BA Trading"}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground hidden sm:block">
          {lang === "ar" ? "المتجر الطبي التخصصي" : lang === "ku" ? "فرۆشگای پزیشکی تایبەتمەند" : "Dental Supply Store"}
        </span>
      </div>
    </Link>
  );

  return (
    <>
      <input
        ref={qrFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleQrUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {/* Top Promotional Reclaim Strip (GooshiShop Style) */}
      {!isPromoDismissed && (
        <div className="relative z-40 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 px-4 py-2 text-white shadow-sm">
          <div className="mx-auto flex max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between gap-3 text-[12px] font-bold">
            <div className="flex flex-1 items-center justify-center gap-2 text-center sm:gap-3">
              <span className="hidden sm:inline-block rounded-md bg-amber-400 px-2 py-0.5 text-[10.5px] font-black text-slate-950 uppercase tracking-wider">
                {lang === "ar" ? "عرض حصري" : lang === "ku" ? "ئۆفەری تایبەت" : "Exclusive"}
              </span>
              <span>
                {s?.show_announcement && pick(s.announcement_ar, s.announcement_ku, lang)
                  ? pick(s.announcement_ar, s.announcement_ku, lang)
                  : lang === "ar"
                  ? "خصم خاص على أول طلبية للعيادات مع كود الخصم:"
                  : lang === "ku"
                  ? "داشکاندنی تایبەت لەسەر یەکەم داواکاری بە کۆدی:"
                  : "Special discount on first clinic order with code:"}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("DENTAL10");
                  toast.success(lang === "ar" ? "تم نسخ الكود DENTAL10" : lang === "ku" ? "کۆدی DENTAL10 کۆپیکرا" : "Code copied: DENTAL10");
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-0.5 font-mono text-[12.5px] font-black text-slate-950 shadow-sm transition hover:bg-amber-300 active:scale-95 cursor-pointer"
                title={lang === "ar" ? "اضغط لنسخ الكود" : lang === "ku" ? "کۆپیکردنی کۆد" : "Click to copy"}
              >
                <span>DENTAL10</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsPromoDismissed(true)}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close announcement"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md transition-all shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between gap-4 px-4 py-2.5 lg:px-6 lg:py-3.5">
          
          {/* Brand Logo */}
          {brandLogoNode}

          {/* Central Live Search Box (GooshiShop Style) */}
          <div ref={searchRef} className="relative hidden flex-1 max-w-xl md:block">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center rounded-xl bg-slate-100/90 border border-slate-200/80 transition-all focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10"
            >
              <div className="flex h-11 w-10 items-center justify-center text-slate-400">
                <Search className="size-4.5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={
                  lang === "ar"
                    ? "ابحث في أكثر من 120+ منتج أسنان، ماركة، أو كود..."
                    : lang === "ku"
                    ? "گەڕان لە نێوان ١٢٠+ بەرهەمی پزیشکی، براند..."
                    : "Search 120+ dental products, brands, or SKU..."
                }
                className="h-11 w-full bg-transparent pr-2 pl-10 text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />

              {/* Clear Query or QR Scan Button */}
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setIsSearchOpen(false);
                  }}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  title={lang === "ar" ? "مسح رمز QR" : lang === "ku" ? "سکانکردنی QR" : "Scan QR code"}
                  onClick={() => qrFileRef.current?.click()}
                  className="mx-1.5 flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-primary"
                >
                  <QrCode className="size-4.5" />
                </button>
              )}
            </form>

            {/* Live Search Suggestions Dropdown */}
            {isSearchOpen && query.trim() && (
              <div className="absolute top-full mt-2 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl z-50">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                  <span>{lang === "ar" ? "النتائج المقترحة" : lang === "ku" ? "ئەنجامە پێشنیارکراوەکان" : "Suggested Results"}</span>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="text-primary hover:underline"
                  >
                    {lang === "ar" ? "عرض الكل" : lang === "ku" ? "بینینی هەمووی" : "View All"}
                  </button>
                </div>
                {suggestions.length > 0 ? (
                  <div className="divide-y divide-slate-50 py-1">
                    {suggestions.map((p) => (
                      <Link
                        key={p.id}
                        to="/product/$id"
                        params={{ id: p.id }}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={pickName(p, lang)}
                            className="size-10 rounded-lg object-contain bg-slate-50 p-1 border border-slate-100"
                          />
                        ) : (
                          <div className="grid size-10 place-items-center rounded-lg bg-slate-50 text-base">🦷</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-slate-800">
                            {pickName(p, lang)}
                          </p>
                          <p className="text-[10.5px] text-slate-400 font-medium">
                            {p.brand} {p.sku ? `• ${p.sku}` : ""}
                          </p>
                        </div>
                        <div className="text-end">
                          <span className="text-[12px] font-black text-primary">
                            {formatPrice(p.price, lang)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-[12px] text-slate-400">
                    {lang === "ar" ? "لم يتم العثور على منتجات مطابقة" : lang === "ku" ? "هیچ بەرهەمێک نەدۆزرایەوە" : "No matching products found"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Language, Notifications, Account, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Switcher Pill */}
            {activeLangs.length > 1 && (
              <button
                onClick={() => setLang(nextLang)}
                className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 text-[12px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-95"
                title={lang === "ar" ? "تغيير اللغة" : lang === "ku" ? "گۆڕینی زمان" : "Change Language"}
              >
                <Globe className="size-4 text-slate-500" />
                <span>{nextLabel}</span>
              </button>
            )}

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Account / Profile Button (Desktop only — on mobile it is in the bottom bar) */}
            {isStaff ? (
              <Link
                to={panelTo}
                className="hidden md:inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-[12.5px] font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
              >
                <LayoutDashboard className="size-4" />
                <span>
                  {lang === "ar" ? "لوحة الإدارة" : lang === "ku" ? "داشبۆرد" : "Dashboard"}
                </span>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="hidden md:inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 sm:px-3.5 text-[12.5px] font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95 shadow-sm"
              >
                <User className="size-4 text-slate-600" />
                <span>
                  {canOrder ? (lang === "ar" ? "حسابي" : lang === "ku" ? "هەژمارەکەم" : "My Account") : (lang === "ar" ? "تسجيل الدخول" : lang === "ku" ? "چوونەژوورەوە" : "Sign In")}
                </span>
              </Link>
            )}

            {/* Mobile Search Button -> Navigates to dedicated Search Page */}
            <Link
              to="/search"
              aria-label="Search"
              className="md:hidden inline-flex size-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
            >
              <Search className="size-4.5 text-slate-600" />
            </Link>

            {/* Shopping Cart Pill Button — Shown only when logged in */}
            {canOrder && (
              <Link
                to="/cart"
                className={cn(
                  "relative inline-flex h-10 items-center gap-2 rounded-xl px-3 sm:px-4 text-[13px] font-black transition-all shadow-sm active:scale-95",
                  cart.count > 0
                    ? "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-95"
                    : "border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <ShoppingBag className="size-4.5" />
                <span className="hidden sm:inline">{t("cart")}</span>
                {cart.count > 0 && (
                  <span className="grid min-w-[20px] place-items-center rounded-full bg-white px-1 text-[11px] font-black text-primary">
                    {cart.count}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Secondary Clean Navigation Bar (Mega Menu Only) */}
        <div className="hidden border-t border-slate-100/80 bg-white lg:block">
          <div className="mx-auto flex max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between px-6 py-1.5">
            
            {/* Category Dropdown Trigger Button */}
            <div ref={catMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-4 py-2 text-[13px] font-black transition-all shadow-sm active:scale-95",
                  isCategoryMenuOpen
                    ? "bg-primary text-white shadow-primary/20"
                    : "bg-slate-100/90 text-slate-800 hover:bg-primary/10 hover:text-primary border border-slate-200/60"
                )}
              >
                <Menu className="size-4.5" />
                <span>
                  {lang === "ar"
                    ? "القائمة الرئيسية وتصنيفات المنتجات"
                    : lang === "ku"
                    ? "هاوپۆلی بەرهەمەکان و بەشەکان"
                    : "Categories & Menu"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    isCategoryMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Beautiful Mega Dropdown Menu */}
              {isCategoryMenuOpen && (
                <div className="absolute top-full mt-2.5 w-[560px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Top Section: Quick Features & Special Sections */}
                  <div className="mb-4">
                    <p className="mb-2.5 px-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      {lang === "ar" ? "الأقسام والعروض المميزة" : lang === "ku" ? "بەشە تایبەت و ئۆفەرەکان" : "Featured Sections"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      
                      {/* Flash Deals */}
                      <Link
                        to="/deals"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl bg-teal-50/80 p-2.5 border border-teal-100/80 transition-all hover:bg-teal-100 hover:scale-[1.02]"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#007979] text-white shadow-sm">
                          <Zap className="size-4.5 fill-white" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[12.5px] font-black text-teal-900">
                            {lang === "ar" ? "عروض سريعة" : lang === "ku" ? "ئۆفەری خێرا" : "Flash Deals"}
                          </span>
                          <span className="block text-[10px] font-medium text-[#007979]">
                            {lang === "ar" ? "خصومات قوية" : lang === "ku" ? "داشکاندنی بەهێز" : "Hot discounts"}
                          </span>
                        </div>
                      </Link>

                      {/* Special Offers */}
                      <Link
                        to="/offers"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl bg-blue-50/80 p-2.5 border border-blue-100/80 transition-all hover:bg-blue-100 hover:scale-[1.02]"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                          <Tag className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[12.5px] font-black text-blue-800">
                            {lang === "ar" ? "تخفيضات خاصة" : lang === "ku" ? "داشکاندنی تایبەت" : "Special Offers"}
                          </span>
                          <span className="block text-[10px] font-medium text-blue-500">
                            {lang === "ar" ? "عروض حصرية" : lang === "ku" ? "ئۆفەری تایبەت" : "Exclusive deals"}
                          </span>
                        </div>
                      </Link>

                      {/* Clinic Bundles */}
                      <Link
                        to="/bundles"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl bg-amber-50/80 p-2.5 border border-amber-100/80 transition-all hover:bg-amber-100 hover:scale-[1.02]"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                          <Boxes className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[12.5px] font-black text-amber-900">
                            {lang === "ar" ? "باقات العيادات" : lang === "ku" ? "پاکێجی کلینیک" : "Clinic Bundles"}
                          </span>
                          <span className="block text-[10px] font-medium text-amber-600">
                            {lang === "ar" ? "توفير أكبر" : lang === "ku" ? "پاشەکەوتی زۆرتر" : "Save more"}
                          </span>
                        </div>
                      </Link>

                      {/* Brands */}
                      <Link
                        to="/brands"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl bg-purple-50/80 p-2.5 border border-purple-100/80 transition-all hover:bg-purple-100 hover:scale-[1.02]"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                          <Sparkles className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[12.5px] font-black text-purple-900">
                            {lang === "ar" ? "الماركات العالمية" : lang === "ku" ? "براندە جیهانییەکان" : "Brands"}
                          </span>
                          <span className="block text-[10px] font-medium text-purple-500">
                            {lang === "ar" ? "3M, GC, Tokuyama" : lang === "ku" ? "براندی فەرمی" : "Official agents"}
                          </span>
                        </div>
                      </Link>

                      {/* Vendor Signup */}
                      <Link
                        to="/vendor-signup"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl bg-emerald-50/80 p-2.5 border border-emerald-100/80 transition-all hover:bg-emerald-100 hover:scale-[1.02] sm:col-span-2"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                          <Store className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[12.5px] font-black text-emerald-900">
                            {lang === "ar" ? "انضم كمورد / افتح متجرك" : lang === "ku" ? "وەک فرۆشیار بەشداربە" : "Sell with Us"}
                          </span>
                          <span className="block text-[10px] font-medium text-emerald-600">
                            {lang === "ar" ? "سجل كشركة أو مستودع طبي" : lang === "ku" ? "تۆمارکردنی کۆمپانیا" : "Register vendor store"}
                          </span>
                        </div>
                      </Link>

                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {lang === "ar" ? "تصنيفات المواد والمستلزمات الطبية" : lang === "ku" ? "هاوپۆلەکانی کەرەستەی پزیشکی" : "Dental Categories"}
                      </p>
                      <Link
                        to="/products"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="text-[11.5px] font-bold text-primary hover:underline"
                      >
                        {lang === "ar" ? "عرض الكل" : lang === "ku" ? "بینینی هەمووی" : "View All"}
                      </Link>
                    </div>

                    {/* Categories Grid */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {categories.map((c) => {
                        const Icon = categoryIcon(c.icon);
                        const hasValidImage = c.image_url && !c.image_url.startsWith("/__l5e");
                        return (
                          <Link
                            key={c.id}
                            to="/products"
                            search={{ cat: c.id } as never}
                            onClick={() => setIsCategoryMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12.5px] font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                          >
                            <div
                              style={tintStyle(c.hue, c.chroma)}
                              className="flex size-7 items-center justify-center rounded-lg p-1 shrink-0 border border-slate-100/60"
                            >
                              {hasValidImage ? (
                                <img
                                  src={c.image_url!}
                                  alt={pickName(c, lang)}
                                  className="size-full object-contain"
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
                                  className="size-4"
                                  strokeWidth={2}
                                  style={{ color: "var(--tint-strong)" }}
                                />
                              </div>
                            </div>
                            <span className="truncate">{pickName(c, lang)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </header>
    </>
  );
}
