/**
 * Central theme engine.
 *
 * A single brand colour (hue + chroma) plus one accent colour drive EVERY
 * coloured surface in the app: flash offers, near-expiry clearance, outlet,
 * info/success/violet accents, gradients, dark hero cards and the corner
 * radius. Section colours are derived from the same two hues so the storefront
 * always reads as one harmonised palette instead of unrelated blocks.
 */

export type ThemeInput = {
  primary_hue: number;
  primary_chroma: number;
  accent_hue: number;
  accent_chroma: number;
  radius_px: number;
};

const wrap = (h: number) => ((h % 360) + 360) % 360;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Hue midpoint along the shortest path around the wheel. */
function midHue(a: number, b: number) {
  let d = wrap(b - a);
  if (d > 180) d -= 360;
  return wrap(a + d / 2);
}

const ok = (l: number, c: number, h: number) => `oklch(${l} ${Math.max(0, c).toFixed(3)} ${wrap(h).toFixed(1)})`;

/** Curated one-tap palettes (brand + accent pairs that always look good). */
export const THEME_PRESETS: Array<{
  key: string;
  ar: string;
  ku: string;
  en: string;
  theme: ThemeInput;
}> = [
  { key: "digikala", ar: "أحمر ديجي‌كالا", ku: "سووری دیجیکالا", en: "Digikala Red", theme: { primary_hue: 20, primary_chroma: 0.19, accent_hue: 20, accent_chroma: 0.17, radius_px: 12 } },
  { key: "crimson", ar: "أحمر قرمزي", ku: "سووری قرمز", en: "Crimson", theme: { primary_hue: 17, primary_chroma: 0.183, accent_hue: 92, accent_chroma: 0.16, radius_px: 14 } },
  { key: "ocean", ar: "أزرق محيطي", ku: "شینی زەریا", en: "Ocean Blue", theme: { primary_hue: 250, primary_chroma: 0.17, accent_hue: 200, accent_chroma: 0.14, radius_px: 14 } },
  { key: "emerald", ar: "أخضر زمردي", ku: "سەوزی زمروود", en: "Emerald", theme: { primary_hue: 162, primary_chroma: 0.14, accent_hue: 110, accent_chroma: 0.15, radius_px: 14 } },
  { key: "royal", ar: "بنفسجي ملكي", ku: "مۆری شاهانە", en: "Royal Violet", theme: { primary_hue: 295, primary_chroma: 0.2, accent_hue: 330, accent_chroma: 0.15, radius_px: 16 } },
  { key: "sunset", ar: "برتقالي غروب", ku: "پرتەقاڵی ئاوابوون", en: "Sunset", theme: { primary_hue: 45, primary_chroma: 0.17, accent_hue: 85, accent_chroma: 0.16, radius_px: 14 } },
  { key: "teal", ar: "تركوازي", ku: "تورکوازی", en: "Turquoise", theme: { primary_hue: 195, primary_chroma: 0.13, accent_hue: 165, accent_chroma: 0.14, radius_px: 12 } },
  { key: "indigo", ar: "نيلي داكن", ku: "نیلی تاریک", en: "Indigo", theme: { primary_hue: 272, primary_chroma: 0.16, accent_hue: 235, accent_chroma: 0.13, radius_px: 12 } },
  { key: "rose", ar: "وردي", ku: "پەمەیی", en: "Rose", theme: { primary_hue: 350, primary_chroma: 0.16, accent_hue: 20, accent_chroma: 0.14, radius_px: 18 } },
];

/**
 * Full CSS-variable map for a theme. Keys are the same tokens declared in
 * `src/styles.css`, so setting them on an element re-skins everything inside.
 */
