import { supabase } from "@/integrations/supabase/client";
import type { Vendor } from "@/lib/vendors";
import type { Bundle, FlashDeal, Offer, Product } from "@/lib/store";

/** All vendors visible in the storefront, alphabetically. */
export async function fetchVendors() {
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as unknown as Vendor[];
}

/** Resolve a vendor from its web address (slug) or its scan code. */
export async function fetchVendor(key: string) {
  const clean = key.trim();
  if (!clean) return null;
  const bySlug = await supabase
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .eq("slug", clean.toLowerCase())
    .maybeSingle();
  if (bySlug.data) return bySlug.data as unknown as Vendor;
  const byCode = await supabase
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .eq("code", clean.toUpperCase())
    .maybeSingle();
  return (byCode.data ?? null) as unknown as Vendor | null;
}

/** Everything a vendor sells: products, offers, flash deals and bundles. */
export async function fetchVendorCatalog(vendorId: string) {
  const [products, offers, flashDeals, bundles] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }),
    supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .eq("vendor_id", vendorId)
      .order("sort_order"),
    supabase
      .from("flash_deals")
      .select("*")
      .eq("is_active", true)
      .eq("vendor_id", vendorId)
      .order("sort_order"),
    supabase
      .from("bundles")
      .select("*")
      .eq("is_active", true)
      .eq("vendor_id", vendorId)
      .order("sort_order"),
  ]);
  return {
    products: (products.data ?? []) as unknown as Product[],
    offers: (offers.data ?? []) as unknown as Offer[],
    flashDeals: (flashDeals.data ?? []) as unknown as FlashDeal[],
    bundles: (bundles.data ?? []) as unknown as Bundle[],
  };
}

/** How many distinct orders each vendor has fulfilled, keyed by vendor id. */
export async function fetchVendorOrderCounts() {
  const { data } = await supabase.rpc("vendor_order_counts");
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { vendor_id: string; orders: number }[]) {
    map[row.vendor_id] = Number(row.orders) || 0;
  }
  return map;
}

/** Text encoded in a vendor QR code: a deep link that also works in a browser. */
export function vendorQrValue(vendor: Pick<Vendor, "slug">) {
  const origin =
    typeof window === "undefined" ? "https://offerdent.lovable.app" : window.location.origin;
  return `${origin}/vendor/${vendor.slug}`;
}

/** Pull a vendor slug/code out of scanned QR text (URL or bare code). */
export function parseVendorScan(text: string) {
  const raw = text.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return raw.replace(/^.*\//, "");
  }
}
