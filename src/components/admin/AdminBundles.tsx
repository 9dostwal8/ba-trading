import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import type { Bundle, Product } from "@/lib/store";

type Draft = {
  id?: string;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  product_ids: string[];
  price: string;
  compare_price: string;
  image_url: string;
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
  product_ids: [],
  price: "0",
  compare_price: "",
  image_url: "",
  hue: "200",
  chroma: "0.14",
  sort_order: "0",
  is_active: true,
};

function toDraft(b: Bundle): Draft {
  return {
    id: b.id,
    title_ar: b.title_ar,
    title_ku: b.title_ku,
    subtitle_ar: b.subtitle_ar,
    subtitle_ku: b.subtitle_ku,
    product_ids: b.product_ids ?? [],
    price: String(b.price),
    compare_price: b.compare_price == null ? "" : String(b.compare_price),
    image_url: b.image_url ?? "",
    hue: String(b.hue),
    chroma: String(b.chroma),
    sort_order: String(b.sort_order),
    is_active: b.is_active,
  };
}

export function AdminBundles({ vendorId }: { vendorId?: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: bundles } = useQuery({
    queryKey: ["admin-bundles", vendorId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("bundles").select("*").order("sort_order");
      if (vendorId) q = q.eq("vendor_id", vendorId);
      return ((await q).data ?? []) as unknown as Bundle[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-bundle-products", vendorId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id,name_ar,name_ku,brand,price,image_url")
        .order("brand");
      if (vendorId) q = q.eq("vendor_id", vendorId);
      return ((await q).data ?? []) as unknown as Product[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        title_ar: d.title_ar.trim(),
        title_ku: d.title_ku.trim(),
        subtitle_ar: d.subtitle_ar.trim(),
        subtitle_ku: d.subtitle_ku.trim(),
        product_ids: d.product_ids,
        price: Number(d.price) || 0,
        compare_price: d.compare_price ? Number(d.compare_price) : null,
        image_url: d.image_url.trim() || null,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
        ...(vendorId ? { vendor_id: vendorId } : {}),
      };
      const { error } = d.id
        ? await supabase.from("bundles").update(row).eq("id", d.id)
        : await supabase.from("bundles").insert(row);
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
      const { error } = await supabase.from("bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  function togglePick(id: string) {
    if (!draft) return;
    const has = draft.product_ids.includes(id);
    setDraft({
      ...draft,
      product_ids: has ? draft.product_ids.filter((x) => x !== id) : [...draft.product_ids, id],
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("bundles")}
        action={
          <Button size="sm" onClick={() => setDraft({ ...empty })}>
            <Plus className="size-4" />
            {t("add")}
          </Button>
        }
      />

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {draft?.id ? <Pencil className="size-4 text-[#007979]" /> : <Package className="size-4 text-[#007979]" />}
              <span>{draft?.id ? t("edit") : t("add")}</span>
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-4 pt-2">
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
              label={t("bundlePrice")}
              type="number"
              value={draft.price}
              onChange={(v) => setDraft({ ...draft, price: v })}
            />
            <TextField
              label={t("comparePrice")}
              type="number"
              value={draft.compare_price}
              onChange={(v) => setDraft({ ...draft, compare_price: v })}
            />
            <div className="col-span-2">
            </div>
            <TextField
              label={t("sortOrder")}
              type="number"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
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
            <Label className="text-[11px] text-muted-foreground">
              {t("bundleItems")} — {draft.product_ids.length} {t("selected")}
            </Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {(products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePick(p.id)}
                  className={`flex w-full items-center gap-2 rounded-md p-1.5 text-start ${
                    draft.product_ids.includes(p.id) ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="line-clamp-1 flex-1 text-[11px] font-bold">
                    {pickName(p, lang)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatPrice(Number(p.price), lang)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={() => save.mutate(draft)}>
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
              <th className="px-4 py-3 font-semibold text-start">{t("bundlePrice")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("bundleItems")}</th>
              <th className="px-4 py-3 font-semibold text-center">{t("active")}</th>
              <th className="px-4 py-3 font-semibold text-end"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {(bundles ?? []).map((b) => (
              <tr key={b.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === "ar" ? b.title_ar : b.title_ku || "—"}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-[#007979]">
                    {formatPrice(Number(b.price), lang)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {(b.product_ids ?? []).length}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {b.is_active ? (
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
                      onClick={() => setDraft(toDraft(b))}
                    >
                      <Pencil className="size-3.5 sm:hidden" />
                      <span className="hidden sm:inline">{t("edit")}</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white"
                      onClick={() => remove.mutate(b.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(bundles ?? []).length === 0 && (
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
