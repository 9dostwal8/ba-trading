/**
 * Accounting model for the admin panel.
 *
 * Three money streams are tracked:
 *  - Customer sales (orders): what dentists owe / paid to the store.
 *  - Vendor commissions (order_items.commission_amount): store income per sold item.
 *  - Vendor marketing charges (vendor_charges): store income for paid features.
 *
 * Settlements (vendor_settlements) close a vendor's period as paid/unpaid.
 */

import type { VendorCharge } from "@/lib/charges";
import type { Vendor } from "@/lib/vendors";

export type AccOrder = {
  id: string;
  order_no: number;
  user_id: string;
  customer_name: string;
  phone: string;
  city: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string;
};

export type AccItem = {
  order_id: string;
  vendor_id: string | null;
  name_ar: string;
  name_ku: string;
  unit_price: number;
  quantity: number;
  commission_amount: number;
};

export type Settlement = {
  id: string;
  vendor_id: string;
  period: string;
  commission_total: number;
  marketing_total: number;
  amount: number;
  status: string;
  note: string;
  paid_at: string | null;
  created_at: string;
};

/** True when an ISO date belongs to "all" / a year ("2026") / a month ("2026-08"). */
export function inPeriod(iso: string | null | undefined, period: string) {
  if (!period || period === "all") return true;
  return String(iso ?? "").startsWith(period);
}

const num = (v: unknown) => Number(v ?? 0) || 0;

/** Store-wide totals for the selected period. */
export function storeTotals(all: AccOrder[], items: AccItem[], charges: VendorCharge[]) {
  // refused orders carry no money at all
  const orders = all.filter((o) => o.status !== "cancelled");
  const sales = orders.reduce((s, o) => s + num(o.total), 0);
  const collected = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + num(o.total), 0);
  const orderIds = new Set(orders.map((o) => o.id));
  const mine = items.filter((i) => orderIds.has(i.order_id));
  const commission = mine.reduce((s, i) => s + num(i.commission_amount), 0);
  const marketing = charges.reduce((s, c) => s + num(c.amount), 0);
  const marketingPaid = charges
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + num(c.amount), 0);
  return {
    sales,
    collected,
    receivable: sales - collected,
    commission,
    marketing,
    marketingPaid,
    marketingUnpaid: marketing - marketingPaid,
    income: commission + marketing,
    orders: orders.length,
  };
}

export type VendorLedger = {
  vendor: Vendor;
  sales: number;
  units: number;
  commission: number;
  marketing: number;
  marketingPaid: number;
  marketingUnpaid: number;
  charges: VendorCharge[];
  due: number;
  settlement: Settlement | undefined;
};

/** Per-vendor ledger: sales they made, commission they owe, marketing they bought. */
export function vendorLedgers(
  vendors: Vendor[],
  orders: AccOrder[],
  items: AccItem[],
  charges: VendorCharge[],
  settlements: Settlement[],
  period: string,
): VendorLedger[] {
  const orderIds = new Set(orders.filter((o) => o.status !== "cancelled").map((o) => o.id));
  return vendors
    .map((vendor) => {
      const mine = items.filter((i) => i.vendor_id === vendor.id && orderIds.has(i.order_id));
      const sales = mine.reduce((s, i) => s + num(i.unit_price) * num(i.quantity), 0);
      const units = mine.reduce((s, i) => s + num(i.quantity), 0);
      const commission = mine.reduce((s, i) => s + num(i.commission_amount), 0);
      const mineCharges = charges.filter((c) => c.vendor_id === vendor.id);
      const marketing = mineCharges.reduce((s, c) => s + num(c.amount), 0);
      const marketingPaid = mineCharges
        .filter((c) => c.status === "paid")
        .reduce((s, c) => s + num(c.amount), 0);
      const settlement = settlements.find(
        (s) => s.vendor_id === vendor.id && s.period === period,
      );
      const marketingUnpaid = marketing - marketingPaid;
      return {
        vendor,
        sales,
        units,
        commission,
        marketing,
        marketingPaid,
        marketingUnpaid,
        charges: mineCharges,
        due: settlement?.status === "paid" ? 0 : commission + marketingUnpaid,
        settlement,
      };
    })
    .filter((l) => l.sales > 0 || l.marketing > 0 || l.commission > 0 || l.settlement)
    .sort((a, b) => b.due - a.due || b.sales - a.sales);
}

export type CustomerLedger = {
  userId: string;
  name: string;
  phone: string;
  city: string;
  orders: AccOrder[];
  spent: number;
  paid: number;
  unpaid: number;
};

/** Per-dentist statement grouped by account. */
export function customerLedgers(orders: AccOrder[]): CustomerLedger[] {
  const map = new Map<string, CustomerLedger>();
  for (const o of orders.filter((x) => x.status !== "cancelled")) {
    const key = o.user_id;
    const cur =
      map.get(key) ??
      ({
        userId: key,
        name: o.customer_name,
        phone: o.phone,
        city: o.city,
        orders: [],
        spent: 0,
        paid: 0,
        unpaid: 0,
      } satisfies CustomerLedger);
    cur.orders.push(o);
    const amt = num(o.total);
    cur.spent += amt;
    if (o.payment_status === "paid") cur.paid += amt;
    else cur.unpaid += amt;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.unpaid - a.unpaid || b.spent - a.spent);
}
