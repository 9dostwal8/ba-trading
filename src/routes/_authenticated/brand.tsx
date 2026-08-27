import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Coins,
  LayoutGrid,
  Package,
  QrCode,
  Receipt,
  Sparkles,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { StoreLayout } from "@/components/StoreLayout";
import { PanelShell } from "@/components/panel/PanelShell";
import { VendorAccounting } from "@/components/vendor/VendorAccounting";

import { ShippingRates } from "@/components/shipping/ShippingRates";
import { VendorRewardPoints } from "@/components/vendor/VendorRewardPoints";
import { PromoStudio } from "@/components/promo/PromoStudio";
import { VendorOrders } from "@/components/vendor/VendorOrders";
import { VendorProducts } from "@/components/vendor/VendorProducts";
import { VendorQrCard } from "@/components/vendor/VendorQrCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyVendor } from "@/hooks/useVendor";
import { formatPrice, useI18n } from "@/lib/i18n";
import { vendorTotals } from "@/lib/vendors";

export const Route = createFileRoute("/_authenticated/brand")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "لوحة البائع | دنتال ستور" },
      {
        name: "description",
        content: "لوحة البائع: المنتجات والطلبات والعروض والحساب المالي في مكان واحد.",
      },
      { property: "og:title", content: "لوحة البائع | دنتال ستور" },
      { property: "og:description", content: "إدارة مبيعاتك وعروضك بخطوات قليلة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandPage,
});

const L = {
  portal: { ar: "لوحة البائع", ku: "پانێلی فرۆشیار", en: "Vendor Dashboard",},
  sell: { ar: "البيع", ku: "فرۆشتن", en: "Selling",},
  promote: { ar: "الترويج", ku: "بانگەشە", en: "Promotions",},
  money: { ar: "الحسابات", ku: "حیساب", en: "Accounts",},
  products: { ar: "منتجاتي", ku: "بەرهەمەکانم", en: "My Products",},
  productsHint: { ar: "إضافة وتعديل الأسعار والخصومات", ku: "زیادکردن و دەستکاری نرخ و داشکاندن", en: "Add & Edit Prices and Discounts",},
  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders",},
  ordersHint: { ar: "متابعة وتجهيز الطلبات", ku: "بەدواداچوون و ئامادەکردن", en: "Track & Process Orders",},
  promos: { ar: "إنشاء عرض", ku: "دروستکردنی ئۆفەر", en: "Create Offer",},
  promosHint: { ar: "خصم، صفقة اليوم، حزمة", ku: "داشکاندن، ئۆفەری ڕۆژ، پاکێج", en: "Discount, Deal of the Day, Bundle",},
  account: { ar: "كشف الحساب", ku: "لیستەی حیساب", en: "Account Statement",},
  accountHint: { ar: "العمولة والمبالغ المستحقة", ku: "کۆمیشن و بڕی پارە", en: "Commission & Due Amounts",},
  costs: { ar: "تكاليف التسويق", ku: "تێچووی ڕیکلام", en: "Marketing Costs",},
  costsHint: { ar: "ما تدفعه مقابل الترويج", ku: "ئەوەی بۆ ڕیکلام دەدەیت", en: "What you pay for promotion",},
  ship: { ar: "أجور التوصيل", ku: "کرێی گەیاندن", en: "Shipping costs",},
  shipHint: { ar: "سعر لكل مدينة + توصيل مجاني", ku: "نرخ بۆ هەر شار + گەیاندنی خۆڕایی", en: "Per-city price + free shipping",},
  qr: { ar: "رمز QR للمتجر", ku: "کیو ئاری فرۆشگا", en: "Store QR Code",},
  qrHint: { ar: "شارِكه مع الأطباء", ku: "بڵاوی بکە بۆ پزیشکان", en: "Share it with dentists",},
  sales: { ar: "المبيعات", ku: "فرۆشتن", en: "Sales",},
  due: { ar: "العمولة", ku: "کۆمیشن", en: "Commission",},
  net: { ar: "الصافي", ku: "پاک", en: "Net",},
  units: { ar: "القطع المباعة", ku: "دانەی فرۆشراو", en: "Items Sold",},
};

function BrandPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data: vendor, isLoading } = useMyVendor(user?.id);
  const { tab } = Route.useSearch();
  const [active, setActive] = useState<string | null>(tab ?? null);

  const { data: totals } = useQuery({
    queryKey: ["vendor-totals", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("unit_price, quantity, commission_amount")
        .eq("vendor_id", vendor!.id);
      if (error) throw error;
      return vendorTotals((data ?? []) as never);
    },
  });

  if (isLoading) return <StoreLayout>{null}</StoreLayout>;

  if (!vendor) {
    return (
      <StoreLayout>
        <p className="py-20 text-center text-sm text-muted-foreground">{t("noBrandAccount")}</p>
      </StoreLayout>
    );
  }

  const groups = [
    {
      label: L.sell[lang],
      items: [
        { key: "products", label: L.products[lang], hint: L.productsHint[lang], icon: Package },
        { key: "orders", label: L.orders[lang], hint: L.ordersHint[lang], icon: LayoutGrid },
        { key: "shipping", label: L.ship[lang], hint: L.shipHint[lang], icon: Truck },
      ],
    },
    {
      label: L.promote[lang],
      items: [
        { key: "promos", label: L.promos[lang], hint: L.promosHint[lang], icon: Sparkles },
        { key: "points", label: t("sponsoredPoints"), hint: t("sponsoredPointsHint"), icon: Coins },
      ],
    },
    {
      label: L.money[lang],
      items: [
        { key: "account", label: L.account[lang], hint: L.accountHint[lang], icon: Receipt },
        { key: "qr", label: L.qr[lang], hint: L.qrHint[lang], icon: QrCode },
      ],
    },
  ];

  return (
    <StoreLayout>
      <PanelShell
        title={L.portal[lang]}
        subtitle={`${(vendor.brands ?? []).join(" · ") || vendor.name} · ${
          vendor.commission_type === "percent"
            ? `${vendor.commission_value}%`
            : String(vendor.commission_value)
        }`}
        kpis={[
          { label: L.sales[lang], value: formatPrice(totals?.sales ?? 0, lang) },
          { label: L.due[lang], value: formatPrice(totals?.commission ?? 0, lang) },
          { label: L.net[lang], value: formatPrice(totals?.net ?? 0, lang) },
          { label: L.units[lang], value: String(totals?.units ?? 0) },
        ]}
        groups={groups}
        active={active}
        onOpen={setActive}
        onClose={() => setActive(null)}
      >
        {active === "products" && (
          <VendorProducts
            vendorId={vendor.id}
            brands={vendor.brands?.length ? vendor.brands : [vendor.brand_key || vendor.name]}
          />
        )}
        {active === "orders" && <VendorOrders vendorId={vendor.id} />}
        {active === "shipping" && <ShippingRates vendorId={vendor.id} />}
        {active === "promos" && <PromoStudio vendorId={vendor.id} />}
        {active === "points" && <VendorRewardPoints vendorId={vendor.id} />}
        {active === "account" && <VendorAccounting vendorId={vendor.id} />}
        {active === "qr" && <VendorQrCard vendor={vendor} />}
      </PanelShell>
    </StoreLayout>
  );
}
