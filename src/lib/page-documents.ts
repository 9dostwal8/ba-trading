import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlockConfig, BlockKind } from "@/lib/page-blocks";

export type BuilderLang = "ar" | "ku" | "en";
export type ModuleRegion = "header" | "content" | "footer";
export type ModuleTemplate = "default" | "minimal" | "outlined" | "soft" | "band" | "editorial";

export type PageModule = {
  id: string;
  type: string;
  label: Record<BuilderLang, string>;
  locked: boolean;
  enabled: boolean;
  region: ModuleRegion;
  content: {
    title?: Partial<Record<BuilderLang, string>>;
    subtitle?: Partial<Record<BuilderLang, string>>;
    button?: Partial<Record<BuilderLang, string>>;
  };
  style: {
    template: ModuleTemplate;
    tone: "primary" | "success" | "info" | "warning" | "neutral";
    icon?: string;
    padding: "compact" | "normal" | "spacious";
    columnsMobile?: number;
    columnsDesktop?: number;
    showMobile: boolean;
    showDesktop: boolean;
  };
  block?: { kind: BlockKind; config: BlockConfig };
};

export type PageDocument = { version: number; modules: PageModule[] };
export type PageDocumentRow = {
  id: string;
  page: string;
  draft: PageDocument;
  published: PageDocument;
  version: number;
  published_at: string | null;
};

type ModuleSeed = {
  id: string;
  type: string;
  ar: string;
  ku: string;
  en: string;
  locked?: boolean;
  region?: ModuleRegion;
  icon?: string;
  title?: Partial<Record<BuilderLang, string>>;
  subtitle?: Partial<Record<BuilderLang, string>>;
};

export type BuilderPage = {
  key: string;
  path: string;
  ar: string;
  ku: string;
  en: string;
  dynamic?: "product" | "vendor" | "bundle" | "order";
  modules: ModuleSeed[];
};

const m = (
  id: string,
  type: string,
  en: string,
  ar: string,
  ku: string,
  options: Omit<ModuleSeed, "id" | "type" | "en" | "ar" | "ku"> = {},
): ModuleSeed => ({ id, type, en, ar, ku, ...options });

const pageHead = (en: string, ar: string, ku: string, icon: string) =>
  m("page-header", "page-header", en, ar, ku, { locked: true, icon, title: { en, ar, ku } });

