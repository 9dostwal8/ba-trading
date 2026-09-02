import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  MessageCircle,
  BadgePercent,
  DollarSign,
  Home,
  Hourglass,
  Image,
  Languages,
  LayoutGrid,
  Layers,
  ListOrdered,
  Package,
  Palette,
  Receipt,
  Settings,
  Shapes,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  Truck,
  Wallet,
  Zap,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  User,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoreLayout } from "@/components/StoreLayout";
import { PanelShell } from "@/components/panel/PanelShell";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { formatPrice, useI18n } from "@/lib/i18n";

const PromoStudio = lazy(() => import("@/components/promo/PromoStudio").then((m) => ({ default: m.PromoStudio })));
const AdminBanners = lazy(() => import("@/components/admin/AdminBanners").then((m) => ({ default: m.AdminBanners })));
const AdminClearance = lazy(() => import("@/components/admin/AdminClearance").then((m) => ({ default: m.AdminClearance })));
const AdminBrands = lazy(() => import("@/components/admin/AdminBrands").then((m) => ({ default: m.AdminBrands })));
const AdminBundles = lazy(() => import("@/components/admin/AdminBundles").then((m) => ({ default: m.AdminBundles })));
const AdminTiers = lazy(() => import("@/components/admin/AdminTiers").then((m) => ({ default: m.AdminTiers })));
const AdminDeals = lazy(() => import("@/components/admin/AdminDeals").then((m) => ({ default: m.AdminDeals })));
const AdminCategories = lazy(() => import("@/components/admin/AdminCategories").then((m) => ({ default: m.AdminCategories })));
const AdminCoupons = lazy(() => import("@/components/admin/AdminCoupons").then((m) => ({ default: m.AdminCoupons })));
const AdminHome = lazy(() => import("@/components/admin/AdminHome").then((m) => ({ default: m.AdminHome })));
const AdminOffers = lazy(() => import("@/components/admin/AdminOffers").then((m) => ({ default: m.AdminOffers })));
const AdminOrders = lazy(() => import("@/components/admin/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminProducts = lazy(() => import("@/components/admin/AdminProducts").then((m) => ({ default: m.AdminProducts })));
const AdminSettings = lazy(() => import("@/components/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })));
const AdminDesign = lazy(() => import("@/components/admin/AdminDesign").then((m) => ({ default: m.AdminDesign })));
const AdminTexts = lazy(() => import("@/components/admin/AdminTexts").then((m) => ({ default: m.AdminTexts })));
const AdminUsp = lazy(() => import("@/components/admin/AdminUsp").then((m) => ({ default: m.AdminUsp })));
const AdminVendors = lazy(() => import("@/components/admin/AdminVendors").then((m) => ({ default: m.AdminVendors })));
const AdminMarketing = lazy(() => import("@/components/admin/AdminMarketing").then((m) => ({ default: m.AdminMarketing })));
const AdminAccounting = lazy(() => import("@/components/admin/AdminAccounting").then((m) => ({ default: m.AdminAccounting })));
const AdminRewards = lazy(() => import("@/components/admin/AdminRewards").then((m) => ({ default: m.AdminRewards })));
const AdminNotify = lazy(() => import("@/components/admin/AdminNotify").then((m) => ({ default: m.AdminNotify })));
const AdminWhatsapp = lazy(() => import("@/components/admin/AdminWhatsapp").then((m) => ({ default: m.AdminWhatsapp })));
const AdminShipping = lazy(() => import("@/components/admin/AdminShipping").then((m) => ({ default: m.AdminShipping })));
const AdminCostTracker = lazy(() => import("@/components/admin/AdminCostTracker").then((m) => ({ default: m.AdminCostTracker })));

const PHONE_DOMAIN = "batrading.com";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "لوحة التحكم المركزية | دنتال ستور" },
      { name: "description", content: "إدارة المنتجات والعروض وأكواد الخصم والطلبات." },
      { property: "og:title", content: "لوحة التحكم | دنتال ستور" },
      { property: "og:description", content: "إدارة المتجر بالكامل." },
    ],
  }),
  component: AdminPage,
});

