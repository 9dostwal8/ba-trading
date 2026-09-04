/**
 * Design Studio engine.
 *
 * One JSON document controls the whole storefront "shell": which template
 * (skin) is active, how product cards look, how section headers are drawn,
 * spacing/typography and the page surface. Everything is emitted as CSS
 * variables so components stay token-driven instead of hardcoded.
 *
 * Colours still come from `src/lib/theme.ts` (hue/chroma). Design settings
 * layer shape, density and layout on top.
 */

export type CardShape = "sharp" | "rounded" | "soft";
export type ImgRatio = "1:1" | "4:5" | "16:9";
export type PriceLayout = "stacked" | "inline";
export type SectionHeaderStyle = "plain" | "pill" | "underline" | "band";
export type Surface = "white" | "grey" | "warm";
export type Density = "compact" | "cozy" | "airy";

export type DesignSettings = {
  template: string;
  surface: Surface;
  section_header: SectionHeaderStyle;
  card: {
    shape: CardShape;
    border: boolean;
    shadow: number; // 0..3
    ratio: ImgRatio;
    fit: "contain" | "cover";
    show_brand: boolean;
    show_vendor: boolean;
    show_rating: boolean;
    show_sellers: boolean;
    show_savings: boolean;
    show_expiry: boolean;
    show_badges: boolean;
    price_layout: PriceLayout;
    mobile_cols: number; // 2 | 3
    desktop_cols: number; // 3 | 4 | 5
  };
  layout: {
    density: Density;
    section_gap_px: number;
    page_max_px: number;
  };
  type: {
    font_scale: number; // 0.92 .. 1.12
    heading_weight: number; // 700..900
  };
};

export const DEFAULT_DESIGN: DesignSettings = {
  template: "digikala",
  surface: "grey",
  section_header: "pill",
  card: {
    shape: "rounded",
    border: true,
    shadow: 0,
    ratio: "1:1",
    fit: "contain",
    show_brand: true,
    show_vendor: true,
    show_rating: true,
    show_sellers: true,
    show_savings: true,
    show_expiry: true,
    show_badges: true,
    price_layout: "stacked",
    mobile_cols: 2,
    desktop_cols: 4,
  },
  layout: { density: "cozy", section_gap_px: 14, page_max_px: 1200 },
  type: { font_scale: 1, heading_weight: 800 },
};

