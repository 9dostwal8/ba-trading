/**
 * One monthly statement per vendor — the single source of accounting truth.
 *
 * Both the admin panel and the vendor panel read the same database
 * calculation (`vendor_statement` / `vendor_statements`), so the numbers on
 * both sides can never disagree.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatementCharge = {
  id: string;
  kind: string;
  label: string;
  amount: number;
  status: string;
  created_at: string;
};

export type StatementOrder = {
  order_id: string;
  order_no: number;
  customer: string;
  date: string;
  units: number;
  sales: number;
  commission: number;
};

export type PayStatus = "unpaid" | "partly_paid" | "paid";

export type VendorStatement = {
  vendor_id: string;
  period: string;
  sales: number;
  units: number;
  commission: number;
  marketing: number;
  marketing_paid: number;
  rewards: number;
  rewards_paid: number;
  /** What the store owes the vendor: sales − commission − marketing − rewards. */
  payout: number;
  /** What the store keeps: commission + marketing + rewards. */
  store_income: number;
  orders: StatementOrder[];
  charges: StatementCharge[];
  status: PayStatus;
  paid_amount: number;
  paid_at: string | null;
  closed_at: string | null;
  note: string;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

const EMPTY: Omit<VendorStatement, "vendor_id" | "period"> = {
  sales: 0,
  units: 0,
  commission: 0,
  marketing: 0,
  marketing_paid: 0,
  rewards: 0,
  rewards_paid: 0,
  payout: 0,
  store_income: 0,
  orders: [],
  charges: [],
  status: "unpaid",
  paid_amount: 0,
  paid_at: null,
  closed_at: null,
  note: "",
};

function normalize(raw: unknown, vendorId: string, period: string): VendorStatement {
  const r = (raw ?? {}) as Record<string, unknown>;
  const status = String(r["status"] ?? "unpaid");
  return {
    ...EMPTY,
    vendor_id: vendorId,
    period,
    sales: num(r["sales"]),
    units: num(r["units"]),
    commission: num(r["commission"]),
    marketing: num(r["marketing"]),
    marketing_paid: num(r["marketing_paid"]),
    rewards: num(r["rewards"]),
    rewards_paid: num(r["rewards_paid"]),
    payout: num(r["payout"]),
    store_income: num(r["store_income"]),
    orders: (r["orders"] ?? []) as StatementOrder[],
    charges: (r["charges"] ?? []) as StatementCharge[],
    status: (status === "paid" || status === "partly_paid" ? status : "unpaid") as PayStatus,
    paid_amount: num(r["paid_amount"]),
    paid_at: (r["paid_at"] ?? null) as string | null,
    closed_at: (r["closed_at"] ?? null) as string | null,
    note: String(r["note"] ?? ""),
  };
}

/** The full statement of one vendor for one month ("YYYY-MM") or "all". */
export function useVendorStatement(vendorId: string | undefined, period: string) {
  return useQuery({
    queryKey: ["statement", vendorId, period],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("vendor_statement", {
        _vendor_id: vendorId!,
        _period: period,
      });
      if (error) throw error;
      return normalize(data, vendorId!, period);
    },
  });
}

export type StatementListRow = {
  vendor_id: string;
  vendor_name: string;
  sales: number;
  units: number;
  commission: number;
  marketing: number;
  rewards: number;
  payout: number;
  store_income: number;
  status: PayStatus;
  paid_amount: number;
  paid_at: string | null;
};

/** Admin overview: one row per vendor for the chosen month. */
export function useVendorStatements(period: string) {
  return useQuery({
    queryKey: ["statements", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("vendor_statements", { _period: period });
      if (error) throw error;
      return ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        const status = String(r["status"] ?? "unpaid");
        return {
          vendor_id: String(r["vendor_id"]),
          vendor_name: String(r["vendor_name"] ?? ""),
          sales: num(r["sales"]),
          units: num(r["units"]),
          commission: num(r["commission"]),
          marketing: num(r["marketing"]),
          rewards: num(r["rewards"]),
          payout: num(r["payout"]),
          store_income: num(r["store_income"]),
          status: (status === "paid" || status === "partly_paid" ? status : "unpaid") as PayStatus,
          paid_amount: num(r["paid_amount"]),
          paid_at: (r["paid_at"] ?? null) as string | null,
        } satisfies StatementListRow;
      });
    },
  });
}

/** i18n key for a payment status. */
export function payStatusKey(status: PayStatus) {
  return status === "paid" ? "paid" : status === "partly_paid" ? "partlyPaid" : "unpaid";
}

/** Tailwind classes for a payment-status pill. */
export function payStatusTone(status: PayStatus) {
  return status === "paid"
    ? "bg-emerald-500/10 text-emerald-600"
    : status === "partly_paid"
      ? "bg-amber-500/10 text-amber-600"
      : "bg-destructive/10 text-destructive";
}

/**
 * How much of this month is still open.
 *
 * A positive payout means the store owes the vendor; a negative payout means
 * the vendor owes the store (marketing/commission exceeded their sales). In
 * both cases the settled amount is the magnitude of the payout.
 */
export function payoutRemaining(payout: number, paidAmount: number) {
  return Math.max(0, Math.abs(payout) - paidAmount);
}

/** Full amount that must be settled for the month, regardless of direction. */
export function payoutDue(payout: number) {
  return Math.abs(payout);
}

/** True when the vendor owes the store instead of the other way round. */
export function vendorOwesStore(payout: number) {
  return payout < 0;
}
