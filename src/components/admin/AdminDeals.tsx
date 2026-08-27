import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { pickName, useI18n } from "@/lib/i18n";
import type { FlashDeal, Product } from "@/lib/store";

type Draft = {
  id?: string;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  badge_ar: string;
  badge_ku: string;
  product_id: string;
  image_url: string;
  discount_type: string;
  discount_value: string;
  starts_at: string;
  ends_at: string;
  min_qty: string;
  max_discount: string;
  max_qty_per_order: string;
  priority: string;
  hue: string;
  chroma: string;
  sort_order: string;
  is_active: boolean;
};

const empty: Draft = {
  title_ar: "",
  title_ku: "",
  subtitle_ar: "",
  subtitle_ku: "",
  badge_ar: "",
  badge_ku: "",
  product_id: "",
  image_url: "",
  discount_type: "percent",
  discount_value: "20",
  starts_at: "",
  ends_at: "",
  min_qty: "1",
  max_discount: "",
  max_qty_per_order: "",
  priority: "0",
  hue: "265",
  chroma: "0.16",
  sort_order: "0",
  is_active: true,
};

function toLocal(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDraft(d: FlashDeal): Draft {
  return {
    id: d.id,
    title_ar: d.title_ar,
    title_ku: d.title_ku,
    subtitle_ar: d.subtitle_ar,
    subtitle_ku: d.subtitle_ku,
    badge_ar: d.badge_ar,
    badge_ku: d.badge_ku,
    product_id: d.product_id ?? "",
    image_url: d.image_url ?? "",
    discount_type: d.discount_type,
    discount_value: String(d.discount_value),
    starts_at: toLocal(d.starts_at),
    ends_at: toLocal(d.ends_at),
    min_qty: String(d.min_qty ?? 1),
    max_discount: d.max_discount == null ? "" : String(d.max_discount),
    max_qty_per_order: d.max_qty_per_order == null ? "" : String(d.max_qty_per_order),
    priority: String(d.priority ?? 0),
    hue: String(d.hue),
    chroma: String(d.chroma),
    sort_order: String(d.sort_order),
    is_active: d.is_active,
  };
}

function StatusChip({ deal }: { deal: FlashDeal }) {
  const { t } = useI18n();
  const now = Date.now();
  const starts = deal.starts_at ? new Date(deal.starts_at).getTime() : 0;
  const ends = deal.ends_at ? new Date(deal.ends_at).getTime() : Infinity;
  const state = !deal.is_active || ends <= now ? "expired" : starts > now ? "scheduled" : "live";
  const hue = state === "live" ? 150 : state === "scheduled" ? 250 : 25;
  return (
    <span
      className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold"
      style={{ background: `oklch(0.94 0.05 ${hue})`, color: `oklch(0.42 0.14 ${hue})` }}
    >
      {t(state === "live" ? "dealLive" : state === "scheduled" ? "dealScheduled" : "dealExpired")}
    </span>
  );
}

export function AdminDeals({ vendorId }: { vendorId?: string }) {

  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: deals } = useQuery({
    queryKey: ["admin-flash-deals", vendorId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("flash_deals").select("*").order("sort_order");
      if (vendorId) q = q.eq("vendor_id", vendorId);
      return ((await q).data ?? []) as unknown as FlashDeal[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-deal-products", vendorId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id,name_ar,name_ku,brand,price,image_url")
        .order("brand");
      if (vendorId) q = q.eq("vendor_id", vendorId);
      return ((await q).data ?? []) as unknown as Product[];
    },
  });

  const setEndIn = (hours: number) => {
    if (!draft) return;
    const start = draft.starts_at ? new Date(draft.starts_at) : new Date();
    const end = new Date(start.getTime() + hours * 3600 * 1000);
    setDraft({ ...draft, starts_at: toLocal(start.toISOString()), ends_at: toLocal(end.toISOString()) });
  };

  const save = useMutation({

    mutationFn: async (d: Draft) => {
      const row = {
        title_ar: d.title_ar.trim(),
        title_ku: d.title_ku.trim(),
        subtitle_ar: d.subtitle_ar.trim(),
        subtitle_ku: d.subtitle_ku.trim(),
        badge_ar: d.badge_ar.trim(),
        badge_ku: d.badge_ku.trim(),
        product_id: d.product_id || null,
        image_url: d.image_url.trim() || null,
        discount_type: d.discount_type,
        discount_value: Number(d.discount_value) || 0,
        starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : new Date().toISOString(),
        ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
        min_qty: Math.max(1, Number(d.min_qty) || 1),
        max_discount: d.max_discount.trim() === "" ? null : Math.max(0, Number(d.max_discount) || 0),
        max_qty_per_order:
          d.max_qty_per_order.trim() === ""
            ? null
            : Math.max(1, Number(d.max_qty_per_order) || 1),
        priority: Number(d.priority) || 0,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
        ...(vendorId ? { vendor_id: vendorId } : {}),
      };
      const { error } = d.id
        ? await supabase.from("flash_deals").update(row).eq("id", d.id)
        : await supabase.from("flash_deals").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flash_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  return (
    <div className="space-y-3">
      <a
        href="/how-discounts"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-2.5 text-[12px] font-bold text-secondary-foreground"
      >
        <HelpCircle className="size-4" />
        {t("howDiscounts")}
      </a>

      <SectionHeader
        title={t("flashDeals")}
        action={
          <Button size="sm" onClick={() => setDraft(draft ? null : { ...empty })}>
            {draft ? <X className="size-4" /> : <Plus className="size-4" />}
            {draft ? t("cancel") : t("add")}
          </Button>
        }
      />

      {draft && (
        <AdminCard>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("titleAr")}
              value={draft.title_ar}
              onChange={(v) => setDraft({ ...draft, title_ar: v })}
            />
            <TextField
              label={t("titleKu")}
              value={draft.title_ku}
              onChange={(v) => setDraft({ ...draft, title_ku: v })}
            />
            <TextField
              label={t("subtitleAr")}
              value={draft.subtitle_ar}
              onChange={(v) => setDraft({ ...draft, subtitle_ar: v })}
            />
            <TextField
              label={t("subtitleKu")}
              value={draft.subtitle_ku}
              onChange={(v) => setDraft({ ...draft, subtitle_ku: v })}
            />
            <TextField
              label={`${t("badge")} (AR)`}
              value={draft.badge_ar}
              onChange={(v) => setDraft({ ...draft, badge_ar: v })}
            />
            <TextField
              label={`${t("badge")} (KU)`}
              value={draft.badge_ku}
              onChange={(v) => setDraft({ ...draft, badge_ku: v })}
            />
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("discountType")}</Label>
              <div className="flex gap-1">
                {["percent", "fixed", "fixed_price"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDraft({ ...draft, discount_type: k })}
                    className={`h-9 flex-1 rounded-lg border text-xs font-bold ${
                      draft.discount_type === k
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border"
                    }`}
                  >
                    {t(k === "percent" ? "percent" : k === "fixed" ? "fixed" : "fixedPrice")}
                  </button>
                ))}
              </div>
            </div>
            <TextField
              label={t("discountValue")}
              type="number"
              value={draft.discount_value}
              onChange={(v) => setDraft({ ...draft, discount_value: v })}
            />
            <TextField
              label={t("endsAt")}
              type="datetime-local"
              value={draft.ends_at}
              onChange={(v) => setDraft({ ...draft, ends_at: v })}
            />
            <TextField
              label={t("startsAt")}
              type="datetime-local"
              value={draft.starts_at}
              onChange={(v) => setDraft({ ...draft, starts_at: v })}
            />
            <div className="col-span-2 space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("dealDuration")}</Label>
              <div className="flex flex-wrap gap-1">
                {[
                  { h: 6, l: "6h" },
                  { h: 24, l: "24h" },
                  { h: 48, l: "48h" },
                  { h: 24 * 7, l: "7d" },
                  { h: 24 * 30, l: "30d" },
                ].map((o) => (
                  <button
                    key={o.h}
                    type="button"
                    onClick={() => setEndIn(o.h)}
                    className="h-8 rounded-lg border border-border px-3 text-[11px] font-bold"
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <TextField
              label={t("offerMinQty")}
              type="number"
              value={draft.min_qty}
              onChange={(v) => setDraft({ ...draft, min_qty: v })}
            />
            <TextField
              label={t("maxDiscount")}
              type="number"
              value={draft.max_discount}
              onChange={(v) => setDraft({ ...draft, max_discount: v })}
            />
            <TextField
              label={t("maxPerOrder")}
              type="number"
              value={draft.max_qty_per_order}
              onChange={(v) => setDraft({ ...draft, max_qty_per_order: v })}
            />
            <TextField
              label={t("priority")}
              type="number"
              value={draft.priority}
              onChange={(v) => setDraft({ ...draft, priority: v })}
            />
            <TextField
              label={t("sortOrder")}
              type="number"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <div className="col-span-2">
            </div>
          </div>

          <TextField
            label={t("imageUrl")}
            value={draft.image_url}
            onChange={(v) => setDraft({ ...draft, image_url: v })}
          />

          <ToggleField
            label={t("active")}
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("product")}</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {(products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, product_id: p.id })}
                  className={`flex w-full items-center gap-2 rounded-md p-1.5 text-start ${
                    draft.product_id === p.id ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="line-clamp-1 flex-1 text-[11px] font-bold">
                    {pickName(p, lang)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{p.brand}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (draft.ends_at) {
                const end = new Date(draft.ends_at).getTime();
                const start = draft.starts_at ? new Date(draft.starts_at).getTime() : Date.now();
                if (end <= start || end <= Date.now()) {
                  toast.error(t("dealEndInvalid"));
                  return;
                }
              }
              save.mutate(draft);
            }}
          >
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-2">
        {(deals ?? []).map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card"
          >
            <span
              className="size-8 shrink-0 rounded-lg"
              style={{
                backgroundImage: `linear-gradient(120deg, oklch(0.32 ${Number(d.chroma) * 0.9} ${d.hue}), oklch(0.5 ${d.chroma} ${d.hue}))`,
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold">{d.title_ar || "—"}</p>
              <p className="text-[11px] text-muted-foreground">
                {d.discount_type === "percent" ? `-${d.discount_value}%` : `-${d.discount_value}`}{" "}
                {d.ends_at ? `· ${new Date(d.ends_at).toLocaleString()}` : ""}
                {d.is_active ? "" : ` · ${t("hidden")}`}
              </p>
              <StatusChip deal={d} />
            </div>

            <Button size="icon" variant="ghost" onClick={() => setDraft(toDraft(d))}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
