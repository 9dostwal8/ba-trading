import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Save,
  Loader2,
  Crown,
  Sparkles,
  Package,
  Layers,
  Shapes,
  Store,
  Hourglass,
  BadgePercent,
  Zap,
  ListOrdered,
  LayoutGrid,
  Truck,
  Ticket,
  Receipt,
  DollarSign,
  Wallet,
  MessageCircle,
  Bell,
  Palette,
  Home,
  Image,
  BadgeCheck,
  Languages,
  Database,
  Terminal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AdminCard } from "../AdminKit";
import { supabase } from "@/integrations/supabase/client";
import type { UserItem } from "./SettingsUsersTab";

export interface PermissionDefinition {
  key: string;
  label: { ar: string; ku: string; en: string };
  description: { ar: string; ku: string; en: string };
  icon: any;
  category: "catalog" | "orders" | "finance" | "marketing" | "system";
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Catalog & Inventory
  {
    key: "products",
    category: "catalog",
    icon: Package,
    label: { ar: "المنتجات والمخزون", ku: "کەتەلۆگ و بەرهەمەکان", en: "Products & Catalog" },
    description: {
      ar: "إضافة وتعديل وحذف المنتجات وضبط الأسعار",
      ku: "زیادکردن و دەستکاریکردنی بەرهەمەکان و نرخ",
      en: "Add, edit, delete products & inventory pricing",
    },
  },
  {
    key: "categories",
    category: "catalog",
    icon: Shapes,
    label: { ar: "الأقسام والفئات", ku: "هاوپۆل و بەشەکان", en: "Categories & Sections" },
    description: {
      ar: "إدارة شجرة التصنيفات والترتيب",
      ku: "بەڕێوەبردنی هاوپۆلەکان و ڕیزبەندی",
      en: "Manage categories tree and sorting",
    },
  },
  {
    key: "brands",
    category: "catalog",
    icon: Sparkles,
    label: { ar: "البراندات والماركات", ku: "براندە فەرمییەکان", en: "Brands & Trademarks" },
    description: {
      ar: "إدارة العلامات التجارية وتنسيقها",
      ku: "بەڕێوەبردنی براندە بازرگانییەکان",
      en: "Manage brand profiles and branding",
    },
  },
  {
    key: "vendors",
    category: "catalog",
    icon: Store,
    label: { ar: "الموردون والشركات", ku: "دابینکەر و کۆمپانیاکان", en: "Vendors & Suppliers" },
    description: {
      ar: "الموافقة على الموردين وحساباتهم",
      ku: "پەسەندکردنی دابینکەران و کۆگاکانیان",
      en: "Vendor applications and store member links",
    },
  },
  {
    key: "clearance",
    category: "catalog",
    icon: Hourglass,
    label: { ar: "الأوتلت وتواريخ الصلاحية", ku: "ئاوتلێت و بەسەرچوون", en: "Clearance & Expiry" },
    description: {
      ar: "عروض البضائع المخفضة وتواريخ الانتهاء",
      ku: "داشکاندنی بەرهەمە نزیک بەسەرچووەکان",
      en: "Short-expiry inventory and outlet items",
    },
  },
  {
    key: "bundles",
    category: "catalog",
    icon: Layers,
    label: { ar: "الباقات والحزم", ku: "پاکێج و بەندڵەکان", en: "Bundles & Combos" },
    description: {
      ar: "إنشاء حزم المنتجات المدمجة",
      ku: "دروستکردنی بەندڵ و باکێجی پێکەوەیی",
      en: "Create multi-product bundles and kits",
    },
  },
  {
    key: "offers",
    category: "catalog",
    icon: BadgePercent,
    label: { ar: "العروض والتخفيضات", ku: "ئۆفەر و داشکاندنەکان", en: "Offers & Promotions" },
    description: {
      ar: "إدارة العروض الخاصة والحملات الترويجية",
      ku: "کۆنترۆڵی ئۆفەر و داشکاندنی بەرهەمەکان",
      en: "Promotional campaigns and discounted offers",
    },
  },
  {
    key: "tiers",
    category: "catalog",
    icon: ListOrdered,
    label: { ar: "فئات وأسعار الأطباء", ku: "پلەی داشکاندنی پزیشکان", en: "Doctor Pricing Tiers" },
    description: {
      ar: "تحديد مستويات التسعير والخصومات للأطباء",
      ku: "دیاریکردنی پلە و داشکاندنی تایبەت بە پزیشکان",
      en: "Tiered volume discounts and VIP doctors",
    },
  },

