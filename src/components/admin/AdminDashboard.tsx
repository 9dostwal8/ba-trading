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
  Sparkles,
  Store,
  Ticket,
  Truck,
  Wallet,
  Zap,
  Loader2,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { PanelShell, type PanelGroup } from "@/components/panel/PanelShell";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useI18n } from "@/lib/i18n";

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

const L = {
  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders" },
  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  categories: { ar: "الأقسام", ku: "بەشەکان", en: "Categories" },
  vendors: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors" },
  accounting: { ar: "المحاسبة", ku: "ژمێریاری", en: "Accounting" },
  shipping: { ar: "أجور التوصيل", ku: "کرێی گەیاندن", en: "Shipping" },
  promo: { ar: "عرض سريع", ku: "ئۆفەری خێرا", en: "Promo Studio" },
  offers: { ar: "العروض", ku: "ئۆفەرەکان", en: "Offers" },
  deals: { ar: "صفقات اليوم", ku: "ئۆفەری ڕۆژ", en: "Daily Deals" },
  bundles: { ar: "الحزم", ku: "پاکێجەکان", en: "Bundles" },
  tiers: { ar: "خصم الكمية", ku: "داشکاندنی بڕ", en: "Volume Tiers" },
  coupons: { ar: "أكواد الخصم", ku: "کۆدی داشکاندن", en: "Coupons" },
  clearance: { ar: "قريب الانتهاء", ku: "نزیکی بەسەرچوون", en: "Clearance" },
  theme: { ar: "استوديو التصميم", ku: "ستۆدیۆی دیزاین", en: "Design Studio" },
  home: { ar: "ترتيب الرئيسية", ku: "ڕیزبەندی سەرەکی", en: "Homepage" },
  banners: { ar: "اللافتات", ku: "بانەرەکان", en: "Banners" },
  brands: { ar: "الماركات", ku: "براندەکان", en: "Brands" },
  usp: { ar: "شريط الخدمات", ku: "هێڵی خزمەتگوزاری", en: "Services Bar" },
  whatsapp: { ar: "واتساب", ku: "واتسئاپ", en: "WhatsApp" },
  notify: { ar: "الإشعارات", ku: "ئاگاداری", en: "Notifications" },
  texts: { ar: "نصوص الموقع", ku: "دەقەکانی سایت", en: "Site Texts" },
  wallet: { ar: "نقاط المكافأة", ku: "خاڵی خەڵات", en: "Rewards" },
  costs: { ar: "تكلفة التشغيل", ku: "تێچووی کارپێکردن", en: "Running Cost" },
  fees: { ar: "أجور التسويق", ku: "کرێی ڕیکلام", en: "Marketing Fees" },
  settings: { ar: "إعدادات المتجر", ku: "ڕێکخستنی کۆگا", en: "Store Settings" },
};

interface AdminDashboardProps {
  initialTab?: string | undefined;
}

export function AdminDashboard({ initialTab }: AdminDashboardProps) {
  const { lang } = useI18n();
  const [active, setActive] = useState<string | null>(initialTab ?? null);

  const handleOpenTab = (key: string) => {
    setActive(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", key);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // fallback
    }
  };

  const handleCloseTab = () => {
    setActive(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState(null, "", url.toString());
    } catch {
      // fallback
    }
  };

  // 24 Odoo App Tiles configured with distinct vibrant Odoo-style gradient palettes
  const groups: PanelGroup[] = [
    {
      label: "Apps",
      items: [
        {
          key: "orders",
          label: L.orders[lang],
          icon: LayoutGrid,
          color: "from-cyan-500 to-blue-600",
        },
        {
          key: "products",
          label: L.products[lang],
          icon: Package,
          color: "from-amber-500 to-orange-600",
        },
        {
          key: "categories",
          label: L.categories[lang],
          icon: Shapes,
          color: "from-emerald-500 to-teal-600",
        },
        {
          key: "vendors",
          label: L.vendors[lang],
          icon: Store,
          color: "from-purple-500 to-indigo-600",
        },
        {
          key: "accounting",
          label: L.accounting[lang],
          icon: Receipt,
          color: "from-teal-500 to-emerald-600",
        },
        {
          key: "shipping",
          label: L.shipping[lang],
          icon: Truck,
          color: "from-sky-500 to-blue-600",
        },
        {
          key: "promo",
          label: L.promo[lang],
          icon: Sparkles,
          color: "from-pink-500 to-rose-600",
        },
        {
          key: "offers",
          label: L.offers[lang],
          icon: BadgePercent,
          color: "from-orange-500 to-red-500",
        },
        {
          key: "deals",
          label: L.deals[lang],
          icon: Zap,
          color: "from-amber-400 to-red-500",
        },
        {
          key: "bundles",
          label: L.bundles[lang],
          icon: Layers,
          color: "from-indigo-500 to-purple-600",
        },
        {
          key: "tiers",
          label: L.tiers[lang],
          icon: ListOrdered,
          color: "from-blue-500 to-indigo-600",
        },
        {
          key: "coupons",
          label: L.coupons[lang],
          icon: Ticket,
          color: "from-fuchsia-500 to-pink-600",
        },
        {
          key: "clearance",
          label: L.clearance[lang],
          icon: Hourglass,
          color: "from-yellow-500 to-amber-600",
        },
        {
          key: "theme",
          label: L.theme[lang],
          icon: Palette,
          color: "from-purple-600 to-pink-600",
        },
        {
          key: "home",
          label: L.home[lang],
          icon: Home,
          color: "from-cyan-600 to-blue-600",
        },
        {
          key: "banners",
          label: L.banners[lang],
          icon: Image,
          color: "from-blue-500 to-teal-500",
        },
        {
          key: "brands",
          label: L.brands[lang],
          icon: Sparkles,
          color: "from-amber-500 to-yellow-500",
        },
        {
          key: "usp",
          label: L.usp[lang],
          icon: BadgeCheck,
          color: "from-teal-500 to-green-600",
        },
        {
          key: "whatsapp",
          label: L.whatsapp[lang],
          icon: MessageCircle,
          color: "from-emerald-500 to-green-600",
        },
        {
          key: "notify",
          label: L.notify[lang],
          icon: Bell,
          color: "from-red-500 to-rose-600",
        },
        {
          key: "texts",
          label: L.texts[lang],
          icon: Languages,
          color: "from-slate-600 to-blue-700",
        },
        {
          key: "wallet",
          label: L.wallet[lang],
          icon: Wallet,
          color: "from-amber-400 to-orange-500",
        },
        {
          key: "costs",
          label: L.costs[lang],
          icon: DollarSign,
          color: "from-purple-700 to-slate-800",
        },
        {
          key: "fees",
          label: L.fees[lang],
          icon: Wallet,
          color: "from-emerald-600 to-teal-700",
        },
        {
          key: "settings",
          label: L.settings[lang],
          icon: Settings,
          color: "from-slate-700 to-zinc-900",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col">
      {/* Existing Header (no extra duplicate header) */}
      <AdminHeader />
      
      {/* Odoo App Launcher Grid */}
      <div className="flex-1">
        <PanelShell
          groups={groups}
          active={active}
          onOpen={handleOpenTab}
          onClose={handleCloseTab}
        >
          <Suspense
            fallback={
              <div className="flex h-64 w-full items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-[#007979]" />
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
