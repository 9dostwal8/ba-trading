import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store";

/** A shared product identity every vendor can list under their own price. */
export type CatalogItem = {
  id: string;
  name_ar: string;
  name_ku: string;
  description_ar: string;
  description_ku: string;
  brand: string;
  sku: string;
  image_url: string | null;
  category_id: string | null;
};

/** Search the shared catalog (all vendors) by name or brand. */
export async function searchCatalog(term: string, limit = 20) {
  const s = term.trim();
  if (s.length < 2) return [] as CatalogItem[];
  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .or(`name_ar.ilike.%${s}%,name_ku.ilike.%${s}%,brand.ilike.%${s}%,sku.ilike.%${s}%`)
    .order("name_ar")
    .limit(limit);
  return (data ?? []) as unknown as CatalogItem[];
}

/**
 * A plain catalog listing (not a promoted clearance offer). Only these are
 * merged across vendors — clearance/offer listings always stay on the vendor
 * that paid for and priced that campaign.
 */
export function isNormalListing(p: Product) {
  return (p.clearance_kind ?? "none") === "none";
}

/** Key a product groups under: its shared catalog item, else its own id. */
export function catalogKeyOf(p: Product) {
  return isNormalListing(p) && p.catalog_item_id ? p.catalog_item_id : p.id;
}

/**
 * Collapse listings so a shared item appears once (cheapest offer first) and
 * report how many vendors sell it.
 */
export function dedupeByCatalog(products: Product[], priceOf: (p: Product) => number) {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = catalogKeyOf(p);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  const out: { product: Product; offers: number }[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    const vendors = new Set(sorted.map((p) => p.vendor_id ?? p.id));
    out.push({ product: sorted[0]!, offers: vendors.size });
  }
  return out;
}

/** Other vendors' plain listings of the same shared item. */
export function siblingOffers(product: Product, products: Product[]) {
  if (!product.catalog_item_id || !isNormalListing(product)) return [] as Product[];
  return products.filter(
    (p) =>
      p.id !== product.id &&
      p.catalog_item_id === product.catalog_item_id &&
      isNormalListing(p),
  );
}
