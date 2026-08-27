/** Paid banner placements (ad slots) and the banner creatives that fill them. */

export type BannerSlotRow = {
  id: string;
  slot_key: string;
  name_ar: string;
  name_ku: string;
  desc_ar: string | null;
  desc_ku: string | null;
  price: number;
  max_banners: number;
  is_active: boolean;
  sort_order: number;
};

export type BannerRow = {
  id: string;
  slot_key: string;
  vendor_id: string | null;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string | null;
  subtitle_ku: string | null;
  cta_ar: string | null;
  cta_ku: string | null;
  image_url: string | null;
  link: string | null;
  bg_color: string | null;
  text_color: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

/** Ordered placement keys used across storefront pages. */
export const SLOT_KEYS = [
  "home_hero",
  "home_below_hero",
  "home_mid",
  "home_footer",
  "cart",
  "products_top",
  "offers_page",
  "product_page",
  "orders_page",
] as const;

export type SlotKey = (typeof SLOT_KEYS)[number];

/** Ready-made background presets so vendors pick visually, not by hex code. */
export const BANNER_THEMES: { key: string; bg: string; fg: string; ar: string; ku: string; en: string }[] = [
  { key: "sky", bg: "linear-gradient(135deg,#0b4f9c,#22a7f0)", fg: "#ffffff", ar: "أزرق طبي", ku: "شینی پزیشکی", en: "Medical Blue",},
  { key: "mint", bg: "linear-gradient(135deg,#046b5c,#3fd0a8)", fg: "#ffffff", ar: "أخضر نعناعي", ku: "سەوزی مینت", en: "Mint Green",},
  { key: "amber", bg: "linear-gradient(135deg,#b45309,#fbbf24)", fg: "#1a1206", ar: "ذهبي", ku: "زێڕین", en: "Golden",},
  { key: "rose", bg: "linear-gradient(135deg,#9d174d,#fb7185)", fg: "#ffffff", ar: "وردي", ku: "پەمەیی", en: "Pink",},
  { key: "violet", bg: "linear-gradient(135deg,#4c1d95,#a78bfa)", fg: "#ffffff", ar: "بنفسجي", ku: "مۆر", en: "Purple",},
  { key: "ink", bg: "linear-gradient(135deg,#0f172a,#334155)", fg: "#ffffff", ar: "رمادي غامق", ku: "خۆڵەمێشی تاریک", en: "Dark Gray",},
  { key: "teal", bg: "linear-gradient(135deg,#134e4a,#2dd4bf)", fg: "#ffffff", ar: "فيروزي", ku: "فیرۆزی", en: "Turquoise",},
  { key: "coral", bg: "linear-gradient(135deg,#9a3412,#fb923c)", fg: "#ffffff", ar: "برتقالي", ku: "نارنجی", en: "Orange",},
];

export const DEFAULT_BANNER_BG = BANNER_THEMES[0]!.bg;
export const DEFAULT_BANNER_FG = BANNER_THEMES[0]!.fg;

/** Active + inside its scheduled window. */
export function bannerIsLive(b: BannerRow, now = Date.now()) {
  if (!b.is_active) return false;
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
  if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
  return true;
}

/** Live banners for one placement, respecting the slot capacity. */
export function bannersForSlot(rows: BannerRow[] = [], slot: string, max = 5) {
  return rows
    .filter((b) => b.slot_key === slot && bannerIsLive(b))
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, max);
}

/** "YYYY-MM-DDTHH:mm" value for datetime-local inputs. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : null;
}
