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
  Users,
  Wallet,
  Zap,
  Loader2,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { PanelShell, type PanelGroup } from "@/components/panel/PanelShell";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useI18n } from "@/lib/i18n";

// Core Admin Modules
const AdminOrders = lazy(() => import("@/components/admin/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminUsers = lazy(() => import("@/components/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminProducts = lazy(() => import("@/components/admin/AdminProducts").then((m) => ({ default: m.AdminProducts })));
const AdminCategories = lazy(() => import("@/components/admin/AdminCategories").then((m) => ({ default: m.AdminCategories })));
const AdminBrands = lazy(() => import("@/components/admin/AdminBrands").then((m) => ({ default: m.AdminBrands })));
const AdminVendors = lazy(() => import("@/components/admin/AdminVendors").then((m) => ({ default: m.AdminVendors })));

// Unified Storefront, Design & Marketing Studio
const AdminStorefrontStudio = lazy(() =>
  import("@/components/admin/AdminStorefrontStudio").then((m) => ({
    default: m.AdminStorefrontStudio,
  }))
);

// Offers & Discounts Modules
const AdminOffers = lazy(() => import("@/components/admin/AdminOffers").then((m) => ({ default: m.AdminOffers })));
const AdminDeals = lazy(() => import("@/components/admin/AdminDeals").then((m) => ({ default: m.AdminDeals })));
const AdminBundles = lazy(() => import("@/components/admin/AdminBundles").then((m) => ({ default: m.AdminBundles })));
const AdminTiers = lazy(() => import("@/components/admin/AdminTiers").then((m) => ({ default: m.AdminTiers })));
const AdminCoupons = lazy(() => import("@/components/admin/AdminCoupons").then((m) => ({ default: m.AdminCoupons })));
const AdminClearance = lazy(() => import("@/components/admin/AdminClearance").then((m) => ({ default: m.AdminClearance })));
const AdminRewards = lazy(() => import("@/components/admin/AdminRewards").then((m) => ({ default: m.AdminRewards })));

// Logistics, Financials & Communications
const AdminAccounting = lazy(() => import("@/components/admin/AdminAccounting").then((m) => ({ default: m.AdminAccounting })));
const AdminShipping = lazy(() => import("@/components/admin/AdminShipping").then((m) => ({ default: m.AdminShipping })));
const AdminCostTracker = lazy(() => import("@/components/admin/AdminCostTracker").then((m) => ({ default: m.AdminCostTracker })));
const AdminWhatsapp = lazy(() => import("@/components/admin/AdminWhatsapp").then((m) => ({ default: m.AdminWhatsapp })));
const AdminNotify = lazy(() => import("@/components/admin/AdminNotify").then((m) => ({ default: m.AdminNotify })));
const AdminMarketing = lazy(() => import("@/components/admin/AdminMarketing").then((m) => ({ default: m.AdminMarketing })));
const AdminSettings = lazy(() => import("@/components/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })));

const L = {
  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders" },
  users: { ar: "مستخدمو الموقع", ku: "بەکارهێنەرانی سایت", en: "Website Users" },
  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  categories: { ar: "الأقسام", ku: "بەشەکان", en: "Categories" },
  brands: { ar: "الماركات", ku: "براندەکان", en: "Brands" },
  vendors: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors" },
  storefront: {
    ar: "استوديو الواجهة والتصميم",
    ku: "ستۆدیۆی دیزاین و ڕووکار",
    en: "Storefront & Design Studio",
  },
  offers: { ar: "العروض", ku: "ئۆفەرەکان", en: "Offers" },
  deals: { ar: "صفقات اليوم", ku: "ئۆفەری ڕۆژ", en: "Daily Deals" },
  bundles: { ar: "الحزم", ku: "پاکێجەکان", en: "Bundles" },
  tiers: { ar: "خصم الكمية", ku: "داشکاندنی بڕ", en: "Volume Tiers" },
  coupons: { ar: "أكواد الخصم", ku: "کۆدی داشکاندن", en: "Coupons" },
  clearance: { ar: "قريب الانتهاء", ku: "نزیکی بەسەرچوون", en: "Clearance" },
  wallet: { ar: "نقاط المكافأة", ku: "خاڵی خەڵات", en: "Rewards" },
  accounting: { ar: "المحاسبة", ku: "ژمێریاری", en: "Accounting" },
  shipping: { ar: "أجور التوصيل", ku: "کرێی گەیاندن", en: "Shipping" },
  costs: { ar: "تكلفة التشغيل", ku: "تێچووی کارپێکردن", en: "Running Cost" },
  whatsapp: { ar: "واتساب", ku: "واتسئاپ", en: "WhatsApp" },
  notify: { ar: "الإشعارات", ku: "ئاگاداری", en: "Notifications" },
  fees: { ar: "أجور التسويق", ku: "کرێی ڕیکلام", en: "Marketing Fees" },
  settings: { ar: "إعدادات", ku: "ڕێکخستنەکان", en: "Settings" },
};

interface AdminDashboardProps {
  initialTab?: string | undefined;
}

export function AdminDashboard({ initialTab }: AdminDashboardProps) {
  const { lang } = useI18n();
  const [active, setActive] = useState<string | null>(initialTab ?? null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Modern Odoo App Tiles configured with distinct vibrant palettes
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
          key: "users",
          label: L.users[lang],
          icon: Users,
          color: "from-blue-600 to-indigo-700",
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
          key: "brands",
          label: L.brands[lang],
          icon: Sparkles,
          color: "from-amber-500 to-yellow-600",
        },
        {
          key: "vendors",
          label: L.vendors[lang],
          icon: Store,
          color: "from-purple-500 to-indigo-600",
        },
        {
          key: "storefront",
          label: L.storefront[lang],
          icon: Palette,
          color: "from-purple-600 via-pink-600 to-rose-600",
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
          color: "from-amber-500 to-orange-600",
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
          key: "costs",
          label: L.costs[lang],
          icon: DollarSign,
          color: "from-purple-700 to-slate-800",
        },
        {
          key: "wallet",
          label: L.wallet[lang],
          icon: Wallet,
          color: "from-amber-400 to-orange-500",
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
          color: "from-rose-500 to-red-600",
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
    <div className="min-h-screen bg-slate-100/90 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Existing Header with Search and Theme Toggle */}
      <AdminHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={!active}
      />
      
      {/* Odoo App Launcher Grid */}
      <div className="flex-1">
        <PanelShell
          groups={groups}
          active={active}
          onOpen={handleOpenTab}
          onClose={handleCloseTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        >
          <Suspense
            fallback={
              <div className="flex h-64 w-full items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-[#007979]" />
              </div>
            }
          >
            {active === "orders" && <AdminOrders />}
            {active === "users" && <AdminUsers />}
            {active === "products" && <AdminProducts />}
            {active === "categories" && <AdminCategories />}
            {active === "brands" && <AdminBrands />}
            {active === "vendors" && <AdminVendors />}

            {/* Unified Storefront & Design Studio */}
            {active === "storefront" && <AdminStorefrontStudio />}
            {active === "theme" && <AdminStorefrontStudio initialSubTab="theme" />}
            {active === "home" && <AdminStorefrontStudio initialSubTab="home" />}
            {active === "banners" && <AdminStorefrontStudio initialSubTab="banners" />}
            {active === "usp" && <AdminStorefrontStudio initialSubTab="usp" />}
            {active === "texts" && <AdminStorefrontStudio initialSubTab="texts" />}
            {active === "promo" && <AdminStorefrontStudio initialSubTab="promo" />}

            {/* Other Admin Tools */}
            {active === "offers" && <AdminOffers />}
            {active === "deals" && <AdminDeals />}
            {active === "bundles" && <AdminBundles />}
            {active === "tiers" && <AdminTiers />}
            {active === "coupons" && <AdminCoupons />}
            {active === "clearance" && <AdminClearance />}
            {active === "accounting" && <AdminAccounting />}
            {active === "shipping" && <AdminShipping />}
            {active === "costs" && <AdminCostTracker />}
            {active === "wallet" && <AdminRewards />}
            {active === "whatsapp" && <AdminWhatsapp />}
            {active === "notify" && <AdminNotify />}
            {active === "fees" && <AdminMarketing />}
            {active === "settings" && <AdminSettings />}
          </Suspense>
        </PanelShell>
      </div>
    </div>
  );
}
