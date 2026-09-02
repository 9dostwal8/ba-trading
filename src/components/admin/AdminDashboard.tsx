import { useQuery } from "@tanstack/react-query";
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
import { PanelShell } from "@/components/panel/PanelShell";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { supabase } from "@/integrations/supabase/client";
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
  accounting: { ar: "المحاسبة", ku: "ژمێریاري", en: "Accounting" },
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

interface AdminDashboardProps {
  initialTab?: string;
}

export function AdminDashboard({ initialTab }: AdminDashboardProps) {
  const { lang } = useI18n();
  const [active, setActive] = useState<string | null>(initialTab ?? null);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
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
