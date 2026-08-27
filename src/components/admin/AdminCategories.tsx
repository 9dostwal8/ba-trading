import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ColorField, AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_ICON_KEYS, categoryIcon, tintStyle } from "@/lib/category-icons";
import { useI18n } from "@/lib/i18n";

type Draft = {
  id?: string;
  slug: string;
  name_ar: string;
  name_ku: string;
  icon: string;
  hue: string;
  chroma: string;
  sort_order: string;
  is_active: boolean;
};

const empty: Draft = {
  slug: "",
  name_ar: "",
  name_ku: "",
  icon: "smile",
  hue: "250",
  chroma: "0.16",
  sort_order: "0",
  is_active: true,
};

export function AdminCategories() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        slug: d.slug || d.name_ar.trim().toLowerCase().replace(/\s+/g, "-"),
        name_ar: d.name_ar,
        name_ku: d.name_ku || d.name_ar,
        icon: d.icon,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
      };
      const { error } = d.id
        ? await supabase.from("categories").update(row).eq("id", d.id)
        : await supabase.from("categories").insert(row);
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
      const { error } = await supabase.from("categories").delete().eq("id", id);
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
        title={t("categories")}
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
              value={draft.name_ar}
              onChange={(v) => setDraft({ ...draft, name_ar: v })}
            />
            <TextField
              label={t("nameKu")}
              value={draft.name_ku}
              onChange={(v) => setDraft({ ...draft, name_ku: v })}
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
            <TextField
              label={t("slug")}
              value={draft.slug}
              onChange={(v) => setDraft({ ...draft, slug: v })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{t("icon")}</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {CATEGORY_ICON_KEYS.map((key) => {
                const Icon = categoryIcon(key);
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
        {(categories ?? []).map((c) => {
          const Icon = categoryIcon(c.icon as string);
          return (
            <div
              key={c.id}
              style={tintStyle(c.hue as number, c.chroma as number)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg"
                style={{ background: "var(--tint-soft)", color: "var(--tint-strong)" }}
              >
                <Icon className="size-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold">
                  {lang === "ar" ? c.name_ar : c.name_ku}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  #{c.sort_order} · {c.is_active ? t("active") : t("hidden")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() =>
                  setDraft({
                    id: c.id,
                    slug: c.slug,
                    name_ar: c.name_ar,
                    name_ku: c.name_ku,
                    icon: (c.icon as string) ?? "smile",
                    hue: String(c.hue ?? 250),
                    chroma: String(c.chroma ?? 0.16),
                    sort_order: String(c.sort_order ?? 0),
                    is_active: c.is_active,
                  })
                }
              >
                {t("edit")}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive"
                onClick={() => remove.mutate(c.id)}
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
