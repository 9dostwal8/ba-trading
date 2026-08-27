import { supabase } from "@/integrations/supabase/client";
import type { BrandCard } from "@/lib/brands";
import { clearanceBase } from "@/lib/clearance";
import type { ClearanceRule } from "@/lib/clearance";

export type { ClearanceRule };

export type Product = {
  id: string;
  category_id: string | null;
  name_ar: string;
  name_ku: string;
  description_ar: string;
  description_ku: string;
  brand: string;
  sku: string;
  price: number;
  compare_price: number | null;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  badges?: string[] | null;
  vendor_id?: string | null;
  /** Shared catalog identity: several vendors can list the same item. */
  catalog_item_id?: string | null;
  /** Clearance concept: expiry-driven or slow-moving outlet stock. */
  clearance_kind?: string | null;
  expiry_date?: string | null;
  stocked_since?: string | null;
  batch_no?: string | null;
};

export type OfferScope = "products" | "category" | "brand" | "all";
export type OfferKind = "percent" | "fixed" | "fixed_price" | "bxgy";

export type Offer = {
  id: string;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  discount_type: string;
  discount_value: number;
  badge_ar: string;
  badge_ku: string;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  scope: OfferScope;
  category_id: string | null;
  brand: string;
  min_qty: number;
  max_discount: number | null;
  buy_qty: number;
  get_qty: number;
  priority: number;
  hue: number;
  chroma: number;
};

export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_ku: string;
  image_url: string | null;
  icon: string;
  hue: number;
  chroma: number;
  sort_order: number;
  is_active: boolean;
};

export type HomeSectionKind =
  | "expiring"
  | "outlet"
  | "hero"
  | "categories"
  | "offers"
  | "brands"
  | "bundles"
  | "featured"
  | "newest"
  | "banners";

export type HomeSection = {
  id: string;
  kind: HomeSectionKind;
  title_ar: string;
  title_ku: string;
  layout: string;
  item_limit: number;
  hue: number;
  chroma: number;
  show_title: boolean;
  sort_order: number;
  is_active: boolean;
};

export type StoreSettings = {
  id: string;
  primary_hue: number;
  primary_chroma: number;
  accent_hue: number;
  accent_chroma: number;
  radius_px: number;
  show_search: boolean;
  site_name_ar: string;
  site_name_ku: string;
  tagline_ar: string;
  tagline_ku: string;
  meta_title_ar: string;
  meta_title_ku: string;
  meta_description_ar: string;
  meta_description_ku: string;
  logo_url: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  logo_emoji: string;
  contact_phone: string;
  whatsapp: string;
  contact_email: string;
  address_ar: string;
  address_ku: string;
  instagram_url: string;
  facebook_url: string;
  telegram_url: string;
  default_lang: string;
  lang_ar_enabled: boolean;
  lang_ku_enabled: boolean;
  lang_en_enabled: boolean;
  currency_ar: string;
  currency_ku: string;
  min_order_total: number;
  delivery_fee: number;
  free_delivery_over: number;
  announcement_ar: string;
  announcement_ku: string;
  show_announcement: boolean;
  maintenance_mode: boolean;
  maintenance_note_ar: string;
  maintenance_note_ku: string;
  rewards_enabled: boolean;
  points_per_1000_iqd: number;
  rewards_max_redeem_percent: number;
  rewards_note_ar: string;
  rewards_note_ku: string;
  rewards_note_en: string;
  show_reward_bar: boolean;
  reward_bar_link: string;
  show_vendor_join_cta: boolean;
  vendor_join_cta_link: string;
  reward_bar_icon: string;
  reward_bar_items: RewardBarItem[];
  reward_bar_cta: TriText;
  vendor_cta: VendorCta;
};

/** Admin-editable text in the three store languages. */
export type TriText = { ar: string; ku: string; en: string };

/** One scrolling line inside the homepage reward points bar. */
export type RewardBarItem = TriText & { icon: string };

/** Homepage "become a vendor" card content. */
export type VendorCta = {
  icon: string;
  title_ar: string;
  title_ku: string;
  title_en: string;
  sub_ar: string;
  sub_ku: string;
  sub_en: string;
};

const REWARD_ITEM_FALLBACK: RewardBarItem[] = [
  { icon: "coin", ar: "١٠٠٠ نقطة = ١٠٠٠ د.ع", ku: "١٠٠٠ خاڵ = ١٠٠٠ د.ع", en: "1000 points = 1000 IQD" },
  { icon: "gift", ar: "هدية أول طلب: ٥٠٠٠", ku: "دیاری یەکەم: ٥٠٠٠", en: "First order: 5000 pts" },
  { icon: "trend", ar: "نقاط مع كل شراء", ku: "خاڵ لە هەر کڕینێک", en: "Points on every buy" },
];

