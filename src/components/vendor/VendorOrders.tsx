import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileText, MapPin, Package, Receipt, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/admin/AdminKit";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pick, pickName, useI18n } from "@/lib/i18n";
import { printOrderInvoice } from "@/lib/orderInvoice";
import { ACTION_LABELS } from "@/lib/status";

type Tab = "active" | "accepted" | "refused";

type Line = {
  id: string;
  name_ar: string;
  name_ku: string;
  quantity: number;
  unit_price: number;
  commission_amount: number;
  fulfillment_status: string;
  order_id: string;
  bundle_id: string | null;
  bundles: { title_ar: string; title_ku: string } | null;
  orders: {
    order_no: number;
    customer_name: string;
    phone: string;
    city: string;
    address_line: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
  } | null;
};

/** A vendor acts on a whole bundle at once; single products stay their own unit. */
type Unit = {
  key: string;
  isBundle: boolean;
  title: string;
  lines: Line[];
};

export function VendorOrders({ vendorId }: { vendorId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  const { data: lines } = useQuery({
    queryKey: ["vendor-order-items", vendorId],
    queryFn: async () =>
      ((
        await supabase
          .from("order_items")
          .select(
            "id, name_ar, name_ku, quantity, unit_price, commission_amount, fulfillment_status, order_id, bundle_id, bundles(title_ar, title_ku), orders(order_no, customer_name, phone, city, address_line, latitude, longitude, created_at)",
          )
          .eq("vendor_id", vendorId)
      ).data ?? []) as unknown as Line[],
  });


  const { data: vendor } = useQuery({
    queryKey: ["vendor-name", vendorId],
    queryFn: async () =>
      (await supabase.from("vendors").select("name").eq("id", vendorId).maybeSingle()).data,
  });

  const money = (n: number) => formatPrice(n, lang);

  /** Bundle lines collapse into a single acceptance unit. */
  const toUnits = (items: Line[]): Unit[] => {
    const out: Unit[] = [];
    const byBundle = new Map<string, Unit>();
    for (const l of items) {
      if (!l.bundle_id) {
        out.push({ key: l.id, isBundle: false, title: pickName(l, lang), lines: [l] });
        continue;
      }
      const found = byBundle.get(l.bundle_id);
      if (found) {
        found.lines.push(l);
        continue;
      }
      const unit: Unit = {
        key: `bundle:${l.bundle_id}`,
        isBundle: true,
        title: l.bundles ? pick(l.bundles.title_ar, l.bundles.title_ku, lang) : t("bundles"),
        lines: [l],
      };
      byBundle.set(l.bundle_id, unit);
      out.push(unit);
    }
    return out;
  };


  const invoice = (items: Line[]) => {
    const head = items[0]?.orders;
    if (!head) return;
    const ok = printOrderInvoice({
      lang,
      storeName: t("storeName"),
      party: vendor?.name ?? t("brandOrders"),
      caption: `${t("ordInvoiceCaption")} · #${head.order_no}`,
      orderNo: head.order_no,
      date: head.created_at,
      customerName: head.customer_name,
      phone: head.phone,
      address: `${head.city} — ${head.address_line}`,
      items: items.map((i) => ({
        name: pickName(i, lang),
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
      })),
      extras: [
        {
          label: t("commissionDue"),
          value: money(items.reduce((s, i) => s + Number(i.commission_amount), 0)),
        },
      ],
      totalLabel: t("total"),
      money,
      t: (k) => t(k as Parameters<typeof t>[0]),
      footer: `${head.city} — ${head.address_line}`,
    });
    if (ok) toast.success(t("ordInvoiceReady"));
  };

  const setStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("order_items")
        .update({ fulfillment_status: status })
        .in("id", ids);
      if (error) throw error;
      return { ids, status };
    },
    onSuccess: (res) => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["vendor-order-items", vendorId] });
      // confirming a line marks the customer order paid (DB trigger)
      qc.invalidateQueries({ queryKey: ["accounting"] });
      qc.invalidateQueries({ queryKey: ["orders"] });

      // auto-generate the invoice once every line of this order is accepted
      if (res.status !== "confirmed") return;
      const line = (lines ?? []).find((l) => res.ids.includes(l.id));
      if (!line) return;
      const items = (lines ?? [])
        .filter((l) => l.order_id === line.order_id)
        .map((l) => (res.ids.includes(l.id) ? { ...l, fulfillment_status: "confirmed" } : l));
      if (items.every((l) => l.fulfillment_status === "confirmed")) invoice(items);
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });


  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const classify = (items: Line[]) => {
    if (items.every((i) => i.fulfillment_status === "confirmed")) return "accepted";
    if (items.every((i) => i.fulfillment_status === "cancelled")) return "refused";
    return "active";
  };

  const groupsSorted = useMemo(() => {
    const groups = new Map<string, Line[]>();
    for (const l of lines ?? []) groups.set(l.order_id, [...(groups.get(l.order_id) ?? []), l]);
    return [...groups.entries()].sort((a, b) => {
      const ta = new Date(a[1][0]?.orders?.created_at ?? 0).getTime();
      const tb = new Date(b[1][0]?.orders?.created_at ?? 0).getTime();
      return tb - ta;
    });
  }, [lines]);

  const term = q.trim().toLowerCase();
  const filtered = groupsSorted.filter(([orderId, items]) => {
    if (classify(items) !== tab) return false;
    const head = items[0]?.orders;
    const created = head?.created_at ? new Date(head.created_at) : null;
    if (from && created && created < new Date(`${from}T00:00:00`)) return false;
    if (to && created && created > new Date(`${to}T23:59:59`)) return false;
    if (!term) return true;
    const hay = [
      String(head?.order_no ?? ""),
      head?.customer_name ?? "",
      head?.phone ?? "",
      head?.city ?? "",
      head?.address_line ?? "",
      orderId,
      ...items.map((i) => pickName(i, lang)),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(term);
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "active", label: t("newestOrders") },
    { key: "accepted", label: t("oldAcceptedOrders") },
    { key: "refused", label: t("oldRefusedOrders") },
  ];

  const hasFilter = Boolean(term || from || to);

  return (
    <div className="space-y-3">
      <SectionHeader title={t("brandOrders")} />

      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-card">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`rounded-lg px-1 py-2 text-[11px] font-extrabold transition-all ${
              tab === tb.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Search className="size-4" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("ordSearchPh")}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs font-bold outline-none focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground">{t("ordFrom")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs font-bold outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground">{t("ordTo")}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs font-bold outline-none focus:border-primary"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-muted-foreground">
            {t("ordResults")}: {filtered.length}
          </p>
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setFrom("");
                setTo("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-extrabold text-muted-foreground"
            >
              <X className="size-3.5" />
              {t("ordClear")}
            </button>
          )}
        </div>
      </div>

      {filtered.map(([orderId, items]) => {
        const head = items[0]?.orders;
        const sales = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
        const expanded = open === orderId;
        const accepted = classify(items) === "accepted";
        return (
          <div key={orderId} className="rounded-xl border border-border bg-card shadow-card">
            {/* compact row — click to expand */}
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : orderId)}
              className="flex w-full items-center gap-2 p-3 text-start"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">#{head?.order_no}</span>
                  <span className="text-sm font-extrabold text-primary">
                    {formatPrice(sales, lang)}
                  </span>
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {head?.customer_name} · {head?.city} ·{" "}
                  {head?.created_at ? new Date(head.created_at).toLocaleDateString() : ""}
                </span>
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {expanded && (
              <>
                <div className="flex flex-wrap items-center gap-2 border-t-2 border-border p-3">
                  <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                    {head?.phone}
                    <br />
                    {head?.city} — {head?.address_line}
                  </p>
                  {head?.latitude && (
                    <a
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold text-primary"
                      href={`https://maps.google.com/?q=${head.latitude},${head.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="size-3.5" />
                      {t("useMyLocation")}
                    </a>
                  )}
                  {accepted && (
                    <button
                      type="button"
                      onClick={() => invoice(items)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-[11px] font-extrabold text-primary-foreground"
                    >
                      <FileText className="size-3.5" />
                      {t("ordInvoice")}
                    </button>
                  )}
                </div>

                <ul className="divide-y divide-border">
                  {toUnits(items).map((u) => {
                    const total = u.lines.reduce(
                      (s, i) => s + Number(i.unit_price) * i.quantity,
                      0,
                    );
                    const commission = u.lines.reduce(
                      (s, i) => s + Number(i.commission_amount),
                      0,
                    );
                    const status = u.lines.every((i) => i.fulfillment_status === "confirmed")
                      ? "confirmed"
                      : u.lines.every((i) => i.fulfillment_status === "cancelled")
                        ? "cancelled"
                        : (u.lines[0]?.fulfillment_status ?? "new");
                    const ids = u.lines.map((i) => i.id);
                    return (
                      <li key={u.key} className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 text-xs font-bold">
                            {u.isBundle && (
                              <span className="me-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                                <Package className="size-3" />
                                {t("bundles")}
                              </span>
                            )}
                            {u.title}
                            {!u.isBundle && ` ×${u.lines[0]?.quantity}`}
                          </p>
                          <OrderStatusBadge status={status} lang={lang} />
                        </div>
                        {u.isBundle && (
                          <ul className="space-y-0.5 rounded-lg bg-muted/50 p-2">
                            {u.lines.map((i) => (
                              <li key={i.id} className="text-[11px] font-semibold">
                                • {pickName(i, lang)} ×{i.quantity}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {formatPrice(total, lang)} · {t("commissionDue")}:{" "}
                          {formatPrice(commission, lang)}
                        </p>
                        {tab === "active" && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={status === "confirmed"}
                              onClick={() => setStatus.mutate({ ids, status: "confirmed" })}
                              className="h-9 rounded-lg bg-primary text-xs font-extrabold text-primary-foreground disabled:opacity-40"
                            >
                              {ACTION_LABELS.confirmed[lang]}
                            </button>
                            <button
                              type="button"
                              disabled={status === "cancelled"}
                              onClick={() => setStatus.mutate({ ids, status: "cancelled" })}
                              className="h-9 rounded-lg border border-border text-xs font-extrabold text-muted-foreground disabled:opacity-40"
                            >
                              {ACTION_LABELS.cancelled[lang]}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {tab === "active" && (
                  <p className="border-t border-border p-2 text-center text-[10px] text-muted-foreground">
                    {t("ordInvoiceHint")}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("noOrders")}</p>
      )}
    </div>
  );
}
