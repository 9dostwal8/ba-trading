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
  title: { ar: "لوحة تحكم أودو المركزية", ku: "پانێلی بەڕێوەبردنی سیستم", en: "Operations Command Center" },
  subtitle: { ar: "تطبيقات الإدارة والأزرار السريعة", ku: "ئەپەکانی بەڕێوەبردن و دوگمە خێراکان", en: "Enterprise Apps & Quick Actions" },
  
  daily: { ar: "الطلبات والمبيعات", ku: "داواکاری و فرۆشتن", en: "Orders & Sales" },
  dailyDesc: { ar: "متابعة الطلبات، حالات التوصيل وقواعد التصفية", ku: "بەدواداچوونی داواکاری و داشکاندنی خۆکار", en: "Order fulfillment, delivery status & clearance" },

  catalog: { ar: "المنتجات والمخزون", ku: "بەرهەمەکان و کۆگا", en: "Catalog & Inventory" },
  catalogDesc: { ar: "إضافة وتعديل المنتجات، الأقسام والأسعار", ku: "زیادکردن و دەستکاری بەرهەمەکان و بەشەکان", en: "Manage items, categories and pricing" },

  vendors: { ar: "البائعون والمالية", ku: "فرۆشیاران و دارایی", en: "Vendors & Finance" },
  vendorsDesc: { ar: "حسابات التجار، كلفة الشحن، المحاسبة وتتبع التكاليف", ku: "هەژماری فرۆشیاران، کرێی گەیاندن و ژمێریاری", en: "Vendor portals, commissions, shipping & accounting" },

  marketing: { ar: "العروض والتسويق", ku: "ئۆفەر و بازاڕکردن", en: "Offers & Marketing" },
  marketingDesc: { ar: "إنشاء العروض السريعة، كوبونات الخصم وصفقات اليوم", ku: "ئۆفەری خێرا، کۆدی داشکاندن و پاکێجەکان", en: "Promotions, coupon codes and flash deals" },

  storefront: { ar: "واجهة المتجر والتصميم", ku: "ڕووکار و ستۆدیۆی دیزاین", en: "Storefront & Design" },
  storefrontDesc: { ar: "تخصيص القوالب، اللافتات، ترتيب الصفحة والماركات", ku: "تێمپلەیتی دیزاین، بانەرەکان و براندەکان", en: "Templates, homepage layout, banners and brands" },

  setup: { ar: "الإعدادات والمراسلات", ku: "ڕێکخستن و پەیوەندی", en: "System & Messaging" },
  setupDesc: { ar: "إعدادات المتجر العامة، رسائل واتساب وقوالب الإشعارات", ku: "ڕێکخستنی کۆگا، پەیامی واتسئاپ و ئاگاداری", en: "General configurations, WhatsApp & notifications" },

  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders" },
  ordersHint: { ar: "متابعة وتغيير حالة الطلبات", ku: "بەدواداچوون و گۆڕینی دۆخ", en: "Track & change order status" },
  clearance: { ar: "قريب الانتهاء والتصفية", ku: "نزیکی بەسەرچوون و ڕیکلام", en: "Nearing Expiry & Clearance" },
  clearanceHint: { ar: "قواعد الخصم التلقائي", ku: "یاسای داشکاندنی خۆکار", en: "Automatic Discount Rules" },

  vendorList: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors" },
  vendorListHint: { ar: "إضافة بائع، العمولة، حساب الدخول", ku: "زیادکردن، کۆمیشن، هەژمار", en: "Add vendor, commission, login account" },
  accounting: { ar: "المحاسبة والتسويات", ku: "ژمێریاری و کۆمیشن", en: "Accounting" },
  accountingHint: { ar: "العمولات والتسويات والفواتير", ku: "کۆمیشن و حیسابکردن", en: "Commissions, settlements, and invoices" },
  shipping: { ar: "أجور التوصيل", ku: "کرێی گەیاندن", en: "Shipping costs" },
  shippingHint: { ar: "سعر التوصيل لكل مدينة لكل بائع", ku: "نرخی گەیاندن بۆ هەر شار بۆ هەر فرۆشیار", en: "Per-city delivery price for each vendor" },
  wallet: { ar: "نقاط المكافأة", ku: "خاڵی خەڵات", en: "Reward points" },
  walletHint: { ar: "قيم النقاط، معدل الاستبدال، الكروت والحركات", ku: "بەهای خاڵ، ڕێژەی گۆڕین، کارت و جوڵەکان", en: "Point values, redeem rate, cards & activity" },
  costs: { ar: "تكلفة التشغيل", ku: "تێچووی کارپێکردن", en: "Running cost" },
  costsHint: { ar: "تقدير الكلفة الشهرية بالدولار", ku: "خەملاندنی تێچووی مانگانە بە دۆلار", en: "Monthly USD cost estimate" },

  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  productsHint: { ar: "إضافة وتعديل المنتجات", ku: "زیادکردن و دەستکاری", en: "Add & Edit Products" },
  categories: { ar: "الأقسام", ku: "بەشەکان", en: "Categories" },
  categoriesHint: { ar: "أيقونات وألوان الأقسام", ku: "ئایکون و ڕەنگ", en: "Category icons and colors" },

  promo: { ar: "إنشاء عرض سريع", ku: "ئۆفەری خێرا", en: "Create Quick Offer" },
  promoHint: { ar: "خصم، صفقة اليوم، حزمة، لافتة", ku: "داشکاندن، ئۆفەری ڕۆژ، پاکێج", en: "Discount, Deal of the Day, Bundle, Banner" },
  fees: { ar: "أجور ومدة التسويق", ku: "کرێ و ماوەی بازاڕکردن", en: "Marketing Fees & Durations" },
  feesHint: { ar: "أسعار ومدد العروض لجميع البائعين", ku: "نرخ و ماوەی ئۆفەرەکان بۆ هەموو فرۆشیارەکان", en: "Offer prices and durations for all vendors" },
  offers: { ar: "العروض", ku: "ئۆفەرەکان", en: "Offers" },
  deals: { ar: "صفقات اليوم", ku: "ئۆفەری ڕۆژ", en: "Deals of the Day" },
  bundles: { ar: "الحزم", ku: "پاکێجەکان", en: "Bundles" },
  tiers: { ar: "خصم الكمية", ku: "داشکاندنی بڕ", en: "Volume Discount" },
  coupons: { ar: "أكواد الخصم", ku: "کۆدی داشکاندن", en: "Discount Codes" },

  home: { ar: "ترتيب الصفحة الرئيسية", ku: "ڕیزبەندی پەڕەی سەرەکی", en: "Homepage Order" },
  brands: { ar: "الماركات", ku: "براندەکان", en: "Brands" },
  banners: { ar: "اللافتات والأماكن", ku: "بانەر و شوێنەکان", en: "Banners & Locations" },
  usp: { ar: "شريط الخدمات", ku: "هێڵی خزمەتگوزاری", en: "Services Bar" },
  theme: { ar: "استوديو التصميم", ku: "ستۆدیۆی دیزاین", en: "Design Studio" },
  themeHint: { ar: "القوالب، الألوان، بطاقات المنتج والأقسام", ku: "تێمپلەیت، ڕەنگ، کارتی بەرهەم و بەشەکان", en: "Templates, colours, product cards and sections" },

  settings: { ar: "إعدادات المتجر", ku: "ڕێکخستنی کۆگا", en: "Store Settings" },
  settingsHint: { ar: "الاسم، التوصيل، الأسعار، الألوان", ku: "ناو، گەیاندن، نرخ، ڕەنگ", en: "Name, Delivery, Prices, Colors" },
  texts: { ar: "نصوص الموقع", ku: "دەقەکانی سایت", en: "Site Texts" },
  notify: { ar: "إرسال إشعار", ku: "ناردنی ئاگاداری", en: "Send notification" },
  notifyHint: { ar: "رسالة لكل الأطباء أو البائعين", ku: "پەیام بۆ پزیشکان یان فرۆشیارەکان", en: "Message dentists or vendors" },
  whatsapp: { ar: "رسائل واتساب", ku: "پەیامی واتسئاپ", en: "WhatsApp messages" },
  whatsappHint: { ar: "قوالب جاهزة للبائعين بضغطة واحدة", ku: "تێمپلەیتی ئامادە بۆ فرۆشیارەکان", en: "Ready templates for vendors, one tap" },
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

  // Top Odoo Quick Actions Ribbon
  const topQuickActions = [
    {
      key: "products",
      label: lang === "ku" ? "+ بەرهەمی نوێ" : lang === "ar" ? "+ منتج جديد" : "+ New Product",
      icon: Package,
    },
    {
      key: "promo",
      label: lang === "ku" ? "⚡ ئۆفەری خێرا" : lang === "ar" ? "⚡ عرض سريع" : "⚡ Quick Offer",
      icon: Sparkles,
    },
    {
      key: "orders",
      label: lang === "ku" ? "📦 داواکارییەکان" : lang === "ar" ? "📦 الطلبات" : "📦 Orders",
      icon: LayoutGrid,
    },
    {
      key: "whatsapp",
      label: lang === "ku" ? "💬 واتسئاپ" : lang === "ar" ? "💬 واتساب" : "💬 WhatsApp",
      icon: MessageCircle,
    },
    {
      key: "store",
      label: lang === "ku" ? "🌐 بینینی کۆگا" : lang === "ar" ? "🌐 المتجر" : "🌐 Live Store",
      icon: Store,
      external: true,
      url: "/",
    },
  ];

  // Odoo Module App Groups with Quick Buttons
  const groups: PanelGroup[] = [
    {
      label: L.daily[lang],
      description: L.dailyDesc[lang],
      icon: LayoutGrid,
      color: "teal",
      quickActions: [
        {
          key: "orders",
          label: lang === "ku" ? "+ داواکارییەکان" : lang === "ar" ? "+ الطلبات" : "+ Orders",
          icon: LayoutGrid,
          primary: true,
        },
        {
          key: "clearance",
          label: lang === "ku" ? "نزیکی بەسەرچوون" : lang === "ar" ? "قريب الانتهاء" : "Clearance",
          icon: Hourglass,
        },
      ],
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
      label: L.catalog[lang],
      description: L.catalogDesc[lang],
      icon: Package,
      color: "amber",
      quickActions: [
        {
          key: "products",
          label: lang === "ku" ? "+ بەرهەمی نوێ" : lang === "ar" ? "+ منتج جديد" : "+ Add Product",
          icon: Package,
          primary: true,
        },
        {
          key: "categories",
          label: lang === "ku" ? "بەشەکان" : lang === "ar" ? "الأقسام" : "Categories",
          icon: Shapes,
        },
      ],
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
      label: L.vendors[lang],
      description: L.vendorsDesc[lang],
      icon: Store,
      color: "emerald",
      quickActions: [
        {
          key: "vendors",
          label: lang === "ku" ? "+ فرۆشیاران" : lang === "ar" ? "+ البائعون" : "+ Vendors",
          icon: Store,
          primary: true,
        },
        {
          key: "accounting",
          label: lang === "ku" ? "ژمێریاری" : lang === "ar" ? "المحاسبة" : "Accounting",
          icon: Receipt,
        },
        {
          key: "shipping",
          label: lang === "ku" ? "کرێی گەیاندن" : lang === "ar" ? "أجور التوصيل" : "Shipping",
          icon: Truck,
        },
      ],
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
      label: L.marketing[lang],
      description: L.marketingDesc[lang],
      icon: Sparkles,
      color: "purple",
      quickActions: [
        {
          key: "promo",
          label: lang === "ku" ? "+ ئۆفەری خێرا" : lang === "ar" ? "+ عرض سريع" : "+ Quick Promo",
          icon: Sparkles,
          primary: true,
        },
        {
          key: "coupons",
          label: lang === "ku" ? "کۆدی داشکاندن" : lang === "ar" ? "أكواد الخصم" : "Coupons",
          icon: Ticket,
        },
        {
          key: "deals",
          label: lang === "ku" ? "ئۆفەری ڕۆژ" : lang === "ar" ? "صفقات اليوم" : "Deals",
          icon: Zap,
        },
      ],
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
      description: L.storefrontDesc[lang],
      icon: Palette,
      color: "indigo",
      quickActions: [
        {
          key: "theme",
          label: lang === "ku" ? "ستۆدیۆی دیزاین" : lang === "ar" ? "استوديو التصميم" : "Design Studio",
          icon: Palette,
          primary: true,
        },
        {
          key: "banners",
          label: lang === "ku" ? "بانەرەکان" : lang === "ar" ? "اللافتات" : "Banners",
          icon: Image,
        },
        {
          key: "home",
          label: lang === "ku" ? "ڕیزبەندی سەرەکی" : lang === "ar" ? "الصفحة الرئيسية" : "Homepage",
          icon: Home,
        },
      ],
      items: [
        { key: "home", label: L.home[lang], icon: Home },
        { key: "brands", label: L.brands[lang], icon: Sparkles },
        { key: "banners", label: L.banners[lang], icon: Image },
        { key: "usp", label: L.usp[lang], icon: BadgeCheck },
        {
          key: "theme",
          label: L.theme[lang],
          hint: L.themeHint[lang],
          icon: Palette,
        },
      ],
    },
    {
      label: L.setup[lang],
      description: L.setupDesc[lang],
      icon: Settings,
      color: "slate",
      quickActions: [
        {
          key: "whatsapp",
          label: lang === "ku" ? "پەیامی واتسئاپ" : lang === "ar" ? "رسائل واتساب" : "WhatsApp",
          icon: MessageCircle,
          primary: true,
        },
        {
          key: "settings",
          label: lang === "ku" ? "ڕێکخستنی کۆگا" : lang === "ar" ? "إعدادات المتجر" : "Settings",
          icon: Settings,
        },
        {
          key: "notify",
          label: lang === "ku" ? "ئاگاداری" : lang === "ar" ? "إشعار" : "Notify",
          icon: Bell,
        },
      ],
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <AdminHeader />
      <div className="flex-1">
        <PanelShell
          title={L.title[lang]}
          subtitle={L.subtitle[lang]}
          showKpis={false}
          topQuickActions={topQuickActions}
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
