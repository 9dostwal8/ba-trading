import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Eye,
  Grid2x2,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Rows3,
  Save,
  Sparkles,
  Type as TypeIcon,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, ToggleField } from "./AdminKit";
import { AdminTheme } from "./AdminTheme";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";
import {
  DEFAULT_DESIGN,
  TEMPLATE_PRESETS,
  applyDesign,
  applyTemplate,
  designVars,
  type DesignSettings,
} from "@/lib/design";
import { fetchDesign } from "@/lib/design-store";

type Tab = "theme" | "templates" | "cards" | "sections" | "type";

const L = {
  title: { ar: "استوديو التصميم", ku: "ستۆدیۆی دیزاین", en: "Design Studio" },
  hint: {
    ar: "كل شكل المتجر من مكان واحد: القوالب، الألوان، بطاقات المنتج، الأقسام والخطوط. عدّل، شاهد المعاينة، ثم انشر.",
    ku: "هەموو شێوەی فرۆشگا لە یەک شوێن: تێمپلەیت، ڕەنگ، کارتی بەرهەم، بەشەکان و فۆنت. بگۆڕە، پێشبینی بکە، دوایی بڵاوی بکە.",
    en: "The whole store look in one place: templates, colours, product cards, sections and fonts. Edit, preview, then publish.",
  },
  tabs: {
    theme: { ar: "الألوان", ku: "ڕەنگ", en: "Theme" },
    templates: { ar: "القوالب", ku: "تێمپلەیت", en: "Templates" },
    cards: { ar: "البطاقات", ku: "کارتەکان", en: "Cards" },
    sections: { ar: "الأقسام", ku: "بەشەکان", en: "Sections" },
    type: { ar: "الخط والمسافات", ku: "فۆنت و بۆشایی", en: "Type & spacing" },
  },
  preview: { ar: "معاينة مباشرة", ku: "پێشبینینی ڕاستەوخۆ", en: "Live preview" },
  saveDraft: { ar: "حفظ كمسودة", ku: "پاشەکەوت وەک ڕەشنووس", en: "Save draft" },
  publish: { ar: "نشر للجميع", ku: "بڵاوکردن بۆ هەموان", en: "Publish to store" },
  revert: { ar: "رجوع للمنشور", ku: "گەڕانەوە بۆ بڵاوکراو", en: "Revert to published" },
  reset: { ar: "الوضع الافتراضي", ku: "دۆخی بنەڕەت", en: "Reset to default" },
  drafted: { ar: "تم حفظ المسودة", ku: "ڕەشنووس پاشەکەوت کرا", en: "Draft saved" },
  published: { ar: "تم نشر التصميم على كل المتجر", ku: "دیزاین بۆ هەموو فرۆشگا بڵاو کرایەوە", en: "Design published across the store" },
  surface: { ar: "خلفية الصفحة", ku: "پاشبنەمای پەیج", en: "Page surface" },
  header: { ar: "شكل عنوان القسم", ku: "شێوەی سەردێری بەش", en: "Section header style" },
  shape: { ar: "شكل البطاقة", ku: "شێوەی کارت", en: "Card shape" },
  border: { ar: "إطار البطاقة", ku: "چوارچێوەی کارت", en: "Card border" },
  shadow: { ar: "قوة الظل", ku: "توندی سێبەر", en: "Shadow level" },
  ratio: { ar: "نسبة الصورة", ku: "ڕێژەی وێنە", en: "Image ratio" },
  fit: { ar: "ملء الصورة", ku: "پڕکردنی وێنە", en: "Image fill" },
  cols: { ar: "أعمدة الموبايل", ku: "ستوونی مۆبایل", en: "Mobile columns" },
  colsD: { ar: "أعمدة الكمبيوتر", ku: "ستوونی کۆمپیوتەر", en: "Desktop columns" },
  price: { ar: "شكل السعر", ku: "شێوەی نرخ", en: "Price layout" },
  content: { ar: "ما يظهر داخل البطاقة", ku: "چی لە کارتدا دەردەکەوێت", en: "What shows in the card" },
  brand: { ar: "اسم الماركة", ku: "ناوی براند", en: "Brand name" },
  vendor: { ar: "اسم المورد", ku: "ناوی فرۆشیار", en: "Vendor name" },
  rating: { ar: "التقييم", ku: "هەڵسەنگاندن", en: "Rating" },
  sellers: { ar: "عدد الموردين", ku: "ژمارەی فرۆشیار", en: "Sellers count" },
  savings: { ar: "نسبة الخصم", ku: "ڕێژەی داشکان", en: "Discount %" },
  expiry: { ar: "شريحة الانتهاء/الأوتلت", ku: "چیپی بەسەرچوون/ئاوتلێت", en: "Expiry / outlet chip" },
  badges: { ar: "الملصقات", ku: "ستیکەر", en: "Badges" },
  scale: { ar: "حجم الخط", ku: "قەبارەی فۆنت", en: "Font size" },
  weight: { ar: "ثقل العناوين", ku: "قورسی سەردێر", en: "Heading weight" },
  gap: { ar: "المسافة بين الأقسام", ku: "بۆشایی نێوان بەشەکان", en: "Section gap" },
  width: { ar: "عرض الصفحة", ku: "پانی پەیج", en: "Page width" },
  density: { ar: "الكثافة", ku: "چڕی", en: "Density" },
  sectionsHint: {
    ar: "أظهر أو أخفِ أقسام الصفحة الرئيسية ورتّبها. تعديل الألوان والمحتوى لكل قسم من تبويب الرئيسية.",
    ku: "بەشەکانی پەیجی سەرەکی پیشان بدە یان بشارەوە و ڕیزیان بکە. ڕەنگ و ناوەڕۆک لە تابی سەرەکی.",
    en: "Show, hide and reorder home page sections. Per-section colours and content live in the Home tab.",
  },
  sample: { ar: "منتج تجريبي", ku: "بەرهەمی نموونە", en: "Sample product" },
  up: { ar: "أعلى", ku: "سەرەوە", en: "Up" },
  down: { ar: "أسفل", ku: "خوارەوە", en: "Down" },
};

