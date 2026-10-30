import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  user: User | null;
  loading: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => boolean;
  /** Add a whole kit: all lines land together and can only be changed together. */
  addBundle: (
    bundle: { id: string; title_ar: string; title_ku: string },
    lines: Omit<BundleLineInput, "bundle_id" | "bundle_title_ar" | "bundle_title_ku">[],
    qty?: number,
  ) => boolean;
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
const STORAGE_KEY = "dental-cart-v1";

function getLocalCart(userId?: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const key = userId ? `dental-cart-${userId}` : STORAGE_KEY;
    const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalCart(items: CartItem[], userId?: string) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, payload);
    if (userId) {
      localStorage.setItem(`dental-cart-${userId}`, payload);
    }
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => getLocalCart());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to sync cart items to Supabase public.cart_items table
  const syncToDb = async (itemsToSync: CartItem[], userId: string) => {
    try {
      await supabase.from("cart_items").delete().eq("user_id", userId);

      if (itemsToSync.length > 0) {
        const rows = itemsToSync.map((item) => ({
          user_id: userId,
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          bundle_id: item.bundle_id ?? null,
          bundle_title_ar: item.bundle_title_ar ?? null,
          bundle_title_ku: item.bundle_title_ku ?? null,
        }));

        const { error } = await supabase.from("cart_items").insert(rows);
        if (error) {
          console.warn("cart_items sync insert note:", error.message);
        }
      }
    } catch (err) {
      console.warn("cart_items sync error:", err);
    }
  };

  // Helper to persist cart changes locally & debounced to database
  const persist = (nextItems: CartItem[], currentUser: User | null = user) => {
    setLocalCart(nextItems, currentUser?.id);
    if (currentUser) {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        syncToDb(nextItems, currentUser.id);
      }, 400);
    }
  };

  // 1. Sync User Auth State
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const userItems = getLocalCart(u.id);
        if (userItems.length > 0) {
          setItems(userItems);
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const userItems = getLocalCart(u.id);
        if (userItems.length > 0) {
          setItems(userItems);
        }
      }
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2. Sync from Database when User is Authenticated
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadDbCart() {
      try {
        // Query structured cart_items table joined with products catalog
        const { data, error } = await supabase
          .from("cart_items")
          .select(`
            id,
            product_id,
            quantity,
            price,
            bundle_id,
            bundle_title_ar,
            bundle_title_ku,
            products (
              name_ar,
              name_ku,
              image_url,
              vendor_id,
              price
            )
          `)
          .eq("user_id", user!.id);

        if (!active) return;

        if (!error && Array.isArray(data) && data.length > 0) {
          const dbItems: CartItem[] = data.map((row) => {
            const p = row.products as any;
            return {
              id: row.product_id,
              name_ar: p?.name_ar ?? "",
              name_ku: p?.name_ku ?? "",
              image_url: p?.image_url ?? null,
              vendor_id: p?.vendor_id ?? null,
              price: Number(row.price) || Number(p?.price) || 0,
              quantity: row.quantity,
              bundle_id: row.bundle_id ?? null,
              bundle_title_ar: row.bundle_title_ar ?? null,
              bundle_title_ku: row.bundle_title_ku ?? null,
            };
          });

          setItems(dbItems);
          setLocalCart(dbItems, user!.id);
          return;
        }

        // Fallback / One-time migration from localStorage
        const localItems = getLocalCart(user!.id);
        if (localItems.length > 0) {
          syncToDb(localItems, user!.id);
          return;
        }

        // Fallback / One-time migration from legacy ui_texts
        const { data: legacyRow } = await supabase
          .from("ui_texts")
          .select("ar")
          .eq("key", `user_cart_${user!.id}`)
          .maybeSingle();

        if (!active) return;

        if (legacyRow?.ar) {
          try {
            const parsed = JSON.parse(legacyRow.ar);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
              setLocalCart(parsed, user!.id);
              syncToDb(parsed, user!.id);
              // Clean up legacy ui_texts backup
              supabase.from("ui_texts").delete().eq("key", `user_cart_${user!.id}`).then();
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn("Db cart sync note:", e);
      }
    }

    loadDbCart();

    return () => {
      active = false;
    };
  }, [user]);

  // Check auth helper
  const requireAuth = (): boolean => {
    if (!user) {
      toast.error(
        typeof document !== "undefined" && document.documentElement.lang === "ku"
          ? "پێویستە سەرەتا بچیتە ژوورەوە بۆ ئەوەی بەرهەم زیادبکەیت بۆ سەبەتە"
          : "يجب تسجيل الدخول بحساب لإضافة المنتجات إلى السلة",
        {
          description:
            typeof document !== "undefined" && document.documentElement.lang === "ku"
              ? "تەنها خاوەن هەژمارەکان دەتوانن کڕین ئەنجام بدەن."
              : "الشراء متاح فقط للمستخدمين المسجلين.",
        },
      );
      return false;
    }
    return true;
  };

  // Add Single Item
  const add: Ctx["add"] = (item, qty = 1) => {
    if (!requireAuth()) return false;

    setItems((prev) => {
      const key = lineKey(item);
      const found = prev.find((p) => lineKey(p) === key);
      const newQty = found ? found.quantity + qty : qty;
      const next = found
        ? prev.map((p) => (lineKey(p) === key ? { ...p, quantity: newQty } : p))
        : [...prev, { ...item, quantity: qty }];

      persist(next, user);
      return next;
    });

    return true;
  };

  // Add Bundle Kit
  const addBundle: Ctx["addBundle"] = (bundle, lines, qty = 1) => {
    if (!requireAuth()) return false;

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

      persist(next, user);
      return next;
    });

    return true;
  };

  // Set Quantity
  const setQty: Ctx["setQty"] = (key, qty) => {
    setItems((prev) => {
      const next =
        qty <= 0
          ? prev.filter((p) => lineKey(p) !== key)
          : prev.map((p) => (lineKey(p) === key ? { ...p, quantity: qty } : p));

      persist(next, user);
      return next;
    });
  };

  // Set Bundle Quantity
  const setBundleQty: Ctx["setBundleQty"] = (bundleId, qty) => {
    setItems((prev) => {
      const next =
        qty <= 0
          ? prev.filter((p) => p.bundle_id !== bundleId)
          : prev.map((p) => (p.bundle_id === bundleId ? { ...p, quantity: qty } : p));

      persist(next, user);
      return next;
    });
  };

  // Remove Item
  const remove: Ctx["remove"] = (key) => {
    setItems((prev) => {
      const next = prev.filter((p) => lineKey(p) !== key);
      persist(next, user);
      return next;
    });
  };

  // Remove Bundle
  const removeBundle: Ctx["removeBundle"] = (bundleId) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.bundle_id !== bundleId);
      persist(next, user);
      return next;
    });
  };

  // Clear Cart
  const clear: Ctx["clear"] = () => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    setItems([]);
    setLocalCart([], user?.id);
    if (user) {
      supabase.from("cart_items").delete().eq("user_id", user.id).then();
      supabase.from("ui_texts").delete().eq("key", `user_cart_${user.id}`).then();
    }
  };

  const value: Ctx = {
    items,
    user,
    loading,
    add,
    addBundle,
    setQty,
    setBundleQty,
    remove,
    removeBundle,
    clear,
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
