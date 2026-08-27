/**
 * Notification links are stored as plain strings in the database, but the
 * admin/vendor panels are single routes with an internal tool key.
 * This resolves a stored link into a real router target so notifications
 * never land on a "not found" page.
 */
export type NotifTarget = { to: string; search?: Record<string, string> };

const VENDOR_TABS: Record<string, string> = {
  products: "products",
  product: "products",
  orders: "orders",
  promos: "promos",
  promo: "promos",
  offers: "promos",
  rewards: "points",
  points: "points",
  accounting: "account",
  account: "account",
  costs: "costs",
  charges: "costs",
  qr: "qr",
};

const ADMIN_TABS: Record<string, string> = {
  orders: "orders",
  vendors: "vendors",
  applications: "vendors",
  charges: "charges",
  accounting: "accounting",
  rewards: "wallet",
  points: "wallet",
  products: "products",
  categories: "categories",
  promo: "promo",
  offers: "offers",
  deals: "deals",
  bundles: "bundles",
  coupons: "coupons",
  banners: "banners",
  settings: "settings",
  notify: "notify",
};

/** Simple top-level routes that exist in the app. */
const SIMPLE = new Set([
  "/",
  "/rewards",
  "/notifications",
  "/cart",
  "/products",
  "/offers",
  "/deals",
  "/bundles",
  "/brands",
  "/vendors",
  "/categories",
  "/expiring",
  "/outlet",
  "/featured",
  "/new",
  "/scan",
  "/how-discounts",
  "/orders",
  "/profile",
  "/profile/edit",
  "/profile/addresses",
]);

export function resolveNotifLink(link: string | null | undefined): NotifTarget | null {
  if (!link) return null;
  const base = link.split("?")[0] ?? "";
  const clean = (base.split("#")[0] ?? "").replace(/\/+$/, "") || "/";
  const seg = clean.split("/").filter(Boolean);

  if (seg[0] === "brand") {
    const tab = seg[1] ? VENDOR_TABS[seg[1]] : undefined;
    return { to: "/brand", search: tab ? { tab } : {} };
  }
  if (seg[0] === "admin") {
    const tab = seg[1] ? ADMIN_TABS[seg[1]] : undefined;
    return { to: "/admin", search: tab ? { tab } : {} };
  }
  if (seg[0] === "orders" && seg[1]) {
    return { to: `/orders/${seg[1]}` };
  }
  if (seg[0] === "product" && seg[1]) return { to: `/product/${seg[1]}` };
  if (seg[0] === "vendor" && seg[1]) return { to: `/vendor/${seg[1]}` };
  if (seg[0] === "bundle" && seg[1]) return { to: `/bundle/${seg[1]}` };
  if (SIMPLE.has(clean)) return { to: clean };
  return null;
}
