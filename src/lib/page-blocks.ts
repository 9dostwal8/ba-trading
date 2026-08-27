/**
 * Page builder store.
 *
 * Every storefront page is described by an ordered list of blocks in the
 * `page_blocks` table. A block is either a *native* section (the real
 * marketplace modules: banners, categories, flash rail, near-expiry, …) or a
 * *custom* block the admin composes in the studio (text, icon row, image, CTA).
 *
 * The home page is fully composable (drag & drop the whole feed); the other
 * pages accept custom blocks above and below their built-in content.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlockKind = "section" | "text" | "icons" | "image" | "cta";
export type BlockFrame = "none" | "card" | "dashed" | "soft" | "band" | "gradient";
export type BlockTone = "primary" | "success" | "info" | "warning" | "neutral";
export type BlockAlign = "start" | "center";
export type BlockSize = "sm" | "md" | "lg";
export type BlockPosition = "top" | "bottom";

export type BlockItem = {
  icon: string;
  ar: string;
  ku: string;
  en: string;
};

export type BlockConfig = {
  /** native section key when kind = "section" */
  section?: string;
  /** banner slot name when section = "banner_slot" */
  slot?: string;
  title_ar?: string;
  title_ku?: string;
  title_en?: string;
  body_ar?: string;
  body_ku?: string;
  body_en?: string;
  button_ar?: string;
  button_ku?: string;
  button_en?: string;
  href?: string;
  icon?: string;
  items?: BlockItem[];
  image_url?: string;
  align?: BlockAlign;
  size?: BlockSize;
  frame?: BlockFrame;
  tone?: BlockTone;
  cols?: number;
  ratio?: "16:9" | "4:3" | "1:1" | "21:9";
  position?: BlockPosition;
};

export type PageBlock = {
  id: string;
  page: string;
  kind: BlockKind;
  sort_order: number;
  is_active: boolean;
  config: BlockConfig;
};

/** Pages that can be edited in the studio. `path` powers the live preview. */
export const BUILDER_PAGES: Array<{
  key: string;
  ar: string;
  ku: string;
  en: string;
  path: string;
  composable?: boolean;
}> = [
  { key: "home", ar: "الرئيسية", ku: "سەرەکی", en: "Home", path: "/", composable: true },
  { key: "offers", ar: "العروض", ku: "ئۆفەرەکان", en: "Offers", path: "/offers" },
  { key: "expiring", ar: "قرب الانتهاء", ku: "نزیک بەسەرچوون", en: "Near-expiry", path: "/expiring" },
  { key: "outlet", ar: "أوتلت", ku: "ئاوتلێت", en: "Outlet", path: "/outlet" },
  { key: "deals", ar: "الصفقات", ku: "بازاڕگەرم", en: "Flash deals", path: "/deals" },
  { key: "brands", ar: "الماركات", ku: "براندەکان", en: "Brands", path: "/brands" },
  { key: "bundles", ar: "الحزم", ku: "پاکێجەکان", en: "Bundles", path: "/bundles" },
  { key: "categories", ar: "الأقسام", ku: "بەشەکان", en: "Categories", path: "/categories" },
  { key: "products", ar: "المنتجات", ku: "بەرهەمەکان", en: "Products", path: "/products" },
  { key: "featured", ar: "منتجات مميزة", ku: "هەڵبژارد", en: "Featured", path: "/featured" },
  { key: "new", ar: "الأحدث", ku: "نوێترین", en: "Newest", path: "/new" },
  { key: "product", ar: "صفحة المنتج", ku: "پەیجی بەرهەم", en: "Product page", path: "/products" },
  { key: "cart", ar: "السلة", ku: "سەبەتە", en: "Cart", path: "/cart" },
  { key: "vendors", ar: "الموردون", ku: "دابینکەران", en: "Suppliers", path: "/vendors" },
  { key: "vendor", ar: "صفحة المورد", ku: "پەیجی دابینکەر", en: "Supplier page", path: "/vendors" },
  { key: "rewards", ar: "نقاط المكافأة", ku: "خاڵی پاداشت", en: "Reward points", path: "/rewards" },
  { key: "profile", ar: "الحساب", ku: "هەژمار", en: "Profile", path: "/profile" },
  { key: "savings", ar: "توفيراتي", ku: "پاشەکەوتم", en: "Savings", path: "/savings" },
  { key: "notifications", ar: "التنبيهات", ku: "ئاگادارکردنەوە", en: "Notifications", path: "/notifications" },
  { key: "how-discounts", ar: "كيف تعمل الخصومات", ku: "چۆنیەتی داشکان", en: "How discounts work", path: "/how-discounts" },
  { key: "vendor-signup", ar: "تسجيل مورد", ku: "تۆمارکردنی دابینکەر", en: "Vendor signup", path: "/vendor-signup" },
  { key: "auth", ar: "الدخول", ku: "چوونەژوورەوە", en: "Sign in", path: "/auth" },
];


