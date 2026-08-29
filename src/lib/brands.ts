import type { Product } from "@/lib/store";

const LOGO_TOKEN = import.meta.env["VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY"] as
  | string
  | undefined;

export type BrandCard = {
  id: string;
  name: string;
  mark: string;
  match_key: string;
  logo_domain: string | null;
  logo_url: string | null;
  hue: number;
  chroma: number;
  product_ids: string[];
  sort_order: number;
  is_active: boolean;
};

/** Transparent PNG logo for a brand card: custom URL wins, else logo.dev or unavatar fallback. */
export function brandLogo(brand: Pick<BrandCard, "logo_url" | "logo_domain"> & { name?: string }, size = 240) {
  if (brand.logo_url) return brand.logo_url;
  if (brand.logo_domain) {
    if (LOGO_TOKEN) {
      return `https://img.logo.dev/${brand.logo_domain}?token=${LOGO_TOKEN}&size=${size}&format=png&retina=true`;
    }
    return `https://unavatar.io/${brand.logo_domain}?fallback=https://www.google.com/s2/favicons?domain=${brand.logo_domain}&sz=128`;
  }
  return null;
}

/** Products belonging to a brand card: hand-picked list first, else keyword match. */
export function brandProducts(brand: BrandCard, products: Product[] = []) {
  const picked = brand.product_ids ?? [];
  if (picked.length) {
    const order = new Map(picked.map((id, i) => [id, i]));
    return products
      .filter((p) => order.has(p.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  const key = (brand.match_key || brand.name).toLowerCase().trim();
  if (!key) return [];
  return products.filter((p) => (p.brand ?? "").toLowerCase().includes(key));
}
