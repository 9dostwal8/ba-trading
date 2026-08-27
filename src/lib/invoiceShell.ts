import type { Lang } from "@/lib/i18n";

/** Shared, print-ready document chrome for every invoice/statement in the system. */
export function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

export function dirOf(lang: Lang) {
  return lang === "en" ? "ltr" : "rtl";
}

export const INVOICE_CSS = `
*{box-sizing:border-box}
:root{--ink:#0b1220;--sub:#64748b;--line:#e6eaf0;--brand:#0f4c81;--brand2:#1d7ec8;--ok:#0f766e;--due:#be123c;--soft:#f7f9fc}
html,body{margin:0}
body{font-family:"Vazirmatn","Noto Kufi Arabic",system-ui,-apple-system,sans-serif;color:var(--ink);background:#eef2f7;padding:22px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{max-width:820px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 50px -24px rgba(11,18,32,.35)}
.top{background:linear-gradient(120deg,var(--brand) 0%,var(--brand2) 100%);color:#fff;padding:22px 26px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;position:relative}
.top:after{content:"";position:absolute;inset-inline-end:-40px;top:-60px;width:190px;height:190px;border-radius:999px;background:rgba(255,255,255,.10)}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;letter-spacing:.5px}
h1{font-size:19px;margin:0;line-height:1.25;font-weight:800}
.cap{font-size:11.5px;opacity:.85;margin:2px 0 0}
.docbox{text-align:end;font-size:11.5px;line-height:1.6}
.docbox .no{display:inline-block;background:#fff;color:var(--brand);font-weight:800;font-size:13px;border-radius:999px;padding:4px 12px;margin-bottom:6px}
.cards{display:flex;gap:12px;padding:18px 26px 4px;flex-wrap:wrap}
.card{flex:1 1 200px;background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:11px 13px}
.card h4{margin:0 0 4px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:var(--sub);font-weight:800}
.card p{margin:0;font-size:12.5px;line-height:1.65;font-weight:600}
.card p span{color:var(--sub);font-weight:500}
.pill{display:inline-block;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:800}
.pill.ok{background:#d9f6ef;color:var(--ok)}
.pill.due{background:#ffe4e9;color:var(--due)}
.wrap{padding:16px 26px 0}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;border:1px solid var(--line);border-radius:14px;overflow:hidden}
th,td{padding:10px 10px;text-align:start;border-bottom:1px solid var(--line)}
th{background:var(--soft);font-size:10.5px;letter-spacing:.4px;text-transform:uppercase;color:var(--sub);font-weight:800}
tbody tr:nth-child(even) td{background:#fbfcfe}
tbody tr:last-child td{border-bottom:none}
td.n{width:34px;color:var(--sub);font-weight:700}
td.a,th.a{text-align:end;font-weight:800;white-space:nowrap}
.s{font-weight:800}.ok{color:var(--ok)}.due{color:var(--due)}
.foot{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:16px 26px 24px;flex-wrap:wrap}
.note{flex:1 1 240px;font-size:11px;color:var(--sub);line-height:1.7;background:var(--soft);border:1px dashed var(--line);border-radius:14px;padding:11px 13px}
.tot{width:300px;font-size:12.5px}
.tot div{display:flex;justify-content:space-between;padding:7px 2px;border-bottom:1px solid var(--line)}
.tot .g{margin-top:6px;border:none;background:var(--ink);color:#fff;border-radius:12px;padding:11px 13px;font-weight:800;font-size:14.5px}
.thanks{padding:0 26px 22px;font-size:11px;color:var(--sub);border-top:1px solid var(--line);padding-top:12px;text-align:center}
@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0;max-width:none}}
`;

export type ShellInput = {
  lang: Lang;
  title: string;
  storeName: string;
  caption: string;
  docLabel: string;
  no: string;
  metaLines: string[];
  /** Info cards (billed-to / seller / meta). */
  cards: { title: string; lines: string[] }[];
  tableHead: string[];
  tableBody: string;
  colspan: number;
  emptyText: string;
  summary: { label: string; value: string; strong?: boolean }[];
  totalLabel: string;
  totalValue: string;
  note?: string;
  thanks?: string;
};

export function renderInvoiceHtml(i: ShellInput) {
  const initials = i.storeName.trim().slice(0, 2).toUpperCase();
  const cards = i.cards
    .map(
      (c) =>
        `<div class="card"><h4>${esc(c.title)}</h4><p>${c.lines.join("<br>")}</p></div>`,
    )
    .join("");
  const head = i.tableHead
    .map((h, idx) => `<th${idx === i.tableHead.length - 1 ? ' class="a"' : ""}>${esc(h)}</th>`)
    .join("");
  const summary = i.summary
    .map(
      (s) =>
        `<div><span>${esc(s.label)}</span><span${s.strong ? ' style="font-weight:800"' : ""}>${esc(
          s.value,
        )}</span></div>`,
    )
    .join("");

  return `<!doctype html><html dir="${dirOf(i.lang)}" lang="${i.lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(i.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&family=Noto+Kufi+Arabic:wght@400;700;800&display=swap" rel="stylesheet">
<style>${INVOICE_CSS}</style></head><body>
<div class="sheet">
  <div class="top">
    <div class="brand">
      <div class="logo">${esc(initials)}</div>
      <div><h1>${esc(i.storeName)}</h1><p class="cap">${esc(i.caption)}</p></div>
    </div>
    <div class="docbox">
      <span class="no">${esc(i.docLabel)} #${esc(i.no)}</span><br>
      ${i.metaLines.join("<br>")}
    </div>
  </div>
  <div class="cards">${cards}</div>
  <div class="wrap">
    <table><thead><tr>${head}</tr></thead>
    <tbody>${i.tableBody || `<tr><td colspan="${i.colspan}">${esc(i.emptyText)}</td></tr>`}</tbody></table>
  </div>
  <div class="foot">
    <div class="note">${i.note ?? ""}</div>
    <div class="tot">
      ${summary}
      <div class="g"><span>${esc(i.totalLabel)}</span><span>${esc(i.totalValue)}</span></div>
    </div>
  </div>
  ${i.thanks ? `<div class="thanks">${esc(i.thanks)}</div>` : ""}
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},600)}</script>
</body></html>`;
}

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=880,height=1040");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