/** Native app modules that can be reordered / hidden / dropped into any page. */
export const NATIVE_SECTIONS: Array<{ key: string; ar: string; ku: string; en: string }> = [
  { key: "banners", ar: "سلايدر البانرات", ku: "سلایدەری بانەر", en: "Banner slider" },
  { key: "categories", ar: "دوائر الأقسام", ku: "خشتەی بەشەکان", en: "Category circles" },
  { key: "hero", ar: "عروض مذهلة", ku: "ئۆفەری سەرسوڕهێنەر", en: "Amazing offers rail" },
  { key: "usp", ar: "شريط الضمانات", ku: "باندی دڵنیایی", en: "Trust strip" },
  { key: "expiring", ar: "قرب الانتهاء", ku: "نزیک بەسەرچوون", en: "Near-expiry hero" },
  { key: "outlet", ar: "أوتلت", ku: "ئاوتلێت", en: "Outlet grid" },
  { key: "offers", ar: "العروض", ku: "ئۆفەرەکان", en: "Offer strip" },
  { key: "bundles", ar: "الحزم", ku: "پاکێجەکان", en: "Bundles rail" },
  { key: "brands", ar: "الماركات", ku: "براندەکان", en: "Brands" },
  { key: "featured", ar: "منتجات مميزة", ku: "بەرهەمی هەڵبژارد", en: "Featured products" },
  { key: "newest", ar: "أحدث المنتجات", ku: "نوێترین بەرهەم", en: "Newest products" },
  { key: "vendor_rail", ar: "شريط الموردين", ku: "باندی دابینکەران", en: "Suppliers rail" },
  { key: "how_it_works", ar: "كيف يعمل", ku: "چۆن کار دەکات", en: "How it works" },
  { key: "help_cta", ar: "المساعدة والانضمام", ku: "یارمەتی و بەشداری", en: "Help / join CTA" },
  { key: "banner_slot", ar: "مساحة إعلانية", ku: "شوێنی ڕیکلام", en: "Ad banner slot" },
  { key: "reward_bar", ar: "شريط نقاط المكافأة", ku: "باندی خاڵی پاداشت", en: "Reward points bar" },
  { key: "savings_hero", ar: "توفيراتي", ku: "پاشەکەوتم", en: "My savings hero" },
  { key: "trust_rail", ar: "شريط الثقة", ku: "باندی متمانە", en: "Trust rail" },
  { key: "vendor_join_cta", ar: "دعوة الموردين", ku: "بانگهێشتی دابینکەر", en: "Vendor join CTA" },
  { key: "home_intro", ar: "ترحيب الرئيسية", ku: "بەخێرهاتنی سەرەکی", en: "Welcome intro" },
  { key: "qr_scan", ar: "ماسح QR", ku: "سکانەری QR", en: "QR scanner bar" },
];

/**
 * The built-in modules each page already ships with. The builder seeds these as
 * ready-made (hidden) blocks so every part of the app is visible and editable —
 * enable one to render it, reorder it, or place it above / below the content.
 */
export const PAGE_PRESETS: Record<string, string[]> = {
  home: ["banners", "categories", "hero", "usp", "expiring", "outlet", "offers", "bundles", "brands", "featured", "newest", "vendor_rail", "how_it_works", "help_cta"],
  offers: ["offers", "usp", "banner_slot"],
  expiring: ["expiring", "outlet", "usp"],
  outlet: ["outlet", "expiring", "usp"],
  deals: ["hero", "offers", "usp"],
  brands: ["brands", "featured"],
  bundles: ["bundles", "offers"],
  categories: ["categories", "featured"],
  products: ["categories", "featured", "newest"],
  featured: ["featured", "usp", "banner_slot"],
  new: ["newest", "usp"],
  product: ["usp", "trust_rail", "featured"],
  cart: ["usp", "trust_rail", "banner_slot"],
  vendors: ["vendor_rail", "usp"],
  vendor: ["vendor_rail", "featured"],
  rewards: ["reward_bar", "how_it_works", "help_cta"],
  profile: ["savings_hero", "reward_bar", "usp"],
  savings: ["savings_hero", "usp"],
  notifications: ["banner_slot", "usp"],
  "how-discounts": ["how_it_works", "usp", "help_cta"],
  "vendor-signup": ["vendor_join_cta", "how_it_works", "help_cta"],
  auth: ["usp", "trust_rail"],
};

