import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Hourglass, Palette, RotateCcw, Save, Tag, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";
import { THEME_PRESETS, applyTheme, matchPreset, themeVars, type ThemeInput } from "@/lib/theme";

const L = {
  title: { ar: "ثيم الألوان", ku: "ڕەنگی ڕووکار", en: "Colour Theme" },
  hint: {
    ar: "لون واحد يتحكم بكل التطبيق: العروض السريعة، قرب الانتهاء، الأوتلت، الأزرار والتدرجات. التغيير يظهر فوراً.",
    ku: "یەک ڕەنگ هەموو ئەپ کۆنترۆڵ دەکات: ئۆفەری خێرا، نزیک بەسەرچوون، ئاوتلێت، دوگمە و گرادیێنت. گۆڕان یەکسەر دەردەکەوێت.",
    en: "One colour drives the whole app: flash offers, near-expiry, outlet, buttons and gradients. Changes apply instantly.",
  },
  presets: { ar: "باقات جاهزة", ku: "پاکێجی ئامادە", en: "Ready palettes" },
  brand: { ar: "لون العلامة", ku: "ڕەنگی براند", en: "Brand colour" },
  accent: { ar: "اللون الثاني", ku: "ڕەنگی دووەم", en: "Accent colour" },
  hue: { ar: "الدرجة", ku: "پلە", en: "Hue" },
  chroma: { ar: "القوة", ku: "توندی", en: "Strength" },
  radius: { ar: "استدارة الحواف", ku: "خواربوونی لێوار", en: "Corner radius" },
  live: { ar: "معاينة مباشرة", ku: "پێشبینینی ڕاستەوخۆ", en: "Live preview" },
  flash: { ar: "عروض سريعة", ku: "ئۆفەری خێرا", en: "Flash offers" },
  expiry: { ar: "قرب الانتهاء", ku: "نزیک بەسەرچوون", en: "Near expiry" },
  outlet: { ar: "أوتلت", ku: "ئاوتلێت", en: "Outlet" },
  sample: { ar: "زر الشراء", ku: "دوگمەی کڕین", en: "Buy button" },
  save: { ar: "حفظ للجميع", ku: "پاشەکەوت بۆ هەموان", en: "Save for everyone" },
  reset: { ar: "رجوع", ku: "گەڕانەوە", en: "Revert" },
  saved: { ar: "تم تطبيق الثيم على كل النظام", ku: "ڕووکار بۆ هەموو سیستەم جێبەجێ کرا", en: "Theme applied across the system" },
};

const HUES = [17, 45, 75, 110, 140, 162, 195, 220, 250, 272, 295, 320, 350];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-[11.5px] font-bold text-muted-foreground">
        {label}
        <span className="tabular-nums text-foreground">
          {value}
          {suffix ?? ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </label>
  );
}

