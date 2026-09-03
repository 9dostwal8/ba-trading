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
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StoreLayout } from "@/components/StoreLayout";
import { PanelShell } from "@/components/panel/PanelShell";
import { PromoStudio } from "@/components/promo/PromoStudio";
import { AdminBanners } from "@/components/admin/AdminBanners";
import { AdminClearance } from "@/components/admin/AdminClearance";
import { AdminBrands } from "@/components/admin/AdminBrands";
import { AdminBundles } from "@/components/admin/AdminBundles";
import { AdminTiers } from "@/components/admin/AdminTiers";
import { AdminDeals } from "@/components/admin/AdminDeals";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminCoupons } from "@/components/admin/AdminCoupons";
import { AdminHome } from "@/components/admin/AdminHome";
import { AdminOffers } from "@/components/admin/AdminOffers";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminDesign } from "@/components/admin/AdminDesign";
import { AdminTexts } from "@/components/admin/AdminTexts";
import { AdminUsp } from "@/components/admin/AdminUsp";
import { AdminVendors } from "@/components/admin/AdminVendors";
import { AdminMarketing } from "@/components/admin/AdminMarketing";
import { AdminAccounting } from "@/components/admin/AdminAccounting";
import { AdminRewards } from "@/components/admin/AdminRewards";
import { AdminNotify } from "@/components/admin/AdminNotify";
import { AdminWhatsapp } from "@/components/admin/AdminWhatsapp";
import { AdminShipping } from "@/components/admin/AdminShipping";
import { AdminCostTracker } from "@/components/admin/AdminCostTracker";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { formatPrice, useI18n } from "@/lib/i18n";

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

  // 2FA Verification State on Login
  const [mfaStep, setMfaStep] = useState<{ factorId: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);

  // Security Hardening: Rate Limiting & CAPTCHA Challenge State
  const MAX_FAILED_ATTEMPTS = 5;
  const [failedAttempts, setFailedAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("admin_failed_attempts") || "0", 10);
  });
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Human / Bot Verification Challenge (Cryptographic / Math)
  const [challenge, setChallenge] = useState(() => ({
    a: Math.floor(Math.random() * 8) + 3,
    b: Math.floor(Math.random() * 8) + 2,
  }));
  const [challengeInput, setChallengeInput] = useState("");

  const refreshChallenge = () => {
    setChallenge({
      a: Math.floor(Math.random() * 8) + 3,
      b: Math.floor(Math.random() * 8) + 2,
    });
    setChallengeInput("");
  };

  // Check lockout on mount and tick countdown every second
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkLockout = () => {
      const lockUntil = parseInt(localStorage.getItem("admin_lockout_until") || "0", 10);
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockoutSeconds(remaining);
      if (remaining === 0 && lockUntil > 0) {
        localStorage.removeItem("admin_lockout_until");
        localStorage.setItem("admin_failed_attempts", "0");
        setFailedAttempts(0);
      }
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

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

    // 1. Guard against active security lockout
    if (lockoutSeconds > 0) {
      toast.error(
        lang === "ar"
          ? `النظام مغلق مؤقتاً لأسباب أمنية. يرجى الانتظار ${lockoutSeconds} ثانية.`
          : lang === "ku"
            ? `سیستم بە شێوەیەکی کاتی قوفڵ کراوە. تکایە ${lockoutSeconds} چرکە چاوەڕێ بکە.`
            : `Login is temporarily locked for security. Please wait ${lockoutSeconds}s.`
      );
      return;
    }

    if (!identifier.trim() || !password) {
      toast.error(
        lang === "ar"
          ? "يرجى كتابة رقم الهاتف / البريد وكلمة المرور"
          : lang === "ku"
            ? "تکایە ژمارەی مۆبایل یان ئیمەیڵ و وشەی نهێنی بنووسە"
            : "Please enter login credentials"
      );
      return;
    }

    // 2. Validate Human Challenge
    if (parseInt(challengeInput.trim(), 10) !== challenge.a + challenge.b) {
      toast.error(
        lang === "ar"
          ? "رمز التحقق البشري غير صحيح، يرجى إعادة المحاولة"
          : lang === "ku"
            ? "پشکنینی مرۆڤ هەڵەیە، تکایە دووبارە تاقی بکەرەوە"
            : "Human verification failed. Please try again."
      );
      refreshChallenge();
      return;
    }

    setLoginLoading(true);

    // Artificial baseline delay (800ms) to defeat automated fast-burst brute-force
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        const raw = normalizePhone(email);
        email = `${raw}@${PHONE_DOMAIN}`;
      }

      const [{ data, error }] = await Promise.all([
        supabase.auth.signInWithPassword({ email, password }),
        minDelay,
      ]);

      if (error) throw error;

      if (data.user) {
        // Check if account has 2FA (TOTP) enabled
        try {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");
          if (verifiedTotp) {
            setMfaStep({ factorId: verifiedTotp.id });
            setLoginLoading(false);
            return;
          }
        } catch (mfaErr) {
          console.warn("MFA factors check:", mfaErr);
        }

        // Success without 2FA: clear lockout and failure records
        if (typeof window !== "undefined") {
          localStorage.removeItem("admin_failed_attempts");
          localStorage.removeItem("admin_lockout_until");
        }
        setFailedAttempts(0);
        setLockoutSeconds(0);
        toast.success(
          lang === "ar"
            ? "تم تسجيل الدخول بنجاح!"
            : lang === "ku"
              ? "چوونەژوورەوە سەرکەوتوو بوو!"
              : "Login successful!"
        );
        queryClient.invalidateQueries();
      }
    } catch {
      // Record failed attempt and compute progressive backoff
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      refreshChallenge();

      if (typeof window !== "undefined") {
        localStorage.setItem("admin_failed_attempts", String(newAttempts));
      }

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Severe Lockout: 5 minutes (300 seconds)
        const lockUntil = Date.now() + 300 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_lockout_until", String(lockUntil));
        }
        setLockoutSeconds(300);
        toast.error(
          lang === "ar"
            ? "تم قفل الدخول لمدة 5 دقائق لتكرار المحاولات الخاطئة."
            : lang === "ku"
              ? "چوونەژوورەوە بۆ ماوەی 5 خولەک قوفڵ کرا بەهۆی هەڵەی بەردەوام."
              : "Too many failed attempts. Login locked for 5 minutes."
        );
      } else if (newAttempts >= 3) {
        // Cooldown Lockout: 30 seconds
        const lockUntil = Date.now() + 30 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_lockout_until", String(lockUntil));
        }
        setLockoutSeconds(30);
        toast.error(
          lang === "ar"
            ? `بيانات الدخول غير صحيحة. تم تفعيل قفل حماية لمدة 30 ثانية (المحاولة ${newAttempts} من ${MAX_FAILED_ATTEMPTS})`
            : lang === "ku"
              ? `زانیاری هەڵەیە. قوفڵی پاراستن بۆ 30 چرکە چالاک کرا (هەوڵی ${newAttempts} لە ${MAX_FAILED_ATTEMPTS})`
              : `Invalid credentials. 30s security cooldown enabled (Attempt ${newAttempts} of ${MAX_FAILED_ATTEMPTS})`
        );
      } else {
        toast.error(
          lang === "ar"
            ? `بيانات الدخول غير صحيحة (المتبقي ${MAX_FAILED_ATTEMPTS - newAttempts} محاولات قبل القفل)`
            : lang === "ku"
              ? `زانیاری هەڵەیە (${MAX_FAILED_ATTEMPTS - newAttempts} هەوڵ ماوە پێش قوفڵ)`
              : `Invalid credentials (${MAX_FAILED_ATTEMPTS - newAttempts} attempts remaining before lockout)`
        );
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaStep || totpCode.trim().length < 6) return;

    setMfaVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaStep.factorId });
      if (challenge.error) throw challenge.error;

      const verifyRes = await supabase.auth.mfa.verify({
        factorId: mfaStep.factorId,
        challengeId: challenge.data.id,
        code: totpCode.trim(),
      });

      if (verifyRes.error) throw verifyRes.error;

      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_failed_attempts");
        localStorage.removeItem("admin_lockout_until");
      }
      setFailedAttempts(0);
      setLockoutSeconds(0);
      setMfaStep(null);
      toast.success(
        lang === "ar"
          ? "تم تأكيد الرمز وتسجيل الدخول بنجاح!"
          : lang === "ku"
            ? "کۆدی 2FA پەسەندکرا و چوونەژوورەوە سەرکەوتوو بوو!"
            : "Two-Factor authentication verified!"
      );
      queryClient.invalidateQueries();
    } catch {
      toast.error(
        lang === "ar"
          ? "رمز المصادقة (2FA) غير صحيح أو منتهي الصلاحية"
          : lang === "ku"
            ? "کۆدی 2FA هەڵەیە یان بەسەرچووە"
            : "Invalid or expired 2FA code."
      );
    } finally {
      setMfaVerifying(false);
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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-[#031d1d] to-slate-900 p-4 sm:p-6 text-slate-100">
        <div className="w-full max-w-md">
          
          {/* Card Container */}
          <div className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            
            {/* Top Glow Accent */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-[#007979]/30 blur-3xl pointer-events-none" />

            {/* Header / Security Shield */}
            <div className="text-center mb-6 relative z-10">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#007979] to-teal-400 text-white shadow-lg shadow-teal-500/30">
                <ShieldCheck className="size-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {mfaStep
                  ? (lang === "ar" ? "المصادقة الثنائية (2FA)" : lang === "ku" ? "پشتڕاستکردنەوەی 2FA" : "Two-Factor Authentication")
                  : (lang === "ar" ? "بوابة الإدارة المركزية" : lang === "ku" ? "دەروازەی بەڕێوەبەرایەتی" : "Admin Security Portal")}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-teal-200/70 mt-1">
                {mfaStep
                  ? (lang === "ar" ? "أدخل الرمز من تطبيق Google Authenticator" : lang === "ku" ? "کۆدی ئەپی Google Authenticator بنووسە" : "Enter code from Google Authenticator")
                  : (lang === "ar" ? "تسجيل الدخول المخصص لمدراء النظام" : lang === "ku" ? "چوونەژوورەوەی تایبەت بە بەڕێوەبەرانی سیستم" : "Authorized Management Access Only")}
              </p>
            </div>

            {mfaStep ? (
              /* Step 2: 2FA Verification Form */
              <form onSubmit={handleMfaVerify} className="space-y-4 relative z-10 animate-in fade-in zoom-in-95">
                <div className="rounded-2xl border border-teal-500/30 bg-teal-950/40 p-3.5 text-center space-y-1">
                  <p className="text-xs font-bold text-teal-300">
                    {lang === "ar" ? "الرمز المكون من 6 أرقام" : lang === "ku" ? "کۆدی 6 ژمارەیی" : "6-Digit Security Code"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {lang === "ar" ? "افتح تطبيق هاتفك واكتب الرمز المؤقت:" : lang === "ku" ? "ئەپەکە بکەرەوە و کۆدە کاتییەکە بنووسە:" : "Open your authenticator app & type code:"}
                  </p>
                </div>

                <div className="space-y-1.5 text-start">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="h-12 text-center text-2xl font-mono font-black tracking-widest rounded-xl border-slate-700 bg-slate-800/90 text-teal-300 focus:border-[#007979] focus:ring-1 focus:ring-[#007979]"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="submit"
                    disabled={mfaVerifying || totpCode.trim().length < 6}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#007979] to-teal-500 text-white font-black text-sm shadow-lg shadow-teal-500/25 hover:from-[#006666] hover:to-teal-600 transition"
                  >
                    {mfaVerifying ? (
                      <div className="flex items-center gap-2">
                        <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>{lang === "ar" ? "جاري التحقق..." : lang === "ku" ? "پشکنین..." : "Verifying..."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>{lang === "ar" ? "تأكيد والدخول للوحة التحكم" : lang === "ku" ? "پەسەندکردن و چوونەژوورەوە" : "Verify & Sign In"}</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setMfaStep(null);
                      setTotpCode("");
                    }}
                    className="w-full text-xs text-slate-400 hover:text-white"
                  >
                    {lang === "ar" ? "إلغاء والعودة لتسجيل الدخول" : lang === "ku" ? "پاشگەزبوونەوە و چوونەژوورەوە لە سەرەتاوە" : "Cancel & Return to Login"}
                  </Button>
                </div>
              </form>
            ) : (
              /* Step 1: Standard Credentials Form */
              <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">
                
                {/* Security Lockout Banner */}
                {lockoutSeconds > 0 && (
                  <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-red-200 flex items-center gap-3 text-xs animate-in fade-in zoom-in-95">
                    <Clock className="size-5 shrink-0 text-red-400 animate-pulse" />
                    <div>
                      <p className="font-bold">
                        {lang === "ar" ? "قفل الحماية الأمني نشط" : lang === "ku" ? "قوفڵی پاراستن چالاکە" : "Security Lockout Active"}
                      </p>
                      <p className="text-red-300/80 mt-0.5 font-medium">
                        {lang === "ar"
                          ? `تم تجميد تسجيل الدخول مؤقتاً. يرجى الانتظار ${lockoutSeconds} ثانية.`
                          : lang === "ku"
                            ? `چوونەژوورەوە بە کاتی قوفڵ کراوە. تکایە ${lockoutSeconds} چرکە چاوەڕێ بکە.`
                            : `Too many failed attempts. Try again in ${lockoutSeconds}s.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Failed Attempt Warning Banner */}
                {failedAttempts > 0 && lockoutSeconds === 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-amber-200 flex items-center gap-2 text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                    <span>
                      {lang === "ar"
                        ? `تحذير أمني: محاولة خاطئة (${failedAttempts} من ${MAX_FAILED_ATTEMPTS})`
                        : lang === "ku"
                          ? `ئاگاداری ئاسایش: هەوڵی هەڵە (${failedAttempts} لە ${MAX_FAILED_ATTEMPTS})`
                          : `Security Alert: ${failedAttempts} of ${MAX_FAILED_ATTEMPTS} failed attempts`}
                    </span>
                  </div>
                )}

                {/* Phone / Email Input */}
                <div className="space-y-1.5 text-start">
                  <label className="text-xs font-bold text-slate-300">
                    {lang === "ar" ? "رقم الهاتف أو البريد الإلكتروني" : lang === "ku" ? "ژمارەی مۆبایل یان ئیمەیڵ" : "Admin Phone / Email"}
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="0770XXXXXXX / admin@batrading.iq"
                      className="h-11 rounded-xl border-slate-700 bg-slate-800/80 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#007979] focus:ring-1 focus:ring-[#007979]"
                      required
                      autoFocus
                      disabled={lockoutSeconds > 0}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 text-start">
                  <label className="text-xs font-bold text-slate-300">
                    {lang === "ar" ? "كلمة المرور السرية" : lang === "ku" ? "وشەی نهێنی" : "Password"}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 rounded-xl border-slate-700 bg-slate-800/80 pe-10 ps-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#007979] focus:ring-1 focus:ring-[#007979]"
                      required
                      disabled={lockoutSeconds > 0}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                      disabled={lockoutSeconds > 0}
                    >
                      {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Anti-Bot Security Challenge */}
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{lang === "ar" ? "التحقق الأمني (منع الروبوتات)" : lang === "ku" ? "پشکنینی ئاسایش (دژی ڕۆبۆت)" : "Security Challenge (Anti-Bot)"}</span>
                    <span className="text-[10px] text-teal-400/90 font-mono tracking-wider uppercase bg-teal-950/60 border border-teal-500/30 px-1.5 py-0.5 rounded">Human Check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-between h-11 rounded-xl border border-teal-500/30 bg-slate-800/90 px-3.5 text-sm text-white font-mono select-none">
                      <span className="tracking-widest text-teal-300 font-bold text-base">
                        {challenge.a} + {challenge.b} = ?
                      </span>
                      <button
                        type="button"
                        onClick={refreshChallenge}
                        title="Refresh Challenge"
                        className="text-slate-400 hover:text-teal-300 transition p-1"
                        disabled={lockoutSeconds > 0}
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      placeholder={lang === "ar" ? "الناتج" : lang === "ku" ? "وەڵام" : "Answer"}
                      className="w-24 h-11 rounded-xl border-slate-700 bg-slate-800/80 text-center font-black text-base text-teal-300 placeholder:text-slate-500 focus:border-[#007979] focus:ring-1 focus:ring-[#007979]"
                      required
                      disabled={lockoutSeconds > 0}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loginLoading || lockoutSeconds > 0}
                  className={`w-full h-11 rounded-xl text-white font-black text-sm shadow-lg transition mt-2 ${
                    lockoutSeconds > 0
                      ? "bg-red-900/60 border border-red-500/40 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-[#007979] to-teal-500 shadow-teal-500/25 hover:from-[#006666] hover:to-teal-600 active:scale-[0.99]"
                  }`}
                >
                  {lockoutSeconds > 0 ? (
                    <div className="flex items-center justify-center gap-2 text-red-200">
                      <Clock className="size-4 animate-pulse" />
                      <span>
                        {lang === "ar"
                          ? `مغلق مؤقتاً (انتظر ${lockoutSeconds} ثانية)`
                          : lang === "ku"
                            ? `قوفڵ کراوە (${lockoutSeconds} چرکە)`
                            : `Security Locked (${lockoutSeconds}s)`}
                      </span>
                    </div>
                  ) : loginLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>{lang === "ar" ? "جاري التحقق..." : lang === "ku" ? "پشکنین..." : "Verifying..."}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="size-4" />
                      <span>{lang === "ar" ? "دخول لوحة التحكم" : lang === "ku" ? "چوونەژوورەوەی پانێڵ" : "Sign In to Dashboard"}</span>
                    </div>
                  )}
                </Button>
              </form>
            )}

            {/* Footer / Back to Store */}
            <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <Link to="/" className="flex items-center gap-1 hover:text-teal-400 transition font-bold">
                <span>{lang === "ar" ? "← العودة إلى المتجر" : lang === "ku" ? "← گەڕانەوە بۆ فرۆشگا" : "← Return to Store"}</span>
              </Link>
              <span className="flex items-center gap-1 text-slate-500">
                <CheckCircle2 className="size-3.5 text-teal-500" />
                <span>SSL Encrypted</span>
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
            <Button onClick={handleLogout} variant="default" className="w-full font-bold bg-[#007979] hover:bg-[#006666] text-white">
              <LogOut className="size-4 me-1.5" />
              {lang === "ar" ? "تسجيل الخروج والتبديل لحساب المدير" : lang === "ku" ? "چوونەدەرەوە و گۆڕین بۆ هەژماری بەڕێوەبەر" : "Sign Out & Switch Account"}
            </Button>
            <Button asChild variant="outline" className="w-full font-bold">
              <Link to="/">
                <ArrowRight className="size-4 me-1.5" />
                {lang === "ar" ? "العودة إلى واجهة المتجر" : lang === "ku" ? "گەڕانەوە بۆ فرۆشگا" : "Return to Store"}
              </Link>
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
          onClose={() => setActive(null)}
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
        </PanelShell>
      </div>
    </div>
  );
}