export function rewardBarItems(v: unknown): RewardBarItem[] {
  if (!Array.isArray(v)) return REWARD_ITEM_FALLBACK;
  const rows = v
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      icon: String(r['icon'] ?? "sparkles"),
      ar: String(r['ar'] ?? ""),
      ku: String(r['ku'] ?? ""),
      en: String(r['en'] ?? ""),
    }));
  return rows.length ? rows : REWARD_ITEM_FALLBACK;
}

export function triText(v: unknown, fallback: TriText): TriText {
  if (!v || typeof v !== "object") return fallback;
  const r = v as Record<string, unknown>;
  return {
    ar: String(r['ar'] ?? fallback.ar),
    ku: String(r['ku'] ?? fallback.ku),
    en: String(r['en'] ?? fallback.en),
  };
}

export function vendorCta(v: unknown): VendorCta {
  const fb: VendorCta = {
    icon: "store",
    title_ar: "عندك متجر؟ سجّل كبائع",
    title_ku: "فرۆشگات هەیە؟ وەک فرۆشیار تۆمار بکە",
    title_en: "Own a store? Sell with us",
    sub_ar: "٣ خطوات فقط — بعد موافقة الإدارة",
    sub_ku: "تەنها ٣ هەنگاو — دوای ڕەزامەندی بەڕێوەبەر",
    sub_en: "3 quick steps — after admin approval",
  };
  if (!v || typeof v !== "object") return fb;
  const r = v as Record<string, unknown>;
  const pickStr = (k: keyof VendorCta) => String(r[k] ?? fb[k]);
  return {
    icon: pickStr("icon"),
    title_ar: pickStr("title_ar"),
    title_ku: pickStr("title_ku"),
    title_en: pickStr("title_en"),
    sub_ar: pickStr("sub_ar"),
    sub_ku: pickStr("sub_ku"),
    sub_en: pickStr("sub_en"),
  };
}

export type FlashDeal = {
  id: string;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  badge_ar: string;
  badge_ku: string;
  product_id: string | null;
  image_url: string | null;
  discount_type: string;
  discount_value: number;
  starts_at: string;
  ends_at: string | null;
  min_qty: number;
  max_discount: number | null;
  max_qty_per_order: number | null;
  priority: number;
  hue: number;
  chroma: number;
  sort_order: number;
  is_active: boolean;
};


export type Bundle = {
  id: string;
  vendor_id?: string | null;
  /** `lot` = mixed clearance lot, `kit` = curated kit. */
  kind?: string | null;
  stock?: number | null;
  expiry_date?: string | null;
  ends_at?: string | null;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  product_ids: string[];
  price: number;
  compare_price: number | null;
  image_url: string | null;
  hue: number;
  chroma: number;
  sort_order: number;
  is_active: boolean;
};

export type ProductTier = {
  id: string;
  product_id: string;
  min_qty: number;
  price: number;
};

/** Tiers of one product, cheapest-last (ordered by min_qty). */
export function tiersOf(productId: string, tiers: ProductTier[] = []) {
  return tiers
    .filter((tr) => tr.product_id === productId)
    .sort((a, b) => a.min_qty - b.min_qty);
}

/** Unit price for a quantity: best matching wholesale tier, else the base price. */
export function tierUnitPrice(base: number, qty: number, tiers: ProductTier[] = []) {
  let out = base;
  for (const tr of tiers) {
    if (qty >= tr.min_qty && Number(tr.price) < out) out = Number(tr.price);
  }
  return out;
}

/**
 * Unit price of a today-deal, honouring its type and its per-piece discount cap.
 * `percent` = % off, `fixed` = amount off, `fixed_price` = final price per piece.
 */
export function dealUnitPrice(deal: FlashDeal, base: number) {
  const value = Math.max(0, Number(deal.discount_value) || 0);
  const cap = deal.max_discount == null ? null : Math.max(0, Number(deal.max_discount));
  let off = 0;
  switch (deal.discount_type) {
    case "fixed":
      off = value;
      break;
    case "fixed_price":
      off = Math.max(0, base - value);
      break;
    default:
      off = (base * Math.min(value, 100)) / 100;
  }
  if (cap != null) off = Math.min(off, cap);
  return Math.max(0, Math.round(base - off));
}

/** Back-compat alias: deal price for its linked product. */
export function flashPrice(deal: FlashDeal, base: number) {
  return dealUnitPrice(deal, base);
}

/** A deal is live when active and inside its scheduled window. */
export function flashIsLive(d: FlashDeal) {
  const now = Date.now();
  return (
    d.is_active &&
    (!d.starts_at || new Date(d.starts_at).getTime() <= now) &&
    (!d.ends_at || new Date(d.ends_at).getTime() > now)
  );
}

