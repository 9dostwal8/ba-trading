import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ColorField, AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { brandLogo, type BrandCard } from "@/lib/brands";
import { pickName, useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/store";

type Draft = {
  id?: string;
  name: string;
  mark: string;
  match_key: string;
  logo_domain: string;
  logo_url: string;
  hue: string;
  chroma: string;
  product_ids: string[];
  sort_order: string;
  is_active: boolean;
};

const empty: Draft = {
  name: "",
  mark: "",
  match_key: "",
  logo_domain: "",
  logo_url: "",
  hue: "250",
  chroma: "0.17",
  product_ids: [],
  sort_order: "0",
  is_active: true,
};

function toDraft(b: BrandCard): Draft {
  return {
    id: b.id,
    name: b.name,
    mark: b.mark,
    match_key: b.match_key,
    logo_domain: b.logo_domain ?? "",
    logo_url: b.logo_url ?? "",
    hue: String(b.hue),
    chroma: String(b.chroma),
    product_ids: b.product_ids ?? [],
    sort_order: String(b.sort_order),
    is_active: b.is_active,
  };
}

export function AdminBrands() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: brands } = useQuery({
    queryKey: ["admin-brand-cards"],
    queryFn: async () =>
      ((await supabase.from("brand_cards").select("*").order("sort_order")).data ??
        []) as unknown as BrandCard[],
  });

  const { data: products } = useQuery({
    queryKey: ["admin-brand-products"],
    queryFn: async () =>
      ((
        await supabase
          .from("products")
          .select("id,name_ar,name_ku,brand,image_url,price")
          .order("brand")
      ).data ?? []) as unknown as Product[],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        name: d.name.trim(),
        mark: d.mark.trim() || d.name.trim().slice(0, 2).toUpperCase(),
        match_key: d.match_key.trim() || d.name.trim().toLowerCase(),
        logo_domain: d.logo_domain.trim() || null,
        logo_url: d.logo_url.trim() || null,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
        product_ids: d.product_ids,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
      };
      const { error } = d.id
        ? await supabase.from("brand_cards").update(row).eq("id", d.id)
        : await supabase.from("brand_cards").insert(row);
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
      const { error } = await supabase.from("brand_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const move = useMutation({
    mutationFn: async ({ card, dir }: { card: BrandCard; dir: -1 | 1 }) => {
      const list = brands ?? [];
      const i = list.findIndex((b) => b.id === card.id);
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      const other = list[j]!;
      const a = await supabase
        .from("brand_cards")
        .update({ sort_order: other.sort_order })
        .eq("id", card.id);
      const b = await supabase
        .from("brand_cards")
        .update({ sort_order: card.sort_order })
        .eq("id", other.id);
      if (a.error || b.error) throw a.error ?? b.error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  function togglePick(id: string) {
    if (!draft) return;
    const has = draft.product_ids.includes(id);
    setDraft({
      ...draft,
      product_ids: has
        ? draft.product_ids.filter((x) => x !== id)
        : [...draft.product_ids, id],
    });
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("brands")}
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
              label={t("name")}
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
              placeholder="GC"
            />
            <TextField
              label={t("brandMark")}
              value={draft.mark}
              onChange={(v) => setDraft({ ...draft, mark: v })}
              placeholder="GC"
            />
            <TextField
              label={t("logoDomain")}
              value={draft.logo_domain}
              onChange={(v) => setDraft({ ...draft, logo_domain: v })}
              placeholder="gc.dental"
            />
            <TextField
              label={t("matchKey")}
              value={draft.match_key}
              onChange={(v) => setDraft({ ...draft, match_key: v })}
              placeholder="gc"
            />
            <div className="col-span-2">
              <ColorField
                label={t("cardColor")}
                hue={draft.hue}
                chroma={draft.chroma}
                onChange={(hue, chroma) => setDraft({ ...draft, hue, chroma })}
              />
            </div>
            <TextField
              label={t("sortOrder")}
              type="number"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("brandColor")}</Label>
              <div
                className="h-9 rounded-lg border border-border"
                style={{
                  backgroundImage: `linear-gradient(115deg, oklch(0.34 ${Number(draft.chroma) * 0.9} ${draft.hue}), oklch(0.53 ${draft.chroma} ${draft.hue}))`,
                }}
              />
            </div>
          </div>

          <TextField
            label={t("logoUrlCustom")}
            value={draft.logo_url}
            onChange={(v) => setDraft({ ...draft, logo_url: v })}
            placeholder="https://.../logo.png"
          />

          {(draft.logo_url || draft.logo_domain) && (
            <div className="grid place-items-center rounded-lg border border-border bg-secondary p-3">
              <img
                src={
                  brandLogo(
                    { logo_url: draft.logo_url || null, logo_domain: draft.logo_domain || null },
                    240,
                  ) ?? ""
                }
                alt=""
                className="h-12 w-auto object-contain"
              />
            </div>
          )}

          <ToggleField
            label={t("active")}
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              {t("pickItems")} — {draft.product_ids.length} {t("selected")}
              {draft.product_ids.length === 0 ? ` (${t("autoItems")})` : ""}
            </Label>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {(products ?? []).map((p) => {
                const on = draft.product_ids.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePick(p.id)}
                    className={`flex w-full items-center gap-2 rounded-md p-1.5 text-start ${
                      on ? "bg-primary/10" : ""
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded border ${
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {on && <Check className="size-3.5" />}
                    </span>
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt=""
                        loading="lazy"
                        className="size-8 shrink-0 rounded object-cover"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 block text-[12px] font-bold">
                        {pickName(p, lang)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">{p.brand}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={save.isPending || !draft.name.trim()}
            onClick={() => save.mutate(draft)}
          >
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-2">
        {(brands ?? []).map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card"
          >
            <div
              className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg"
              style={{ background: `oklch(0.53 ${b.chroma} ${b.hue})` }}
            >
              {brandLogo(b, 160) ? (
                <img
                  src={brandLogo(b, 160)!}
                  alt=""
                  loading="lazy"
                  className="h-8 w-auto object-contain opacity-90 mix-blend-multiply"
                />
              ) : (
                <span className="text-[11px] font-black text-white">{b.mark}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold">{b.name}</p>
              <p className="text-xs text-muted-foreground">
                {b.product_ids?.length
                  ? `${b.product_ids.length} ${t("selected")}`
                  : `${t("autoItems")}: ${b.match_key}`}{" "}
                · {b.is_active ? t("active") : t("cancel")}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => move.mutate({ card: b, dir: -1 })}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => move.mutate({ card: b, dir: 1 })}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setDraft(toDraft(b))}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-destructive"
              onClick={() => remove.mutate(b.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
