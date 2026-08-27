import { textKeys, type TKey } from "@/lib/i18n";

export type SectionId =
  | "home"
  | "products"
  | "cart"
  | "offers"
  | "orders"
  | "account"
  | "vendors"
  | "banners"
  | "admin"
  | "common";

export const SECTIONS: { id: SectionId; ar: string; ku: string; en: string }[] = [
  { id: "home", ar: "الصفحة الرئيسية", ku: "پەیجی سەرەکی", en: "Home",},
  { id: "products", ar: "المنتجات", ku: "بەرهەمەکان", en: "Products",},
  { id: "offers", ar: "العروض والخصومات", ku: "ئۆفەر و داشکاندن", en: "Offers & Discounts",},
  { id: "cart", ar: "السلة والدفع", ku: "سەبەتە و پارەدان", en: "Cart & Checkout",},
  { id: "orders", ar: "الطلبات", ku: "داواکاریەکان", en: "Orders",},
  { id: "account", ar: "الحساب والعناوين", ku: "هەژمار و ناونیشان", en: "Account & Addresses",},
  { id: "vendors", ar: "الموردون", ku: "دابینکەران", en: "Suppliers",},
  { id: "banners", ar: "البانرات", ku: "بانەرەکان", en: "Banners",},
  { id: "admin", ar: "لوحة الإدارة", ku: "پانێلی بەڕێوەبردن", en: "Admin Panel",},
  { id: "common", ar: "نصوص عامة", ku: "دەقی گشتی", en: "General Texts",},
];

/** Ordered keyword rules: first match wins. */
const RULES: { section: SectionId; test: RegExp }[] = [
  { section: "banners", test: /^banner|^myBanners$|^sponsored$/i },
  { section: "vendors", test: /vendor|brand|logo|commission|settle|charge|marketing|invoice/i },
  {
    section: "cart",
    test: /cart|checkout|coupon|shipping|delivery|total|subtotal|payment|paid|address|city|location/i,
  },
  { section: "orders", test: /order|status|confirm|shipped|pending|cancel/i },
  {
    section: "account",
    test: /sign|auth|password|profile|account|name|mobile|phone|email|notif|lang/i,
  },
  {
    section: "offers",
    test: /offer|deal|discount|badge|bundle|tier|flash|price|save|upTo|ends|expire|qty/i,
  },
  { section: "products", test: /product|stock|category|categor|filter|search|sku|desc|shop/i },
  { section: "home", test: /home|hero|usp|scan|qr|store|tagline|welcome|section|slide/i },
  { section: "admin", test: /admin|dashboard|group|settings|revenue|report|stat|accounting|user/i },
];

export function sectionOf(key: string): SectionId {
  for (const r of RULES) if (r.test.test(key)) return r.section;
  return "common";
}

export function keysBySection(): Record<SectionId, TKey[]> {
  const out = {} as Record<SectionId, TKey[]>;
  for (const s of SECTIONS) out[s.id] = [];
  for (const k of textKeys) out[sectionOf(k)].push(k);
  return out;
}