const TAB_META: Array<{ key: Tab; icon: typeof Palette }> = [
  { key: "theme", icon: Palette },
  { key: "templates", icon: LayoutTemplate },
  { key: "cards", icon: Grid2x2 },
  { key: "sections", icon: Rows3 },
  { key: "type", icon: TypeIcon },
];

function Chips<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ v: T; l: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11.5px] font-extrabold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition-transform active:scale-95 ${
              o.v === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-[11.5px] font-extrabold text-muted-foreground">
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

/** Static mock of a storefront card + section header, styled purely by tokens. */
function Preview({ design, lang }: { design: DesignSettings; lang: "ar" | "ku" | "en" }) {
  const vars = designVars(design) as Record<string, string>;
  const head = design.section_header;
  const title = lang === "ar" ? "عروض قرب الانتهاء" : lang === "ku" ? "ئۆفەری نزیک بەسەرچوون" : "Near-expiry offers";
  return (
    <div
      style={{ ...vars, background: "var(--design-surface)" }}
      className="rounded-2xl border border-border p-3"
    >
      <div style={{ marginBottom: "var(--section-gap)" }}>
        {head === "band" ? (
          <div className="rounded-lg bg-primary px-3 py-2 text-[13px] font-black text-primary-foreground">{title}</div>
        ) : head === "pill" ? (
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[12.5px] font-extrabold text-primary">
            {title}
          </span>
        ) : head === "underline" ? (
          <span className="inline-block border-b-2 border-primary pb-1 text-[13px] font-extrabold">{title}</span>
        ) : (
          <span className="text-[13px] font-extrabold">{title}</span>
        )}
      </div>

      <div
        className={design.card.mobile_cols === 3 ? "grid grid-cols-3" : "grid grid-cols-2"}
        style={{ gap: "var(--grid-gap)" }}
      >
        {[0, 1].map((i) => (
          <article
            key={i}
            className="flex min-w-0 flex-col overflow-hidden border-border/60 bg-card"
            style={{
              borderRadius: "var(--card-radius)",
              borderWidth: "var(--card-border-w)",
              borderStyle: "solid",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div style={{ padding: "var(--card-pad)" }}>
              <div
                className="grid w-full place-items-center bg-secondary/50 text-2xl"
                style={{ aspectRatio: "var(--card-img-ratio)" }}
              >
                🦷
              </div>
            </div>
            <div className="flex flex-col gap-1 px-2.5 pb-2.5">
              {design.card.show_expiry && (
                <span className="w-fit rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
                  {lang === "ar" ? "٣ أشهر" : lang === "ku" ? "٣ مانگ" : "3 months"}
                </span>
              )}
              {design.card.show_badges && (
                <span className="w-fit rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-extrabold text-success">
                  {lang === "ar" ? "مميز" : lang === "ku" ? "تایبەت" : "Premium"}
                </span>
              )}
              <p
                className="line-clamp-2 text-[11.5px] leading-[1.55]"
                style={{ fontWeight: "var(--heading-weight)" as unknown as number }}
              >
                {design.card.show_brand ? "GC " : ""}
                {L.sample[lang]}
              </p>
              {design.card.show_vendor && (
                <span className="text-[10px] font-bold text-muted-foreground">Zagros Dental</span>
              )}
              <div
                className={`flex gap-1.5 pt-1 ${
                  design.card.price_layout === "inline"
                    ? "flex-row-reverse items-baseline justify-end"
                    : "items-end justify-between"
                }`}
              >
                {design.card.show_savings ? (
                  <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9.5px] font-black text-primary-foreground">
                    30%
                  </span>
                ) : (
                  <span />
                )}
                <div className={design.card.price_layout === "inline" ? "flex items-baseline gap-1.5" : "text-end"}>
                  <div className="text-[10px] font-bold text-muted-foreground line-through tabular-nums">30,000</div>
                  <div className="text-[13.5px] font-black tabular-nums">21,000</div>
                </div>
              </div>
              <button
                type="button"
                className="mt-1.5 w-full bg-primary py-2 text-[11px] font-extrabold text-primary-foreground"
                style={{ borderRadius: "calc(var(--card-radius) * 0.75)" }}
              >
                {lang === "ar" ? "أضف للسلة" : lang === "ku" ? "زیادکە بۆ سەبەتە" : "Add to cart"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AdminDesign() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("templates");
  const { data: row } = useQuery({ queryKey: ["design"], queryFn: fetchDesign });
  const { data: store } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const [draft, setDraft] = useState<DesignSettings | null>(null);

  useEffect(() => {
    if (row && !draft) setDraft(row.draft ?? DEFAULT_DESIGN);
  }, [row, draft]);

  // Live preview across the admin panel while editing; restore published on exit.
  useEffect(() => {
    if (draft && typeof document !== "undefined") applyDesign(document.documentElement, draft);
  }, [draft]);
  useEffect(
    () => () => {
      if (row && typeof document !== "undefined") applyDesign(document.documentElement, row.published);
    },
    [row],
  );

  const save = useMutation({
    mutationFn: async ({ v, live }: { v: DesignSettings; live: boolean }) => {
      if (!row) throw new Error("design row missing");
      const patch = live ? { draft: v, published: v } : { draft: v };
      const { error } = await supabase.from("design_settings").update(patch).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.live ? L.published[lang] : L.drafted[lang]);
      qc.invalidateQueries({ queryKey: ["design"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sections = useMemo(() => [...(store?.homeSections ?? [])].sort((a, b) => a.sort_order - b.sort_order), [store]);

  const toggleSection = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("home_sections").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const moveSection = useMutation({
    mutationFn: async ({ id, order }: { id: string; order: number }) => {
      const { error } = await supabase.from("home_sections").update({ sort_order: order }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!draft) return null;
  const set = (patch: Partial<DesignSettings>) => setDraft({ ...draft, ...patch });
  const setCard = (patch: Partial<DesignSettings["card"]>) => setDraft({ ...draft, card: { ...draft.card, ...patch } });

  return (
    <div className="space-y-3">
      <SectionHeader title={L.title[lang]} />

      <AdminCard>
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-muted-foreground">
          {L.hint[lang]}
        </p>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TAB_META.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[11.5px] font-extrabold transition-transform active:scale-95 ${
                tab === key ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Icon className="size-3.5" strokeWidth={2.8} />
              {L.tabs[key][lang]}
            </button>
          ))}
        </div>
      </AdminCard>

      {tab !== "theme" && (
        <AdminCard>
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
            <Eye className="size-3.5 text-primary" strokeWidth={2.8} />
            {L.preview[lang]}
          </p>
          <Preview design={draft} lang={lang} />
        </AdminCard>
      )}

      {tab === "theme" && <AdminTheme />}

      {tab === "templates" && (
        <AdminCard>
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATE_PRESETS.map((p) => {
              const active = draft.template === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setDraft(applyTemplate(draft, p.key))}
                  className={`space-y-1 rounded-xl border-2 p-3 text-start transition-transform active:scale-[0.98] ${
                    active ? "border-foreground bg-secondary/50" : "border-border"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] font-black">
                    {active ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : (
                      <Sparkles className="size-3.5 text-primary" strokeWidth={2.8} />
                    )}
                    {p[lang]}
                  </span>
                  <span className="block text-[11px] font-bold leading-relaxed text-muted-foreground">
                    {p.note[lang]}
                  </span>
                </button>
              );
            })}
          </div>

          <Chips
            label={L.surface[lang]}
            value={draft.surface}
            onChange={(v) => set({ surface: v })}
            options={[
              { v: "white" as const, l: lang === "ar" ? "أبيض" : lang === "ku" ? "سپی" : "White" },
              { v: "grey" as const, l: lang === "ar" ? "رمادي" : lang === "ku" ? "خۆڵەمێشی" : "Soft grey" },
              { v: "warm" as const, l: lang === "ar" ? "دافئ" : lang === "ku" ? "گەرم" : "Warm" },
            ]}
          />
          <Chips
            label={L.header[lang]}
            value={draft.section_header}
            onChange={(v) => set({ section_header: v })}
            options={[
              { v: "plain" as const, l: lang === "ar" ? "بسيط" : lang === "ku" ? "سادە" : "Plain" },
              { v: "pill" as const, l: lang === "ar" ? "كبسولة" : lang === "ku" ? "کپسوول" : "Pill" },
              { v: "underline" as const, l: lang === "ar" ? "خط سفلي" : lang === "ku" ? "هێڵی ژێرەوە" : "Underline" },
              { v: "band" as const, l: lang === "ar" ? "شريط ملون" : lang === "ku" ? "باندی ڕەنگین" : "Colour band" },
            ]}
          />
        </AdminCard>
      )}

      {tab === "cards" && (
        <AdminCard>
          <Chips
            label={L.shape[lang]}
            value={draft.card.shape}
            onChange={(v) => setCard({ shape: v })}
            options={[
              { v: "sharp" as const, l: lang === "ar" ? "حاد" : lang === "ku" ? "تیژ" : "Sharp" },
              { v: "rounded" as const, l: lang === "ar" ? "دائري" : lang === "ku" ? "خوار" : "Rounded" },
              { v: "soft" as const, l: lang === "ar" ? "ناعم جداً" : lang === "ku" ? "زۆر نەرم" : "Extra soft" },
            ]}
          />
          <Chips
            label={L.ratio[lang]}
            value={draft.card.ratio}
            onChange={(v) => setCard({ ratio: v })}
            options={[
              { v: "1:1" as const, l: "1:1" },
              { v: "4:5" as const, l: "4:5" },
              { v: "16:9" as const, l: "16:9" },
            ]}
          />
          <Chips
            label={L.fit[lang]}
            value={draft.card.fit}
            onChange={(v) => setCard({ fit: v })}
            options={[
              { v: "contain" as const, l: lang === "ar" ? "كامل الصورة" : lang === "ku" ? "تەواوی وێنە" : "Fit whole" },
              { v: "cover" as const, l: lang === "ar" ? "ملء الإطار" : lang === "ku" ? "پڕکردنی چوارچێوە" : "Fill frame" },
            ]}
          />
          <Chips
            label={L.price[lang]}
            value={draft.card.price_layout}
            onChange={(v) => setCard({ price_layout: v })}
            options={[
              { v: "stacked" as const, l: lang === "ar" ? "طبقات" : lang === "ku" ? "چین چین" : "Stacked" },
              { v: "inline" as const, l: lang === "ar" ? "بسطر واحد" : lang === "ku" ? "یەک ڕیز" : "One line" },
            ]}
          />
          <Chips
            label={L.cols[lang]}
            value={draft.card.mobile_cols}
            onChange={(v) => setCard({ mobile_cols: v })}
            options={[
              { v: 2, l: "2" },
              { v: 3, l: "3" },
            ]}
          />
          <Chips
            label={L.colsD[lang]}
            value={draft.card.desktop_cols}
            onChange={(v) => setCard({ desktop_cols: v })}
            options={[
              { v: 3, l: "3" },
              { v: 4, l: "4" },
              { v: 5, l: "5" },
            ]}
          />
          <Range
            label={L.shadow[lang]}
            value={draft.card.shadow}
            min={0}
            max={3}
            step={1}
            onChange={(v) => setCard({ shadow: v })}
          />
          <ToggleField
            label={L.border[lang]}
            checked={draft.card.border}
            onChange={(v) => setCard({ border: v })}
          />

          <p className="pt-1 text-[11.5px] font-extrabold">{L.content[lang]}</p>
          <ToggleField label={L.brand[lang]} checked={draft.card.show_brand} onChange={(v) => setCard({ show_brand: v })} />
          <ToggleField label={L.vendor[lang]} checked={draft.card.show_vendor} onChange={(v) => setCard({ show_vendor: v })} />
          <ToggleField label={L.rating[lang]} checked={draft.card.show_rating} onChange={(v) => setCard({ show_rating: v })} />
          <ToggleField label={L.sellers[lang]} checked={draft.card.show_sellers} onChange={(v) => setCard({ show_sellers: v })} />
          <ToggleField label={L.savings[lang]} checked={draft.card.show_savings} onChange={(v) => setCard({ show_savings: v })} />
          <ToggleField label={L.expiry[lang]} checked={draft.card.show_expiry} onChange={(v) => setCard({ show_expiry: v })} />
          <ToggleField label={L.badges[lang]} checked={draft.card.show_badges} onChange={(v) => setCard({ show_badges: v })} />
        </AdminCard>
      )}

      {tab === "sections" && (
        <AdminCard>
          <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[11.5px] font-bold leading-relaxed text-muted-foreground">
            {L.sectionsHint[lang]}
          </p>
          <div className="space-y-1.5">
            {sections.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold">
                  {(lang === "ar" ? s.title_ar : s.title_ku) || s.kind}
                  <span className="ms-1.5 text-[10.5px] font-bold text-muted-foreground">{s.kind}</span>
                </span>
                <button
                  type="button"
                  aria-label={L.up[lang]}
                  disabled={i === 0}
                  onClick={() => {
                    const prev = sections[i - 1];
                    if (!prev) return;
                    moveSection.mutate({ id: s.id, order: prev.sort_order });
                    moveSection.mutate({ id: prev.id, order: s.sort_order });
                  }}
                  className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-black disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={L.down[lang]}
                  disabled={i === sections.length - 1}
                  onClick={() => {
                    const next = sections[i + 1];
                    if (!next) return;
                    moveSection.mutate({ id: s.id, order: next.sort_order });
                    moveSection.mutate({ id: next.id, order: s.sort_order });
                  }}
                  className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-black disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection.mutate({ id: s.id, is_active: !s.is_active })}
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${
                    s.is_active ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s.is_active
                    ? lang === "ar"
                      ? "ظاهر"
                      : lang === "ku"
                        ? "دەرکەوتوو"
                        : "Visible"
                    : lang === "ar"
                      ? "مخفي"
                      : lang === "ku"
                        ? "شاراوە"
                        : "Hidden"}
                </button>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {tab === "type" && (
        <AdminCard>
          <Range
            label={L.scale[lang]}
            value={Number(draft.type.font_scale.toFixed(2))}
            min={0.9}
            max={1.15}
            step={0.01}
            onChange={(v) => set({ type: { ...draft.type, font_scale: v } })}
          />
          <Range
            label={L.weight[lang]}
            value={draft.type.heading_weight}
            min={600}
            max={900}
            step={100}
            onChange={(v) => set({ type: { ...draft.type, heading_weight: v } })}
          />
          <Range
            label={L.gap[lang]}
            value={draft.layout.section_gap_px}
            min={6}
            max={40}
            step={1}
            suffix="px"
            onChange={(v) => set({ layout: { ...draft.layout, section_gap_px: v } })}
          />
          <Range
            label={L.width[lang]}
            value={draft.layout.page_max_px}
            min={960}
            max={1440}
            step={20}
            suffix="px"
            onChange={(v) => set({ layout: { ...draft.layout, page_max_px: v } })}
          />
          <Chips
            label={L.density[lang]}
            value={draft.layout.density}
            onChange={(v) => set({ layout: { ...draft.layout, density: v } })}
            options={[
              { v: "compact" as const, l: lang === "ar" ? "مكثف" : lang === "ku" ? "چڕ" : "Compact" },
              { v: "cozy" as const, l: lang === "ar" ? "متوسط" : lang === "ku" ? "مامناوەند" : "Cozy" },
              { v: "airy" as const, l: lang === "ar" ? "واسع" : lang === "ku" ? "فراوان" : "Airy" },
            ]}
          />
        </AdminCard>
      )}

      {tab !== "theme" && (
        <AdminCard>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save.mutate({ v: draft, live: true })} disabled={save.isPending} className="gap-1.5">
              <Upload className="size-4" strokeWidth={2.6} />
              {L.publish[lang]}
            </Button>
            <Button
              variant="secondary"
              onClick={() => save.mutate({ v: draft, live: false })}
              disabled={save.isPending}
              className="gap-1.5"
            >
              <Save className="size-4" strokeWidth={2.6} />
              {L.saveDraft[lang]}
            </Button>
            <Button
              variant="ghost"
              onClick={() => row && setDraft(row.published)}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="size-4" strokeWidth={2.6} />
              {L.revert[lang]}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(DEFAULT_DESIGN)} className="gap-1.5 text-muted-foreground">
              {L.reset[lang]}
            </Button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