  // 2. Orders & Fulfillment
  {
    key: "orders",
    category: "orders",
    icon: LayoutGrid,
    label: { ar: "إدارة الطلبات", ku: "بەڕێوەبردنی داواکارییەکان", en: "Orders Management" },
    description: {
      ar: "معالجة الطلبات وتغيير الحالات والطباعة",
      ku: "بینین و گۆڕینی دۆخی داواکاری و چاپکردنی پسوولە",
      en: "Process orders, status workflow, and invoices",
    },
  },
  {
    key: "shipping",
    category: "orders",
    icon: Truck,
    label: { ar: "الشحن والتوصيل", ku: "گەیاندن و پارێزگاکان", en: "Shipping & Delivery" },
    description: {
      ar: "تسعير التوصيل حسب المحافظات والمدن",
      ku: "نرخەکانی گەیاندن بۆ هەموو پارێزگاکان",
      en: "Delivery zones, courier rates and thresholds",
    },
  },
  {
    key: "coupons",
    category: "orders",
    icon: Ticket,
    label: { ar: "كوبونات الخصم", ku: "کوپۆنی داشکاندن", en: "Discount Coupons" },
    description: {
      ar: "توليد قسائم الخصم وتحديد شروطها",
      ku: "دروستکردنی کۆدی کوپۆن و مەرجەکان",
      en: "Generate promo codes and usage limits",
    },
  },

  // 3. Finance & Accounting
  {
    key: "accounting",
    category: "finance",
    icon: Receipt,
    label: { ar: "الحسابات والفواتير", ku: "ژمێریاری و وەسڵەکان", en: "Accounting & Invoices" },
    description: {
      ar: "كشوف الحسابات والإيرادات والمطالبات",
      ku: "تۆماری وەسڵەکان و قازانج و داهات",
      en: "Financial ledger, statements, and revenue",
    },
  },
  {
    key: "costs",
    category: "finance",
    icon: DollarSign,
    label: { ar: "تتبع التكاليف", ku: "تۆماری خەرجییەکان", en: "Cost Tracker" },
    description: {
      ar: "متابعة تكاليف الخوادم والرسائل والخدمات",
      ku: "چاودێری خەرجی مانگانە و سێرڤەر و ناردن",
      en: "Infrastructure and operating cost ledger",
    },
  },
  {
    key: "fees",
    category: "finance",
    icon: Wallet,
    label: { ar: "عمولات ورسوم المنصة", ku: "ڕسوومات و کۆمیسیۆن", en: "Platform Fees & Plans" },
    description: {
      ar: "تحديد عمولات المتاجر وخطط الاشتراك",
      ku: "دیاریکردنی ڕێژەی قازانج و کرێی دابینکەران",
      en: "Vendor fee percentages and commercial plans",
    },
  },
  {
    key: "wallet",
    category: "finance",
    icon: Zap,
    label: { ar: "المحفظة ونقاط المكافآت", ku: "باڵانس و پاداشتەکان", en: "Wallets & Loyalty Points" },
    description: {
      ar: "إدارة أرصدة الأطباء ونقاط الولاء",
      ku: "باڵانسی دیاری و خاڵەکانی پاداشتی دکتۆرەکان",
      en: "Customer wallet credits and cashback rules",
    },
  },

