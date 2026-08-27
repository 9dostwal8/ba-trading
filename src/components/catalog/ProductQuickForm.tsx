import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { aiFillProduct } from "@/lib/ai-listing.functions";

import { Loader2, Plus, Save, Sparkles, Upload, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, TextField } from "@/components/admin/AdminKit";
import { RewardSponsorField } from "@/components/rewards/RewardSponsorField";
import { PRODUCT_BADGES, badgeLabel } from "@/lib/badges";
import { type ClearanceRule } from "@/lib/clearance";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { uploadMessage, uploadProductImage } from "@/lib/upload";

export type ProductDraft = {
  id?: string;
  name_ar: string;
  name_ku: string;
  description_ar: string;
  description_ku: string;
  brand: string;
  sku: string;
  /** original price */
  price: string;
  /** optional price after discount (kept separate for a simple 2-field UI) */
  sale_price: string;
  compare_price: string;
  stock: string;
  image_url: string;
  category_id: string;
  vendor_id: string;
  /** shared catalog identity (set when picked from the shared catalog) */
  catalog_item_id?: string | null;
  clearance_kind: "none" | "near_expiry" | "outlet";
  expiry_date: string;
  stocked_since: string;
  batch_no: string;
  is_active: boolean;
  is_featured: boolean;
  badges: string[];
  /** vendor-sponsored reward points on this listing */
  reward_multiplier: string;
  reward_bonus_points: string;
};

export const emptyProductDraft: ProductDraft = {
  name_ar: "",
  name_ku: "",
  description_ar: "",
  description_ku: "",
  brand: "",
  sku: "",
  price: "",
  sale_price: "",
  compare_price: "",
  stock: "1",
  image_url: "",
  category_id: "",
  vendor_id: "",
  catalog_item_id: null,
  clearance_kind: "none",
  expiry_date: "",
  stocked_since: "",
  batch_no: "",
  is_active: true,
  is_featured: false,
  badges: [],
  reward_multiplier: "1",
  reward_bonus_points: "0",
};

type Row = Record<string, unknown>;

/** DB row -> editable draft (price = original, sale_price = discounted). */
export function toProductDraft(row: Row): ProductDraft {
  const str = (k: string) => (row[k] == null ? "" : String(row[k]));
  const kind = str("clearance_kind");
  const price = Number(row["price"]) || 0;
  const compare = Number(row["compare_price"]) || 0;
  const discounted = compare > price;
  return {
    ...emptyProductDraft,
    id: str("id"),
    name_ar: str("name_ar"),
    name_ku: str("name_ku"),
    description_ar: str("description_ar"),
    description_ku: str("description_ku"),
    brand: str("brand"),
    sku: str("sku"),
    price: String(discounted ? compare : price),
    sale_price: discounted ? String(price) : "",
    compare_price: str("compare_price"),
    stock: str("stock") || "0",
    image_url: str("image_url"),
    category_id: str("category_id"),
    vendor_id: str("vendor_id"),
    catalog_item_id: str("catalog_item_id") || null,
    clearance_kind:
      kind === "near_expiry" || kind === "outlet" || kind === "none"
        ? (kind as ProductDraft["clearance_kind"])
        : "none",
    expiry_date: str("expiry_date").slice(0, 10),
    stocked_since: str("stocked_since").slice(0, 10),
    batch_no: str("batch_no"),
    is_active: row["is_active"] !== false,
    is_featured: row["is_featured"] === true,
    badges: Array.isArray(row["badges"]) ? (row["badges"] as string[]) : [],
    reward_multiplier: String(Number(row["reward_multiplier"] ?? 1) || 1),
    reward_bonus_points: String(Number(row["reward_bonus_points"] ?? 0) || 0),
  };
}

/** Copy a catalog item into a brand-new listing (price / stock stay for the vendor). */
export function duplicateDraft(d: ProductDraft): ProductDraft {
  const { id: _id, ...rest } = d;
  return { ...rest, sku: "", batch_no: "" };
}

export function productPayload(d: ProductDraft, vendorId?: string | null) {
  const original = Number(d.price) || 0;
  const sale = Number(d.sale_price) || 0;
  const hasSale = sale > 0 && sale < original;
  return {
    name_ar: d.name_ar.trim(),
    name_ku: d.name_ku.trim() || d.name_ar.trim(),
    description_ar: d.description_ar,
    description_ku: d.description_ku,
    brand: d.brand.trim(),
    sku: d.sku.trim(),
    price: hasSale ? sale : original,
    compare_price: hasSale ? original : null,
    stock: Number(d.stock) || 0,
    image_url: d.image_url.trim() || null,
    category_id: d.category_id || null,
    vendor_id: vendorId ?? (d.vendor_id || null),
    catalog_item_id: d.catalog_item_id || null,
    clearance_kind: d.clearance_kind,
    expiry_date: d.clearance_kind === "near_expiry" && d.expiry_date ? d.expiry_date : null,
    stocked_since: d.clearance_kind === "outlet" ? d.stocked_since || null : null,
    batch_no: d.batch_no.trim() || null,
    is_active: d.is_active,
    is_featured: d.is_featured,
    badges: d.badges,
    reward_multiplier: Math.max(1, Number(d.reward_multiplier) || 1),
    reward_bonus_points: Math.max(0, Math.round(Number(d.reward_bonus_points) || 0)),
  };
}

