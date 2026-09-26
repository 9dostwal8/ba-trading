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

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr className="border-b border-slate-200/80 dark:border-slate-800">
              <th className="px-4 py-3 font-semibold w-16">{t("icon")}</th>
              <th className="px-4 py-3 font-semibold text-start">{t("categories")}</th>
              <th className="px-4 py-3 font-semibold text-start">{t("slug")}</th>
              <th className="px-4 py-3 font-semibold text-center w-24">{t("sortOrder")}</th>
              <th className="px-4 py-3 font-semibold text-center w-24">{t("active")}</th>
              <th className="px-4 py-3 font-semibold text-end w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {(categories ?? []).map((c) => {
              const Icon = categoryIcon(c.icon as string);
              return (
                <tr key={c.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div
                      style={tintStyle(c.hue as number, c.chroma as number)}
                      className="grid size-10 place-items-center rounded-xl"
                    >
                      <span
                        className="grid size-full place-items-center rounded-xl"
                        style={{ background: "var(--tint-soft)", color: "var(--tint-strong)" }}
                      >
                        <Icon className="size-5" strokeWidth={2.2} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === "ar" ? c.name_ar : c.name_ku}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {lang === "ar" ? c.name_ku : c.name_ar}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {c.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      #{c.sort_order}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {c.is_active ? t("active") : t("hidden")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 rounded-lg text-xs font-bold"
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
                        className="size-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white"
                        onClick={() => remove.mutate(c.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