  // 4. Marketing & Communications
  {
    key: "promo",
    category: "marketing",
    icon: Sparkles,
    label: { ar: "استوديو الإعلانات AI", ku: "ستۆدیۆی ڕیکلامی AI", en: "AI Promo Studio" },
    description: {
      ar: "تصميم بوسترات السوشيال ميديا والحملات",
      ku: "دروستکردنی پۆستەری ڕیکلام بۆ سۆشیاڵ میدیا",
      en: "Social poster and creative asset generator",
    },
  },
  {
    key: "banners",
    category: "marketing",
    icon: Image,
    label: { ar: "بنرات وسلايدرات المتجر", ku: "پۆستەر و بەنەرەکانی سەرەکی", en: "Store Banners & Sliders" },
    description: {
      ar: "تغيير صور الواجهة الرئيسية والعروض",
      ku: "دەستکاریکردنی بەنەری سەرەکی ئەپ و وێبسایت",
      en: "Homepage carousel and promo visual banners",
    },
  },
  {
    key: "whatsapp",
    category: "marketing",
    icon: MessageCircle,
    label: { ar: "تكامل واتساب", ku: "ڕێکخستنی واتسئاپ", en: "WhatsApp Gateway" },
    description: {
      ar: "إرسال الإشعارات والتواصل المباشر",
      ku: "ناردنی پەیامی ڕاستەوخۆ بۆ کڕیاران لە واتسئاپ",
      en: "Direct customer chat and messaging bot",
    },
  },
  {
    key: "notify",
    category: "marketing",
    icon: Bell,
    label: { ar: "الإشعارات الفورية (Push)", ku: "ئاگاداری دەستبەجێ (Push)", en: "Push Notifications" },
    description: {
      ar: "إرسال إشعارات جماعية للموبايل والويب",
      ku: "ناردنی نۆتیفیکەیشنی گشتی بۆ مۆبایلی کڕیاران",
      en: "Broadcast alerts and web push campaigns",
    },
  },
  {
    key: "home",
    category: "marketing",
    icon: Home,
    label: { ar: "تخصيص الصفحة الرئيسية", ku: "پەڕەی سەرەکی کۆگا", en: "Homepage Sections" },
    description: {
      ar: "ترتيب وتنسيق أقسام المتجر الرئيسية",
      ku: "دیاریکردنی بەشەکانی پەڕەی سەرەکی و شێواز",
      en: "Reorder homepage blocks and featured items",
    },
  },
  {
    key: "usp",
    category: "marketing",
    icon: BadgeCheck,
    label: { ar: "مميزات المتجر (USPs)", ku: "خاڵە بەهێزەکانی کۆگا (USPs)", en: "Value Propositions" },
    description: {
      ar: "نقاط القوة وشارات الثقة بالمتجر",
      ku: "خزمەتگوزاری و خاڵەکانی متمانەی کڕیار",
      en: "Trust badges, guarantees, and service perks",
    },
  },

