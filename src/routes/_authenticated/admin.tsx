import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { formatPrice, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "لوحة التحكم | دنتال ستور" },
      { name: "description", content: "إدارة المنتجات والعروض وأكواد الخصم والطلبات." },
      { property: "og:title", content: "لوحة التحكم | دنتال ستور" },
      { property: "og:description", content: "إدارة المتجر بالكامل." },
    ],
  }),
  component: AdminPage,
});

const L = {
  title: { ar: "لوحة التحكم", ku: "پانێلی بەڕێوەبردن", en: "Dashboard",},
  daily: { ar: "اليومي", ku: "ڕۆژانە", en: "Daily",},
  vendors: { ar: "البائعون والمال", ku: "فرۆشیار و پارە", en: "Vendors & Finance",},
  catalog: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products",},
  marketing: { ar: "العروض والتسويق", ku: "ئۆفەر و ڕیکلام", en: "Offers & Marketing",},
  fees: { ar: "أجور ومدة التسويق", ku: "کرێ و ماوەی بازاڕکردن", en: "Marketing Fees & Durations",},
  feesHint: { ar: "أسعار ومدد العروض لجميع البائعين", ku: "نرخ و ماوەی ئۆفەرەکان بۆ هەموو فرۆشیارەکان", en: "Offer prices and durations for all vendors",},
  storefront: { ar: "واجهة المتجر", ku: "ڕووکاری کۆگا", en: "Storefront",},
  notify: { ar: "إرسال إشعار", ku: "ناردنی ئاگاداری", en: "Send notification",},
  whatsapp: { ar: "رسائل واتساب", ku: "پەیامی واتسئاپ", en: "WhatsApp messages",},
  whatsappHint: { ar: "قوالب جاهزة للبائعين بضغطة واحدة", ku: "تێمپلەیتی ئامادە بۆ فرۆشیارەکان", en: "Ready templates for vendors, one tap",},
  notifyHint: { ar: "رسالة لكل الأطباء أو البائعين", ku: "پەیام بۆ پزیشکان یان فرۆشیارەکان", en: "Message dentists or vendors",},
  setup: { ar: "الإعدادات", ku: "ڕێکخستن", en: "Settings",},

  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders",},
  ordersHint: { ar: "متابعة وتغيير حالة الطلبات", ku: "بەدواداچوون و گۆڕینی دۆخ", en: "Track & change order status",},
  clearance: { ar: "قريب الانتهاء والتصفية", ku: "نزیکی بەسەرچوون و ڕیکلام", en: "Nearing Expiry & Clearance",},
  clearanceHint: { ar: "قواعد الخصم التلقائي", ku: "یاسای داشکاندنی خۆکار", en: "Automatic Discount Rules",},

  vendorList: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors",},
  vendorListHint: { ar: "إضافة بائع، العمولة، حساب الدخول", ku: "زیادکردن، کۆمیشن، هەژمار", en: "Add vendor, commission, login account",},
  charges: { ar: "فواتير التسويق", ku: "پسوولەی ڕیکلام", en: "Marketing Invoices",},
  chargesHint: { ar: "ما يدفعه البائعون", ku: "ئەوەی فرۆشیارەکان دەدەن", en: "What vendors pay",},
  accounting: { ar: "المحاسبة", ku: "ژمێریاری", en: "Accounting",},
  shipping: { ar: "أجور التوصيل", ku: "کرێی گەیاندن", en: "Shipping costs",},
  shippingHint: { ar: "سعر التوصيل لكل مدينة لكل بائع", ku: "نرخی گەیاندن بۆ هەر شار بۆ هەر فرۆشیار", en: "Per-city delivery price for each vendor",},
  accountingHint: { ar: "العمولات والتسويات والفواتير", ku: "کۆمیشن و حیسابکردن", en: "Commissions, settlements, and invoices",},

  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products",},
  productsHint: { ar: "إضافة وتعديل المنتجات", ku: "زیادکردن و دەستکاری", en: "Add & Edit Products",},
  categories: { ar: "الأقسام", ku: "بەشەکان", en: "Categories",},
  categoriesHint: { ar: "أيقونات وألوان الأقسام", ku: "ئایکون و ڕەنگ", en: "Category icons and colors",},

  promo: { ar: "إنشاء عرض سريع", ku: "ئۆفەری خێرا", en: "Create Quick Offer",},
  promoHint: { ar: "خصم، صفقة اليوم، حزمة، لافتة", ku: "داشکاندن، ئۆفەری ڕۆژ، پاکێج", en: "Discount, Deal of the Day, Bundle, Banner",},
  offers: { ar: "العروض", ku: "ئۆفەرەکان", en: "Offers",},
  deals: { ar: "صفقات اليوم", ku: "ئۆفەری ڕۆژ", en: "Deals of the Day",},
  bundles: { ar: "الحزم", ku: "پاکێجەکان", en: "Bundles",},
  tiers: { ar: "خصم الكمية", ku: "داشکاندنی بڕ", en: "Volume Discount",},
  coupons: { ar: "أكواد الخصم", ku: "کۆدی داشکاندن", en: "Discount Codes",},

  home: { ar: "ترتيب الصفحة الرئيسية", ku: "ڕیزبەندی پەڕەی سەرەکی", en: "Homepage Order",},
  brands: { ar: "الماركات", ku: "براندەکان", en: "Brands",},
  banners: { ar: "اللافتات والأماكن", ku: "بانەر و شوێنەکان", en: "Banners & Locations",},
  usp: { ar: "شريط الخدمات", ku: "هێڵی خزمەتگوزاری", en: "Services Bar",},

  settings: { ar: "إعدادات المتجر", ku: "ڕێکخستنی کۆگا", en: "Store Settings",},
  settingsHint: { ar: "الاسم، التوصيل، الأسعار، الألوان", ku: "ناو، گەیاندن، نرخ، ڕەنگ", en: "Name, Delivery, Prices, Colors",},
  texts: { ar: "نصوص الموقع", ku: "دەقەکانی سایت", en: "Site Texts",},

  wallet: { ar: "نقاط المكافأة", ku: "خاڵی خەڵات", en: "Reward points",},
  walletHint: { ar: "قيم النقاط، معدل الاستبدال، الكروت والحركات", ku: "بەهای خاڵ، ڕێژەی گۆڕین، کارت و جوڵەکان", en: "Point values, redeem rate, cards & activity",},

  costs: { ar: "تكلفة التشغيل", ku: "تێچووی کارپێکردن", en: "Running cost",},
  costsHint: { ar: "تقدير الكلفة الشهرية بالدولار", ku: "خەملاندنی تێچووی مانگانە بە دۆلار", en: "Monthly USD cost estimate",},
  revenue: { ar: "الإيرادات", ku: "داهات", en: "Revenue",},
  newOrders: { ar: "طلبات جديدة", ku: "داواکاری نوێ", en: "New Orders",},
  productsCount: { ar: "المنتجات", ku: "بەرهەم", en: "Products",},
  activeOffers: { ar: "عروض نشطة", ku: "ئۆفەری چالاک", en: "Active Offers",},
};

function AdminPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { tab } = Route.useSearch();
  const [active, setActive] = useState<string | null>(tab ?? null);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [orders, products, offers] = await Promise.all([
        supabase.from("orders").select("total, status"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      if (orders.error) throw orders.error;
      const rows = orders.data ?? [];
      return {
        revenue: rows
          .filter((o) => o.status !== "cancelled")
          .reduce((s, o) => s + Number(o.total), 0),
        newOrders: rows.filter((o) => o.status === "new").length,
        products: products.count ?? 0,
        offers: offers.count ?? 0,
      };
    },
  });

  const [claiming, setClaiming] = useState(false);

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

  if (isAdmin === false) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-8" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">
            {lang === "ar" ? "لوحة تحكم الإدارة" : lang === "ku" ? "پانێلی بەڕێوەبردن" : "Admin Dashboard"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {user ? (lang === "ar" ? "أنت مسجل الدخول ولكن ليس لديك صلاحية مدير." : lang === "ku" ? "چوویتەژوورەوە بەڵام دەسەڵاتی بەڕێوەبەرت نییە." : "You are logged in but not an admin.") : t("notAdmin")}
          </p>

          {user ? (
            <Button onClick={handleClaim} disabled={claiming} className="w-full font-bold">
              {claiming ? "..." : (lang === "ar" ? "تفعيل حساب المدير الأول (Claim Admin)" : lang === "ku" ? "چالاککردنی بەڕێوەبەری یەکەم" : "Claim First Admin Account")}
            </Button>
          ) : (
            <Link to="/auth" className="inline-flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground">
              {lang === "ar" ? "تسجيل الدخول أولاً" : lang === "ku" ? "سەرەتا بچۆ ژوورەوە" : "Login First"}
            </Link>
          )}
        </div>
      </StoreLayout>
    );
  }

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
    <StoreLayout>
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
    </StoreLayout>
  );
}
