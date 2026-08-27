import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, Field, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const empty = {
  code: "",
  discount_type: "percent",
  discount_value: "10",
  min_order: "0",
  max_uses: "",
  ends_at: "",
  is_active: true,
};

export function AdminCoupons() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<typeof empty | null>(null);

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () =>
      (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ??
      [],
  });

  const save = useMutation({
    mutationFn: async (d: typeof empty) => {
      const { error } = await supabase.from("coupons").insert({
        code: d.code.trim().toUpperCase(),
        discount_type: d.discount_type,
        discount_value: Number(d.discount_value) || 0,
        min_order: Number(d.min_order) || 0,
        max_uses: d.max_uses ? Number(d.max_uses) : null,
        ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
        is_active: d.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("coupons")}
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
            <TextField label={t("code")} value={draft.code} onChange={(v) => setDraft({ ...draft, code: v })} placeholder="DENTAL10" />
            <Field label={t("discountType")}>
              <Select value={draft.discount_type} onValueChange={(v) => setDraft({ ...draft, discount_type: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t("percent")}</SelectItem>
                  <SelectItem value="fixed">{t("fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <TextField label={t("discountValue")} type="number" value={draft.discount_value} onChange={(v) => setDraft({ ...draft, discount_value: v })} />
            <TextField label={t("minOrder")} type="number" value={draft.min_order} onChange={(v) => setDraft({ ...draft, min_order: v })} />
            <TextField label={t("maxUses")} type="number" value={draft.max_uses} onChange={(v) => setDraft({ ...draft, max_uses: v })} />
            <TextField label={t("endsAt")} type="datetime-local" value={draft.ends_at} onChange={(v) => setDraft({ ...draft, ends_at: v })} />
          </div>
          <ToggleField label={t("active")} checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>
        </AdminCard>
      )}

      <div className="space-y-2">
        {(coupons ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-card">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold tracking-wider">{c.code}</p>
              <p className="text-xs text-muted-foreground">
                {c.discount_type === "percent"
                  ? `${c.discount_value}%`
                  : `${c.discount_value} ${t("currency")}`}{" "}
                · {t("minOrder")}: {c.min_order} · {t("used")}: {c.used_count}
                {c.max_uses ? `/${c.max_uses}` : ""}
              </p>
            </div>
            <ToggleField
              label={t("active")}
              checked={c.is_active}
              onChange={(v) => toggle.mutate({ id: c.id, is_active: v })}
            />
            <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => remove.mutate(c.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
