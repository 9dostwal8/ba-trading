import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name_ar: string;
  name_ku: string;
  price: number;
  image_url: string | null;
  vendor_id?: string | null;
  quantity: number;
  /** Set when this line belongs to a bundle kit: the kit is bought as a whole. */
  bundle_id?: string | null;
  bundle_title_ar?: string | null;
  bundle_title_ku?: string | null;
};

export type BundleLineInput = Omit<CartItem, "quantity">;

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  /** Add a whole kit: all lines land together and can only be changed together. */
  addBundle: (
    bundle: { id: string; title_ar: string; title_ku: string },
    lines: Omit<BundleLineInput, "bundle_id" | "bundle_title_ar" | "bundle_title_ku">[],
    qty?: number,
  ) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setBundleQty: (bundleId: string, qty: number) => void;
  removeBundle: (bundleId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  /** Distinct vendors represented in the cart (unknown vendor counts as one). */
  vendorCount: number;
};

/** Stable identity of a cart line (a product can exist standalone and inside kits). */
export function lineKey(i: Pick<CartItem, "id" | "bundle_id">) {
  return i.bundle_id ? `bundle:${i.bundle_id}:${i.id}` : i.id;
}

const CartContext = createContext<Ctx | null>(null);
const KEY = "dental-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const add: Ctx["add"] = (item, qty = 1) =>
    setItems((prev) => {
      const key = lineKey(item);
      const found = prev.find((p) => lineKey(p) === key);
      if (found)
        return prev.map((p) => (lineKey(p) === key ? { ...p, quantity: p.quantity + qty } : p));
      return [...prev, { ...item, quantity: qty }];
    });

  const addBundle: Ctx["addBundle"] = (bundle, lines, qty = 1) =>
    setItems((prev) => {
      const next = [...prev];
      for (const line of lines) {
        const item: Omit<CartItem, "quantity"> = {
          ...line,
          bundle_id: bundle.id,
          bundle_title_ar: bundle.title_ar,
          bundle_title_ku: bundle.title_ku,
        };
        const key = lineKey(item);
        const idx = next.findIndex((p) => lineKey(p) === key);
        const existing = idx >= 0 ? next[idx] : undefined;
        if (existing) next[idx] = { ...existing, quantity: existing.quantity + qty };
        else next.push({ ...item, quantity: qty });
      }

      return next;
    });

  const setQty: Ctx["setQty"] = (key, qty) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => lineKey(p) !== key)
        : prev.map((p) => (lineKey(p) === key ? { ...p, quantity: qty } : p)),
    );

  const setBundleQty: Ctx["setBundleQty"] = (bundleId, qty) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.bundle_id !== bundleId)
        : prev.map((p) => (p.bundle_id === bundleId ? { ...p, quantity: qty } : p)),
    );

  const value: Ctx = {
    items,
    add,
    addBundle,
    setQty,
    setBundleQty,
    remove: (key) => setItems((prev) => prev.filter((p) => lineKey(p) !== key)),
    removeBundle: (bundleId) => setItems((prev) => prev.filter((p) => p.bundle_id !== bundleId)),
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + i.quantity * i.price, 0),
    vendorCount: new Set(items.map((i) => i.vendor_id ?? "unknown")).size,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