export function AdminTheme() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const s = data?.settings;

  const [form, setForm] = useState<ThemeInput | null>(null);
  useEffect(() => {
    if (s && !form)
      setForm({
        primary_hue: s.primary_hue,
        primary_chroma: s.primary_chroma,
        accent_hue: s.accent_hue,
        accent_chroma: s.accent_chroma,
        radius_px: s.radius_px,
      });
  }, [s, form]);

  // Live preview: paint the draft theme on <html> so admin sees the whole app change.
  useEffect(() => {
    if (form && typeof document !== "undefined") applyTheme(document.documentElement, form);
  }, [form]);

  const save = useMutation({
    mutationFn: async (v: ThemeInput) => {
      if (!s) return;
      const { error } = await supabase.from("store_settings").update(v).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.saved[lang]);
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vars = useMemo(() => (form ? themeVars(form) : {}), [form]);
  if (!s || !form) return null;
  const preset = matchPreset(form);
  const set = (patch: Partial<ThemeInput>) => setForm({ ...form, ...patch });

  return (
    <div className="space-y-3">
      <SectionHeader title={L.title[lang]} />
      <AdminCard>
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-muted-foreground">
          {L.hint[lang]}
        </p>

        {/* Ready palettes */}
        <p className="pt-1 text-[11.5px] font-extrabold">{L.presets[lang]}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEME_PRESETS.map((p) => {
            const pv = themeVars(p.theme);
            const active = preset?.key === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => set(p.theme)}
                className={`space-y-1.5 rounded-xl border-2 p-2 text-start transition-transform active:scale-95 ${
                  active ? "border-foreground bg-secondary/60" : "border-border"
                }`}
              >
                <span className="flex gap-1">
                  {(["--primary", "--deal", "--expiry", "--outlet"] as const).map((k) => (
                    <span
                      key={k}
                      className="h-6 flex-1 rounded-md"
                      style={{ background: pv[k] }}
                    />
                  ))}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-extrabold">
                  {active && <Check className="size-3" strokeWidth={3} />}
                  {p[lang]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Brand hue row */}
        <p className="pt-2 text-[11.5px] font-extrabold">{L.brand[lang]}</p>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-13">
          {HUES.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`hue ${h}`}
              onClick={() => set({ primary_hue: h })}
              className={`aspect-square rounded-lg border-2 transition-transform active:scale-90 ${
                Math.abs(form.primary_hue - h) < 6 ? "border-foreground scale-105" : "border-transparent"
              }`}
              style={{ background: `oklch(0.6 ${form.primary_chroma} ${h})` }}
            />
          ))}
        </div>
        <Slider
          label={`${L.brand[lang]} · ${L.hue[lang]}`}
          value={Math.round(form.primary_hue)}
          min={0}
          max={359}
          step={1}
          onChange={(v) => set({ primary_hue: v })}
        />
        <Slider
          label={`${L.brand[lang]} · ${L.chroma[lang]}`}
          value={Number(form.primary_chroma.toFixed(2))}
          min={0.03}
          max={0.26}
          step={0.01}
          onChange={(v) => set({ primary_chroma: v })}
        />

        <p className="pt-2 text-[11.5px] font-extrabold">{L.accent[lang]}</p>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-13">
          {HUES.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`accent ${h}`}
              onClick={() => set({ accent_hue: h })}
              className={`aspect-square rounded-lg border-2 transition-transform active:scale-90 ${
                Math.abs(form.accent_hue - h) < 6 ? "border-foreground scale-105" : "border-transparent"
              }`}
              style={{ background: `oklch(0.82 ${form.accent_chroma} ${h})` }}
            />
          ))}
        </div>
        <Slider
          label={`${L.accent[lang]} · ${L.chroma[lang]}`}
          value={Number(form.accent_chroma.toFixed(2))}
          min={0.03}
          max={0.24}
          step={0.01}
          onChange={(v) => set({ accent_chroma: v })}
        />
        <Slider
          label={L.radius[lang]}
          value={Math.round(form.radius_px)}
          min={0}
          max={28}
          step={1}
          suffix="px"
          onChange={(v) => set({ radius_px: v })}
        />

        {/* Live preview of the three section families */}
        <p className="flex items-center gap-1.5 pt-2 text-[11.5px] font-extrabold">
          <Palette className="size-3.5 text-primary" strokeWidth={2.8} />
          {L.live[lang]}
        </p>
        <div className="space-y-2 rounded-2xl border border-border bg-background p-2.5">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-primary-foreground" style={{ backgroundImage: vars["--gradient-hero"] }}>
            <Zap className="size-4" strokeWidth={3} />
            <span className="text-[12px] font-black">{L.flash[lang]}</span>
            <span className="ms-auto rounded-md px-2 py-0.5 text-[11px] font-black" style={{ background: vars["--deal"], color: vars["--deal-foreground"] }}>
              -30%
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: vars["--expiry"], color: vars["--clearance-foreground"] }}>
            <Hourglass className="size-4" strokeWidth={3} />
            <span className="text-[12px] font-black">{L.expiry[lang]}</span>
            <span className="ms-auto rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-black">3 mo</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-white" style={{ backgroundImage: `linear-gradient(115deg, ${vars["--outlet-deep"]}, ${vars["--outlet"]})` }}>
            <Tag className="size-4" strokeWidth={3} />
            <span className="text-[12px] font-black">{L.outlet[lang]}</span>
            <span className="ms-auto rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-black">-45%</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="flex-1 rounded-xl px-3 py-2.5 text-center text-[12px] font-black text-primary-foreground"
              style={{ background: vars["--primary"], borderRadius: vars["--radius"] }}
            >
              {L.sample[lang]}
            </span>
            <span className="rounded-xl px-3 py-2.5 text-[12px] font-black" style={{ background: vars["--success"], color: vars["--success-foreground"] }}>
              ✓
            </span>
            <span className="rounded-xl px-3 py-2.5 text-[12px] font-black" style={{ background: vars["--info"], color: vars["--info-foreground"] }}>
              i
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={() => save.mutate(form)} disabled={save.isPending}>
            <Save className="me-1.5 size-4" />
            {L.save[lang]}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setForm({
                primary_hue: s.primary_hue,
                primary_chroma: s.primary_chroma,
                accent_hue: s.accent_hue,
                accent_chroma: s.accent_chroma,
                radius_px: s.radius_px,
              })
            }
          >
            <RotateCcw className="size-4" />
            {L.reset[lang]}
          </Button>
        </div>
      </AdminCard>
    </div>
  );
}
