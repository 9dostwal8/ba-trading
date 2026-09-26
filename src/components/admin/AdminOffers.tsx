import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, Field, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { pickName, useI18n } from "@/lib/i18n";

type Draft = {
  id?: string;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  badge_ar: string;
  badge_ku: string;
  discount_type: string;
  discount_value: string;
  image_url: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  productIds: string[];
  scope: string;
  category_id: string;
  brand: string;
  min_qty: string;
  max_discount: string;
  buy_qty: string;
  get_qty: string;
  priority: string;
  hue: string;
  chroma: string;
};

const empty: Draft = {
  title_ar: "",
  title_ku: "",
  subtitle_ar: "",
  subtitle_ku: "",
  badge_ar: "",
  badge_ku: "",
  discount_type: "percent",
  discount_value: "10",
  image_url: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  productIds: [],
  scope: "products",
  category_id: "",
  brand: "",
  min_qty: "1",
  max_discount: "",
  buy_qty: "2",
  get_qty: "1",
  priority: "0",
  hue: "250",
  chroma: "0.14",
};

const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

export function AdminOffers() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: offers } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () =>
      (await supabase.from("offers").select("*, offer_products(product_id)").order("sort_order"))
        .data ?? [],
  });
  const { data: categories } = useQuery({
    queryKey: ["admin-categories-lite"],
    queryFn: async () =>
      (await supabase.from("categories").select("id, name_ar, name_ku").order("sort_order")).data ??
      [],
  });
  const { data: products } = useQuery({
    queryKey: ["admin-products-lite"],
    queryFn: async () =>
      (await supabase.from("products").select("id, name_ar, name_ku, brand").order("name_ar")).data ??
      [],
  });

  const brandOptions = Array.from(
    new Set(((products ?? []) as { brand?: string | null }[]).map((p) => (p.brand ?? "").trim())),
  ).filter(Boolean);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        title_ar: d.title_ar.trim(),
        title_ku: d.title_ku.trim() || d.title_ar.trim(),
        subtitle_ar: d.subtitle_ar,
        subtitle_ku: d.subtitle_ku,
        badge_ar: d.badge_ar,
        badge_ku: d.badge_ku,
        discount_type: d.discount_type,
        discount_value: Number(d.discount_value) || 0,
        image_url: d.image_url || null,
        starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : new Date().toISOString(),
        ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
        is_active: d.is_active,
        scope: d.scope,
        category_id: d.scope === "category" && d.category_id ? d.category_id : null,
        brand: d.scope === "brand" ? d.brand.trim() : "",
        min_qty: Math.max(1, Number(d.min_qty) || 1),
        max_discount: d.max_discount === "" ? null : Math.max(0, Number(d.max_discount) || 0),
        buy_qty: d.discount_type === "bxgy" ? Math.max(1, Number(d.buy_qty) || 1) : 0,
        get_qty: d.discount_type === "bxgy" ? Math.max(1, Number(d.get_qty) || 1) : 0,
        priority: Number(d.priority) || 0,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
      };
      let offerId = d.id;
      if (offerId) {
        const { error } = await supabase.from("offers").update(payload).eq("id", offerId);
        if (error) throw error;
        await supabase.from("offer_products").delete().eq("offer_id", offerId);
      } else {
        const { data, error } = await supabase.from("offers").insert(payload).select("id").single();
        if (error) throw error;
        offerId = data.id;
      }
      if (d.scope === "products" && d.productIds.length) {
        const { error } = await supabase
          .from("offer_products")
          .insert(d.productIds.map((product_id) => ({ offer_id: offerId!, product_id })));
        if (error) throw error;
      }
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
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  function toggleProduct(id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      productIds: draft.productIds.includes(id)
        ? draft.productIds.filter((p) => p !== id)
        : [...draft.productIds, id],
    });
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("offers")}
        action={
          <Button size="sm" onClick={() => setDraft(empty)}>
            <Plus className="size-4" />
            {t("add")}
          </Button>
        }
      />

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {draft?.id ? <Pencil className="size-4 text-[#007979]" /> : <Tag className="size-4 text-[#007979]" />}
              <span>{draft?.id ? t("edit") : t("add")}</span>
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <TextField label={t("titleAr")} value={draft.title_ar} onChange={(v) => setDraft({ ...draft, title_ar: v })} />
            <TextField label={t("titleKu")} value={draft.title_ku} onChange={(v) => setDraft({ ...draft, title_ku: v })} />
            <TextField label={t("subtitleAr")} value={draft.subtitle_ar} onChange={(v) => setDraft({ ...draft, subtitle_ar: v })} />
            <TextField label={t("subtitleKu")} value={draft.subtitle_ku} onChange={(v) => setDraft({ ...draft, subtitle_ku: v })} />
            <TextField label={`${t("badge")} (ar)`} value={draft.badge_ar} onChange={(v) => setDraft({ ...draft, badge_ar: v })} />
            <TextField label={`${t("badge")} (ku)`} value={draft.badge_ku} onChange={(v) => setDraft({ ...draft, badge_ku: v })} />
            <Field label={t("discountType")}>
              <Select value={draft.discount_type} onValueChange={(v) => setDraft({ ...draft, discount_type: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t("percent")}</SelectItem>
                  <SelectItem value="fixed">{t("fixed")}</SelectItem>
                  <SelectItem value="fixed_price">{t("fixedPrice")}</SelectItem>
                  <SelectItem value="bxgy">{t("bxgy")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <TextField label={t("discountValue")} type="number" value={draft.discount_value} onChange={(v) => setDraft({ ...draft, discount_value: v })} />
            <TextField label={t("startsAt")} type="datetime-local" value={draft.starts_at} onChange={(v) => setDraft({ ...draft, starts_at: v })} />
            <TextField label={t("endsAt")} type="datetime-local" value={draft.ends_at} onChange={(v) => setDraft({ ...draft, ends_at: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("offerScope")}>
              <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">{t("scopeProducts")}</SelectItem>
                  <SelectItem value="category">{t("scopeCategory")}</SelectItem>
                  <SelectItem value="brand">{t("scopeBrand")}</SelectItem>
                  <SelectItem value="all">{t("scopeAll")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {draft.scope === "category" && (
              <Field label={t("offerCategory")}>
                <Select
                  value={draft.category_id}
                  onValueChange={(v) => setDraft({ ...draft, category_id: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {pickName(c, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {draft.scope === "brand" && (
              <Field label={t("offerBrand")}>
                <Select value={draft.brand} onValueChange={(v) => setDraft({ ...draft, brand: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brandOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <TextField
              label={t("offerMinQty")}
              type="number"
              value={draft.min_qty}
              onChange={(v) => setDraft({ ...draft, min_qty: v })}
            />
            {draft.discount_type !== "bxgy" && (
              <TextField
                label={t("maxDiscount")}
                type="number"
                value={draft.max_discount}
                onChange={(v) => setDraft({ ...draft, max_discount: v })}
              />
            )}
            {draft.discount_type === "bxgy" && (
              <>
                <TextField
                  label={t("buyQty")}
                  type="number"
                  value={draft.buy_qty}
                  onChange={(v) => setDraft({ ...draft, buy_qty: v })}
                />
                <TextField
                  label={t("getQty")}
                  type="number"
                  value={draft.get_qty}
                  onChange={(v) => setDraft({ ...draft, get_qty: v })}
                />
              </>
            )}
            <TextField
              label={t("priority")}
              type="number"
              value={draft.priority}
              onChange={(v) => setDraft({ ...draft, priority: v })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{t("onlyOneOfferApplies")}</p>
          <TextField label={t("imageUrl")} value={draft.image_url} onChange={(v) => setDraft({ ...draft, image_url: v })} />
          <ToggleField label={t("active")} checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />

          {draft.scope === "products" && (
          <Field label={t("offerProducts")}>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {(products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-xs ${
                    draft.productIds.includes(p.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <span className="line-clamp-1">{pickName(p, lang)}</span>
                  {draft.productIds.includes(p.id) && <span>✓</span>}
                </button>
              ))}
            </div>
          </Field>
          )}

          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr className="border-b border-slate-200/80 dark:border-slate-800">
              <th className="px-4 py-3 font-semibold text-start">{t("titleAr")}</th>
              <th className="px-4 py-3 font-semibold text-start">{t("discountValue")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("offerProducts")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("active")}</th>
              <th className="px-4 py-3 font-semibold text-end"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {(offers ?? []).map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === "ar" ? o.title_ar : o.title_ku}
                    </p>
                    {o.ends_at && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(o.ends_at).toLocaleDateString("ar-IQ")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-[#007979]">
                    {o.discount_type === "percent"
                      ? `${o.discount_value}%`
                      : `${o.discount_value} ${t("currency")}`}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {(o.offer_products ?? []).length}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {o.is_active ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                      {t("active")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {t("inactive")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 rounded-lg text-xs font-bold"
                      onClick={() =>
                        setDraft({
                          id: o.id,
                          title_ar: o.title_ar,
                          title_ku: o.title_ku,
                          subtitle_ar: o.subtitle_ar ?? "",
                          subtitle_ku: o.subtitle_ku ?? "",
                          badge_ar: o.badge_ar ?? "",
                          badge_ku: o.badge_ku ?? "",
                          discount_type: o.discount_type,
                          discount_value: String(o.discount_value),
                          image_url: o.image_url ?? "",
                          starts_at: toLocal(o.starts_at),
                          ends_at: toLocal(o.ends_at),
                          is_active: o.is_active,
                          productIds: (o.offer_products ?? []).map((x) => x.product_id),
                          scope: o.scope ?? "products",
                          category_id: o.category_id ?? "",
                          brand: o.brand ?? "",
                          min_qty: String(o.min_qty ?? 1),
                          max_discount: o.max_discount == null ? "" : String(o.max_discount),
                          buy_qty: String(o.buy_qty || 2),
                          get_qty: String(o.get_qty || 1),
                          priority: String(o.priority ?? 0),
                          hue: String(o.hue ?? 250),
                          chroma: String(o.chroma ?? 0.14),
                        })
                      }
                    >
                      <Pencil className="size-3.5 sm:hidden" />
                      <span className="hidden sm:inline">{t("edit")}</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white"
                      onClick={() => remove.mutate(o.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(offers ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  {t("noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
