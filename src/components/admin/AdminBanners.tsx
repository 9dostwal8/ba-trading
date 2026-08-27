import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { BannerForm, draftFromBanner, emptyBannerDraft, type BannerDraft } from "@/components/banners/BannerForm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { fromLocalInput, type BannerRow, type BannerSlotRow } from "@/lib/banners";

/** Payload shared by insert/update. */
const payload = (d: BannerDraft) => ({
  slot_key: d.slot_key,
  vendor_id: d.vendor_id,
  title_ar: d.title_ar,
  title_ku: d.title_ku || d.title_ar,
  subtitle_ar: d.subtitle_ar || null,
  subtitle_ku: d.subtitle_ku || null,
  cta_ar: d.cta_ar || null,
  cta_ku: d.cta_ku || null,
  image_url: d.image_url || null,
  link: d.link || null,
  bg_color: d.bg_color,
  text_color: d.text_color,
  starts_at: fromLocalInput(d.starts_at),
  ends_at: fromLocalInput(d.ends_at),
  sort_order: Number(d.sort_order) || 0,
  is_active: d.is_active,
});

export function AdminBanners() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<BannerDraft | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const { data: slots } = useQuery({
    queryKey: ["banner-slots"],
    queryFn: async () =>
      ((await supabase.from("banner_slots").select("*").order("sort_order")).data ??
        []) as unknown as BannerSlotRow[],
  });

  const { data: banners } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () =>
      ((await supabase.from("banners").select("*").order("sort_order")).data ?? []) as unknown as BannerRow[],
  });

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendor-names"],
    queryFn: async () =>
      ((await supabase.from("vendors").select("id, name").order("name")).data ?? []) as {
        id: string;
        name: string;
      }[],
  });

  const save = useMutation({
    mutationFn: async (d: BannerDraft) => {
      const { error } = d.id
        ? await supabase.from("banners").update(payload(d) as never).eq("id", d.id)
        : await supabase.from("banners").insert(payload(d) as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSlot = useMutation({
    mutationFn: async (s: BannerSlotRow) => {
      const { error } = await supabase
        .from("banner_slots")
        .update({
          price: Number(s.price) || 0,
          max_banners: Number(s.max_banners) || 1,
          is_active: s.is_active,
        } as never)
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["banner-slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = slots ?? [];
  const vendorName = (id: string | null) =>
    id ? (vendors ?? []).find((v) => v.id === id)?.name ?? "—" : t("bannerStore");

  return (
    <div className="space-y-3">
      <SectionHeader
        title={t("banners")}
        action={
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setShowPricing((v) => !v)}>
              {t("bannerPricing")}
            </Button>
            <Button size="sm" onClick={() => setDraft(draft ? null : emptyBannerDraft(list[0]?.slot_key ?? "home_hero"))}>
              {draft ? <X className="size-4" /> : <Plus className="size-4" />}
            </Button>
          </div>
        }
      />

      {showPricing && (
        <AdminCard>
          <SectionHeader title={t("bannerPricing")} />
          <p className="text-[11px] text-muted-foreground">{t("bannerPricingHint")}</p>
          <div className="space-y-2">
            {list.map((s) => (
              <SlotPricingRow key={s.id} slot={s} onSave={(next) => saveSlot.mutate(next)} />
            ))}
          </div>
        </AdminCard>
      )}

      {draft && (
        <AdminCard>
          <div className="mb-2 grid gap-1.5">
            <p className="text-[11px] text-muted-foreground">{t("bannerOwner")}</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, vendor_id: null })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  draft.vendor_id === null ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                {t("bannerStore")}
              </button>
              {(vendors ?? []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, vendor_id: v.id })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    draft.vendor_id === v.id ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
          <BannerForm
            draft={draft}
            onChange={setDraft}
            slots={list}
            saving={save.isPending}
            priceNotice={!!draft.vendor_id}
            onSave={() => save.mutate(draft)}
          />
        </AdminCard>
      )}

      {/* banners grouped by placement */}
      <div className="space-y-3">
        {list.map((s) => {
          const rows = (banners ?? []).filter((b) => b.slot_key === s.slot_key);
          return (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <p className="truncate text-[12px] font-extrabold">
                  {lang === "ku" ? s.name_ku : s.name_ar}
                </p>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-extrabold">
                  {formatPrice(Number(s.price), lang)} · {rows.length}/{s.max_banners}
                </span>
              </div>
              {!rows.length && (
                <p className="rounded-xl border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
                  {t("bannerSlotEmpty")}
                </p>
              )}
              {rows.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card"
                >
                  {b.image_url ? (
                    <img src={b.image_url} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-lg text-primary-foreground"
                      style={{ background: b.bg_color ?? "var(--primary)" }}
                    >
                      <ImageIcon className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[12px] font-extrabold">
                      {lang === "ku" ? b.title_ku : b.title_ar}
                    </p>
                    <p className="truncate text-[10.5px] text-muted-foreground">
                      {vendorName(b.vendor_id)} · {b.link ?? "—"} · {b.is_active ? t("active") : t("cancel")}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => setDraft(draftFromBanner(b))}>
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
          );
        })}
      </div>
    </div>
  );
}

function SlotPricingRow({ slot, onSave }: { slot: BannerSlotRow; onSave: (s: BannerSlotRow) => void }) {
  const { t, lang } = useI18n();
  const [row, setRow] = useState(slot);

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-2">
      <p className="text-[12px] font-extrabold">{lang === "ku" ? slot.name_ku : slot.name_ar}</p>
      <p className="mb-1.5 text-[10.5px] text-muted-foreground">
        {(lang === "ku" ? slot.desc_ku : slot.desc_ar) ?? ""}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label={t("bannerSlotPrice")}
          type="number"
          value={String(row.price)}
          onChange={(v) => setRow({ ...row, price: Number(v) || 0 })}
        />
        <TextField
          label={t("bannerMax")}
          type="number"
          value={String(row.max_banners)}
          onChange={(v) => setRow({ ...row, max_banners: Number(v) || 1 })}
        />
      </div>
      <ToggleField
        label={t("active")}
        checked={row.is_active}
        onChange={(v) => setRow({ ...row, is_active: v })}
      />
      <Button size="sm" className="w-full" onClick={() => onSave(row)}>
        {t("save")}
      </Button>
    </div>
  );
}
