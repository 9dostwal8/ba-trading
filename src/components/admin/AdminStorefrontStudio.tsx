import { lazy, Suspense, useState } from "react";
import {
  FileText,
  Home,
  Image as ImageIcon,
  Languages,
  LayoutTemplate,
  Loader2,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Lazy load individual sub-modules
const AdminDesign = lazy(() =>
  import("@/components/admin/AdminDesign").then((m) => ({ default: m.AdminDesign }))
);
const AdminHome = lazy(() =>
  import("@/components/admin/AdminHome").then((m) => ({ default: m.AdminHome }))
);
const AdminBanners = lazy(() =>
  import("@/components/admin/AdminBanners").then((m) => ({ default: m.AdminBanners }))
);
const AdminUsp = lazy(() =>
  import("@/components/admin/AdminUsp").then((m) => ({ default: m.AdminUsp }))
);
const AdminTexts = lazy(() =>
  import("@/components/admin/AdminTexts").then((m) => ({ default: m.AdminTexts }))
);
const PromoStudio = lazy(() =>
  import("@/components/promo/PromoStudio").then((m) => ({ default: m.PromoStudio }))
);

export type StorefrontSubTab =
  | "theme"
  | "home"
  | "banners"
  | "usp"
  | "texts"
  | "promo";

interface AdminStorefrontStudioProps {
  initialSubTab?: StorefrontSubTab;
}

const L = {
  title: {
    ar: "استوديو الواجهة والتصميم والتسويق",
    ku: "ستۆدیۆی ڕووکار، دیزاین و مارکێتینگ",
    en: "Storefront, Design & Marketing Studio",
  },
  subtitle: {
    ar: "تحكم كامل في مظهر المتجر: الألوان، الصفحة الرئيسية، اللافتات الإعلانية، النصوص وشريط الخدمات",
    ku: "کۆنترۆڵی تەواوی ڕووکاری فرۆشگا: ڕەنگەکان، پەڕەی سەرەکی، بانەرەکان، دەقەکان و شریتی خزمەتگوزاری",
    en: "Complete control of your storefront: colors, homepage layout, banners, multilingual texts and trust bar",
  },
  tabs: {
    theme: {
      label: { ar: "الألوان والتصميم", ku: "ڕەنگ و دیزاین", en: "Theme & Design" },
      desc: { ar: "هوية المتجر والألوان", ku: "ڕەنگ و ستایلی براند", en: "Brand colors & style" },
      icon: Palette,
      color: "text-purple-600 dark:text-purple-400",
    },
    home: {
      label: { ar: "الصفحة الرئيسية", ku: "پەڕەی سەرەکی", en: "Homepage Layout" },
      desc: { ar: "ترتيب الأقسام والمنتجات", ku: "ڕیزبەندی بەش و بەرهەمەکان", en: "Section layout & blocks" },
      icon: Home,
      color: "text-blue-600 dark:text-blue-400",
    },
    banners: {
      label: { ar: "اللافتات والإعلانات", ku: "بانەر و ڕیکلام", en: "Banners & Ads" },
      desc: { ar: "بانرات العروض والشرائح", ku: "سلایدەر و بانەری ئۆفەر", en: "Hero slides & ad slots" },
      icon: ImageIcon,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    usp: {
      label: { ar: "شريط الخدمات والمميزات", ku: "شریتی خزمەتگوزاری", en: "Trust Bar & USPs" },
      desc: { ar: "أصالة وضمان وتوصيل", ku: "دڵنیایی و متمانەی کڕیار", en: "Guarantee & trust badges" },
      icon: ShieldCheck,
      color: "text-teal-600 dark:text-teal-400",
    },
    texts: {
      label: { ar: "نصوص الموقع", ku: "دەقەکانی سایت", en: "Site Texts" },
      desc: { ar: "الترجمة والرسائل", ku: "دەق و ئاگادارییەکان", en: "Multilingual strings" },
      icon: Languages,
      color: "text-amber-600 dark:text-amber-400",
    },
    promo: {
      label: { ar: "ستوديو العروض السريعة", ku: "ستۆدیۆی ڕیکلامی خێرا", en: "Promo Studio" },
      desc: { ar: "تصميم صور السوشيال", ku: "دروستکردنی وێنەی ڕیکلام", en: "Social promo graphics" },
      icon: Sparkles,
      color: "text-pink-600 dark:text-pink-400",
    },
  },
};

export function AdminStorefrontStudio({
  initialSubTab = "theme",
}: AdminStorefrontStudioProps) {
  const { lang } = useI18n();
  const [activeSubTab, setActiveSubTab] = useState<StorefrontSubTab>(initialSubTab);

  const subTabsList: StorefrontSubTab[] = [
    "theme",
    "home",
    "banners",
    "usp",
    "texts",
    "promo",
  ];

  return (
    <div className="w-full space-y-6">
      {/* Studio Header & Tab Switcher Bar */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-6 shadow-sm backdrop-blur-md">
        
        {/* Title & Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20">
              <Palette className="size-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {L.title[lang]}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {L.subtitle[lang]}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/30 px-3 py-1 text-xs font-black text-[#007979] dark:text-teal-400">
              <Zap className="size-3.5" />
              <span>{lang === "ku" ? "کۆنترۆڵی یەکگرتوو" : lang === "ar" ? "إدارة موحدة وشاملة" : "Unified Management"}</span>
            </span>
          </div>
        </div>

        {/* Sub-Tabs Grid Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-4">
          {subTabsList.map((tabKey) => {
            const meta = L.tabs[tabKey];
            const Icon = meta.icon;
            const isActive = activeSubTab === tabKey;

            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveSubTab(tabKey)}
                className={cn(
                  "group flex flex-col items-start p-3 rounded-2xl border text-start transition-all duration-200 active:scale-95 cursor-pointer relative overflow-hidden",
                  isActive
                    ? "bg-[#007979] text-white border-[#007979] shadow-md shadow-teal-700/20"
                    : "bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl transition-colors",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  {isActive && (
                    <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
                  )}
                </div>

                <span
                  className={cn(
                    "text-xs font-black truncate w-full",
                    isActive ? "text-white" : "text-slate-900 dark:text-white"
                  )}
                >
                  {meta.label[lang]}
                </span>

                <span
                  className={cn(
                    "text-[10px] truncate w-full font-medium mt-0.5",
                    isActive ? "text-teal-100/90" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {meta.desc[lang]}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Active Sub-Module Content */}
      <div className="min-h-[500px]">
        <Suspense
          fallback={
            <div className="flex h-64 w-full items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[#007979]" />
            </div>
          }
        >
          {activeSubTab === "theme" && <AdminDesign />}
          {activeSubTab === "home" && <AdminHome />}
          {activeSubTab === "banners" && <AdminBanners />}
          {activeSubTab === "usp" && <AdminUsp />}
          {activeSubTab === "texts" && <AdminTexts />}
          {activeSubTab === "promo" && <PromoStudio />}
        </Suspense>
      </div>
    </div>
  );
}