  // 5. System & Administration
  {
    key: "settings_identity",
    category: "system",
    icon: Languages,
    label: { ar: "هوية المتجر و SEO", ku: "ناسنامەی کۆگا و SEO", en: "Store Identity & SEO" },
    description: {
      ar: "الاسم، الشعار، بيانات الاتصال ومحركات البحث",
      ku: "ناو، لۆگۆ، زانیاری پەیوەندی و گەڕان",
      en: "Store branding, logos, contact info, and SEO",
    },
  },
  {
    key: "settings_langs",
    category: "system",
    icon: Languages,
    label: { ar: "اللغات والعملات", ku: "زمانەکان و دراو", en: "Languages & Currency" },
    description: {
      ar: "تفعيل الكردية، العربية، والإنجليزية",
      ku: "کاراکردنی زمانەکان و دراوەکان",
      en: "Enable/disable store languages and currency",
    },
  },
  {
    key: "settings_backup",
    category: "system",
    icon: Database,
    label: { ar: "النسخ الاحتياطي للداتابيس", ku: "پاشەکەوتی داتابەیس", en: "Database Backup" },
    description: {
      ar: "تصدير وتنزيل نسخ كاملة من البيانات",
      ku: "داگرتن و پاشەکەوتکردنی هەموو داتاکانی کۆگا",
      en: "Export full snapshots and single-table CSVs",
    },
  },
  {
    key: "settings_logs",
    category: "system",
    icon: Terminal,
    label: { ar: "سجلات النظام والأنشطة", ku: "تۆماری سیستەم و ئاسایش", en: "System & Audit Logs" },
    description: {
      ar: "مراقبة سلامة السيرفرات وسجلات الأمان",
      ku: "تەندروستی سێرڤەر و تۆماری چالاکییەکان",
      en: "Health monitors, ping latency, and activity logs",
    },
  },
  {
    key: "settings_users",
    category: "system",
    icon: Users,
    label: { ar: "إدارة المستخدمين والصلاحيات", ku: "بەکارهێنەران و دەسەڵاتەکان", en: "Users & Permissions" },
    description: {
      ar: "تعديل حسابات المشرفين وتوزيع الصلاحيات",
      ku: "بەڕێوەبردنی ئەندامان و دیاریکردنی دەسەڵات",
      en: "Staff administration and permissions policy",
    },
  },
];

