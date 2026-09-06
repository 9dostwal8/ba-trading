import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
const KEY = "dental-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Sync User Auth State
  useEffect(() => {
    let active = true;

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2. Load Cart from Database when User is Authenticated
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let active = true;

    async function loadDbCart() {
      try {
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
              id,
              name_ar,
              name_ku,
              price,
              image_url,
              vendor_id
            )
          `)
          .eq("user_id", user.id);

        if (error) {
          console.warn("Failed to load db cart:", error);
          return;
        }

        if (!active || !data) return;

        const loadedItems: CartItem[] = data.map((row: any) => {
          const prod = row.products;
          return {
            id: row.product_id,
            name_ar: prod?.name_ar ?? "",
            name_ku: prod?.name_ku ?? "",
            price: Number(row.price || prod?.price || 0),
            image_url: prod?.image_url ?? null,
            vendor_id: prod?.vendor_id ?? null,
            quantity: row.quantity,
            bundle_id: row.bundle_id ?? null,
            bundle_title_ar: row.bundle_title_ar ?? null,
            bundle_title_ku: row.bundle_title_ku ?? null,
          };
        });

        setItems(loadedItems);
      } catch (e) {
        console.warn("Error loading cart items from db:", e);
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
        }
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

      // Sync to database
      if (user) {
        (async () => {
          try {
            // Check existing row
            let query = supabase
              .from("cart_items")
              .select("id, quantity")
              .eq("user_id", user.id)
              .eq("product_id", item.id);

            if (item.bundle_id) {
              query = query.eq("bundle_id", item.bundle_id);
            } else {
              query = query.is("bundle_id", null);
            }

            const { data: existing } = await query.maybeSingle();

            if (existing) {
              await supabase
                .from("cart_items")
                .update({ quantity: newQty, updated_at: new Date().toISOString() })
                .eq("id", existing.id);
            } else {
              await supabase.from("cart_items").insert({
                user_id: user.id,
                product_id: item.id,
                quantity: newQty,
                price: item.price,
                bundle_id: item.bundle_id ?? null,
                bundle_title_ar: item.bundle_title_ar ?? null,
                bundle_title_ku: item.bundle_title_ku ?? null,
              });
            }
          } catch (err) {
            console.error("Failed to save cart item to DB:", err);
          }
        })();
      }

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

      // Sync to database
      if (user) {
        (async () => {
          for (const line of lines) {
            try {
              const { data: existing } = await supabase
                .from("cart_items")
                .select("id, quantity")
                .eq("user_id", user.id)
                .eq("product_id", line.id)
                .eq("bundle_id", bundle.id)
                .maybeSingle();

              if (existing) {
                await supabase
                  .from("cart_items")
                  .update({ quantity: existing.quantity + qty, updated_at: new Date().toISOString() })
                  .eq("id", existing.id);
              } else {
                await supabase.from("cart_items").insert({
                  user_id: user.id,
                  product_id: line.id,
                  quantity: qty,
                  price: line.price,
                  bundle_id: bundle.id,
                  bundle_title_ar: bundle.title_ar,
                  bundle_title_ku: bundle.title_ku,
                });
              }
            } catch (err) {
              console.error("Failed to save bundle item to DB:", err);
            }
          }
        })();
      }

      return next;
    });

    return true;
  };

  // Set Quantity
  const setQty: Ctx["setQty"] = (key, qty) => {
    setItems((prev) => {
      const target = prev.find((p) => lineKey(p) === key);
      const next =
        qty <= 0
          ? prev.filter((p) => lineKey(p) !== key)
          : prev.map((p) => (lineKey(p) === key ? { ...p, quantity: qty } : p));

      if (user && target) {
        (async () => {
          try {
            let query = supabase
              .from("cart_items")
              .delete()
              .eq("user_id", user.id)
              .eq("product_id", target.id);

            if (target.bundle_id) {
              query = query.eq("bundle_id", target.bundle_id);
            } else {
              query = query.is("bundle_id", null);
            }

            if (qty <= 0) {
              await query;
            } else {
              let updateQuery = supabase
                .from("cart_items")
                .update({ quantity: qty, updated_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("product_id", target.id);

              if (target.bundle_id) {
                updateQuery = updateQuery.eq("bundle_id", target.bundle_id);
              } else {
                updateQuery = updateQuery.is("bundle_id", null);
              }
              await updateQuery;
            }
          } catch (err) {
            console.error("Failed to update cart qty in DB:", err);
          }
        })();
      }

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

      if (user) {
        (async () => {
          try {
            if (qty <= 0) {
              await supabase
                .from("cart_items")
                .delete()
                .eq("user_id", user.id)
                .eq("bundle_id", bundleId);
            } else {
              await supabase
                .from("cart_items")
                .update({ quantity: qty, updated_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("bundle_id", bundleId);
            }
          } catch (err) {
            console.error("Failed to update bundle qty in DB:", err);
          }
        })();
      }

      return next;
    });
  };

  // Remove Item
  const remove: Ctx["remove"] = (key) => {
    setItems((prev) => {
      const target = prev.find((p) => lineKey(p) === key);
      const next = prev.filter((p) => lineKey(p) !== key);

      if (user && target) {
        (async () => {
          try {
            let query = supabase
              .from("cart_items")
              .delete()
              .eq("user_id", user.id)
              .eq("product_id", target.id);

            if (target.bundle_id) {
              query = query.eq("bundle_id", target.bundle_id);
            } else {
              query = query.is("bundle_id", null);
            }
            await query;
          } catch (err) {
            console.error("Failed to remove item from DB cart:", err);
          }
        })();
      }

      return next;
    });
  };

  // Remove Bundle
  const removeBundle: Ctx["removeBundle"] = (bundleId) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.bundle_id !== bundleId);
      if (user) {
        supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("bundle_id", bundleId)
          .then();
      }
      return next;
    });
  };

  // Clear Cart
  const clear: Ctx["clear"] = () => {
    setItems([]);
    if (user) {
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .then();
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
