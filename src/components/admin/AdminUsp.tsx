import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, ColorField, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { tintStyle } from "@/lib/category-icons";
import { useI18n } from "@/lib/i18n";
import { USP_ICON_KEYS, uspIcon } from "@/lib/usp-icons";

type Draft = {
  id?: string;
  icon: string;
  title_ar: string;
  title_ku: string;
  hue: string;
  chroma: string;
  sort_order: string;
  is_active: boolean;
};

const empty: Draft = {
  icon: "badge-check",
  title_ar: "",
  title_ku: "",
  hue: "250",
  chroma: "0.16",
  sort_order: "0",
  is_active: true,
};

export function AdminUsp() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: items } = useQuery({
    queryKey: ["admin-usp-items"],
    queryFn: async () =>
      (await supabase.from("usp_items").select("*").order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        icon: d.icon,
        title_ar: d.title_ar,
        title_ku: d.title_ku || d.title_ar,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
      };
      const { error } = d.id
        ? await supabase.from("usp_items").update(row).eq("id", d.id)
        : await supabase.from("usp_items").insert(row);
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
      const { error } = await supabase.from("usp_items").delete().eq("id", id);
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
      <SectionHeader
        title={t("uspStrip")}
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
            <TextField
              label={t("nameAr")}
              value={draft.title_ar}
              onChange={(v) => setDraft({ ...draft, title_ar: v })}
            />
            <TextField
              label={t("nameKu")}
              value={draft.title_ku}
              onChange={(v) => setDraft({ ...draft, title_ku: v })}
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
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{t("icon")}</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {USP_ICON_KEYS.map((key) => {
                const Icon = uspIcon(key);
                const active = draft.icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: key })}
                    style={{
                      ...tintStyle(draft.hue, draft.chroma),
                      ...(active
                        ? { background: "var(--tint-soft)", borderColor: "var(--tint-strong)" }
                        : {}),
                    }}
                    className="grid aspect-square place-items-center rounded-lg border border-border"
                  >
                    <Icon className="size-4" style={{ color: "var(--tint-strong)" }} />
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleField
            label={t("active")}
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-2">
        {(items ?? []).map((item) => {
          const Icon = uspIcon(item.icon as string);
          return (
            <div
              key={item.id}
              style={tintStyle(item.hue as number, item.chroma as number)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full border"
                style={{
                  background: "var(--tint-soft)",
                  borderColor: "var(--tint-border)",
                  color: "var(--tint-strong)",
                }}
              >
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold">
                  {lang === "ar" ? item.title_ar : item.title_ku}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  #{item.sort_order} · {item.is_active ? t("active") : t("hidden")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() =>
                  setDraft({
                    id: item.id,
                    icon: (item.icon as string) ?? "badge-check",
                    title_ar: item.title_ar,
                    title_ku: item.title_ku,
                    hue: String(item.hue ?? 250),
                    chroma: String(item.chroma ?? 0.16),
                    sort_order: String(item.sort_order ?? 0),
                    is_active: item.is_active,
                  })
                }
              >
                {t("edit")}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive"
                onClick={() => remove.mutate(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
