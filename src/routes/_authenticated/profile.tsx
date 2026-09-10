import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  Copy,
  Globe,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  User,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { toast } from "sonner";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { TwoFactorModal } from "@/components/profile/TwoFactorModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyVendor } from "@/hooks/useVendor";
import { useFavorites } from "@/hooks/useFavorites";
import { formatPrice, useI18n } from "@/lib/i18n";
import { useMyWallet } from "@/lib/wallet";
import {
  coinsToMoney,
  formatCoins,
  REWARD_TITLE,
  useRewardSettings,
  useRewardSummary,
} from "@/lib/rewards";
import { useTotalSavings } from "@/lib/savings";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي | دنتال ستور" },
      { name: "description", content: "حسابك: البيانات، الطلبات، المحفظة وعناوين التوصيل." },
      { property: "og:title", content: "ملفي الشخصي | دنتال ستور" },
      { property: "og:description", content: "إدارة بياناتك وعناوين التوصيل والمحفظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const L = {
  profileTitle: { ar: "الملف الشخصي", ku: "پڕۆفایلی من", en: "My Profile" },
  verifiedCustomer: { ar: "طبيب / عميل موثق", ku: "پزیشک / کڕیاری باوەڕپێکراو", en: "Verified Doctor / Client" },
  vendorBadge: { ar: "شريك مورد معتمد", ku: "فرۆشیاری باوەڕپێکراو", en: "Verified Vendor Partner" },
  editProfile: { ar: "تعديل البيانات الشخصية", ku: "دەستکاریکردنی زانیاری کەسی", en: "Edit Personal Info" },
  editHint: { ar: "الاسم، اسم العيادة ورقم الهاتف", ku: "ناو، ناوی کلینیک و ژمارەی مۆبایل", en: "Name, Clinic & Phone Number" },
  panel: { ar: "بوابة الموردين والشركاء", ku: "دەروازەی فرۆشیار و براندەکان", en: "Vendor & Brand Portal" },
  accountSection: { ar: "إعدادات الحساب والأمان", ku: "ڕێکخستنی هەژمار و پاراستن", en: "Account & Security" },
  shoppingSection: { ar: "الطلبات والمحفظة والتوفير", ku: "داواکارییەکان، جزدان و پاشەکەوت", en: "Orders, Wallet & Savings" },
  supportSection: { ar: "الدعم والمساعدة واللغة", ku: "پشتیوانی و یارمەتی و زمان", en: "Support & Language" },
  wallet: { ar: "محفظتي والنقاط", ku: "جزدان و خاڵەکانم", en: "My Wallet & Points" },
  walletHint: { ar: "نقاط المكافأة، طرق الكسب والاستبدال", ku: "خاڵەکانی پاداشت، شێوازی قازانج و گۆڕینەوە", en: "Reward points, earning & redeeming" },
  myOrders: { ar: "سجل الطلبات", ku: "مێژووی داواکارییەکان", en: "Orders History" },
  ordersHint: { ar: "تتبع حالات الشحن وجميع فواتيرك", ku: "بەدواداچوونی گەیاندن و هەموو پسوڵەکانت", en: "Track deliveries & all invoices" },
  addresses: { ar: "عناوين التوصيل", ku: "ناونیشانەکانی گەیاندن", en: "Delivery Addresses" },
  addressHint: { ar: "عناوين العيادة والمختبر المحفوظة", ku: "ناونیشانە پارێزراوەکانی کلینیک و تاقیگە", en: "Saved Clinic & Lab Addresses" },
  mySavings: { ar: "إجمالي التوفير", ku: "کۆی پاشەکەوت", en: "Total Savings" },
  mySavingsHint: { ar: "كل ما وفرته من العروض والخصومات والنقاط", ku: "هەموو ئەو پاشەکەوتەی لە ئۆفەر و داشکاندنەکان بەدەستهاتووە", en: "Everything saved from offers, discounts & points" },
  savingsCTA: { ar: "تفاصيل التوفير", ku: "وردەکاری پاشەکەوت", en: "Savings Breakdown" },
  favorites: { ar: "قائمة المفضلة", ku: "بەرهەمە دڵخوازەکان", en: "Favorite Products" },
  favoritesHint: { ar: "المنتجات التي قمت بحفظها للشراء لاحقاً", ku: "ئەو بەرهەمانەی پاشەکەوتت کردوون بۆ کڕین", en: "Items saved for later purchase" },
  whatsappDirect: { ar: "تواصل مباشر عبر واتساب", ku: "پەیوەندی ڕاستەوخۆ بە واتسئاپ", en: "Direct WhatsApp Support" },
  whatsappHint: { ar: "خدمة العملاء والطلبات الخاصة على مدار الساعة", ku: "خزمەتگوزاری بەشداربووان و داواکاری تایبەت", en: "24/7 Customer care & special orders" },
  language: { ar: "لغة التطبيق", ku: "زمانی بەرنامە", en: "App Language" },
  signOut: { ar: "تسجيل الخروج من الحساب", ku: "چوونەدەرەوە لە هەژمار", en: "Sign Out" },
  copied: { ar: "تم النسخ بنجاح", ku: "کۆپی کرا", en: "Copied successfully" },
};