/** Does this deal apply to the product at this quantity? */
export function dealApplies(deal: FlashDeal, productId: string, qty = 1) {
  return (
    flashIsLive(deal) &&
    deal.product_id === productId &&
    Math.max(1, qty) >= Math.max(1, deal.min_qty ?? 1)
  );
}

/** Cheapest live deal for a product; `priority` breaks ties. */
export function bestDeal(productId: string, base: number, qty = 1, deals: FlashDeal[] = []) {
  let best: { deal: FlashDeal | null; unitPrice: number } = { deal: null, unitPrice: base };
  for (const d of deals) {
    if (!dealApplies(d, productId, qty)) continue;
    const unitPrice = dealUnitPrice(d, base);
    const wins =
      unitPrice < best.unitPrice ||
      (unitPrice === best.unitPrice && !!best.deal && d.priority > best.deal.priority) ||
      (unitPrice === best.unitPrice && !best.deal);
    if (wins && (unitPrice < base || !best.deal)) best = { deal: d, unitPrice };
  }
  return best;
}


export function offerIsLive(o: Offer) {
  const now = Date.now();
  return (
    o.is_active &&
    new Date(o.starts_at).getTime() <= now &&
    (!o.ends_at || new Date(o.ends_at).getTime() > now)
  );
}

export function applyDiscount(price: number, type: string, value: number) {
  const out = type === "fixed" ? price - value : price - (price * value) / 100;
  return Math.max(0, Math.round(out));
}

export type OfferTarget = Pick<Product, "id" | "price"> &
  Partial<
    Pick<Product, "brand" | "category_id" | "clearance_kind" | "expiry_date" | "stocked_since">
  >;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Does this offer target the given product? */
export function offerTargets(
  offer: Offer,
  product: OfferTarget,
  offerProducts: { offer_id: string; product_id: string }[] = [],
) {
  switch (offer.scope) {
    case "all":
      return true;
    case "category":
      return !!offer.category_id && offer.category_id === product.category_id;
    case "brand":
      return !!norm(offer.brand) && norm(offer.brand) === norm(product.brand);
    default:
      return offerProducts.some(
        (op) => op.offer_id === offer.id && op.product_id === product.id,
      );
  }
}

/** Discounted unit price for one offer (ignores buy-x-get-y, which is a free-quantity rule). */
export function offerUnitPrice(offer: Offer, base: number) {
  const value = Math.max(0, Number(offer.discount_value) || 0);
  const cap = offer.max_discount == null ? null : Math.max(0, Number(offer.max_discount));
  let off = 0;
  switch (offer.discount_type) {
    case "fixed":
      off = value;
      break;
    case "fixed_price":
      off = Math.max(0, base - value);
      break;
    case "bxgy":
      off = 0;
      break;
    default:
      off = (base * Math.min(value, 100)) / 100;
  }
  if (cap != null) off = Math.min(off, cap);
  return Math.max(0, Math.round(base - off));
}

/** Free units unlocked by a buy-X-get-Y offer at this quantity. */
export function offerFreeQty(offer: Offer, qty: number) {
  if (offer.discount_type !== "bxgy") return 0;
  const buy = Math.max(1, offer.buy_qty);
  const get = Math.max(1, offer.get_qty);
  return Math.floor(qty / (buy + get)) * get;
}

export type OfferResult = {
  offer: Offer | null;
  unitPrice: number;
  freeQty: number;
  lineTotal: number;
  saving: number;
};

/**
 * Best live offer for a product at a given quantity.
 * Offers never stack: the cheapest line total wins, `priority` breaks ties.
 */
export function bestOffer(
  product: OfferTarget,
  qty: number,
  offers: Offer[] = [],
  offerProducts: { offer_id: string; product_id: string }[] = [],
): OfferResult {
  const base = Number(product.price) || 0;
  const units = Math.max(1, qty);
  let best: OfferResult = {
    offer: null,
    unitPrice: base,
    freeQty: 0,
    lineTotal: base * units,
    saving: 0,
  };

  for (const offer of offers) {
    if (!offerIsLive(offer)) continue;
    if (units < Math.max(1, offer.min_qty)) continue;
    if (!offerTargets(offer, product, offerProducts)) continue;

    const unitPrice = offerUnitPrice(offer, base);
    const freeQty = Math.min(offerFreeQty(offer, units), units);
    const lineTotal = unitPrice * (units - freeQty);
    const bestPriority = best.offer ? best.offer.priority : Number.NEGATIVE_INFINITY;
    const wins =
      lineTotal < best.lineTotal ||
      (lineTotal === best.lineTotal && offer.priority > bestPriority);
    if (!wins) continue;
    best = { offer, unitPrice, freeQty, lineTotal, saving: base * units - lineTotal };
  }
  return best;
}