/** Exact inventory of the modules that currently make up each customer-facing page. */
export const PAGE_REGISTRY: BuilderPage[] = [
  { key: "home", path: "/", en: "Home", ar: "الرئيسية", ku: "سەرەکی", modules: [
    m("reward-bar", "reward-bar", "Reward bar", "شريط المكافآت", "باندی پاداشت", { icon: "coin" }),
    m("banners", "catalog", "Banner carousel", "سلايدر البانرات", "سلایدەری بانەر", { icon: "image" }),
    m("categories", "catalog", "Categories", "الأقسام", "بەشەکان", { icon: "grid" }),
    m("flash-deals", "catalog", "Flash deals", "العروض السريعة", "ئۆفەری خێرا", { icon: "zap" }),
    m("trust-strip", "features", "Trust strip", "شريط الثقة", "باندی متمانە", { icon: "shield" }),
    m("near-expiry", "catalog", "Near-expiry", "قرب الانتهاء", "نزیک بەسەرچوون", { icon: "clock" }),
    m("outlet", "catalog", "Outlet", "أوتلت", "ئاوتلێت", { icon: "package" }),
    m("offers", "catalog", "Offers", "العروض", "ئۆفەرەکان", { icon: "tag" }),
    m("bundles", "catalog", "Bundles", "الحزم", "پاکێجەکان", { icon: "boxes" }),
    m("brands", "catalog", "Brands", "الماركات", "براندەکان", { icon: "award" }),
    m("featured", "catalog", "Featured products", "منتجات مميزة", "بەرهەمی هەڵبژارد", { icon: "star" }),
    m("newest", "catalog", "Newest products", "أحدث المنتجات", "نوێترین بەرهەم", { icon: "sparkles" }),
    m("suppliers", "catalog", "Suppliers", "الموردون", "دابینکەران", { icon: "store" }),
    m("how-it-works", "features", "How it works", "كيف يعمل", "چۆن کار دەکات", { icon: "list" }),
    m("help-cta", "cta", "Help and vendor CTA", "المساعدة والانضمام", "یارمەتی و بەشداری", { icon: "rocket" }),
  ]},
  { key: "offers", path: "/offers", en: "Offers", ar: "العروض", ku: "ئۆفەرەکان", modules: [pageHead("Offers hub", "مركز العروض", "ناوەندی ئۆفەر" , "tag"), m("offer-navigation", "navigation-grid", "Offer categories", "أنواع العروض", "جۆرەکانی ئۆفەر", { locked: true, icon: "grid" })] },
  { key: "expiring", path: "/expiring", en: "Near-expiry", ar: "قرب الانتهاء", ku: "نزیک بەسەرچوون", modules: [pageHead("Near-expiry header", "عنوان قرب الانتهاء", "سەردێری نزیک بەسەرچوون", "clock"), m("campaign-banner", "banner-slot", "Campaign banner", "بانر الحملة", "بانەری کەمپین", { icon: "image" }), m("expiry-groups", "product-list", "Expiry groups", "مجموعات الانتهاء", "گرووپی بەسەرچوون", { locked: true, icon: "list" }), m("browse-more", "cta", "Browse more", "تصفح المزيد", "زیاتر ببینە", { icon: "arrow" })] },
  { key: "outlet", path: "/outlet", en: "Outlet", ar: "أوتلت", ku: "ئاوتلێت", modules: [pageHead("Outlet header", "عنوان الأوتلت", "سەردێری ئاوتلێت", "package"), m("campaign-banner", "banner-slot", "Campaign banner", "بانر الحملة", "بانەری کەمپین", { icon: "image" }), m("outlet-grid", "product-grid", "Outlet products", "منتجات الأوتلت", "بەرهەمی ئاوتلێت", { locked: true, icon: "grid" })] },
  { key: "deals", path: "/deals", en: "Flash deals", ar: "الصفقات", ku: "بازاڕگەرم", modules: [pageHead("Flash-deal header", "عنوان الصفقات", "سەردێری ڕێککەوتن", "zap"), m("campaign-banner", "banner-slot", "Campaign banner", "بانر الحملة", "بانەری کەمپین", { icon: "image" }), m("deal-list", "product-list", "Timed deal list", "قائمة الصفقات", "لیستی ئۆفەر", { locked: true, icon: "clock" })] },
  { key: "brands", path: "/brands", en: "Brands", ar: "الماركات", ku: "براندەکان", modules: [pageHead("Brands header", "عنوان الماركات", "سەردێری براند", "award"), m("campaign-banner", "banner-slot", "Campaign banner", "بانر الحملة", "بانەری کەمپین", { icon: "image" }), m("brand-rails", "brand-list", "Brand product rails", "صفوف الماركات", "ڕیزی براندەکان", { locked: true, icon: "award" })] },
  { key: "bundles", path: "/bundles", en: "Bundles", ar: "الحزم", ku: "پاکێجەکان", modules: [pageHead("Bundles header", "عنوان الحزم", "سەردێری پاکێج", "boxes"), m("campaign-banner", "banner-slot", "Campaign banner", "بانر الحملة", "بانەری کەمپین", { icon: "image" }), m("bundle-list", "bundle-list", "Bundle cards", "بطاقات الحزم", "کارتی پاکێج", { locked: true, icon: "boxes" })] },
  { key: "categories", path: "/categories", en: "Categories", ar: "الأقسام", ku: "بەشەکان", modules: [pageHead("Categories header", "عنوان الأقسام", "سەردێری بەشەکان", "grid"), m("category-grid", "category-grid", "Category grid", "شبكة الأقسام", "خشتەی بەشەکان", { locked: true, icon: "grid" })] },
  { key: "products", path: "/products", en: "Products", ar: "المنتجات", ku: "بەرهەمەکان", modules: [pageHead("Shop title", "عنوان المتجر", "سەردێری فرۆشگا", "store"), m("search", "search", "Product search", "بحث المنتجات", "گەڕانی بەرهەم", { locked: true, icon: "search" }), m("filters", "filters", "Sort and category filters", "الفرز والتصفية", "ڕیزکردن و فلتەر", { locked: true, icon: "filter" }), m("results-summary", "stats", "Results summary", "ملخص النتائج", "پوختەی ئەنجام", { icon: "list" }), m("products-banner", "banner-slot", "Products banner", "بانر المنتجات", "بانەری بەرهەم", { icon: "image" }), m("product-grid", "product-grid", "Product grid", "شبكة المنتجات", "خشتەی بەرهەم", { locked: true, icon: "grid" })] },
  { key: "featured", path: "/featured", en: "Featured", ar: "منتجات مميزة", ku: "هەڵبژارد", modules: [pageHead("Featured header", "عنوان المميز", "سەردێری هەڵبژاردە", "star"), m("product-grid", "product-grid", "Featured grid", "شبكة المنتجات", "خشتەی بەرهەم", { locked: true, icon: "grid" })] },
  { key: "new", path: "/new", en: "Newest", ar: "الأحدث", ku: "نوێترین", modules: [pageHead("Newest header", "عنوان الأحدث", "سەردێری نوێترین", "sparkles"), m("product-grid", "product-grid", "Newest grid", "شبكة المنتجات", "خشتەی بەرهەم", { locked: true, icon: "grid" })] },
  { key: "product", path: "/products", dynamic: "product", en: "Product detail", ar: "صفحة المنتج", ku: "پەیجی بەرهەم", modules: [m("media", "product-media", "Product gallery", "صور المنتج", "وێنەی بەرهەم", { locked: true, icon: "image" }), m("identity", "product-info", "Name, brand and badges", "الاسم والماركة والشارات", "ناو و براند و نیشانە", { locked: true, icon: "badge" }), m("price", "price-panel", "Price and quantity", "السعر والكمية", "نرخ و بڕ", { locked: true, icon: "coin" }), m("rewards", "reward-panel", "Reward points", "نقاط المكافأة", "خاڵی پاداشت", { icon: "gift" }), m("supplier", "supplier-offer", "Supplier offer", "عرض المورد", "ئۆفەری دابینکەر", { locked: true, icon: "store" }), m("trust", "features", "Trust tiles", "مربعات الثقة", "خانەی متمانە", { icon: "shield" }), m("description", "rich-text", "Description", "الوصف", "وەسف", { icon: "file" }), m("reviews", "reviews", "Reviews", "التقييمات", "هەڵسەنگاندن", { icon: "star" }), m("buy-dock", "action-dock", "Buy bar", "شريط الشراء", "باندی کڕین", { locked: true, icon: "cart", region: "footer" })] },
  { key: "cart", path: "/cart", en: "Cart", ar: "السلة", ku: "سەبەتە", modules: [m("items", "cart-items", "Order items", "عناصر الطلب", "کاڵاکانی داواکاری", { locked: true, icon: "cart" }), m("shipping-meter", "shipping-meter", "Free-shipping progress", "تقدم الشحن المجاني", "پێشکەوتنی گەیاندنی خۆڕایی", { icon: "truck" }), m("coupon", "coupon", "Coupon", "كوبون الخصم", "کوپۆن", { icon: "tag" }), m("delivery", "delivery-form", "Delivery details", "تفاصيل التوصيل", "زانیاری گەیاندن", { locked: true, icon: "pin" }), m("rewards", "reward-panel", "Use and earn points", "استخدام وكسب النقاط", "بەکارهێنان و بەدەستهێنانی خاڵ", { icon: "coin" }), m("payment", "payment-method", "Payment method", "طريقة الدفع", "شێوازی پارەدان", { locked: true, icon: "card" }), m("summary", "order-summary", "Order summary", "ملخص الطلب", "پوختەی داواکاری", { locked: true, icon: "receipt" }), m("checkout", "checkout-action", "Place order", "إتمام الطلب", "تەواوکردنی داواکاری", { locked: true, icon: "check", region: "footer" })] },
  { key: "vendors", path: "/vendors", en: "Suppliers", ar: "الموردون", ku: "دابینکەران", modules: [pageHead("Suppliers header", "عنوان الموردين", "سەردێری دابینکەران", "store"), m("vendor-grid", "vendor-grid", "Supplier directory", "دليل الموردين", "ڕێبەری دابینکەران", { locked: true, icon: "grid" })] },
  { key: "vendor", path: "/vendors", dynamic: "vendor", en: "Supplier detail", ar: "صفحة المورد", ku: "پەیجی دابینکەر", modules: [m("vendor-header", "vendor-header", "Supplier identity and QR", "هوية المورد وQR", "ناسنامە و QR", { locked: true, icon: "store" }), m("about", "rich-text", "About supplier", "عن المورد", "دەربارەی دابینکەر", { icon: "file" }), m("deals", "catalog", "Supplier deals", "صفقات المورد", "ئۆفەری دابینکەر", { icon: "zap" }), m("offers", "catalog", "Supplier offers", "عروض المورد", "ئۆفەری دابینکەر", { icon: "tag" }), m("bundles", "catalog", "Supplier bundles", "حزم المورد", "پاکێجی دابینکەر", { icon: "boxes" }), m("products", "product-grid", "Supplier products", "منتجات المورد", "بەرهەمی دابینکەر", { locked: true, icon: "grid" })] },
  { key: "rewards", path: "/rewards", en: "Reward points", ar: "نقاط المكافأة", ku: "خاڵی پاداشت", modules: [pageHead("Rewards hero", "واجهة المكافآت", "سەردێری پاداشت", "coin"), m("value", "stats", "Points value", "قيمة النقاط", "بەهای خاڵ", { icon: "coin" }), m("steps", "features", "How it works", "كيف تعمل", "چۆن کار دەکات", { icon: "list" }), m("earning", "features", "Ways to earn", "طرق الكسب", "ڕێگای بەدەستهێنان", { icon: "star" }), m("rules", "data-list", "Live reward rules", "قواعد المكافآت", "یاسای پاداشت", { locked: true, icon: "settings" }), m("faq", "faq", "Questions", "الأسئلة", "پرسیارەکان", { icon: "help" }), m("join", "cta", "Join CTA", "دعوة الانضمام", "بانگهێشتی بەشداری", { icon: "gift" })] },
  { key: "profile", path: "/profile", en: "Profile", ar: "الحساب", ku: "هەژمار", modules: [m("identity", "profile-identity", "Account identity", "هوية الحساب", "ناسنامەی هەژمار", { locked: true, icon: "user" }), m("savings", "savings", "Savings card", "بطاقة التوفير", "کارتی پاشەکەوت", { icon: "tag" }), m("account-menu", "account-menu", "Account menu", "قائمة الحساب", "لیستی هەژمار", { locked: true, icon: "list" })] },
  { key: "savings", path: "/savings", en: "Savings", ar: "توفيراتي", ku: "پاشەکەوتم", modules: [pageHead("Savings summary", "ملخص التوفير", "پوختەی پاشەکەوت", "tag"), m("savings-stats", "stats", "Savings totals", "إجمالي التوفير", "کۆی پاشەکەوت", { locked: true, icon: "chart" }), m("savings-ledger", "data-list", "Savings ledger", "سجل التوفير", "تۆماری پاشەکەوت", { locked: true, icon: "receipt" })] },
  { key: "notifications", path: "/notifications", en: "Notifications", ar: "التنبيهات", ku: "ئاگادارکردنەوە", modules: [pageHead("Notifications header", "عنوان التنبيهات", "سەردێری ئاگادارکردنەوە", "bell"), m("notification-list", "data-list", "Notification list", "قائمة التنبيهات", "لیستی ئاگادارکردنەوە", { locked: true, icon: "list" })] },
  { key: "how-discounts", path: "/how-discounts", en: "Discount guide", ar: "كيف تعمل الخصومات", ku: "چۆنیەتی داشکان", modules: [pageHead("Discount guide", "دليل الخصومات", "ڕێبەری داشکان", "percent"), m("discount-steps", "features", "Discount steps", "خطوات الخصم", "هەنگاوی داشکان", { locked: true, icon: "list" }), m("discount-rules", "data-list", "Live discount rules", "قواعد الخصم", "یاسای داشکان", { locked: true, icon: "settings" })] },
  { key: "vendor-signup", path: "/vendor-signup", en: "Vendor signup", ar: "تسجيل مورد", ku: "تۆمارکردنی دابینکەر", modules: [pageHead("Vendor signup hero", "واجهة تسجيل المورد", "سەردێری تۆمارکردنی دابینکەر", "store"), m("signup-steps", "form", "Vendor registration form", "نموذج تسجيل المورد", "فۆرمی تۆمارکردنی دابینکەر", { locked: true, icon: "form" }), m("approval-note", "notice", "Approval information", "معلومات الموافقة", "زانیاری پەسەندکردن", { icon: "shield" })] },
  { key: "auth", path: "/auth", en: "Sign in", ar: "الدخول", ku: "چوونەژوورەوە", modules: [pageHead("Account hero", "واجهة الحساب", "سەردێری هەژمار", "user"), m("auth-form", "form", "Login and registration wizard", "نموذج الدخول والتسجيل", "فۆرمی چوونەژوورەوە", { locked: true, icon: "form" }), m("benefits", "features", "Dentist benefits", "فوائد طبيب الأسنان", "سوودی پزیشکی ددان", { icon: "sparkles" })] },
  { key: "scan", path: "/scan", en: "QR scanner", ar: "ماسح QR", ku: "سکانەری QR", modules: [pageHead("Scanner header", "عنوان الماسح", "سەردێری سکانەر", "scan"), m("scanner", "scanner", "Camera scanner", "ماسح الكاميرا", "سکانەری کامێرا", { locked: true, icon: "scan" }), m("scanner-help", "notice", "Scanner help", "مساعدة الماسح", "یارمەتی سکانەر", { icon: "help" })] },
  { key: "bundle", path: "/bundles", dynamic: "bundle", en: "Bundle detail", ar: "تفاصيل الحزمة", ku: "وردەکاری پاکێج", modules: [m("bundle-media", "product-media", "Bundle image", "صورة الحزمة", "وێنەی پاکێج", { locked: true, icon: "image" }), m("bundle-info", "product-info", "Bundle details", "تفاصيل الحزمة", "وردەکاری پاکێج", { locked: true, icon: "boxes" }), m("bundle-items", "product-list", "Included products", "المنتجات المشمولة", "بەرهەمە ناوخراوەکان", { locked: true, icon: "list" }), m("bundle-buy", "action-dock", "Buy bundle", "شراء الحزمة", "کڕینی پاکێج", { locked: true, icon: "cart" })] },
  { key: "payment", path: "/cart", dynamic: "order", en: "Payment", ar: "الدفع", ku: "پارەدان", modules: [pageHead("Payment header", "عنوان الدفع", "سەردێری پارەدان", "card"), m("payment-status", "status", "Payment status", "حالة الدفع", "دۆخی پارەدان", { locked: true, icon: "shield" }), m("payment-action", "payment-action", "Payment action", "إجراء الدفع", "کرداری پارەدان", { locked: true, icon: "card" })] },
  { key: "orders", path: "/orders", en: "My orders", ar: "طلباتي", ku: "داواکارییەکانم", modules: [pageHead("Orders header", "عنوان الطلبات", "سەردێری داواکاری", "package"), m("order-filters", "filters", "Order filters", "تصفية الطلبات", "فلتەری داواکاری", { icon: "filter" }), m("order-list", "data-list", "Order list", "قائمة الطلبات", "لیستی داواکاری", { locked: true, icon: "list" })] },
  { key: "order", path: "/orders", dynamic: "order", en: "Order detail", ar: "تفاصيل الطلب", ku: "وردەکاری داواکاری", modules: [pageHead("Order status", "حالة الطلب", "دۆخی داواکاری", "package"), m("order-items", "data-list", "Order items", "عناصر الطلب", "کاڵاکانی داواکاری", { locked: true, icon: "list" }), m("delivery-summary", "summary", "Delivery summary", "ملخص التوصيل", "پوختەی گەیاندن", { locked: true, icon: "pin" }), m("invoice", "invoice", "Invoice", "الفاتورة", "پسووڵە", { icon: "receipt" })] },
];