const L = {
  title: { ar: "لوحة التحكم", ku: "پانێلی بەڕێوەبردن", en: "Dashboard" },
  daily: { ar: "اليومي", ku: "ڕۆژانە", en: "Daily" },
  vendors: { ar: "البائعون والمال", ku: "فرۆشیار و پارە", en: "Vendors & Finance" },
  catalog: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  marketing: { ar: "العروض والتسويق", ku: "ئۆفەر و ڕیکلام", en: "Offers & Marketing" },
  fees: { ar: "أجور ومدة التسويق", ku: "کرێ و ماوەی بازاڕکردن", en: "Marketing Fees & Durations" },
  feesHint: { ar: "أسعار ومدد العروض لجميع البائعين", ku: "نرخ و ماوەی ئۆفەرەکان بۆ هەموو فرۆشیارەکان", en: "Offer prices and durations for all vendors" },
  storefront: { ar: "واجهة المتجر", ku: "ڕووکاری کۆگا", en: "Storefront" },
  notify: { ar: "إرسال إشعار", ku: "ناردنی ئاگاداری", en: "Send notification" },
  whatsapp: { ar: "رسائل واتساب", ku: "پەیامی واتسئاپ", en: "WhatsApp messages" },
  whatsappHint: { ar: "قوالب جاهزة للبائعين بضغطة واحدة", ku: "تێمپلەیتی ئامادە بۆ فرۆشیارەکان", en: "Ready templates for vendors, one tap" },
  notifyHint: { ar: "رسالة لكل الأطباء أو البائعين", ku: "پەیام بۆ پزیشکان یان فرۆشیارەکان", en: "Message dentists or vendors" },
  setup: { ar: "الإعدادات", ku: "ڕێکخستن", en: "Settings" },

  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders" },
  ordersHint: { ar: "متابعة وتغيير حالة الطلبات", ku: "بەدواداچوون و گۆڕینی دۆخ", en: "Track & change order status" },
  clearance: { ar: "قريب الانتهاء والتصفية", ku: "نزیکی بەسەرچوون و ڕیکلام", en: "Nearing Expiry & Clearance" },
  clearanceHint: { ar: "قواعد الخصم التلقائي", ku: "یاسای داشکاندنی خۆکار", en: "Automatic Discount Rules" },

  vendorList: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors" },
  vendorListHint: { ar: "إضافة بائع، العمولة، حساب الدخول", ku: "زیادکردن، کۆمیشن، هەژمار", en: "Add vendor, commission, login account" },
  charges: { ar: "فواتير التسويق", ku: "پسوولەی ڕیکلام", en: "Marketing Invoices" },
  chargesHint: { ar: "ما يدفعه البائعون", ku: "ئەوەی فرۆشیارەکان دەدەن", en: "What vendors pay" },
  accounting: { ar: "المحاسبة", ku: "ژمێریاری", en: "Accounting" },
  shipping: { ar: "أجور التوصيل", ku: "کرێی گەیاندن", en: "Shipping costs" },
  shippingHint: { ar: "سعر التوصيل لكل مدينة لكل بائع", ku: "نرخی گەیاندن بۆ هەر شار بۆ هەر فرۆشیار", en: "Per-city delivery price for each vendor" },
  accountingHint: { ar: "العمولات والتسويات والفواتير", ku: "کۆمیشن و حیسابکردن", en: "Commissions, settlements, and invoices" },

  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  productsHint: { ar: "إضافة وتعديل المنتجات", ku: "زیادکردن و دەستکاری", en: "Add & Edit Products" },
  categories: { ar: "الأقسام", ku: "بەشەکان", en: "Categories" },
  categoriesHint: { ar: "أيقونات وألوان الأقسام", ku: "ئایکون و ڕەنگ", en: "Category icons and colors" },

  promo: { ar: "إنشاء عرض سريع", ku: "ئۆفەری خێرا", en: "Create Quick Offer" },
  promoHint: { ar: "خصم، صفقة اليوم، حزمة، لافتة", ku: "داشکاندن، ئۆفەری ڕۆژ، پاکێج", en: "Discount, Deal of the Day, Bundle, Banner" },
  offers: { ar: "العروض", ku: "ئۆفەرەکان", en: "Offers" },
  deals: { ar: "صفقات اليوم", ku: "ئۆفەری ڕۆژ", en: "Deals of the Day" },
  bundles: { ar: "الحزم", ku: "پاکێجەکان", en: "Bundles" },
  tiers: { ar: "خصم الكمية", ku: "داشکاندنی بڕ", en: "Volume Discount" },
  coupons: { ar: "أكواد الخصم", ku: "کۆدی داشکاندن", en: "Discount Codes" },

  home: { ar: "ترتيب الصفحة الرئيسية", ku: "ڕیزبەندی پەڕەی سەرەکی", en: "Homepage Order" },
  brands: { ar: "الماركات", ku: "براندەکان", en: "Brands" },
  banners: { ar: "اللافتات والأماكن", ku: "بانەر و شوێنەکان", en: "Banners & Locations" },
  usp: { ar: "شريط الخدمات", ku: "هێڵی خزمەتگوزاری", en: "Services Bar" },

  settings: { ar: "إعدادات المتجر", ku: "ڕێکخستنی کۆگا", en: "Store Settings" },
  settingsHint: { ar: "الاسم، التوصيل، الأسعار، الألوان", ku: "ناو، گەیاندن، نرخ، ڕەنگ", en: "Name, Delivery, Prices, Colors" },
  texts: { ar: "نصوص الموقع", ku: "دەقەکانی سایت", en: "Site Texts" },

  wallet: { ar: "نقاط المكافأة", ku: "خاڵی خەڵات", en: "Reward points" },
  walletHint: { ar: "قيم النقاط، معدل الاستبدال، الكروت والحركات", ku: "بەهای خاڵ، ڕێژەی گۆڕین، کارت و جوڵەکان", en: "Point values, redeem rate, cards & activity" },

  costs: { ar: "تكلفة التشغيل", ku: "تێچووی کارپێکردن", en: "Running cost" },
  costsHint: { ar: "تقدير الكلفة الشهرية بالدولار", ku: "خەملاندنی تێچووی مانگانە بە دۆلار", en: "Monthly USD cost estimate" },
  revenue: { ar: "الإيرادات", ku: "داهات", en: "Revenue" },
  newOrders: { ar: "طلبات جديدة", ku: "داواکاری نوێ", en: "New Orders" },
  productsCount: { ar: "المنتجات", ku: "بەرهەم", en: "Products" },
  activeOffers: { ar: "عروض نشطة", ku: "ئۆفەری چالاک", en: "Active Offers" },
};

