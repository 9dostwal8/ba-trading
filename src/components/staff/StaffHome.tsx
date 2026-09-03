import { Link } from "@tanstack/react-router";
import {
  Eye,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Lang = "ar" | "ku" | "en";

const L = {
  adminTitle: { ar: "إدارة المتجر", ku: "بەڕێوەبردنی فرۆشگا", en: "Store Management" },
  vendorTitle: { ar: "إدارة متجرك", ku: "بەڕێوەبردنی فرۆشگاکەت", en: "Manage Your Store" },
  adminSub: {
    ar: "هذه ليست صفحة الطبيب — من هنا تدير كل شيء في الموقع.",
    ku: "ئەمە پەڕەی پزیشک نییە — لێرەوە هەموو شت بەڕێوە دەبەی.",
    en: "This is not the dentist home — manage the whole marketplace from here.",
  },
  vendorSub: {
    ar: "هذه ليست صفحة الطبيب — من هنا تدير منتجاتك وطلباتك وعروضك.",
    ku: "ئەمە پەڕەی پزیشک نییە — بەرهەم و داواکاری و ئۆفەرەکانت لێرەوە بەڕێوە بەرە.",
    en: "This is not the dentist home — manage your products, orders and offers.",
  },
  openPanel: { ar: "افتح لوحة الإدارة", ku: "پانێلی بەڕێوەبردن بکەرەوە", en: "Open management panel" },
  preview: { ar: "معاينة صفحة الطبيب", ku: "پێشبینینی پەڕەی پزیشک", en: "Preview dentist home" },
  previewHint: {
    ar: "شاهد الموقع كما يراه الأطباء (بدون شراء).",
    ku: "وێبسایت وەک پزیشکان ببینە (بێ کڕین).",
    en: "See the storefront the way dentists see it (no buying).",
  },
  products: { ar: "المنتجات", ku: "بەرهەمەکان", en: "Products" },
  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders" },
  promos: { ar: "العروض والتسويق", ku: "ئۆفەر و ڕیکلام", en: "Offers & Marketing" },
  money: { ar: "الحسابات", ku: "حیسابات", en: "Accounts" },
  vendors: { ar: "البائعون", ku: "فرۆشیارەکان", en: "Vendors" },
  settings: { ar: "الإعدادات", ku: "ڕێکخستن", en: "Settings" },
  browse: { ar: "تصفح المتجر", ku: "گەڕان لە فرۆشگا", en: "Browse store" },
};

/** Landing page shown instead of the dentist home for admins and vendors. */
export function StaffHome({ isAdmin, panelTo }: { isAdmin: boolean; panelTo: "/admin" | "/admin/dashboard" | "/brand" }) {
  const { lang } = useI18n() as { lang: Lang };

  const tiles = isAdmin
    ? [
        { icon: Receipt, label: L.orders[lang] },
        { icon: Package, label: L.products[lang] },
        { icon: Sparkles, label: L.promos[lang] },
        { icon: Users, label: L.vendors[lang] },
        { icon: LayoutGrid, label: L.money[lang] },
        { icon: Settings, label: L.settings[lang] },
      ]
    : [
        { icon: Package, label: L.products[lang] },
        { icon: Receipt, label: L.orders[lang] },
        { icon: Sparkles, label: L.promos[lang] },
        { icon: LayoutGrid, label: L.money[lang] },
      ];

  return (
    <div className="px-3 py-4 lg:px-6 lg:py-8">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-pop">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-extrabold">
          <Store className="size-3.5" />
          {isAdmin ? L.adminTitle[lang] : L.vendorTitle[lang]}
        </span>
        <h1 className="mt-3 font-display text-[22px] font-extrabold leading-tight lg:text-[30px]">
          {isAdmin ? L.adminTitle[lang] : L.vendorTitle[lang]}
        </h1>
        <p className="mt-1.5 text-[12.5px] font-semibold opacity-90 lg:text-[14px]">
          {isAdmin ? L.adminSub[lang] : L.vendorSub[lang]}
        </p>
        <Link
          to={panelTo}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary-foreground px-4 py-2.5 text-[13.5px] font-extrabold text-primary active:scale-95"
        >
          <LayoutGrid className="size-4" />
          {L.openPanel[lang]}
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            to={panelTo}
            className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-3.5 text-start active:scale-[0.98]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <tile.icon className="size-[18px]" />
            </span>
            <span className="text-[13px] font-extrabold">{tile.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
        <div className="flex items-center gap-2 text-[13.5px] font-extrabold">
          <Eye className="size-[18px] text-primary" />
          {L.preview[lang]}
        </div>
        <p className="mt-1 text-[12px] font-semibold text-muted-foreground">{L.previewHint[lang]}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/?view=store"
            className="rounded-xl bg-foreground px-3.5 py-2 text-[12.5px] font-extrabold text-background active:scale-95"
          >
            {L.preview[lang]}
          </a>
          <Link
            to="/products"
            className="rounded-xl border border-border bg-card px-3.5 py-2 text-[12.5px] font-extrabold active:scale-95"
          >
            {L.browse[lang]}
          </Link>
        </div>
      </div>
    </div>
  );
}