export function UserPermissionsPage({
  user,
  onBack,
}: {
  user: UserItem;
  onBack: () => void;
}) {
  const { lang } = useI18n();
  const isRtl = lang === "ar" || lang === "ku";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const storageKey = `user_perms_${user.id}`;
  const isFullAdmin = user.role === "admin";

  // State for permissions map
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    // 1. Try localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch {}
    }

    // Default: admins get all permissions, brand managers get catalog/orders
    const initial: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) {
      if (isFullAdmin) {
        initial[p.key] = true;
      } else if (user.role === "brand_manager") {
        initial[p.key] = p.category === "catalog" || p.category === "orders";
      } else {
        initial[p.key] = false;
      }
    }
    return initial;
  });

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(isFullAdmin);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing permissions from Supabase `ui_texts` if available
  useEffect(() => {
    async function loadCloudPerms() {
      try {
        const { data } = await supabase
          .from("ui_texts")
          .select("ar")
          .eq("key", storageKey)
          .maybeSingle();

        if (data?.ar) {
          const parsed = JSON.parse(data.ar);
          setPermissions(parsed);
          const allTrue = ALL_PERMISSIONS.every((p) => parsed[p.key] === true);
          if (allTrue) setIsSuperAdmin(true);
        }
      } catch {}
    }
    loadCloudPerms();
  }, [storageKey]);

  // Toggle single permission
  const handleToggle = (key: string) => {
    setPermissions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const allActive = ALL_PERMISSIONS.every((p) => next[p.key]);
      setIsSuperAdmin(allActive);
      return next;
    });
  };

  // Toggle Super Admin master switch
  const handleMasterToggle = () => {
    const nextState = !isSuperAdmin;
    setIsSuperAdmin(nextState);
    const updated: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) {
      updated[p.key] = nextState;
    }
    setPermissions(updated);
  };

  // Presets
  const applyPreset = (preset: "all" | "none" | "store" | "finance" | "marketing") => {
    const updated: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) {
      if (preset === "all") updated[p.key] = true;
      else if (preset === "none") updated[p.key] = false;
      else if (preset === "store") updated[p.key] = p.category === "catalog" || p.category === "orders";
      else if (preset === "finance") updated[p.key] = p.category === "finance";
      else if (preset === "marketing") updated[p.key] = p.category === "marketing";
    }
    setPermissions(updated);
    setIsSuperAdmin(preset === "all");
    toast.info(
      lang === "ku"
        ? "دەسەڵاتەکان بەپێی شێوازی دیاریکراو دانران"
        : lang === "ar"
        ? "تم تطبيق النموذج المحدد للصلاحيات"
        : "Permissions preset applied"
    );
  };

  // Save permissions
  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(permissions));

      await supabase.from("ui_texts").upsert(
        {
          key: storageKey,
          section: "permissions",
          ar: JSON.stringify(permissions),
          ku: JSON.stringify(permissions),
        },
        { onConflict: "key" }
      );

      toast.success(
        lang === "ku"
          ? "دەسەڵاتەکانی بەکارهێنەر بە سەرکەوتوویی پاشەکەوت کران"
          : lang === "ar"
          ? "تم حفظ وتحديث صلاحيات المستخدم بنجاح"
          : "User permissions saved successfully"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    {
      id: "catalog",
      title: { ar: "المنتجات والمخزون والبراندات", ku: "کەتەلۆگ، بەرهەمەکان و براندەکان", en: "Catalog & Products" },
      icon: Package,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "orders",
      title: { ar: "الطلبات والتوصيل والكوبونات", ku: "داواکاری، گەیاندن و کوپۆنەکان", en: "Orders & Delivery" },
      icon: LayoutGrid,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "finance",
      title: { ar: "المالية والحسابات والعمولات", ku: "دارایی، ژمێریاری و ڕسوومات", en: "Finance & Accounting" },
      icon: Receipt,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "marketing",
      title: { ar: "التسويق والإعلانات والرسائل", ku: "مارکێتینگ، ڕیکلام و پۆستەرەکان", en: "Marketing & Engagement" },
      icon: Sparkles,
      color: "text-pink-500",
      bg: "bg-pink-500/10 border-pink-500/20",
    },
    {
      id: "system",
      title: { ar: "النظام والأمان والإعدادات", ku: "سیستەم، ئاسایش و ڕێکخستنەکان", en: "System & Administration" },
      icon: ShieldCheck,
      color: "text-teal-500",
      bg: "bg-teal-500/10 border-teal-500/20",
    },
  ];

  const activeCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition shadow-2xs shrink-0 active:scale-95"
            title={lang === "ku" ? "گەڕانەوە" : lang === "ar" ? "رجوع" : "Back"}
          >
            <BackIcon className="size-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {lang === "ku"
                  ? `دەسەڵاتەکانی پانێڵ بۆ: ${user.full_name}`
                  : lang === "ar"
                  ? `صلاحيات لوحة التحكم للمستخدم: ${user.full_name}`
                  : `Admin Panel Permissions: ${user.full_name}`}
              </h2>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                  user.role === "admin"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
                    : user.role === "brand_manager"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {user.role === "admin" ? <Crown className="size-3" /> : <Shield className="size-3" />}
                <span>
                  {user.role === "admin"
                    ? lang === "ku"
                      ? "بەڕێوەبەری گشتی"
                      : "مشرف عام"
                    : user.role === "brand_manager"
                    ? lang === "ku"
                      ? "بەڕێوەبەری براند"
                      : "مدير براند"
                    : lang === "ku"
                    ? "کڕیار"
                    : "عميل"}
                </span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === "ku"
                ? `دیاریکردنی دەسەڵات و بەشە ڕێگەپێدراوەکانی ئەم پانێڵە (${activeCount} لە ${ALL_PERMISSIONS.length} چالاکە)`
                : lang === "ar"
                ? `تحديد الصلاحيات والأقسام المسموح بها في اللوحة (${activeCount} من ${ALL_PERMISSIONS.length} مفعّل)`
                : `Configure access permissions for this staff member (${activeCount}/${ALL_PERMISSIONS.length} active)`}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-black shadow-sm transition active:scale-95 shrink-0"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>{lang === "ku" ? "پاشەکەوتکردنی دەسەڵاتەکان" : lang === "ar" ? "حفظ الصلاحيات" : "Save Permissions"}</span>
        </button>
      </div>

      {/* Super Admin Master Toggle Card */}
      <AdminCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Crown className="size-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                {lang === "ku"
                  ? "دەسەڵاتی تەواوی بەڕێوەبەر (Super Administrator)"
                  : lang === "ar"
                  ? "صلاحية المشرف العام الكاملة (Super Admin)"
                  : "Super Administrator Full Access"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === "ku"
                  ? "پێدانی تەواوی دەسەڵاتەکانی پانێڵ بەبێ هیچ سنووردارکردنێک"
                  : lang === "ar"
                  ? "منح جميع صلاحيات اللوحة بدون أي قيود"
                  : "Grant unrestricted administrative privileges across all modules"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMasterToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isSuperAdmin ? "bg-rose-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isSuperAdmin ? (isRtl ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Preset Quick Filters */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 me-1">
            {lang === "ku" ? "شێوازە ئامادەکراوەکان:" : lang === "ar" ? "نماذج جاهزة:" : "Presets:"}
          </span>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {lang === "ku" ? "هەموو دەسەڵاتەکان" : lang === "ar" ? "تحديد الكل" : "Select All"}
          </button>
          <button
            type="button"
            onClick={() => applyPreset("store")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {lang === "ku" ? "کۆگا و داواکارییەکان" : lang === "ar" ? "المخزون والطلبات" : "Store & Orders"}
          </button>
          <button
            type="button"
            onClick={() => applyPreset("finance")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {lang === "ku" ? "تەنها دارایی و ژمێریاری" : lang === "ar" ? "المالية والمحاسبة" : "Finance Only"}
          </button>
          <button
            type="button"
            onClick={() => applyPreset("marketing")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {lang === "ku" ? "تەنها مارکێتینگ" : lang === "ar" ? "التسويق والإعلانات" : "Marketing Only"}
          </button>
          <button
            type="button"
            onClick={() => applyPreset("none")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ms-auto"
          >
            {lang === "ku" ? "لابردنی هەمووی" : lang === "ar" ? "إلغاء الكل" : "Deselect All"}
          </button>
        </div>
      </AdminCard>

      {/* Categorized Permission Groups */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catPermissions = ALL_PERMISSIONS.filter((p) => p.category === cat.id);
          const CatIcon = cat.icon;

          return (
            <AdminCard key={cat.id}>
              {/* Category Title Header */}
              <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className={`size-8 rounded-xl ${cat.bg} flex items-center justify-center ${cat.color} shrink-0`}>
                  <CatIcon className="size-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {cat.title[lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"]}
                </h4>
                <span className="ms-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {catPermissions.filter((p) => permissions[p.key]).length}/{catPermissions.length}
                </span>
              </div>

              {/* Permission Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {catPermissions.map((perm) => {
                  const PermIcon = perm.icon;
                  const active = !!permissions[perm.key];

                  return (
                    <div
                      key={perm.key}
                      onClick={() => handleToggle(perm.key)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        active
                          ? "bg-teal-500/5 border-[#007979]/30 dark:bg-teal-950/20 dark:border-teal-800/60"
                          : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            active
                              ? "bg-[#007979] text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <PermIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${active ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                            {perm.label[lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"]}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {perm.description[lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"]}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ms-2">
                        <span
                          className={`size-5 rounded-md flex items-center justify-center transition-colors ${
                            active
                              ? "bg-[#007979] text-white"
                              : "border border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {active && <CheckCircle2 className="size-3.5" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AdminCard>
          );
        })}
      </div>

      {/* Bottom Floating Save Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[#007979]" />
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            {lang === "ku"
              ? `${activeCount} دەسەڵات لە کۆی ${ALL_PERMISSIONS.length} هەڵبژێردراوە`
              : lang === "ar"
              ? `تم تحديد ${activeCount} من أصل ${ALL_PERMISSIONS.length} صلاحية`
              : `${activeCount} of ${ALL_PERMISSIONS.length} permissions granted`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {lang === "ku" ? "پاشگەزبوونەوە" : lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-black shadow-sm transition active:scale-95"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{lang === "ku" ? "پاشەکەوتکردن" : lang === "ar" ? "حفظ" : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