function AdminPage() {
  const { t, lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { tab } = Route.useSearch();
  const [active, setActive] = useState<string | null>(tab ?? null);
  const queryClient = useQueryClient();

  // Admin Login Portal Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin === true,
    queryFn: async () => {
      try {
        const [orders, products, offers] = await Promise.all([
          supabase.from("orders").select("total, status"),
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);
        const rows = orders.data ?? [];
        return {
          revenue: rows
            .filter((o) => o.status !== "cancelled")
            .reduce((s, o) => s + Number(o.total), 0),
          newOrders: rows.filter((o) => o.status === "new").length,
          products: products.count ?? 0,
          offers: offers.count ?? 0,
        };
      } catch {
        return { revenue: 0, newOrders: 0, products: 0, offers: 0 };
      }
    },
  });

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error(lang === "ar" ? "يرجى كتابة رقم الهاتف / البريد وكلمة المرور" : lang === "ku" ? "تکایە ژمارەی مۆبایل یان ئیمەیڵ و وشەی نهێنی بنووسە" : "Please enter login credentials");
      return;
    }

    setLoginLoading(true);
    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        const raw = normalizePhone(email);
        email = `${raw}@${PHONE_DOMAIN}`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success(lang === "ar" ? "تم تسجيل الدخول بنجاح!" : lang === "ku" ? "چوونەژوورەوە سەرکەوتوو بوو!" : "Login successful!");
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (/invalid login credentials/i.test(msg)) {
        toast.error(lang === "ar" ? "بيانات الدخول غير صحيحة" : lang === "ku" ? "زانیاری چوونەژوورەوە هەڵەیە" : "Invalid login credentials");
      } else {
        toast.error(msg || "Failed to sign in");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_admin");
      if (error) throw error;
      if (data) {
        toast.success(lang === "ar" ? "تم تفعيل صلاحيات المدير بنجاح!" : lang === "ku" ? "دەسەڵاتی بەڕێوەبەر بە سەرکەوتوویی چالاک کرا!" : "Admin rights claimed successfully!");
        window.location.reload();
      } else {
        toast.error(lang === "ar" ? "يوجد مدير مسجل مسبقاً في النظام" : lang === "ku" ? "بەڕێوەبەرێکی تر لە پێشدا تۆمارکراوە" : "An admin already exists");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error claiming admin");
    } finally {
      setClaiming(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Admin Portal...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Dedicated Executive Admin Login Portal
  if (!user) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-6 text-slate-100 font-sans">
        
        {/* Ambient Animated Background Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-gradient-to-tr from-[#005c5c]/30 via-teal-500/20 to-emerald-500/10 blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 right-10 size-80 rounded-full bg-teal-900/20 blur-[100px] pointer-events-none" />
        <div className="absolute top-10 left-10 size-72 rounded-full bg-cyan-900/20 blur-[90px] pointer-events-none" />

        {/* Subtle Tech Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d2729_1px,transparent_1px),linear-gradient(to_bottom,#0d2729_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          
          {/* Main Glassmorphic Card */}
          <div className="relative overflow-hidden rounded-3xl border border-teal-500/30 bg-slate-900/75 p-7 sm:p-9 shadow-[0_0_80px_rgba(0,121,121,0.22)] backdrop-blur-2xl transition-all duration-300">
            
            {/* Top Glowing Edge Strip */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-80" />

            {/* Header & Security Badge */}
            <div className="text-center mb-8 relative">
              <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#007979] via-teal-500 to-emerald-400 text-white shadow-[0_0_35px_rgba(0,200,170,0.4)] group transition-transform duration-300 hover:scale-105">
                <div className="absolute inset-0 rounded-2xl bg-white/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <ShieldCheck className="size-10 relative z-10 drop-shadow-md" strokeWidth={2.2} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                {lang === "ar" ? "بوابة الإدارة المركزية" : lang === "ku" ? "دەروازەی بەڕێوەبەرایەتی" : "Executive Admin Portal"}
              </h1>
              
              <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-950/70 border border-teal-500/30 text-[11.5px] font-bold text-teal-300 shadow-inner">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-teal-400"></span>
                </span>
                <span>{lang === "ar" ? "تسجيل الدخول المخصص لمدراء النظام" : lang === "ku" ? "چوونەژوورەوەی تایبەت بە بەڕێوەبەرانی سیستم" : "Authorized Management Access Only"}</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-5">
              
              {/* Phone / Email Input */}
              <div className="space-y-2 text-start">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 ps-0.5">
                  {lang === "ar" ? "رقم الهاتف أو البريد الإلكتروني" : lang === "ku" ? "ژمارەی مۆبایل یان ئیمەیڵ" : "Admin Phone / Email"}
                </label>
                <div className="relative group">
                  <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors">
                    <User className="size-4.5" />
                  </div>
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="0770XXXXXXX / admin@batrading.iq"
                    className="h-12 rounded-xl border-slate-700/80 bg-slate-950/70 ps-10 pe-4 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:shadow-[0_0_20px_rgba(0,200,170,0.15)] transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2 text-start">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 ps-0.5">
                  {lang === "ar" ? "كلمة المرور السرية" : lang === "ku" ? "وشەی نهێنی" : "Password"}
                </label>
                <div className="relative group">
                  <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors">
                    <KeyRound className="size-4.5" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 rounded-xl border-slate-700/80 bg-slate-950/70 ps-10 pe-11 text-sm text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 focus:shadow-[0_0_20px_rgba(0,200,170,0.15)] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4.5 text-teal-400" /> : <Eye className="size-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loginLoading}
                className="relative overflow-hidden w-full h-12 rounded-xl bg-gradient-to-r from-[#007979] via-teal-500 to-emerald-400 text-white font-black text-sm shadow-[0_0_30px_rgba(0,200,170,0.3)] hover:shadow-[0_0_40px_rgba(0,200,170,0.5)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 mt-3"
              >
                {loginLoading ? (
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="size-4.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span className="tracking-wide">{lang === "ar" ? "جاري التحقق..." : lang === "ku" ? "پشکنین..." : "Authenticating..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="size-4.5" />
                    <span className="tracking-wide">{lang === "ar" ? "تسجيل الدخول للوحة التحكم" : lang === "ku" ? "چوونەژوورەوەی پانێڵ" : "Sign In to Dashboard"}</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Footer / Back to Store */}
            <div className="mt-8 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <Link to="/" className="group flex items-center gap-1.5 hover:text-teal-300 transition-colors font-bold">
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                <span>{lang === "ar" ? "العودة إلى المتجر" : lang === "ku" ? "گەڕانەوە بۆ فرۆشگا" : "Return to Store"}</span>
              </Link>
              <span className="flex items-center gap-1.5 text-slate-400 font-medium bg-slate-950/50 px-2.5 py-1 rounded-md border border-slate-800">
                <CheckCircle2 className="size-3.5 text-teal-400" />
                <span>256-bit Encrypted</span>
              </span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // 3. User is logged in, but not an admin role in Supabase
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AdminHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">
            {lang === "ar" ? "صلاحيات غير كافية" : lang === "ku" ? "دەسەڵاتی کەم" : "Insufficient Privileges"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {lang === "ar"
              ? `أنت مسجل الدخول بالحساب (${user.email || user.phone})، ولكن هذا الحساب ليس لديه صلاحية مدير.`
              : lang === "ku"
                ? `چوویتەژوورەوە بە هەژماری (${user.email || user.phone})، بەڵام دەسەڵاتی بەڕێوەبەرت نییە.`
                : `Logged in as (${user.email || user.phone}), but this account is not registered as Admin.`}
          </p>

          <div className="space-y-2.5">
            <Button onClick={handleClaim} disabled={claiming} className="w-full font-bold bg-[#007979] hover:bg-[#006666] text-white">
              {claiming ? "..." : (lang === "ar" ? "تفعيل حساب المدير الأول (Claim Admin)" : lang === "ku" ? "چالاککردنی بەڕێوەبەری یەکەم" : "Claim First Admin Account")}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full font-bold">
              <LogOut className="size-4 me-1.5" />
              {lang === "ar" ? "تسجيل الخروج والتبديل لحساب المدير" : lang === "ku" ? "چوونەدەرەوە و گۆڕین بۆ هەژماری بەڕێوەبەر" : "Sign Out & Switch Account"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated Admin Dashboard
  const groups = [
    {
      label: L.daily[lang],
      items: [
        { key: "orders", label: L.orders[lang], hint: L.ordersHint[lang], icon: LayoutGrid },
        {
          key: "clearance",
          label: L.clearance[lang],
          hint: L.clearanceHint[lang],
          icon: Hourglass,
        },
      ],
    },
    {
      label: L.vendors[lang],
      items: [
        { key: "vendors", label: L.vendorList[lang], hint: L.vendorListHint[lang], icon: Store },
        { key: "shipping", label: L.shipping[lang], hint: L.shippingHint[lang], icon: Truck },
        { key: "wallet", label: L.wallet[lang], hint: L.walletHint[lang], icon: Sparkles },
        { key: "costs", label: L.costs[lang], hint: L.costsHint[lang], icon: DollarSign },
        {
          key: "accounting",
          label: L.accounting[lang],
          hint: L.accountingHint[lang],
          icon: Receipt,
        },
      ],
    },
    {
      label: L.catalog[lang],
      items: [
        { key: "products", label: L.products[lang], hint: L.productsHint[lang], icon: Package },
        {
          key: "categories",
          label: L.categories[lang],
          hint: L.categoriesHint[lang],
          icon: Shapes,
        },
      ],
    },
    {
      label: L.marketing[lang],
      items: [
        { key: "promo", label: L.promo[lang], hint: L.promoHint[lang], icon: Sparkles },
        { key: "fees", label: L.fees[lang], hint: L.feesHint[lang], icon: Wallet },
        { key: "offers", label: L.offers[lang], icon: BadgePercent },
        { key: "deals", label: L.deals[lang], icon: Zap },
        { key: "bundles", label: L.bundles[lang], icon: Layers },
        { key: "tiers", label: L.tiers[lang], icon: ListOrdered },
        { key: "coupons", label: L.coupons[lang], icon: Ticket },
      ],
    },
    {
      label: L.storefront[lang],
      items: [
        { key: "home", label: L.home[lang], icon: Home },
        { key: "brands", label: L.brands[lang], icon: Sparkles },
        { key: "banners", label: L.banners[lang], icon: Image },
        { key: "usp", label: L.usp[lang], icon: BadgeCheck },
        {
          key: "theme",
          label: lang === "ar" ? "استوديو التصميم" : lang === "ku" ? "ستۆدیۆی دیزاین" : "Design Studio",
          hint:
            lang === "ar"
              ? "القوالب، الألوان، بطاقات المنتج والأقسام من مكان واحد"
              : lang === "ku"
                ? "تێمپلەیت، ڕەنگ، کارتی بەرهەم و بەشەکان لە یەک شوێن"
                : "Templates, colours, product cards and sections in one place",
          icon: Palette,
        },
      ],
    },
    {
      label: L.setup[lang],
      items: [
        { key: "settings", label: L.settings[lang], hint: L.settingsHint[lang], icon: Settings },
        { key: "texts", label: L.texts[lang], icon: Languages },
        { key: "notify", label: L.notify[lang], hint: L.notifyHint[lang], icon: Bell },
        {
          key: "whatsapp",
          label: L.whatsapp[lang],
          hint: L.whatsappHint[lang],
          icon: MessageCircle,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AdminHeader />
      <div className="flex-1">
        <PanelShell
          title={L.title[lang]}
          subtitle={`${L.revenue[lang]}: ${formatPrice(stats?.revenue ?? 0, lang)}`}
          kpis={[
            { label: L.newOrders[lang], value: String(stats?.newOrders ?? 0) },
            { label: L.productsCount[lang], value: String(stats?.products ?? 0) },
            { label: L.activeOffers[lang], value: String(stats?.offers ?? 0) },
            { label: L.revenue[lang], value: formatPrice(stats?.revenue ?? 0, lang) },
          ]}
          groups={groups}
          active={active}
          onOpen={setActive}
        >
          <Suspense
            fallback={
              <div className="flex h-64 w-full items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            }
          >
            {active === "orders" && <AdminOrders />}
            {active === "clearance" && <AdminClearance />}
            {active === "vendors" && <AdminVendors />}
            {active === "shipping" && <AdminShipping />}
            {active === "accounting" && <AdminAccounting />}
            {active === "costs" && <AdminCostTracker />}
            {active === "wallet" && <AdminRewards />}
            {active === "products" && <AdminProducts />}
            {active === "categories" && <AdminCategories />}
            {active === "promo" && <PromoStudio />}
            {active === "fees" && <AdminMarketing />}
            {active === "offers" && <AdminOffers />}
            {active === "deals" && <AdminDeals />}
            {active === "bundles" && <AdminBundles />}
            {active === "tiers" && <AdminTiers />}
            {active === "coupons" && <AdminCoupons />}
            {active === "home" && <AdminHome />}
            {active === "brands" && <AdminBrands />}
            {active === "banners" && <AdminBanners />}
            {active === "usp" && <AdminUsp />}
            {active === "theme" && <AdminDesign />}
            {active === "settings" && <AdminSettings />}
            {active === "texts" && <AdminTexts />}
            {active === "notify" && <AdminNotify />}
            {active === "whatsapp" && <AdminWhatsapp />}
          </Suspense>
        </PanelShell>
      </div>
    </div>
  );
}