/** Whole-app skins: one tap changes the storefront personality. */
export const TEMPLATE_PRESETS: Array<{
  key: string;
  ar: string;
  ku: string;
  en: string;
  note: { ar: string; ku: string; en: string };
  patch: Omit<Partial<DesignSettings>, "card"> & { card?: Partial<DesignSettings["card"]> };
}> = [
  {
    key: "digikala",
    ar: "سوق ديجي‌كالا",
    ku: "بازاڕی دیجیکالا",
    en: "Digikala Market",
    note: {
      ar: "شبكة مكثفة، حواف صغيرة، إطارات رقيقة.",
      ku: "خانەی چڕ، لێواری بچووک، چوارچێوەی تەنک.",
      en: "Dense grid, tight radius, hairline borders.",
    },
    patch: {
      surface: "grey",
      section_header: "pill",
      layout: { density: "compact", section_gap_px: 12, page_max_px: 1200 },
      type: { font_scale: 1, heading_weight: 800 },
      card: { shape: "rounded", border: true, shadow: 0, ratio: "1:1", fit: "contain", price_layout: "stacked", mobile_cols: 2, desktop_cols: 4 },
    },
  },
  {
    key: "clinic",
    ar: "عيادة نظيفة",
    ku: "کلینیکی پاک",
    en: "Clean Clinic",
    note: {
      ar: "مساحات واسعة، ظل ناعم، حواف دائرية.",
      ku: "بۆشایی فراوان، سێبەری نەرم، لێواری خوار.",
      en: "Airy spacing, soft shadows, rounded corners.",
    },
    patch: {
      surface: "white",
      section_header: "underline",
      layout: { density: "airy", section_gap_px: 20, page_max_px: 1160 },
      type: { font_scale: 1.04, heading_weight: 700 },
      card: { shape: "soft", border: false, shadow: 2, ratio: "4:5", fit: "contain", price_layout: "stacked", mobile_cols: 2, desktop_cols: 4 },
    },
  },
  {
    key: "bold",
    ar: "عروض جسورة",
    ku: "ئۆفەری بەهێز",
    en: "Bold Deals",
    note: {
      ar: "خطوط عريضة، تباين عالي، أسعار كبيرة.",
      ku: "نووسینی ئەستوور، جیاوازی بەرز، نرخی گەورە.",
      en: "Heavy type, high contrast, big prices.",
    },
    patch: {
      surface: "grey",
      section_header: "band",
      layout: { density: "cozy", section_gap_px: 16, page_max_px: 1240 },
      type: { font_scale: 1.06, heading_weight: 900 },
      card: { shape: "rounded", border: false, shadow: 1, ratio: "1:1", fit: "cover", price_layout: "inline", mobile_cols: 2, desktop_cols: 3 },
    },
  },
  {
    key: "minimal",
    ar: "أوتلت بسيط",
    ku: "ئاوتلێتی سادە",
    en: "Minimal Outlet",
    note: {
      ar: "بدون ظلال، خطوط فاصلة رقيقة، لون واحد.",
      ku: "بێ سێبەر، هێڵی تەنک، یەک ڕەنگ.",
      en: "No shadows, hairline dividers, one accent.",
    },
    patch: {
      surface: "white",
      section_header: "plain",
      layout: { density: "compact", section_gap_px: 14, page_max_px: 1120 },
      type: { font_scale: 0.98, heading_weight: 700 },
      card: { shape: "sharp", border: true, shadow: 0, ratio: "1:1", fit: "contain", price_layout: "inline", mobile_cols: 2, desktop_cols: 5 },
    },
  },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d;

/** Merge unknown JSON (from the DB) onto the defaults, safely. */
export function normalizeDesign(raw: unknown): DesignSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const c = (r['card'] && typeof r['card'] === "object" ? r['card'] : {}) as Record<string, unknown>;
  const l = (r['layout'] && typeof r['layout'] === "object" ? r['layout'] : {}) as Record<string, unknown>;
  const t = (r['type'] && typeof r['type'] === "object" ? r['type'] : {}) as Record<string, unknown>;
  const d = DEFAULT_DESIGN;
  return {
    template: String(r['template'] ?? d.template),
    surface: oneOf(r['surface'], ["white", "grey", "warm"] as const, d.surface),
    section_header: oneOf(r['section_header'], ["plain", "pill", "underline", "band"] as const, d.section_header),
    card: {
      shape: oneOf(c['shape'], ["sharp", "rounded", "soft"] as const, d.card.shape),
      border: bool(c['border'], d.card.border),
      shadow: clamp(Math.round(num(c['shadow'], d.card.shadow)), 0, 3),
      ratio: oneOf(c['ratio'], ["1:1", "4:5", "16:9"] as const, d.card.ratio),
      fit: oneOf(c['fit'], ["contain", "cover"] as const, d.card.fit),
      show_brand: bool(c['show_brand'], d.card.show_brand),
      show_vendor: bool(c['show_vendor'], d.card.show_vendor),
      show_rating: bool(c['show_rating'], d.card.show_rating),
      show_sellers: bool(c['show_sellers'], d.card.show_sellers),
      show_savings: bool(c['show_savings'], d.card.show_savings),
      show_expiry: bool(c['show_expiry'], d.card.show_expiry),
      show_badges: bool(c['show_badges'], d.card.show_badges),
      price_layout: oneOf(c['price_layout'], ["stacked", "inline"] as const, d.card.price_layout),
      mobile_cols: clamp(Math.round(num(c['mobile_cols'], d.card.mobile_cols)), 2, 3),
      desktop_cols: clamp(Math.round(num(c['desktop_cols'], d.card.desktop_cols)), 3, 5),
    },
    layout: {
      density: oneOf(l['density'], ["compact", "cozy", "airy"] as const, d.layout.density),
      section_gap_px: clamp(Math.round(num(l['section_gap_px'], d.layout.section_gap_px)), 6, 40),
      page_max_px: clamp(Math.round(num(l['page_max_px'], d.layout.page_max_px)), 960, 1440),
    },
    type: {
      font_scale: clamp(num(t['font_scale'], d.type.font_scale), 0.9, 1.15),
      heading_weight: clamp(Math.round(num(t['heading_weight'], d.type.heading_weight)), 600, 900),
    },
  };
}

