import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, Field, SectionHeader, TextField, ToggleField } from "@/components/admin/AdminKit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RewardSponsorField } from "@/components/rewards/RewardSponsorField";
import { supabase } from "@/integrations/supabase/client";
import { pick, pickName, useI18n } from "@/lib/i18n";

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
  ends_at: string;
  is_active: boolean;
  productIds: string[];
  min_qty: string;
  max_discount: string;
  buy_qty: string;
  get_qty: string;
  priority: string;
  reward_multiplier: string;
  reward_bonus_points: string;
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
  ends_at: "",
  is_active: true,
  productIds: [],
  min_qty: "1",
  max_discount: "",
  buy_qty: "2",
  get_qty: "1",
  priority: "0",
  reward_multiplier: "1",
  reward_bonus_points: "0",
};

export function VendorOffers({ vendorId }: { vendorId: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: offers } = useQuery({
    queryKey: ["vendor-offers", vendorId],
    queryFn: async () =>
      (
        await supabase
          .from("offers")
          .select("*, offer_products(product_id)")
          .eq("vendor_id", vendorId)
          .order("sort_order")
      ).data ?? [],
  });

  const { data: products } = useQuery({
    queryKey: ["vendor-products-lite", vendorId],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id, name_ar, name_ku")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        vendor_id: vendorId,
        title_ar: d.title_ar.trim(),
        title_ku: d.title_ku.trim() || d.title_ar.trim(),
        subtitle_ar: d.subtitle_ar,
        subtitle_ku: d.subtitle_ku || d.subtitle_ar,
        badge_ar: d.badge_ar,
        badge_ku: d.badge_ku || d.badge_ar,
        discount_type: d.discount_type,
        discount_value: Number(d.discount_value) || 0,
        ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
        is_active: d.is_active,
        scope: "products",
        min_qty: Math.max(1, Number(d.min_qty) || 1),
        max_discount: d.max_discount === "" ? null : Math.max(0, Number(d.max_discount) || 0),
        buy_qty: d.discount_type === "bxgy" ? Math.max(1, Number(d.buy_qty) || 1) : 0,
        get_qty: d.discount_type === "bxgy" ? Math.max(1, Number(d.get_qty) || 1) : 0,
        priority: Number(d.priority) || 0,
        reward_multiplier: Math.max(1, Number(d.reward_multiplier) || 1),
        reward_bonus_points: Math.max(0, Math.round(Number(d.reward_bonus_points) || 0)),
      };
      const res = d.id
        ? await supabase.from("offers").update(payload).eq("id", d.id).select("id").single()
        : await supabase.from("offers").insert(payload).select("id").single();
      if (res.error) throw res.error;
      const offerId = res.data.id;
      await supabase.from("offer_products").delete().eq("offer_id", offerId);
      if (d.productIds.length) {
        const { error } = await supabase
          .from("offer_products")
          .insert(d.productIds.map((product_id) => ({ offer_id: offerId, product_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["vendor-offers", vendorId] });
      qc.invalidateQueries({ queryKey: ["store"] });
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
      qc.invalidateQueries({ queryKey: ["vendor-offers", vendorId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const toggleProduct = (id: string) => {
    if (!draft) return;
    const has = draft.productIds.includes(id);
    setDraft({
      ...draft,
      productIds: has ? draft.productIds.filter((p) => p !== id) : [...draft.productIds, id],
    });
  };

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("myOffers")}
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
            <TextField label={t("titleAr")} value={draft.title_ar} onChange={(v) => setDraft({ ...draft, title_ar: v })} />
            <TextField label={t("titleKu")} value={draft.title_ku} onChange={(v) => setDraft({ ...draft, title_ku: v })} />
            <TextField label={t("subtitleAr")} value={draft.subtitle_ar} onChange={(v) => setDraft({ ...draft, subtitle_ar: v })} />
            <TextField label={t("subtitleKu")} value={draft.subtitle_ku} onChange={(v) => setDraft({ ...draft, subtitle_ku: v })} />
            <TextField label={t("badge")} value={draft.badge_ar} onChange={(v) => setDraft({ ...draft, badge_ar: v })} />
            <TextField label={t("discountValue")} type="number" value={draft.discount_value} onChange={(v) => setDraft({ ...draft, discount_value: v })} />
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
            <TextField
              label={t("endsAt")}
              type="datetime-local"
              value={draft.ends_at}
              onChange={(v) => setDraft({ ...draft, ends_at: v })}
            />
            <TextField
              label={t("offerMinQty")}
              type="number"
              value={draft.min_qty}
              onChange={(v) => setDraft({ ...draft, min_qty: v })}
            />
            {draft.discount_type !== "bxgy" ? (
              <TextField
                label={t("maxDiscount")}
                type="number"
                value={draft.max_discount}
                onChange={(v) => setDraft({ ...draft, max_discount: v })}
              />
            ) : (
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

          <RewardSponsorField
            multiplier={draft.reward_multiplier}
            bonus={draft.reward_bonus_points}
            onChange={(patch) =>
              setDraft({
                ...draft,
                ...(patch.multiplier !== undefined ? { reward_multiplier: patch.multiplier } : {}),
                ...(patch.bonus !== undefined ? { reward_bonus_points: patch.bonus } : {}),
              })
            }
          />

          <Field label={t("selectProducts")}>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {(products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-right text-xs font-bold transition-colors ${
                    draft.productIds.includes(p.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {pickName(p, lang)}
                </button>
              ))}
            </div>
          </Field>

          <ToggleField label={t("active")} checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-2">
        {(offers ?? []).map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold">{pick(o.title_ar, o.title_ku, lang)}</p>
              <p className="text-xs text-muted-foreground">
                {o.discount_type === "percent"
                  ? `${o.discount_value}%`
                  : `${o.discount_value}`}{" "}
                · {(o.offer_products ?? []).length} {t("itemsCount")}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
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
                  ends_at: o.ends_at ? o.ends_at.slice(0, 16) : "",
                  is_active: o.is_active,
                  productIds: (o.offer_products ?? []).map((r) => r.product_id),
                  min_qty: String(o.min_qty ?? 1),
                  max_discount: o.max_discount == null ? "" : String(o.max_discount),
                  buy_qty: String(o.buy_qty || 2),
                  get_qty: String(o.get_qty || 1),
                  priority: String(o.priority ?? 0),
                  reward_multiplier: String(o.reward_multiplier ?? 1),
                  reward_bonus_points: String(o.reward_bonus_points ?? 0),
                })
              }
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-destructive"
              onClick={() => remove.mutate(o.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {(offers ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        )}
      </div>
    </div>
  );
}
