import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "./AdminKit";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { PRODUCT_BADGES, ProductBadges, badgeLabel } from "@/lib/badges";
import { PhotoField } from "@/components/catalog/PhotoField";

type Draft = {
  id?: string;
  name_ar: string;
  name_ku: string;
  description_ar: string;
  description_ku: string;
  brand: string;
  sku: string;
  price: string;
  compare_price: string;
  stock: string;
  image_url: string;
  category_id: string;
  vendor_id: string;
  is_active: boolean;
  is_featured: boolean;
  badges: string[];
};

const empty: Draft = {
  name_ar: "",
  name_ku: "",
  description_ar: "",
  description_ku: "",
  brand: "",
  sku: "",
  price: "",
  compare_price: "",
  stock: "0",
  image_url: "",
  category_id: "",
  vendor_id: "",
  is_active: true,
  is_featured: false,
  badges: [],
};

export function AdminProducts() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filterVendor, setFilterVendor] = useState<string>("all");

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () =>
      (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ??
      [],
  });
  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-lite"],
    queryFn: async () => (await supabase.from("vendors").select("id, name").order("name")).data ?? [],
  });
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        name_ar: d.name_ar.trim(),
        name_ku: d.name_ku.trim() || d.name_ar.trim(),
        description_ar: d.description_ar,
        description_ku: d.description_ku,
        brand: d.brand,
        sku: d.sku,
        price: Number(d.price) || 0,
        compare_price: d.compare_price ? Number(d.compare_price) : null,
        stock: Number(d.stock) || 0,
        image_url: d.image_url || null,
        category_id: d.category_id || null,
        vendor_id: d.vendor_id || null,
        is_active: d.is_active,
        is_featured: d.is_featured,
        badges: d.badges,
      };
      const res = d.id
        ? await supabase.from("products").update(payload).eq("id", d.id)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("products")}
        action={
          <Button size="sm" onClick={() => setDraft(draft ? null : empty)}>
            {draft ? <X className="size-4" /> : <Plus className="size-4" />}
            {draft ? t("cancel") : t("add")}
          </Button>
        }
      />

      {draft && (
        <AdminCard>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <TextField
                label={t("nameAr")}
                value={draft.name_ar}
                onChange={(v) => setDraft({ ...draft, name_ar: v, name_ku: v })}
              />
            </div>
            <TextField label={t("price")} type="number" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} />
            <TextField label={t("oldPrice")} type="number" value={draft.compare_price} onChange={(v) => setDraft({ ...draft, compare_price: v })} />
            <TextField label={t("stock")} type="number" value={draft.stock} onChange={(v) => setDraft({ ...draft, stock: v })} />
            <TextField label={t("brand")} value={draft.brand} onChange={(v) => setDraft({ ...draft, brand: v })} />
            <TextField label={t("sku")} value={draft.sku} onChange={(v) => setDraft({ ...draft, sku: v })} />
            <Field
              label={`${t("category")} ${
                lang === "ar" ? "(إلزامي)" : lang === "ku" ? "(پێویست)" : "(required)"
              }`}
            >
              <Select value={draft.category_id} onValueChange={(v) => setDraft({ ...draft, category_id: v })}>
                <SelectTrigger className={`h-9 ${draft.category_id ? "" : "border-destructive ring-1 ring-destructive/30"}`}>
                  <SelectValue placeholder={t("category")} />
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

          </div>
          <Field label={t("brandManager")}>
            <Select
              value={draft.vendor_id}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  vendor_id: v,
                  brand: (vendors ?? []).find((x) => x.id === v)?.name ?? draft.brand,
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("brandManager")} />
              </SelectTrigger>
              <SelectContent>
                {(vendors ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <PhotoField
            value={draft.image_url}
            vendorId={draft.vendor_id || null}
            onChange={(v) => setDraft({ ...draft, image_url: v })}
          />
          <Field label={t("descAr")}>
            <Textarea value={draft.description_ar} onChange={(e) => setDraft({ ...draft, description_ar: e.target.value })} />
          </Field>
          <Field label={t("descKu")}>
            <Textarea value={draft.description_ku} onChange={(e) => setDraft({ ...draft, description_ku: e.target.value })} />
          </Field>
          <Field label={lang === "ar" ? "ملصقات المنتج" : "ستیکەرەکانی بەرهەم"}>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_BADGES.map((b) => {
                const on = draft.badges.includes(b.key);
                const Icon = b.icon;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        badges: on
                          ? draft.badges.filter((x) => x !== b.key)
                          : [...draft.badges, b.key],
                      })
                    }
                    style={
                      on
                        ? { backgroundColor: b.ink, borderColor: b.ink }
                        : { backgroundColor: `color-mix(in oklab, ${b.ink} 8%, white)`, borderColor: `color-mix(in oklab, ${b.ink} 20%, white)`, color: b.ink }
                    }
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-bold tracking-tight transition ${
                      on ? "text-white shadow-[0_6px_14px_-8px_oklch(0_0_0/45%)]" : ""
                    }`}
                  >
                    <Icon className="size-3.5" strokeWidth={2.7} />
                    {badgeLabel(b, lang)}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <ToggleField label={t("active")} checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
            <ToggleField label={t("isFeatured")} checked={draft.is_featured} onChange={(v) => setDraft({ ...draft, is_featured: v })} />
          </div>
          <Button className="w-full" disabled={save.isPending || !draft.category_id} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>

        </AdminCard>
      )}

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        {[{ id: "all", name: t("allBrands") }, ...(vendors ?? []), { id: "none", name: t("noBrand") }].map(
          (v) => (
            <button
              key={v.id}
              onClick={() => setFilterVendor(v.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                filterVendor === v.id ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {v.name}
            </button>
          ),
        )}
      </div>

      <div className="space-y-2">
        {(products ?? [])
          .filter((p) =>
            filterVendor === "all"
              ? true
              : filterVendor === "none"
                ? !p.vendor_id
                : p.vendor_id === filterVendor,
          )
          .map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
            <img
              src={p.image_url ?? "/placeholder.svg"}
              alt={pickName(p, lang)}
              loading="lazy"
              className="size-12 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold">{pickName(p, lang)}</p>
              <p className="text-xs text-muted-foreground">
                {(vendors ?? []).find((v) => v.id === p.vendor_id)?.name ?? p.brand ?? t("noBrand")} ·{" "}
                {formatPrice(Number(p.price), lang)} · {t("stock")}: {p.stock}
                {!p.is_active && ` · ${t("outOfStock")}`}
              </p>
              <div className="mt-1">
                <ProductBadges badges={p.badges} lang={lang} max={3} />
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() =>
                setDraft({
                  id: p.id,
                  name_ar: p.name_ar,
                  name_ku: p.name_ku,
                  description_ar: p.description_ar ?? "",
                  description_ku: p.description_ku ?? "",
                  brand: p.brand ?? "",
                  sku: p.sku ?? "",
                  price: String(p.price),
                  compare_price: p.compare_price ? String(p.compare_price) : "",
                  stock: String(p.stock),
                  image_url: p.image_url ?? "",
                  category_id: p.category_id ?? "",
                  vendor_id: p.vendor_id ?? "",
                  is_active: p.is_active,
                  is_featured: p.is_featured,
                  badges: p.badges ?? [],
                })
              }
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-destructive"
              onClick={() => remove.mutate(p.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