export { SLOT_KEYS as BANNER_SLOTS } from "@/lib/banners";


export const BLOCK_KIND_META: Array<{ key: BlockKind; ar: string; ku: string; en: string }> = [
  { key: "section", ar: "قسم جاهز", ku: "بەشی ئامادە", en: "Built-in section" },
  { key: "text", ar: "نص", ku: "دەق", en: "Text block" },
  { key: "icons", ar: "صف أيقونات", ku: "ڕیزی ئایکۆن", en: "Icon feature row" },
  { key: "image", ar: "صورة / بانر", ku: "وێنە / بانەر", en: "Image / banner" },
  { key: "cta", ar: "زر دعوة", ku: "دوگمەی بانگهێشت", en: "CTA button" },
];

export const DEFAULT_BLOCK_CONFIG: Record<BlockKind, BlockConfig> = {
  section: { section: "featured" },
  text: {
    title_ar: "عنوان جديد",
    title_ku: "سەردێری نوێ",
    title_en: "New heading",
    body_ar: "اكتب النص هنا",
    body_ku: "دەق لێرە بنووسە",
    body_en: "Write your text here",
    align: "center",
    size: "md",
    frame: "card",
    tone: "primary",
    icon: "sparkles",
  },
  icons: {
    align: "center",
    frame: "card",
    tone: "primary",
    cols: 3,
    items: [
      { icon: "truck", ar: "توصيل سريع", ku: "گەیاندنی خێرا", en: "Fast delivery" },
      { icon: "shield", ar: "أصلي 100%", ku: "١٠٠٪ ڕەسەن", en: "100% authentic" },
      { icon: "coin", ar: "نقاط مكافأة", ku: "خاڵی پاداشت", en: "Reward points" },
    ],
  },
  image: { ratio: "16:9", frame: "card", image_url: "", href: "" },
  cta: {
    title_ar: "انضم الآن",
    title_ku: "ئێستا بەشداربە",
    title_en: "Join now",
    button_ar: "ابدأ",
    button_ku: "دەستپێبکە",
    button_en: "Get started",
    href: "/vendor-signup",
    align: "center",
    frame: "gradient",
    tone: "primary",
    icon: "rocket",
  },
};

export async function fetchPageBlocks(): Promise<PageBlock[]> {
  const { data, error } = await supabase
    .from("page_blocks")
    .select("id, page, kind, sort_order, is_active, config")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    page: r.page as string,
    kind: (r.kind as BlockKind) ?? "text",
    sort_order: Number(r.sort_order ?? 0),
    is_active: Boolean(r.is_active),
    config: (r.config ?? {}) as BlockConfig,
  }));
}

/** All blocks (any page) — cached like the rest of the storefront data. */
export function usePageBlocks() {
  return useQuery({ queryKey: ["page_blocks"], queryFn: fetchPageBlocks, staleTime: 5 * 60_000 });
}

/** Visible blocks for one page, in order. */
export function blocksFor(all: PageBlock[] | undefined, page: string, position?: BlockPosition) {
  return (all ?? [])
    .filter((b) => b.page === page && b.is_active)
    .filter((b) => (position ? (b.config.position ?? "top") === position : true))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function blockLabel(b: PageBlock, lang: "ar" | "ku" | "en") {
  if (b.kind === "section") {
    const meta = NATIVE_SECTIONS.find((s) => s.key === b.config.section);
    const base = meta ? meta[lang] : (b.config.section ?? "section");
    return b.config.section === "banner_slot" ? `${base} · ${b.config.slot ?? ""}` : base;
  }
  const pickTitle = b.config[`title_${lang}` as const] || b.config.title_en || b.config.title_ar;
  const kindMeta = BLOCK_KIND_META.find((k) => k.key === b.kind);
  return pickTitle || (kindMeta ? kindMeta[lang] : b.kind);
}