export function applyTemplate(design: DesignSettings, key: string): DesignSettings {
  const preset = TEMPLATE_PRESETS.find((p) => p.key === key);
  if (!preset) return design;
  return normalizeDesign({
    ...design,
    ...preset.patch,
    template: key,
    card: { ...design.card, ...(preset.patch.card ?? {}) },
  });
}

const SHADOWS = [
  "none",
  "0 1px 2px oklch(0.25 0.02 265 / 6%)",
  "0 2px 6px -2px oklch(0.25 0.02 265 / 10%), 0 14px 30px -22px oklch(0.25 0.02 265 / 28%)",
  "0 6px 16px -6px oklch(0.25 0.02 265 / 16%), 0 24px 48px -28px oklch(0.25 0.02 265 / 34%)",
];

const CARD_RADIUS: Record<CardShape, string> = { sharp: "4px", rounded: "12px", soft: "20px" };
const RATIO: Record<ImgRatio, string> = { "1:1": "1 / 1", "4:5": "4 / 5", "16:9": "16 / 9" };
const GAP: Record<Density, string> = { compact: "8px", cozy: "10px", airy: "14px" };
const PAD: Record<Density, string> = { compact: "8px", cozy: "10px", airy: "14px" };

/** CSS variables for a design document — set on <html> or a preview wrapper. */
export function designVars(d: DesignSettings): Record<string, string> {
  const surface =
    d.surface === "white"
      ? "oklch(1 0 0)"
      : d.surface === "warm"
        ? "oklch(0.975 0.012 80)"
        : "oklch(0.968 0.003 265)";
  return {
    "--card-radius": CARD_RADIUS[d.card.shape],
    "--card-border-w": d.card.border ? "1px" : "0px",
    "--card-shadow": SHADOWS[clamp(d.card.shadow, 0, 3)]!,
    "--card-img-ratio": RATIO[d.card.ratio],
    "--card-img-fit": d.card.fit,
    "--card-pad": PAD[d.layout.density],
    "--grid-gap": GAP[d.layout.density],
    "--section-gap": `${d.layout.section_gap_px}px`,
    "--page-max": `${d.layout.page_max_px}px`,
    "--font-scale": String(d.type.font_scale),
    "--heading-weight": String(d.type.heading_weight),
    "--design-surface": surface,
    "--background": surface,
  };
}

export function applyDesign(el: HTMLElement | null | undefined, d: DesignSettings) {
  if (!el) return;
  const isDark =
    el.classList.contains("dark") ||
    (typeof localStorage !== "undefined" && localStorage.getItem("admin_theme_mode") === "dark");
  const vars = designVars(d);
  if (isDark) {
    delete vars["--background"];
    delete vars["--design-surface"];
  }
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

/** Tailwind grid classes derived from the card settings. */
export function gridClass(d: DesignSettings) {
  const m = d.card.mobile_cols === 3 ? "grid-cols-3" : "grid-cols-2";
  const desk =
    d.card.desktop_cols === 3 ? "lg:grid-cols-3" : d.card.desktop_cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return `grid ${m} sm:grid-cols-3 ${desk}`;
}
