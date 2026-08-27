import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
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
        </AdminCard>
      )}

      <div className="space-y-2">
        {(bundles ?? []).map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold">{b.title_ar || "—"}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatPrice(Number(b.price), lang)} · {(b.product_ids ?? []).length}{" "}
                {t("bundleItems")}
                {b.is_active ? "" : ` · ${t("hidden")}`}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDraft(toDraft(b))}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

    </div>
  );
}
