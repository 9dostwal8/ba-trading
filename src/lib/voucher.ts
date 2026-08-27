/**
 * Settlement documents for one vendor month.
 *
 * Two printable papers, both built from the same monthly statement so the
 * numbers can never disagree with the statement itself:
 *  - Payment voucher: the amount the store has already paid (received by the vendor).
 *  - Remaining invoice: what is still open for the month.
 */

import type { Lang } from "@/lib/i18n";
import { printStatement, type StatementRow } from "@/lib/invoice";
import { payoutDue, payoutRemaining, vendorOwesStore, type VendorStatement } from "@/lib/statement";

export type VoucherInput = {
  statement: VendorStatement;
  vendorName: string;
  periodText: string;
  lang: Lang;
  storeName: string;
  money: (n: number) => string;
  t: (k: string) => string;
  /** Detailed papers list every order and every marketing cost line. */
  detailed?: boolean;
};

const docNo = (prefix: string, s: VendorStatement, vendorName: string) =>
  `${prefix}-${s.period.replace("-", "")}-${(vendorName || "VEN").slice(0, 3).toUpperCase()}`;

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "");

function baseRows(input: VoucherInput): StatementRow[] {
  const { statement: s, t } = input;
  if (!input.detailed) {
    return [
      { label: t("accSales"), detail: `${t("accUnits")}: ${s.units}`, amount: s.sales },
      { label: t("accCommission"), amount: -s.commission },
      { label: t("marketingCosts"), amount: -s.marketing },
      { label: t("accRewardsSponsored"), amount: -s.rewards },
    ];
  }
  const orderRows: StatementRow[] = s.orders.map((o) => ({
    label: `#${o.order_no} · ${o.customer}`,
    detail: `${t("accUnits")}: ${Number(o.units)} · ${t("accCommission")} ${input.money(Number(o.commission))}`,
    date: day(o.date),
    amount: Number(o.sales),
  }));
  const chargeRows: StatementRow[] = s.charges.map((c) => ({
    label: c.label || t("marketingCosts"),
    detail: c.kind,
    date: day(c.created_at),
    status: c.status === "paid" ? "paid" : "unpaid",
    amount: -Number(c.amount ?? 0),
  }));
  return [...orderRows, { label: t("accCommission"), amount: -s.commission }, ...chargeRows];
}

/** Receipt for the money already settled this month. */
export function printPaymentVoucher(input: VoucherInput) {
  const { statement: s, t, money } = input;
  const remaining = payoutRemaining(s.payout, s.paid_amount);
  printStatement({
    lang: input.lang,
    storeName: input.storeName,
    party: `${input.vendorName} · ${input.periodText}`,
    caption: t("accVoucherPaid"),
    no: docNo("RV", s, input.vendorName),
    rows: [
      {
        label: t("accVoucherPaid"),
        detail: t(vendorOwesStore(s.payout) ? "accVendorOwesStore" : "accPaidToVendor"),
        ...(s.paid_at ? { date: new Date(s.paid_at).toLocaleDateString() } : {}),
        status: "paid" as const,
        amount: s.paid_amount,
      },
    ],
    summary: [
      { label: t("accPayout"), value: money(payoutDue(s.payout)) },
      { label: t("accRemaining"), value: money(remaining) },
    ],
    totalLabel: t("accReceivedTotal"),
    money,
    t,
    footer: t("accVoucherPaidHint"),
  });
}

/** Invoice for the amount still open this month. */
export function printRemainingInvoice(input: VoucherInput) {
  const { statement: s, t, money } = input;
  const remaining = payoutRemaining(s.payout, s.paid_amount);
  printStatement({
    lang: input.lang,
    storeName: input.storeName,
    party: `${input.vendorName} · ${input.periodText}`,
    caption: t("accVoucherDue"),
    no: docNo("DV", s, input.vendorName),
    rows: [
      ...baseRows(input),
      {
        label: t("accPaidToVendor"),
        status: "paid" as const,
        ...(s.paid_at ? { date: new Date(s.paid_at).toLocaleDateString() } : {}),
        amount: -s.paid_amount,
      },
    ],
    summary: [
      { label: t("accPayout"), value: money(payoutDue(s.payout)) },
      { label: t("accPaidToVendor"), value: money(s.paid_amount) },
    ],
    totalLabel: t("accRemaining"),
    money: () => money(remaining),
    t,
    footer: t("accVoucherDueHint"),
  });
}
