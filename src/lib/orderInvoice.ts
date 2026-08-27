import type { Lang } from "@/lib/i18n";
import { esc, openPrintWindow, renderInvoiceHtml } from "@/lib/invoiceShell";

export type OrderInvoiceItem = {
  name: string;
  quantity: number;
  unit_price: number;
};

export type OrderInvoiceInput = {
  lang: Lang;
  storeName: string;
  /** Seller name (vendor) or store name for the customer copy. */
  party: string;
  caption: string;
  orderNo: number | string;
  date: string;
  customerName: string;
  phone?: string;
  address?: string;
  items: OrderInvoiceItem[];
  extras?: { label: string; value: string }[];
  totalLabel: string;
  /** Grand total; defaults to the items subtotal when omitted. */
  total?: number;
  money: (n: number) => string;
  t: (k: string) => string;
  footer?: string;
};

/** Print-ready order invoice, shared by the vendor panel and the customer order page. */
export function printOrderInvoice(input: OrderInvoiceInput) {
  const subtotal = input.items.reduce(
    (s, i) => s + Number(i.unit_price) * Number(i.quantity),
    0,
  );
  const extras = input.extras ?? [];
  const body = input.items
    .map(
      (i, idx) => `<tr>
        <td class="n">${idx + 1}</td>
        <td><b>${esc(i.name)}</b></td>
        <td>${esc(input.money(Number(i.unit_price)))}</td>
        <td>${i.quantity}</td>
        <td class="a">${esc(input.money(Number(i.unit_price) * Number(i.quantity)))}</td>
      </tr>`,
    )
    .join("");

  const dateStr = new Date(input.date).toLocaleDateString();
  const html = renderInvoiceHtml({
    lang: input.lang,
    title: `${input.t("invoice")} OD-${input.orderNo}`,
    storeName: input.storeName,
    caption: input.caption,
    docLabel: input.t("invoice"),
    no: `OD-${input.orderNo}`,
    metaLines: [
      `${esc(input.t("invoiceDate"))}: ${esc(dateStr)}`,
      `${esc(input.t("invoiceItems"))}: ${input.items.length}`,
    ],
    cards: [
      {
        title: input.t("invoiceType"),
        lines: [`<b>${esc(input.party)}</b>`, `<span>${esc(input.caption)}</span>`],
      },
      {
        title: input.t("invoiceDetails"),
        lines: [
          `<b>${esc(input.customerName)}</b>`,
          ...(input.phone ? [`<span>${esc(input.phone)}</span>`] : []),
          ...(input.address ? [`<span>${esc(input.address)}</span>`] : []),
        ],
      },
    ],
    tableHead: [
      "#",
      input.t("invoiceDetails"),
      input.t("invoiceAmount"),
      input.t("quantity"),
      input.t("total"),
    ],
    tableBody: body,
    colspan: 5,
    emptyText: input.t("noCharges"),
    summary: [
      { label: input.t("subtotal"), value: input.money(subtotal) },
      ...extras.map((e) => ({ label: e.label, value: e.value })),
    ],
    totalLabel: input.totalLabel,
    totalValue: input.money(input.total ?? subtotal),
    note: esc(input.footer ?? ""),
    thanks: input.storeName,
  });

  return openPrintWindow(html);
}
