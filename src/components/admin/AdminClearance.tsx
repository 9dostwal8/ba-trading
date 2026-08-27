import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hourglass, PackageOpen, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "@/components/admin/AdminKit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { tintStyle } from "@/lib/category-icons";
import {
  clearancePercent,
  clearanceUnitPrice,
  monthsChip,
  monthsLeft,
  urgencyTone,
  type ClearanceRule,
} from "@/lib/clearance";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";

type RuleDraft = {
  id?: string;
  months_left: string;
  discount_percent: string;
  label_ar: string;
  label_ku: string;
  hue: string;
  chroma: string;
  sort_order: string;
  is_active: boolean;
};

const emptyRule: RuleDraft = {
  months_left: "6",
  discount_percent: "20",
  label_ar: "",
  label_ku: "",
  hue: "40",
  chroma: "0.16",
  sort_order: "0",
  is_active: true,
};

/**
 * Clearance control room: the automatic near-expiry discount ladder plus a
 * cross-vendor board of every expiring / outlet item with its live price.
 */
export function AdminClearance() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<RuleDraft | null>(null);

  const { data: rules } = useQuery({
    queryKey: ["admin-clearance-rules"],
    queryFn: async () =>
      (await supabase.from("clearance_rules").select("*").order("months_left")).data ?? [],
  });

  const { data: items } = useQuery({
    queryKey: ["admin-clearance-items"],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("*, vendors(name)")
          .in("clearance_kind", ["near_expiry", "outlet"])
          .order("expiry_date", { ascending: true })
      ).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: RuleDraft) => {
      const payload = {
        months_left: Number(d.months_left) || 0,
        discount_percent: Number(d.discount_percent) || 0,
        label_ar: d.label_ar.trim(),
        label_ku: d.label_ku.trim() || d.label_ar.trim(),
        hue: Number(d.hue) || 40,
        chroma: Number(d.chroma) || 0.16,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
      };
      const res = d.id
        ? await supabase.from("clearance_rules").update(payload).eq("id", d.id)
        : await supabase.from("clearance_rules").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-clearance-rules"] });
      qc.invalidateQueries({ queryKey: ["clearance-rules"] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clearance_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admin-clearance-rules"] });
      qc.invalidateQueries({ queryKey: ["clearance-rules"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const active = (rules ?? []).filter((r) => r.is_active) as ClearanceRule[];

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("clearanceRules")}
        action={
          <Button size="sm" onClick={() => setDraft(draft ? null : emptyRule)}>
            <Plus className="size-4" />
            {t("add")}
          </Button>
        }
      />
      <p className="px-1 text-[11px] font-semibold leading-snug text-muted-foreground">
        {t("clearanceRulesHint")}
      </p>

      {draft && (
        <AdminCard>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("monthsLeftLabel")}
              type="number"
              value={draft.months_left}
              onChange={(v) => setDraft({ ...draft, months_left: v })}
            />
            <TextField
              label={t("autoDiscount")}
              type="number"
              value={draft.discount_percent}
              onChange={(v) => setDraft({ ...draft, discount_percent: v })}
            />
            <TextField
              label={t("nameAr")}
              value={draft.label_ar}
              onChange={(v) => setDraft({ ...draft, label_ar: v })}
            />
            <TextField
              label={t("nameKu")}
              value={draft.label_ku}
              onChange={(v) => setDraft({ ...draft, label_ku: v })}
            />
          </div>
          <ToggleField
            label={t("active")}
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            <Save className="size-4" />
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-1.5">
        {(rules ?? []).map((r) => (
          <div
            key={r.id}
            style={tintStyle(Number(r.hue), Number(r.chroma))}
            className="flex items-center gap-2 rounded-2xl border p-2.5 [background:var(--tint-soft)] [border-color:var(--tint-border)]"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl"
              style={{ background: "var(--tint-strong)", color: "oklch(0.99 0 0)" }}
            >
              <Hourglass className="size-4" strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold">
                {pickLabel(r, lang)} · ≤ {r.months_left} {t("monthsLeftLabel")}
              </p>
              <p className="text-[10.5px] font-bold" style={{ color: "var(--tint-strong)" }}>
                -{r.discount_percent}%{r.is_active ? "" : ` · ${t("inactive")}`}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-[11px]"
              onClick={() =>
                setDraft({
                  id: r.id,
                  months_left: String(r.months_left),
                  discount_percent: String(r.discount_percent),
                  label_ar: r.label_ar ?? "",
                  label_ku: r.label_ku ?? "",
                  hue: String(r.hue),
                  chroma: String(r.chroma),
                  sort_order: String(r.sort_order ?? 0),
                  is_active: r.is_active,
                })
              }
            >
              {t("edit")}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-destructive"
              aria-label={t("delete")}
              onClick={() => remove.mutate(r.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <SectionHeader title={t("clearanceItems")} />
      <div className="space-y-1.5">
        {(items ?? []).map((p) => {
          const months = monthsLeft(p.expiry_date);
          const near = p.clearance_kind === "near_expiry" && months != null;
          const tone = urgencyTone(months);
          const percent = clearancePercent(p, active);
          const final = clearanceUnitPrice(Number(p.price), percent);
          const vendorName = (p as { vendors?: { name?: string } | null }).vendors?.name ?? "";
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-card"
            >
              <img
                src={p.image_url ?? "/placeholder.svg"}
                alt=""
                loading="lazy"
                className="size-11 shrink-0 rounded-xl bg-secondary/40 object-contain p-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-extrabold">{pickName(p, lang)}</p>
                <p className="truncate text-[10px] font-semibold text-muted-foreground">
                  {vendorName} · {t("stock")}: {p.stock}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <span
                  style={near ? tintStyle(tone.hue, tone.chroma) : tintStyle(220, 0.12)}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold [background:var(--tint-soft)] [color:var(--tint-strong)]"
                >
                  {near ? <Hourglass className="size-2.5" /> : <PackageOpen className="size-2.5" />}
                  {near ? monthsChip(months, lang) : t("outlet")}
                </span>
                <p className="mt-0.5 text-[11px] font-extrabold tabular-nums text-success">
                  {formatPrice(final, lang)}
                  {percent > 0 ? ` · -${percent}%` : ""}
                </p>
              </div>
            </div>
          );
        })}
        {!(items ?? []).length && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        )}
      </div>
    </div>
  );
}

function pickLabel(r: { label_ar?: string | null; label_ku?: string | null }, lang: string) {
  return (lang === "ar" ? r.label_ar : r.label_ku) || r.label_ar || r.label_ku || "";
}