/**
 * Dead-simple listing form: photo, name, price, discounted price, badges, type.
 * Everything advanced stays hidden behind "more details".
 */
export function ProductQuickForm({
  draft,
  setDraft,
  brands,
  categories,
  vendors,
  vendorId,
  onSave,
  onSaveNew,
  onCancel,
  saving,
  header,
}: {
  draft: ProductDraft;
  setDraft: (d: ProductDraft) => void;
  brands: string[];
  categories: { id: string; name_ar: string; name_ku: string }[];
  vendors?: { id: string; name: string }[];
  /** folder the photo is stored under; vendors may only write their own */
  vendorId?: string | null;
  /** kept for API compatibility; auto-discount preview lives on the storefront */
  rules?: ClearanceRule[];
  onSave: () => void;
  onSaveNew?: () => void;
  onCancel: () => void;
  saving?: boolean;
  header?: ReactNode;
}) {
  const { t, lang } = useI18n();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const fillFn = useServerFn(aiFillProduct);


  const set = (patch: Partial<ProductDraft>) => setDraft({ ...draft, ...patch });

  const { data: settings } = useQuery({
    queryKey: ["product-form-pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("price_badge")
        .limit(1)
        .maybeSingle();
      return data as { price_badge: number } | null;
    },
  });

  /** admin-defined per-sticker fees (free vs paid) */
  const { data: badgeFees } = useQuery({
    queryKey: ["badge-fees"],
    queryFn: async () =>
      ((await (supabase as any).from("badge_fees").select("badge_key, is_paid, price")).data ??
        []) as { badge_key: string; is_paid: boolean; price: number }[],
  });

  const generalBadgePrice = Number(settings?.price_badge) || 0;
  const badgeCost = (key: string) => {
    const row = (badgeFees ?? []).find((f) => f.badge_key === key);
    if (!row) return key === "discount" ? 0 : generalBadgePrice;
    if (!row.is_paid) return 0;
    return Number(row.price) > 0 ? Number(row.price) : generalBadgePrice;
  };
  const badgesTotal = draft.badges.reduce((s, k) => s + badgeCost(k), 0);



  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      set({ image_url: await uploadProductImage(file, vendorId ?? draft.vendor_id) });
      toast.success(t("saved"));
    } catch (e) {
      toast.error(uploadMessage(e, lang));
    } finally {
      setBusy(false);
    }
  }

  /** One tap: rough English name -> trilingual names, brand, SKU, category. */
  async function runAiFill() {
    setAi(true);
    try {
      const out = await fillFn({
        data: {
          name: draft.name_ar,
          categories: categories.map((c) => c.name_ar).filter(Boolean),
        },
      });
      const match = categories.find(
        (c) => c.name_ar === out.category || pickName(c, lang) === out.category,
      );
      set({
        name_ar: out.name_ar || draft.name_ar,
        name_ku: out.name_ku || out.name_ar || draft.name_ku,
        description_ar: out.description_ar || draft.description_ar,
        description_ku: out.description_ku || draft.description_ku,
        brand: out.brand && brands.includes(out.brand) ? out.brand : draft.brand || out.brand,
        sku: draft.sku || out.sku,
        category_id: draft.category_id || match?.id || "",
      });
      toast.success(t("aiDone"));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("error"));
    } finally {
      setAi(false);
    }
  }



  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-3 shadow-card">
      {header}

      {/* photo: upload or paste a link */}
      <div className="flex gap-2.5">
        <label className="grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-secondary/50">
          {busy ? (
            <Loader2 className="size-5 animate-spin text-primary" />
          ) : draft.image_url ? (
            <img src={draft.image_url} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </label>
        <div className="min-w-0 flex-1 space-y-2">
          <Field label={t("nameAr")}>
            <div className="flex gap-1.5">
              <Input
                value={draft.name_ar}
                onChange={(e) => set({ name_ar: e.target.value, name_ku: e.target.value })}
                className="h-10"
                dir="ltr"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-10 shrink-0 gap-1 px-2.5"
                disabled={ai || draft.name_ar.trim().length < 2}
                onClick={runAiFill}
              >
                {ai ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4 text-primary" strokeWidth={2.6} />
                )}
                <span className="text-[11px] font-extrabold">{ai ? t("aiWorking") : "AI"}</span>
              </Button>
            </div>
          </Field>
          <p className="text-[10px] font-semibold leading-snug text-muted-foreground">
            {t("aiFillHint")}
          </p>
          <Field label={t("imageUrl")}>
            <Input
              value={draft.image_url}
              onChange={(e) => set({ image_url: e.target.value })}
              className="h-9"
              placeholder="https://…"
              dir="ltr"
            />
          </Field>
        </div>

      </div>

      {/* price + discounted price + qty */}
      <div className="grid grid-cols-3 gap-2">
        <TextField
          label={t("price")}
          type="number"
          value={draft.price}
          onChange={(v) => set({ price: v })}
        />
        <TextField
          label={t("discountedPrice")}
          type="number"
          value={draft.sale_price}
          onChange={(v) => set({ sale_price: v })}
        />
        <TextField
          label={t("stock")}
          type="number"
          value={draft.stock}
          onChange={(v) => set({ stock: v })}
        />
      </div>

      {/* category is mandatory */}
      <Field
        label={`${t("category")} ${
          lang === "ar" ? "(إلزامي)" : lang === "ku" ? "(پێویست)" : "(required)"
        }`}
      >
        <Select value={draft.category_id} onValueChange={(v) => set({ category_id: v })}>
          <SelectTrigger
            className={`h-10 ${draft.category_id ? "" : "border-destructive ring-1 ring-destructive/30"}`}
          >
            <SelectValue placeholder={t("category")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {pickName(c, lang)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!draft.category_id && (
          <p className="mt-1 text-[10.5px] font-bold text-destructive">
            {lang === "ar"
              ? "اختر القسم قبل الحفظ"
              : lang === "ku"
                ? "پێش پاشەکەوتکردن بەش هەڵبژێرە"
                : "Select a category before saving"}
          </p>
        )}
      </Field>


      {/* badges */}
      <Field label={t("badge")}>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCT_BADGES.map((b) => {
            const on = draft.badges.includes(b.key);
            const Icon = b.icon;
            const cost = badgeCost(b.key);
            return (
              <button
                key={b.key}
                type="button"
                onClick={() =>
                  set({
                    badges: on
                      ? draft.badges.filter((x) => x !== b.key)
                      : [...draft.badges, b.key],
                  })
                }
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-extrabold transition-all active:scale-95 ${
                  on ? "bg-primary text-primary-foreground shadow-pop" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="size-3" strokeWidth={2.6} />
                {badgeLabel(b, lang)}
                <span className={`text-[9px] font-bold ${on ? "opacity-90" : "opacity-70"}`}>
                  {cost > 0 ? formatPrice(cost, lang) : "✓"}
                </span>
              </button>
            );
          })}
        </div>
        {generalBadgePrice || (badgeFees ?? []).some((f) => f.is_paid) ? (
          <div className="mt-2 space-y-1 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-2.5">
            <p className="text-[11px] font-extrabold text-amber-700">{t("badgePricingTitle")}</p>
            <p className="text-[10.5px] leading-snug text-amber-800/80">
              {t("badgePricingEach").replace("{p}", formatPrice(generalBadgePrice, lang))}
            </p>
            <ul className="space-y-0.5 text-[10px] leading-snug text-amber-800/70">
              <li>• {t("badgePricingDiscountFree")}</li>
              <li>• {t("badgePricingOnce")}</li>
            </ul>
            {draft.badges.length > 0 && (
              <p className="pt-1 text-[10.5px] font-extrabold text-amber-700">
                {t("badgePricingSelected").replace(
                  "{n}",
                  String(draft.badges.filter((k) => badgeCost(k) > 0).length),
                )}
                {" · "}
                {t("badgePricingEstimate").replace("{p}", formatPrice(badgesTotal, lang))}
              </p>
            )}
          </div>
        ) : null}
      </Field>


      {/* vendor-funded reward points for this item */}
      <RewardSponsorField
        multiplier={draft.reward_multiplier}
        bonus={draft.reward_bonus_points}
        onChange={(patch) =>
          set({
            ...(patch.multiplier !== undefined ? { reward_multiplier: patch.multiplier } : {}),
            ...(patch.bonus !== undefined ? { reward_bonus_points: patch.bonus } : {}),
          })
        }
      />

      {/* near-expiry / outlet is set from the offers studio, not here */}


      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        className="text-[11px] font-extrabold text-primary underline decoration-dotted underline-offset-2"
      >
        {more ? t("cancel") : t("fullDetails")}
      </button>

      {more && (
        <div className="space-y-2 border-t border-border/60 pt-2">
          <div className="grid grid-cols-1 gap-2">
            <Field label={t("myBrand")}>
              <Select value={draft.brand} onValueChange={(v) => set({ brand: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("myBrand")} />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(brands.filter(Boolean))].map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {vendors && (
            <Field label={t("vendorName")}>
              <Select value={draft.vendor_id} onValueChange={(v) => set({ vendor_id: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("vendorName")} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label={t("descAr")}>
            <Textarea
              value={draft.description_ar}
              onChange={(e) => set({ description_ar: e.target.value })}
              rows={2}
            />
          </Field>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={saving || !draft.name_ar.trim() || !draft.category_id}>
          <Save className="size-4" />
          {t("save")}
        </Button>
        {onSaveNew && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onSaveNew}
            disabled={saving || !draft.name_ar.trim() || !draft.category_id}
          >
            <Plus className="size-4" />
            {t("saveAndNew")}
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="size-4" />
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
