import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Total savings" for a dentist = everything the platform gave back since day one:
 *  1. offer / coupon discounts recorded on their orders
 *  2. reward points already spent as an order discount (IQD)
 *  3. the gap between the normal (compare) price and what they actually paid
 *  4. the IQD value of the reward points they still hold
 *
 * All numbers come from the dentist's own rows (RLS scoped).
 */
export type SavingsBreakdown = {
  offers: number;
  pointsUsed: number;
  comparePrice: number;
  pointsBalanceValue: number;
  total: number;
  orders: number;
};

export function useTotalSavings(userId: string | undefined, pointsBalanceValue: number) {
  const q = useQuery({
    queryKey: ["total-savings", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, discount, coins_discount")
        .eq("user_id", userId!)
        .neq("status", "cancelled");
      if (error) throw error;
      const ids = (orders ?? []).map((o) => o.id);
      let comparePrice = 0;
      if (ids.length) {
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("unit_price, quantity, products(compare_price)")
          .in("order_id", ids);
        if (itemsError) throw itemsError;
        for (const it of items ?? []) {
          const compare = Number(
            (it as { products?: { compare_price: number | null } | null }).products?.compare_price ?? 0,
          );
          const unit = Number(it.unit_price) || 0;
          if (compare > unit) comparePrice += (compare - unit) * (Number(it.quantity) || 0);
        }
      }
      const offers = (orders ?? []).reduce((s, o) => s + (Number(o.discount) || 0), 0);
      const pointsUsed = (orders ?? []).reduce((s, o) => s + (Number(o.coins_discount) || 0), 0);
      return { offers, pointsUsed, comparePrice, orders: ids.length };
    },
  });

  const base = q.data ?? { offers: 0, pointsUsed: 0, comparePrice: 0, orders: 0 };
  const value = Math.max(0, Math.round(pointsBalanceValue) || 0);
  const breakdown: SavingsBreakdown = {
    ...base,
    pointsBalanceValue: value,
    total: Math.round(base.offers + base.pointsUsed + base.comparePrice + value),
  };
  return { ...q, breakdown };
}

export type SavingsLine = {
  orderId: string;
  orderNo: number;
  createdAt: string;
  status: string;
  total: number;
  offers: number;
  pointsUsed: number;
  comparePrice: number;
  items: {
    name_ar: string;
    name_ku: string;
    unit_price: number;
    quantity: number;
    compare_price: number;
    saved: number;
  }[];
};

/** Full line-by-line savings ledger for the signed-in dentist. */
export function useSavingsLedger(userId: string | undefined) {
  return useQuery({
    queryKey: ["savings-ledger", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<SavingsLine[]> => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_no, created_at, status, total, discount, coins_discount")
        .eq("user_id", userId!)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (orders ?? []).map((o) => o.id);
      if (!ids.length) return [];
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("order_id, name_ar, name_ku, unit_price, quantity, products(compare_price)")
        .in("order_id", ids);
      if (itemsError) throw itemsError;
      return (orders ?? []).map((o) => {
        const mine = (items ?? []).filter((i) => i.order_id === o.id);
        const lines = mine.map((i) => {
          const compare = Number(
            (i as { products?: { compare_price: number | null } | null }).products?.compare_price ?? 0,
          );
          const unit = Number(i.unit_price) || 0;
          const qty = Number(i.quantity) || 0;
          return {
            name_ar: i.name_ar,
            name_ku: i.name_ku,
            unit_price: unit,
            quantity: qty,
            compare_price: compare,
            saved: compare > unit ? (compare - unit) * qty : 0,
          };
        });
        return {
          orderId: o.id,
          orderNo: Number(o.order_no),
          createdAt: o.created_at,
          status: o.status,
          total: Number(o.total) || 0,
          offers: Number(o.discount) || 0,
          pointsUsed: Number(o.coins_discount) || 0,
          comparePrice: lines.reduce((s, l) => s + l.saved, 0),
          items: lines,
        };
      });
    },
  });
}