function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { user } = useAuth();
  const { data: vendor } = useMyVendor(user?.id);
  const { favoriteIds } = useFavorites();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: rewardSettings } = useRewardSettings();
  const walletOn = rewardSettings?.rewards_enabled === true;
  const { data: wallet } = useMyWallet(user?.id, walletOn);
  const { data: rewardSummary } = useRewardSummary(user?.id, walletOn);
  const rate = Number(
    rewardSummary?.points_per_1000_iqd || rewardSettings?.points_per_1000_iqd || 0
  );
  const balanceValue = coinsToMoney(Number(rewardSummary?.balance || 0), rate);
  const { breakdown } = useTotalSavings(user?.id, balanceValue);

  // 1. Fetch Profile Data
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").maybeSingle()).data,
  });

  // 2. Fetch Orders Count
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders-count", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total")
        .eq("user_id", user?.id ?? "");
      return data || [];
    },
    enabled: !!user?.id,
  });

  // 3. Fetch Saved Addresses Count
  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () =>
      (await supabase.from("addresses").select("id").eq("user_id", user?.id ?? "")).data ?? [],
    enabled: !!user?.id,
  });

  // 4. Two-Factor Authentication Status
  const [show2FaModal, setShow2FaModal] = useState(false);
  const { data: mfaActive, refetch: refetchMfa } = useQuery({
    queryKey: ["mfa-factors", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        return Boolean(data?.totp?.some((f) => f.status === "verified"));
      } catch {
        return false;
      }
    },
  });

  const copyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label}: ${L.copied[lang]}`);
  };

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const userDisplayName =
    profile?.full_name ||
    (user?.user_metadata?.["full_name"] as string) ||
    (lang === "ar" ? "طبيب أسنان" : lang === "ku" ? "پزیشکی ددان" : "Doctor / Client");

  const displayPhone = profile?.phone || (user?.user_metadata?.["phone"] as string) || "";
  const displayEmail = user?.email || "";

  return (
    <StoreLayout>
      <PageBlocks page="profile" />
      
      <div className="mx-auto max-w-4xl px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">

        {/* 1. HERO PROFILE CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-b from-white via-teal-50/25 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 sm:p-7 shadow-xl shadow-teal-500/5 backdrop-blur-md">
          
          {/* Decorative ambient background glows */}
          <div className="pointer-events-none absolute -top-16 -end-16 size-48 rounded-full bg-gradient-to-br from-[#007979]/20 to-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -start-16 size-48 rounded-full bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            
            {/* User Avatar + Identity Info */}
            <div className="flex items-center gap-4 sm:gap-5">
              
              {/* Avatar with Glow Ring */}
              <div className="relative shrink-0">
                <div className="flex size-16 sm:size-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#007979] to-teal-600 text-white font-black text-2xl sm:text-3xl shadow-lg shadow-teal-600/30 border-2 border-white dark:border-slate-800">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -end-1 flex size-6 sm:size-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-slate-900 shadow-sm" title="Online">
                  <BadgeCheck className="size-4 sm:size-4.5" />
                </div>
              </div>

              {/* Names & Contact Pills */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {userDisplayName}
                  </h1>
                  
                  {/* Verified Badge */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[11px] font-black text-[#007979] dark:text-teal-400">
                    <ShieldCheck className="size-3" />
                    <span>{vendor ? L.vendorBadge[lang] : L.verifiedCustomer[lang]}</span>
                  </span>
                </div>

                {/* Contact metadata with quick copy */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {displayPhone && (
                    <button
                      type="button"
                      onClick={() => copyText(displayPhone, lang === "ku" ? "ژمارەی مۆبایل" : "رقم الموبايل")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-[#007979] transition active:scale-95"
                      title={lang === "ku" ? "کۆپیکردنی مۆبایل" : "نسخ رقم الموبايل"}
                    >
                      <span dir="ltr" className="font-mono">{displayPhone}</span>
                      <Copy className="size-3 opacity-60" />
                    </button>
                  )}

                  {displayEmail && (
                    <button
                      type="button"
                      onClick={() => copyText(displayEmail, lang === "ku" ? "ئیمەیڵ" : "البريد الإلكتروني")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-[#007979] transition active:scale-95"
                      title={lang === "ku" ? "کۆپیکردنی ئیمەیڵ" : "نسخ البريد"}
                    >
                      <span className="font-mono truncate max-w-[170px] sm:max-w-[220px]">{displayEmail}</span>
                      <Copy className="size-3 opacity-60" />
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* Quick Actions (Edit Profile + Logout Button) */}
            <div className="flex items-center gap-2 sm:self-center">
              <Link
                to="/profile/edit"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-black text-slate-800 dark:text-slate-100 shadow-sm hover:border-[#007979] hover:text-[#007979] active:scale-95 transition"
              >
                <Pencil className="size-3.5 text-[#007979] dark:text-teal-400" />
                <span>{lang === "ku" ? "دەستکاری" : lang === "ar" ? "تعديل" : "Edit"}</span>
              </Link>

              <button
                type="button"
                onClick={signOut}
                aria-label={t("signOut")}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-3.5 py-2.5 text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition"
                title={t("signOut")}
              >
                <LogOut className="size-4" />
                <span className="hidden xs:inline">{lang === "ku" ? "دەرچوون" : lang === "ar" ? "خروج" : "Logout"}</span>
              </button>
            </div>

          </div>

        </div>

        {/* 2. STATS & METRICS GRID (Interactive Quick Navigation) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* A. Total Savings Banner Card */}
          <Link
            to="/savings"
            className="group relative overflow-hidden rounded-3xl border border-teal-500/30 bg-gradient-to-br from-[#007979] via-teal-700 to-teal-900 p-4 sm:p-5 text-white shadow-lg shadow-teal-800/15 hover:shadow-teal-800/30 transition-all active:scale-[0.98] col-span-2"
          >
            <PiggyBank className="pointer-events-none absolute -bottom-3 -end-3 size-24 text-white/10 group-hover:scale-110 transition-transform duration-300" />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-xs font-black text-teal-200">
                  <TrendingDown className="size-3.5" />
                  {L.mySavings[lang]}
                </span>
                <p className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  {formatPrice(breakdown.total, lang)}
                </p>
                <p className="text-[11px] font-semibold text-teal-100/80 truncate max-w-[240px] sm:max-w-none">
                  {L.mySavingsHint[lang]}
                </p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white text-[#007979] px-3 py-1.5 text-xs font-black shadow-md group-hover:bg-teal-50 transition">
                <Tag className="size-3" />
                <span>{L.savingsCTA[lang]}</span>
              </span>
            </div>
          </Link>

          {/* B. Reward Points & Coins Card */}
          {walletOn && (
            <Link
              to="/profile/wallet"
              className="group relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:to-slate-900 p-4 sm:p-5 shadow-sm hover:border-amber-400 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black shadow-xs">
                  <Sparkles className="size-5" />
                </div>
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                  {REWARD_TITLE[lang]}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {formatCoins(wallet?.balance ?? 0, lang)}
                </p>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">
                  ≈ {formatPrice(balanceValue, lang)}
                </p>
              </div>
            </Link>
          )}

          {/* C. Orders Count Card */}
          <Link
            to="/orders"
            className="group relative overflow-hidden rounded-3xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-950/30 dark:to-slate-900 p-4 sm:p-5 shadow-sm hover:border-purple-400 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 font-black shadow-xs">
                <Package className="size-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 rounded-full bg-purple-500/10 px-2 py-0.5 border border-purple-500/20">
                {t("myOrders")}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {orders.length}
              </p>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {orders.length > 0 ? (lang === "ku" ? "داواکاری تۆمارکراو" : "طلبات مسجلة") : (lang === "ku" ? "هیچ داواکاری نییە" : "لا توجد طلبات")}
              </p>
            </div>
          </Link>

          {/* D. Saved Addresses Count Card */}
          <Link
            to="/profile/addresses"
            className="group relative overflow-hidden rounded-3xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-950/30 dark:to-slate-900 p-4 sm:p-5 shadow-sm hover:border-blue-400 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black shadow-xs">
                <MapPin className="size-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 rounded-full bg-blue-500/10 px-2 py-0.5 border border-blue-500/20">
                {L.addresses[lang]}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {addresses.length}
              </p>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {lang === "ku" ? "ناونیشانی گەیاندن" : "عناوين محفوظة"}
              </p>
            </div>
          </Link>

          {/* E. Favorite Items Card */}
          <Link
            to="/profile/favorites"
            className="group relative overflow-hidden rounded-3xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/30 dark:to-slate-900 p-4 sm:p-5 shadow-sm hover:border-rose-400 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black shadow-xs">
                <Heart className="size-5 fill-rose-500/20" />
              </div>
              <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 rounded-full bg-rose-500/10 px-2 py-0.5 border border-rose-500/20">
                {L.favorites[lang]}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {favoriteIds.length}
              </p>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {lang === "ku" ? "بەرهەمی دڵخواز" : "منتجات مفضلة"}
              </p>
            </div>
          </Link>

        </div>

        {/* 3. VENDOR / BRAND PORTAL ACCESS (If User is a Vendor) */}
        {vendor && (
          <div className="overflow-hidden rounded-3xl border border-[#007979]/40 bg-gradient-to-r from-teal-500/10 to-blue-500/10 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#007979] text-white shadow-md shadow-teal-500/20">
                  <Store className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {L.panel[lang]}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {lang === "ku" ? "بەڕێوەبردنی بەرهەمەکان، داواکاری و فرۆشەکانت" : "إدارة منتجاتك ومبيعاتك وطلبات الشراء"}
                  </p>
                </div>
              </div>
              <Link
                to="/brand"
                className="rounded-xl bg-[#007979] hover:bg-teal-700 text-white px-4 py-2 text-xs font-black shadow-sm transition active:scale-95 shrink-0"
              >
                {t("brandPortal")}
              </Link>
            </div>
          </div>
        )}

        {/* 4. MAIN CATEGORIZED NAVIGATION HUB */}
        <div className="space-y-4">
          
          {/* Section A: Account & Security */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {L.accountSection[lang]}
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              
              {/* 1. Edit Profile */}
              <ModernRowLink
                to="/profile/edit"
                icon={UserRound}
                iconColor="text-blue-600 bg-blue-50 dark:bg-blue-950/50"
                label={L.editProfile[lang]}
                hint={L.editHint[lang]}
              />

              {/* 2. 2FA Security Modal */}
              <button
                type="button"
                onClick={() => setShow2FaModal(true)}
                className="flex w-full items-center justify-between p-4 sm:px-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group text-start"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 shrink-0">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {lang === "ar"
                          ? "المصادقة الثنائية (Google Authenticator)"
                          : lang === "ku"
                          ? "پشتڕاستکردنەوەی دوو قۆناغی (2FA)"
                          : "Two-Factor Auth (2FA)"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          mfaActive
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {mfaActive
                          ? lang === "ar" ? "مفعل" : lang === "ku" ? "چالاکە" : "Active"
                          : lang === "ar" ? "غير مفعل" : lang === "ku" ? "ناچالاکە" : "Off"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {lang === "ar"
                        ? "حماية الحساب بتطبيق Google Authenticator"
                        : lang === "ku"
                        ? "پاراستنی هەژمار بە ئەپی Google Authenticator"
                        : "Protect account with Google Authenticator"}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="size-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 rtl:rotate-0 ltr:rotate-180 transition shrink-0 ms-2" />
              </button>

              {/* 3. Delivery Addresses */}
              <ModernRowLink
                to="/profile/addresses"
                icon={MapPin}
                iconColor="text-teal-600 bg-teal-50 dark:bg-teal-950/50"
                label={L.addresses[lang]}
                hint={L.addressHint[lang]}
                badge={String(addresses.length)}
              />

            </div>
          </div>

          {/* Section B: Orders & Shopping Hub */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {L.shoppingSection[lang]}
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              
              {/* 1. Orders */}
              <ModernRowLink
                to="/orders"
                icon={Package}
                iconColor="text-purple-600 bg-purple-50 dark:bg-purple-950/50"
                label={L.myOrders[lang]}
                hint={L.ordersHint[lang]}
                badge={orders.length > 0 ? `${orders.length}` : undefined}
              />

              {/* 2. Favorite Products */}
              <ModernRowLink
                to="/profile/favorites"
                icon={Heart}
                iconColor="text-rose-600 bg-rose-50 dark:bg-rose-950/50"
                label={L.favorites[lang]}
                hint={L.favoritesHint[lang]}
                badge={favoriteIds.length > 0 ? `${favoriteIds.length}` : undefined}
              />

              {/* 3. Wallet & Rewards */}
              {walletOn && (
                <ModernRowLink
                  to="/profile/wallet"
                  icon={Sparkles}
                  iconColor="text-amber-600 bg-amber-50 dark:bg-amber-950/50"
                  label={L.wallet[lang]}
                  hint={L.walletHint[lang]}
                  badge={formatCoins(wallet?.balance ?? 0, lang)}
                />
              )}

              {/* 3. Savings Breakdown */}
              <ModernRowLink
                to="/savings"
                icon={PiggyBank}
                iconColor="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50"
                label={L.mySavings[lang]}
                hint={L.mySavingsHint[lang]}
                badge={formatPrice(breakdown.total, lang)}
              />

            </div>
          </div>

          {/* Section C: Support & Settings */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {L.supportSection[lang]}
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              
              {/* 1. WhatsApp Support */}
              <a
                href={`https://wa.me/9647702269722?text=${encodeURIComponent(
                  lang === "ku"
                    ? `سڵاو، پێویستم بە هاوکارییە لە دنتال ستور (هەژمار: ${userDisplayName})`
                    : `مرحباً، أحتاج إلى مساعدة في متجر دنتال ستور (الحساب: ${userDisplayName})`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 sm:px-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 shrink-0">
                    <MessageCircle className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate block">
                      {L.whatsappDirect[lang]}
                    </span>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {L.whatsappHint[lang]}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="size-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 rtl:rotate-0 ltr:rotate-180 transition shrink-0 ms-2" />
              </a>

              {/* 2. Language Switcher Quick Row */}
              <div className="flex items-center justify-between p-4 sm:px-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 shrink-0">
                    <Globe className="size-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">
                      {L.language[lang]}
                    </span>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {lang === "ku" ? "کوردی" : lang === "ar" ? "العربية" : "English"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLang("ku")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      lang === "ku"
                        ? "bg-white dark:bg-slate-700 text-[#007979] dark:text-teal-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    کوردی
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("ar")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      lang === "ar"
                        ? "bg-white dark:bg-slate-700 text-[#007979] dark:text-teal-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                      lang === "en"
                        ? "bg-white dark:bg-slate-700 text-[#007979] dark:text-teal-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* 3. Sign Out Button */}
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center justify-between p-4 sm:px-5 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 transition group text-start"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 shrink-0">
                    <LogOut className="size-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 block">
                      {L.signOut[lang]}
                    </span>
                    <p className="text-xs font-semibold text-rose-500/70 dark:text-rose-400/60">
                      {lang === "ku" ? "داخستنی دانیشتنی ئێستای ماڵپەڕ" : "الخروج الآمن من هذا الجهاز"}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="size-5 text-rose-400 group-hover:text-rose-600 rtl:rotate-0 ltr:rotate-180 transition shrink-0 ms-2" />
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* 2FA Modal */}
      <TwoFactorModal
        open={show2FaModal}
        onOpenChange={setShow2FaModal}
        onStatusChange={() => refetchMfa()}
      />

      <PageBlocks page="profile" position="bottom" />
    </StoreLayout>
  );
}

function ModernRowLink({
  to,
  icon: Icon,
  iconColor,
  label,
  hint,
  badge,
}: {
  to: "/orders" | "/brand" | "/profile/edit" | "/profile/wallet" | "/profile/addresses" | "/savings";
  icon: ComponentType<{ className?: string }>;
  iconColor?: string;
  label: string;
  hint?: string;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-4 sm:px-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition group"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`flex size-10 items-center justify-center rounded-2xl shrink-0 ${iconColor || "bg-teal-50 text-teal-600"}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 truncate block">
            {label}
          </span>
          {hint && (
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {hint}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ms-2">
        {badge && (
          <span className="rounded-xl bg-[#007979]/10 border border-[#007979]/20 px-2.5 py-1 text-xs font-black text-[#007979] dark:text-teal-400">
            {badge}
          </span>
        )}
        <ChevronLeft className="size-5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 rtl:rotate-0 ltr:rotate-180 transition" />
      </div>
    </Link>
  );
}