export const MODULE_TEMPLATES: Array<{ key: ModuleTemplate; en: string; ar: string; ku: string }> = [
  { key: "default", en: "Page default", ar: "افتراضي", ku: "بنەڕەت" },
  { key: "minimal", en: "Minimal", ar: "بسيط", ku: "سادە" },
  { key: "outlined", en: "Outlined", ar: "بإطار", ku: "چوارچێوەدار" },
  { key: "soft", en: "Soft surface", ar: "سطح ناعم", ku: "ڕووی نەرم" },
  { key: "band", en: "Colour band", ar: "شريط ملون", ku: "باندی ڕەنگاوڕەنگ" },
  { key: "editorial", en: "Editorial", ar: "تحريري", ku: "نوسراوەیی" },
];

export function defaultPageDocument(page: BuilderPage): PageDocument {
  return {
    version: 1,
    modules: page.modules.map((seed) => ({
      id: seed.id,
      type: seed.type,
      label: { ar: seed.ar, ku: seed.ku, en: seed.en },
      locked: Boolean(seed.locked),
      enabled: true,
      region: seed.region ?? "content",
      content: {
        ...(seed.title ? { title: seed.title } : {}),
        ...(seed.subtitle ? { subtitle: seed.subtitle } : {}),
      },
      style: {
        template: "default",
        tone: "primary",
        ...(seed.icon ? { icon: seed.icon } : {}),
        padding: "normal",
        showMobile: true,
        showDesktop: true,
      },
    })),
  };
}

