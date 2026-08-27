import type { Lang } from "@/lib/i18n";
import type { VendorCharge } from "@/lib/charges";
import { esc, openPrintWindow, renderInvoiceHtml } from "@/lib/invoiceShell";

export type InvoiceInput = {
  lang: Lang;
  storeName: string;
  vendorName: string;
  rows: VendorCharge[];
  labelOf: (kind: string) => string;
  money: (n: number) => string;
  t: (k: string) => string;
  onlyUnpaid?: boolean;
};

/** Opens a print-ready invoice (browser "Save as PDF") with RTL-safe fonts. */
export function printMarketingInvoice(input: InvoiceInput) {
  const rows = input.onlyUnpaid ? input.rows.filter((r) => r.status !== "paid") : input.rows;
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const unpaid = rows
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const paid = total - unpaid;
  const no = `MK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
    rows.length,
  ).padStart(3, "0")}`;

  const body = rows
    .map(
      (r, i) => `<tr>
        <td class="n">${i + 1}</td>
        <td>${esc(input.labelOf(r.kind))}</td>
        <td>${esc(r.label ?? "")}</td>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><span class="pill ${r.status === "paid" ? "ok" : "due"}">${esc(
          input.t(r.status === "paid" ? "paid" : "unpaid"),
        )}</span></td>
        <td class="a">${esc(input.money(Number(r.amount ?? 0)))}</td>
      </tr>`,
    )
    .join("");

  const html = renderInvoiceHtml({
    lang: input.lang,
    title: `${input.t("invoice")} ${no}`,
    storeName: input.storeName,
    caption: input.t("marketingCosts"),
    docLabel: input.t("invoice"),
    no,
    metaLines: [
      `${esc(input.t("invoiceDate"))}: ${new Date().toLocaleDateString()}`,
      `${esc(input.t("invoiceItems"))}: ${rows.length}`,
    ],
    cards: [
      { title: input.t("vendors"), lines: [`<b>${esc(input.vendorName)}</b>`] },
      {
        title: input.t("status"),
        lines: [
          `${esc(input.t("paidTotal"))}: <span>${esc(input.money(paid))}</span>`,
          `${esc(input.t("unpaidTotal"))}: <span>${esc(input.money(unpaid))}</span>`,
        ],
      },
    ],
    tableHead: [
      "#",
      input.t("invoiceType"),
      input.t("invoiceDetails"),
      input.t("invoiceRowDate"),
      input.t("status"),
      input.t("invoiceAmount"),
    ],
    tableBody: body,
    colspan: 6,
    emptyText: input.t("noCharges"),
    summary: [
      { label: input.t("paidTotal"), value: input.money(paid) },
      { label: input.t("unpaidTotal"), value: input.money(unpaid), strong: true },
    ],
    totalLabel: input.t("totalCosts"),
    totalValue: input.money(total),
    note: esc(input.t("marketingCostsHint")),
    thanks: input.storeName,
  });

  return openPrintWindow(html);
}

export type StatementRow = {
  label: string;
  detail?: string;
  date?: string;
  status?: "paid" | "unpaid";
  amount: number;
};

export type StatementInput = {
  lang: Lang;
  storeName: string;
  /** Invoice subject: vendor name, customer name, or "all vendors". */
  party: string;
  /** Small caption under the store name, e.g. "Accounting statement · August 2026". */
  caption: string;
  no: string;
  rows: StatementRow[];
  /** Extra summary lines rendered above the grand total. */
  summary?: { label: string; value: string }[];
  totalLabel: string;
  money: (n: number) => string;
  t: (k: string) => string;
  footer?: string;
};

/**
 * Generic print-ready accounting statement/invoice (browser "Save as PDF").
 * Used for vendor settlements, marketing bills and customer statements.
 */
export function printStatement(input: StatementInput) {
  const total = input.rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const body = input.rows
    .map(
      (r, i) => `<tr>
        <td class="n">${i + 1}</td>
        <td>${esc(r.label)}</td>
        <td>${esc(r.detail ?? "")}</td>
        <td>${esc(r.date ?? "")}</td>
        <td>${
          r.status
            ? `<span class="pill ${r.status === "paid" ? "ok" : "due"}">${esc(
                input.t(r.status),
              )}</span>`
            : ""
        }</td>
        <td class="a">${esc(input.money(Number(r.amount ?? 0)))}</td>
      </tr>`,
    )
    .join("");

  const html = renderInvoiceHtml({
    lang: input.lang,
    title: `${input.t("invoice")} ${input.no}`,
    storeName: input.storeName,
    caption: input.caption,
    docLabel: input.t("invoice"),
    no: input.no,
    metaLines: [
      `${esc(input.t("invoiceDate"))}: ${new Date().toLocaleDateString()}`,
      `${esc(input.t("invoiceItems"))}: ${input.rows.length}`,
    ],
    cards: [{ title: input.caption, lines: [`<b>${esc(input.party)}</b>`] }],
    tableHead: [
      "#",
      input.t("invoiceType"),
      input.t("invoiceDetails"),
      input.t("invoiceRowDate"),
      input.t("status"),
      input.t("invoiceAmount"),
    ],
    tableBody: body,
    colspan: 6,
    emptyText: input.t("noCharges"),
    summary: (input.summary ?? []).map((s) => ({ label: s.label, value: s.value })),
    totalLabel: input.totalLabel,
    totalValue: input.money(total),
    note: esc(input.footer ?? ""),
    thanks: input.storeName,
  });

  return openPrintWindow(html);
}
