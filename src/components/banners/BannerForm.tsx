import { Check, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextField, ToggleField } from "@/components/admin/AdminKit";
import { uploadBannerImage } from "@/lib/upload";
import { formatPrice, useI18n } from "@/lib/i18n";
import {
  BANNER_THEMES,
  DEFAULT_BANNER_BG,
  DEFAULT_BANNER_FG,
  toLocalInput,
  type BannerRow,
  type BannerSlotRow,
} from "@/lib/banners";

export type BannerDraft = {
  id?: string;
  slot_key: string;
  vendor_id: string | null;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  cta_ar: string;
  cta_ku: string;
  image_url: string;
  link: string;
  bg_color: string;
  text_color: string;
  starts_at: string;
  ends_at: string;
  sort_order: string;
  is_active: boolean;
};

export const emptyBannerDraft = (slot: string, vendorId: string | null = null): BannerDraft => ({
  slot_key: slot,
  vendor_id: vendorId,
  title_ar: "",
  title_ku: "",
  subtitle_ar: "",
  subtitle_ku: "",
  cta_ar: "",
  cta_ku: "",
  image_url: "",
  link: "",
  bg_color: DEFAULT_BANNER_BG,
  text_color: DEFAULT_BANNER_FG,
  starts_at: "",
  ends_at: "",
  sort_order: "0",
  is_active: true,
});

export const draftFromBanner = (b: BannerRow): BannerDraft => ({
  id: b.id,
  slot_key: b.slot_key,
  vendor_id: b.vendor_id,
  title_ar: b.title_ar ?? "",
  title_ku: b.title_ku ?? "",
  subtitle_ar: b.subtitle_ar ?? "",
  subtitle_ku: b.subtitle_ku ?? "",
  cta_ar: b.cta_ar ?? "",
  cta_ku: b.cta_ku ?? "",
  image_url: b.image_url ?? "",
  link: b.link ?? "",
  bg_color: b.bg_color ?? DEFAULT_BANNER_BG,
  text_color: b.text_color ?? DEFAULT_BANNER_FG,
  starts_at: toLocalInput(b.starts_at),
  ends_at: toLocalInput(b.ends_at),
  sort_order: String(b.sort_order ?? 0),
  is_active: b.is_active,
});

/**
 * One rich banner editor shared by the admin panel and the vendor portal:
 * placement picker (with price), bilingual copy, visual theme, schedule.
 */
export function BannerForm({
  draft,
  onChange,
  slots,
  onSave,
  saving,
  priceNotice,
}: {
  draft: BannerDraft;
  onChange: (d: BannerDraft) => void;
  slots: BannerSlotRow[];
  onSave: () => void;
  saving?: boolean;
  /** Show "you will be billed X" for vendor-owned banners. */
  priceNotice?: boolean;
}) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof BannerDraft>(k: K, v: BannerDraft[K]) => onChange({ ...draft, [k]: v });
  const slot = slots.find((s) => s.slot_key === draft.slot_key);
  const price = Number(slot?.price ?? 0);

  return (
    <div className="space-y-3">
      {/* placement picker */}
      <Field label={t("bannerPlacement")}>
        <div className="grid gap-1.5">
          {slots.map((s) => {
            const active = s.slot_key === draft.slot_key;
            return (
              <button
                key={s.slot_key}
                type="button"
                onClick={() => set("slot_key", s.slot_key)}
                className={`flex items-center gap-2 rounded-xl border p-2 text-start transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {active && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-extrabold">
                    {lang === "ku" ? s.name_ku : s.name_ar}
                  </span>
                  <span className="block truncate text-[10.5px] text-muted-foreground">
                    {(lang === "ku" ? s.desc_ku : s.desc_ar) ?? ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-extrabold">
                  {formatPrice(Number(s.price), lang)}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* live preview */}
      <Field label={t("preview")}>
        <div
          className="relative flex h-24 items-center gap-3 overflow-hidden rounded-2xl p-3 shadow-card"
          style={{ background: draft.bg_color, color: draft.text_color }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold">
              {(lang === "ku" ? draft.title_ku : draft.title_ar) || t("banners")}
            </p>
            <p className="truncate text-[11px] opacity-85">
              {lang === "ku" ? draft.subtitle_ku : draft.subtitle_ar}
            </p>
            {(draft.cta_ar || draft.cta_ku) && (
              <span className="mt-1.5 inline-block rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-slate-900">
                {lang === "ku" ? draft.cta_ku || draft.cta_ar : draft.cta_ar || draft.cta_ku}
              </span>
            )}
          </div>
          {draft.image_url && (
            <img src={draft.image_url} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
          )}
        </div>
      </Field>

      {/* theme swatches */}
      <Field label={t("bannerTheme")}>
        <div className="grid grid-cols-8 gap-1.5">
          {BANNER_THEMES.map((th) => (
            <button
              key={th.key}
              type="button"
              title={lang === "ku" ? th.ku : th.ar}
              onClick={() => onChange({ ...draft, bg_color: th.bg, text_color: th.fg })}
              className={`h-8 rounded-lg border-2 ${
                draft.bg_color === th.bg ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: th.bg }}
            />
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <TextField label={t("titleAr")} value={draft.title_ar} onChange={(v) => set("title_ar", v)} />
        <TextField label={t("titleKu")} value={draft.title_ku} onChange={(v) => set("title_ku", v)} />
        <TextField label={t("bannerSubAr")} value={draft.subtitle_ar} onChange={(v) => set("subtitle_ar", v)} />
        <TextField label={t("bannerSubKu")} value={draft.subtitle_ku} onChange={(v) => set("subtitle_ku", v)} />
        <TextField label={t("bannerCtaAr")} value={draft.cta_ar} onChange={(v) => set("cta_ar", v)} />
        <TextField label={t("bannerCtaKu")} value={draft.cta_ku} onChange={(v) => set("cta_ku", v)} />
        <TextField label={t("link")} value={draft.link} onChange={(v) => set("link", v)} placeholder="/offers" />
        <TextField
          label={t("sortOrder")}
          type="number"
          value={draft.sort_order}
          onChange={(v) => set("sort_order", v)}
        />
        <TextField
          label={t("bannerStarts")}
          type="datetime-local"
          value={draft.starts_at}
          onChange={(v) => set("starts_at", v)}
        />
        <TextField
          label={t("bannerEnds")}
          type="datetime-local"
          value={draft.ends_at}
          onChange={(v) => set("ends_at", v)}
        />
      </div>
      <Field label={t("bannerImage")}>
        <div className="space-y-1.5">
          {draft.image_url && (
            <div className="relative overflow-hidden rounded-xl border border-border">
              <img src={draft.image_url} alt="" className="block max-h-40 w-full object-contain" />
              <button
                type="button"
                onClick={() => set("image_url", "")}
                className="absolute end-1.5 top-1.5 rounded-full bg-foreground/60 p-1 text-background"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-[12px] font-extrabold">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? t("uploading") : t("uploadImage")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                try {
                  set("image_url", await uploadBannerImage(file));
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <TextField label={t("imageUrl")} value={draft.image_url} onChange={(v) => set("image_url", v)} />
        </div>
      </Field>
      <ToggleField label={t("active")} checked={draft.is_active} onChange={(v) => set("is_active", v)} />

      {priceNotice && price > 0 && !draft.id && (
        <p className="rounded-xl bg-secondary p-2 text-[11px] font-bold">
          {t("bannerChargeNotice").replace("{p}", formatPrice(price, lang))}
        </p>
      )}

      <Button className="w-full" disabled={saving} onClick={onSave}>
        {t("save")}
      </Button>
    </div>
  );
}