export function themeVars(input: ThemeInput): Record<string, string> {
  const h = wrap(Number(input.primary_hue) || 0);
  const c = clamp(Number(input.primary_chroma) || 0, 0, 0.3);
  const ah = wrap(Number(input.accent_hue) || 0);
  const ac = clamp(Number(input.accent_chroma) || 0, 0, 0.3);
  const radius = clamp(Number(input.radius_px) || 14, 0, 32);

  // Section hues, all tied back to the brand pair.
  const expiryH = ah; // near-expiry clearance follows the admin accent exactly
  const outletH = wrap(h - 20); // outlet / warehouse stock
  const violetH = wrap(h + 75);
  const neutralC = 0.006;

  return {
    "--radius": `${radius}px`,

    "--background": ok(0.968, neutralC, h),
    "--foreground": ok(0.28, 0.012, h),
    "--card": ok(1, 0, h),
    "--card-foreground": ok(0.28, 0.012, h),
    "--popover": ok(1, 0, h),
    "--popover-foreground": ok(0.28, 0.012, h),

    "--primary": "#007979",
    "--primary-foreground": "#ffffff",
    "--primary-deep": "#005e5e",
    "--ring": "#007979",

    "--secondary": ok(0.963, 0.008, h),
    "--secondary-foreground": ok(0.36, 0.016, h),
    "--muted": ok(0.963, 0.008, h),
    "--muted-foreground": ok(0.56, 0.014, h),
    "--accent": ok(0.955, 0.022, h),
    "--accent-foreground": ok(0.45, c * 0.9, h),

    "--deal": ok(0.84, ac, ah),
    "--deal-foreground": ok(0.34, ac * 0.55, ah),

    "--clearance": ok(0.58, (c + ac) / 2, expiryH),
    "--clearance-foreground": ok(0.99, 0, expiryH),
    "--expiry": ok(0.6, (c + ac) / 2, expiryH),
    "--expiry-soft": ok(0.74, (c + ac) / 2 + 0.01, expiryH),
    "--outlet": ok(0.55, c * 0.98, outletH),
    "--outlet-deep": ok(0.42, c * 0.8, outletH),

    // Info (blue) and success (green) stay true to their meaning in every
    // theme — the cart reward frames rely on blue = "spend points",
    // green = "points you earn".
    "--info": ok(0.55, Math.min(0.17, Math.max(0.12, c)), 255),
    "--info-foreground": ok(1, 0, 255),
    "--violet": ok(0.54, Math.min(0.2, c + 0.03), violetH),
    "--violet-foreground": ok(1, 0, violetH),
    "--success": ok(0.62, 0.13, 162),
    "--success-foreground": ok(1, 0, 162),

    "--border": ok(0.9, 0.008, h),
    "--input": ok(0.9, 0.008, h),

    "--sidebar": ok(1, 0, h),
    "--sidebar-foreground": ok(0.28, 0.012, h),
    "--sidebar-primary": "#007979",
    "--sidebar-primary-foreground": ok(1, 0, h),
    "--sidebar-accent": ok(0.955, 0.022, h),
    "--sidebar-accent-foreground": ok(0.45, c * 0.9, h),
    "--sidebar-border": ok(0.9, 0.008, h),
    "--sidebar-ring": "#007979",

    "--gradient-hero": `linear-gradient(135deg, ${ok(0.48, c * 0.95, h)}, ${ok(0.6, c, h)} 60%, ${ok(0.66, c * 0.95, wrap(h + 14))})`,
    "--gradient-deal": `linear-gradient(135deg, ${ok(0.84, ac, ah)}, ${ok(0.9, ac * 0.9, wrap(ah + 8))})`,
    "--gradient-vibrant": `linear-gradient(135deg, ${ok(0.54, c, h)}, ${ok(0.48, c + 0.02, wrap(h - 12))} 55%, ${ok(0.62, c, wrap(h + 20))})`,

    "--hero-card": ok(0.27, 0.026, h),
    "--hero-card-foreground": ok(0.98, 0.004, h),
    "--hero-muted": ok(0.36, 0.026, h),
    "--hero-muted-foreground": ok(0.74, 0.014, h),
  };
}

/** Apply (or clear) a theme on an element — used for live preview and globally. */
export function applyTheme(el: HTMLElement | null | undefined, input: ThemeInput) {
  if (!el) return;
  const isDark =
    el.classList.contains("dark") ||
    (typeof localStorage !== "undefined" && localStorage.getItem("admin_theme_mode") === "dark");
  const vars = themeVars(input);
  if (isDark) {
    // In dark mode, do not force light surface variables onto the element
    delete vars["--card"];
    delete vars["--background"];
    delete vars["--foreground"];
    delete vars["--card-foreground"];
    delete vars["--popover"];
    delete vars["--popover-foreground"];
    delete vars["--secondary"];
    delete vars["--secondary-foreground"];
    delete vars["--muted"];
    delete vars["--muted-foreground"];
    delete vars["--border"];
    delete vars["--input"];
    delete vars["--sidebar"];
    delete vars["--sidebar-foreground"];
  }
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

export function clearTheme(el: HTMLElement | null | undefined) {
  if (!el) return;
  for (const k of Object.keys(themeVars(THEME_PRESETS[0]!.theme))) el.style.removeProperty(k);
}

/** Nearest preset for the current values (so the admin UI can highlight it). */
export function matchPreset(input: ThemeInput) {
  return (
    THEME_PRESETS.find(
      (p) =>
        Math.abs(wrap(p.theme.primary_hue - input.primary_hue)) < 8 &&
        Math.abs(p.theme.primary_chroma - input.primary_chroma) < 0.03,
    ) ?? null
  );
}

/**
 * Colour overrides for a single home-page section. The admin picks a hue +
 * chroma per section (Storefront → Home sections) and every coloured surface
 * rendered inside that block (clearance/expiry ticket, outlet cards, accent
 * pills, tints, gradients) follows it instead of the global brand hue.
 */
export function sectionVars(
  hue: number | string | null | undefined,
  chroma: number | string | null | undefined,
): Record<string, string> {
  const h = wrap(Number(hue) || 0);
  const c = clamp(Number(chroma) || 0, 0, 0.3);
  if (!c) return {};
  return {
    "--primary": ok(0.6, c, h),
    "--primary-deep": ok(0.46, c * 0.95, h),
    "--primary-foreground": ok(1, 0, h),

    "--clearance": ok(0.58, c, h),
    "--clearance-foreground": ok(0.99, 0, h),
    "--expiry": ok(0.6, c, h),
    "--expiry-soft": ok(0.74, c + 0.01, h),
    "--outlet": ok(0.55, c * 0.98, h),
    "--outlet-deep": ok(0.42, c * 0.8, h),

    "--deal": ok(0.84, Math.min(c, 0.2), h),
    "--deal-foreground": ok(0.34, Math.min(c, 0.2) * 0.55, h),

    "--tint-soft": ok(0.94, c * 0.35, h),
    "--tint-strong": ok(0.55, c, h),
    "--tint-border": ok(0.87, c * 0.5, h),

    "--gradient-hero": `linear-gradient(135deg, ${ok(0.48, c * 0.95, h)}, ${ok(0.6, c, h)} 60%, ${ok(0.66, c * 0.95, wrap(h + 14))})`,
  };
}