export type PromoResult = OfferResult & { deal: FlashDeal | null };

/**
 * Final promotional price for a product at a quantity.
 * Today-deals and offers never stack: whichever gives the cheaper line total wins,
 * and a today-deal wins an exact tie (it is the highlighted campaign).
 */
export function bestPromo(
  product: OfferTarget,
  qty = 1,
  offers: Offer[] = [],
  offerProducts: { offer_id: string; product_id: string }[] = [],
  deals: FlashDeal[] = [],
  rules: ClearanceRule[] = [],
): PromoResult {
  // The automatic near-expiry markdown is applied first: it lowers the list
  // price, then offers / today-deals compete on top of that clearance price.
  const listPrice = Number(product.price) || 0;
  const base = clearanceBase({ ...product, price: listPrice }, rules);
  product = { ...product, price: base };
  const units = Math.max(1, qty);
  const offerBest = bestOffer(product, units, offers, offerProducts);
  const { deal, unitPrice } = bestDeal(product.id, base, units, deals);
  if (!deal) return { ...offerBest, deal: null };

  const dealTotal = unitPrice * units;
  if (dealTotal > offerBest.lineTotal) return { ...offerBest, deal: null };
  return {
    offer: null,
    deal,
    unitPrice,
    freeQty: 0,
    lineTotal: dealTotal,
    saving: base * units - dealTotal,
  };
}

/** Effective unit price for a product taking live offers and today-deals into account. */
export function effectivePrice(
  product: OfferTarget,
  offers: Offer[],
  offerProducts: { offer_id: string; product_id: string }[],
  qty = 1,
  deals: FlashDeal[] = [],
  rules: ClearanceRule[] = [],
) {
  return bestPromo(product, qty, offers, offerProducts, deals, rules).unitPrice;
}


export async function fetchStoreData() {
  const [
    products,
    categories,
    offers,
    offerProducts,
    banners,
    brandCards,
    homeSections,
    settings,
    flashDeals,
    bundles,
    tiers,
    clearanceRules,
  ] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("offers").select("*").order("sort_order"),
    supabase.from("offer_products").select("*"),
    supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .eq("slot_key", "home_hero")
      .order("sort_order"),
    supabase.from("brand_cards").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("home_sections").select("*").order("sort_order"),
    supabase.from("store_settings").select("*").limit(1).maybeSingle(),
    supabase
      .from("flash_deals")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("bundles")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false }),
    supabase.from("product_tiers").select("*").order("min_qty"),
    supabase.from("clearance_rules").select("*").eq("is_active", true).order("months_left"),
  ]);
  return {
    products: (products.data ?? []) as unknown as Product[],
    categories: (categories.data ?? []) as unknown as Category[],
    offers: ((offers.data ?? []) as unknown as Offer[]).filter(offerIsLive),
    offerProducts: (offerProducts.data ?? []) as { offer_id: string; product_id: string }[],
    banners: (banners.data ?? []) as {
      id: string;
      title_ar: string;
      title_ku: string;
      image_url: string | null;
      link: string | null;
    }[],
    brandCards: (brandCards.data ?? []) as unknown as BrandCard[],
    homeSections: (homeSections.data ?? []) as unknown as HomeSection[],
    settings: (settings.data ?? null) as unknown as StoreSettings | null,
    flashDeals: ((flashDeals.data ?? []) as unknown as FlashDeal[]).filter(flashIsLive),
    bundles: (bundles.data ?? []) as unknown as Bundle[],
    tiers: (tiers.data ?? []) as unknown as ProductTier[],
    clearanceRules: (clearanceRules.data ?? []) as unknown as ClearanceRule[],
  };
}

export const ORDER_STATUSES = ["new", "confirmed", "cancelled"] as const;

/**
 * Cart lines for a bundle: each product keeps its own id (orders reference real
 * products) but its unit price is pro-rated from the bundle price by its share
 * of the full list total, so the cart subtotal equals the advertised kit price.
 */
export function bundleLines(
  bundle: Pick<Bundle, "price" | "product_ids">,
  products: Pick<Product, "id" | "price">[],
) {
  const items = (bundle.product_ids ?? [])
    .map((pid) => products.find((p) => p.id === pid))
    .filter(Boolean) as Pick<Product, "id" | "price">[];
  if (items.length === 0) return [];
  const kit = Math.max(0, Math.round(Number(bundle.price) || 0));
  const full = items.reduce((s, p) => s + (Number(p.price) || 0), 0);
  let left = kit;
  return items.map((p, idx) => {
    const last = idx === items.length - 1;
    const share = full > 0 ? (Number(p.price) || 0) / full : 1 / items.length;
    const price = last ? left : Math.min(left, Math.round(kit * share));
    left -= price;
    return { id: p.id, price: Math.max(0, price) };
  });
}