/**
 * Legacy `page_blocks` rows used raw section keys while the module registry uses
 * friendlier ids, so the same store section could be imported twice.
 */
export const NATIVE_SECTION_ALIASES: Record<string, string> = {
  hero: "flash-deals",
  expiring: "near-expiry",
  usp: "trust-strip",
  vendor_rail: "suppliers",
  how_it_works: "how-it-works",
  help_cta: "help-cta",
  reward_bar: "reward-bar",
};

/** Identity of a module for duplicate detection: native section key or module id. */
export function moduleIdentity(module: PageModule): string {
  if (module.block?.kind === "section") {
    const key = module.block.config.section ?? "";
    const slot = module.block.config.slot ? `:${module.block.config.slot}` : "";
    return `section:${NATIVE_SECTION_ALIASES[key] ?? key}${slot}`;
  }
  if (module.block) return module.id;
  return `section:${module.id}`;
}

/** Keeps the first occurrence of every module so a page never renders twice. */
export function dedupeModules(modules: PageModule[]): PageModule[] {
  const seen = new Set<string>();
  return modules.filter((module) => {
    const key = moduleIdentity(module);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function normalizeDocument(raw: unknown, page: BuilderPage): PageDocument {
  if (!raw || typeof raw !== "object") return defaultPageDocument(page);
  const value = raw as Partial<PageDocument>;
  if (!Array.isArray(value.modules) || !value.modules.length) return defaultPageDocument(page);
  return { version: Number(value.version) || 1, modules: dedupeModules(value.modules as PageModule[]) };
}

export async function fetchPageDocuments(): Promise<PageDocumentRow[]> {
  const { data, error } = await supabase.from("page_documents").select("id,page,draft,published,version,published_at");
  if (error || !data) return [];
  return data.map((row) => {
    const page = PAGE_REGISTRY.find((entry) => entry.key === row.page) ?? PAGE_REGISTRY.at(0);
    if (!page) throw new Error("Page registry is empty");
    return {
      id: row.id,
      page: row.page,
      draft: normalizeDocument(row.draft, page),
      published: normalizeDocument(row.published, page),
      version: row.version,
      published_at: row.published_at,
    };
  });
}

export function usePageDocuments() {
  return useQuery({ queryKey: ["page_documents"], queryFn: fetchPageDocuments, staleTime: 60_000 });
}

export function pageDocumentFor(rows: PageDocumentRow[] | undefined, page: BuilderPage, mode: "draft" | "published") {
  const row = rows?.find((item) => item.page === page.key);
  return row ? row[mode] : defaultPageDocument(page);
}