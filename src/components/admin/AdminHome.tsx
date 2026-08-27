import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ColorField, AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { tintStyle } from "@/lib/category-icons";
import { useI18n } from "@/lib/i18n";
import { MARKETING_ICON_KEYS, marketingIcon } from "@/lib/marketing-icons";
import {
  rewardBarItems,
  triText,
  vendorCta,
  type HomeSection,
  type HomeSectionKind,
  type RewardBarItem,
  type StoreSettings,
  type TriText,
  type VendorCta,
} from "@/lib/store";

const KINDS: { key: HomeSectionKind; label: string }[] = [
  { key: "hero", label: "sectionHero" },
  { key: "bundles", label: "sectionBundles" },
  { key: "categories", label: "sectionCategories" },
  { key: "offers", label: "sectionOffers" },
  { key: "brands", label: "sectionBrands" },
  { key: "featured", label: "sectionFeatured" },
  { key: "newest", label: "sectionNewest" },
  { key: "banners", label: "sectionBanners" },
];

type Draft = {
  id?: string;
  kind: HomeSectionKind;
  title_ar: string;
  title_ku: string;
  layout: string;
  item_limit: string;
  hue: string;
  chroma: string;
  show_title: boolean;
  sort_order: string;
  is_active: boolean;
};

const empty: Draft = {
  kind: "featured",
  title_ar: "",
  title_ku: "",
  layout: "grid",
  item_limit: "8",
  hue: "250",
  chroma: "0.16",
  show_title: true,
  sort_order: "9",
  is_active: true,
};

export function AdminHome() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: sections } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: async () =>
      ((await supabase.from("home_sections").select("*").order("sort_order")).data ??
        []) as unknown as HomeSection[],
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: async () =>
      ((await supabase.from("store_settings").select("*").limit(1).maybeSingle()).data ??
        null) as unknown as StoreSettings | null,
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        kind: d.kind,
        title_ar: d.title_ar,
        title_ku: d.title_ku || d.title_ar,
        layout: d.layout,
        item_limit: Number(d.item_limit) || 8,
        hue: Number(d.hue) || 0,
        chroma: Number(d.chroma) || 0,
        show_title: d.show_title,
        sort_order: Number(d.sort_order) || 0,
        is_active: d.is_active,
      };
      const { error } = d.id
        ? await supabase.from("home_sections").update(row).eq("id", d.id)
        : await supabase.from("home_sections").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const patch = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: { sort_order?: number; is_active?: boolean };
    }) => {
      const { error } = await supabase.from("home_sections").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      qc.invalidateQueries();
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (values: Partial<StoreSettings>) => {
      if (!settings) return;
      const { error } = await supabase.from("store_settings").update(values).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const list = sections ?? [];

  const move = (index: number, dir: -1 | 1) => {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    patch.mutate({ id: a.id, values: { sort_order: b.sort_order } });
    patch.mutate({ id: b.id, values: { sort_order: a.sort_order } });
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t("homeSections")}
        action={
          <Button size="sm" onClick={() => setDraft(draft ? null : empty)}>
            {draft ? <X className="size-4" /> : <Plus className="size-4" />}
            {draft ? t("cancel") : t("add")}
          </Button>
        }
      />

      {draft && (
        <AdminCard>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{t("sectionKind")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setDraft({ ...draft, kind: k.key })}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
                    draft.kind === k.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {t(k.label as "sectionBrands")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TextField
              label={t("titleAr")}
              value={draft.title_ar}
              onChange={(v) => setDraft({ ...draft, title_ar: v })}
            />
            <TextField
              label={t("titleKu")}
              value={draft.title_ku}
              onChange={(v) => setDraft({ ...draft, title_ku: v })}
            />
            <TextField
              label={t("itemLimit")}
              type="number"
              value={draft.item_limit}
              onChange={(v) => setDraft({ ...draft, item_limit: v })}
            />
            <TextField
              label={t("sortOrder")}
              type="number"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <div className="col-span-2">
              <ColorField
                label={t("cardColor")}
                hue={draft.hue}
                chroma={draft.chroma}
                onChange={(hue, chroma) => setDraft({ ...draft, hue, chroma })}
              />
            </div>
          </div>

          <div className="flex gap-1.5">
            {["grid", "chips"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setDraft({ ...draft, layout: l })}
                className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-bold ${
                  draft.layout === l ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {t(l === "grid" ? "layoutGrid" : "layoutChips")}
              </button>
            ))}
          </div>

          <ToggleField
            label={t("showTitle")}
            checked={draft.show_title}
            onChange={(v) => setDraft({ ...draft, show_title: v })}
          />
          <ToggleField
            label={t("visible")}
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate(draft)}>
            {t("save")}
          </Button>
        </AdminCard>
      )}

      {settings && (
        <HomeMarketingEditor settings={settings} onSave={(v) => saveSettings.mutate(v)} />
      )}

      <div className="space-y-2">

        {list.map((s, i) => (
          <div
            key={s.id}
            style={tintStyle(s.hue, s.chroma)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card"
          >
            <span
              className="h-9 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--tint-strong)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold">
                {(lang === "ar" ? s.title_ar : s.title_ku) ||
                  t((KINDS.find((k) => k.key === s.kind)?.label ?? "sectionBrands") as "sectionBrands")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t((KINDS.find((k) => k.key === s.kind)?.label ?? "sectionBrands") as "sectionBrands")}{" "}
                · {s.item_limit} · {s.is_active ? t("visible") : t("hidden")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => move(i, -1)}
                aria-label={t("moveUp")}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => move(i, 1)}
                aria-label={t("moveDown")}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <Button
              size="sm"
              variant={s.is_active ? "outline" : "default"}
              className="h-8 text-[11px]"
              onClick={() => patch.mutate({ id: s.id, values: { is_active: !s.is_active } })}
            >
              {s.is_active ? t("hidden") : t("visible")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() =>
                setDraft({
                  id: s.id,
                  kind: s.kind,
                  title_ar: s.title_ar,
                  title_ku: s.title_ku,
                  layout: s.layout,
                  item_limit: String(s.item_limit),
                  hue: String(s.hue),
                  chroma: String(s.chroma),
                  show_title: s.show_title,
                  sort_order: String(s.sort_order),
                  is_active: s.is_active,
                })
              }
            >
              {t("edit")}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-destructive"
              onClick={() => remove.mutate(s.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {settings && <ThemeEditor settings={settings} onSave={(v) => saveSettings.mutate(v)} />}

    </div>
  );
}

function ThemeEditor({
  settings,
  onSave,
}: {
  settings: StoreSettings;
  onSave: (v: Partial<StoreSettings>) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    primary_hue: String(settings.primary_hue),
    primary_chroma: String(settings.primary_chroma),
    accent_hue: String(settings.accent_hue),
    accent_chroma: String(settings.accent_chroma),
    radius_px: String(settings.radius_px),
    show_search: settings.show_search,
  });

  return (
    <div className="space-y-3">
      <SectionHeader title={t("themeColors")} />
      <AdminCard>
        <div className="flex gap-2">
          <Swatch label={t("primaryColor")} hue={form.primary_hue} chroma={form.primary_chroma} />
          <Swatch label={t("accentColor")} hue={form.accent_hue} chroma={form.accent_chroma} />
        </div>
        <ColorField
          label={t("primaryColor")}
          hue={form.primary_hue}
          chroma={form.primary_chroma}
          onChange={(hue, chroma) => setForm({ ...form, primary_hue: hue, primary_chroma: chroma })}
        />
        <ColorField
          label={t("accentColor")}
          hue={form.accent_hue}
          chroma={form.accent_chroma}
          onChange={(hue, chroma) => setForm({ ...form, accent_hue: hue, accent_chroma: chroma })}
        />
        <TextField
          label={t("cornerRadius")}
          type="number"
          value={form.radius_px}
          onChange={(v) => setForm({ ...form, radius_px: v })}
        />
        <ToggleField
          label={t("showSearch")}
          checked={form.show_search}
          onChange={(v) => setForm({ ...form, show_search: v })}
        />
        <Button
          className="w-full"
          onClick={() =>
            onSave({
              primary_hue: Number(form.primary_hue) || 0,
              primary_chroma: Number(form.primary_chroma) || 0,
              accent_hue: Number(form.accent_hue) || 0,
              accent_chroma: Number(form.accent_chroma) || 0,
              radius_px: Number(form.radius_px) || 14,
              show_search: form.show_search,
            })
          }
        >
          {t("save")}
        </Button>
      </AdminCard>
    </div>
  );
}

function IconGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {MARKETING_ICON_KEYS.map((key) => {
        const Icon = marketingIcon(key);
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`grid aspect-square place-items-center rounded-lg border ${
              active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

function HomeMarketingEditor({
  settings,
  onSave,
}: {
  settings: StoreSettings;
  onSave: (v: Partial<StoreSettings>) => void;
}) {
  const { t, lang } = useI18n();
  const lab = (ar: string, ku: string, en: string) => (lang === "ku" ? ku : lang === "en" ? en : ar);
  const [form, setForm] = useState({
    show_reward_bar: settings.show_reward_bar,
    reward_bar_link: settings.reward_bar_link || "/rewards",
    reward_bar_icon: settings.reward_bar_icon || "coin",
    show_vendor_join_cta: settings.show_vendor_join_cta,
    vendor_join_cta_link: settings.vendor_join_cta_link || "/vendor-signup",
  });
  const [items, setItems] = useState<RewardBarItem[]>(rewardBarItems(settings.reward_bar_items));
  const [cta, setCta] = useState<TriText>(
    triText(settings.reward_bar_cta, { ar: "تفاصيل", ku: "وردەکاری", en: "Details" }),
  );
  const [vendor, setVendor] = useState<VendorCta>(vendorCta(settings.vendor_cta));

  const patchItem = (i: number, v: Partial<RewardBarItem>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...v } : it)));
  const moveItem = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      const j = i + dir;
      if (j < 0 || j >= next.length) return list;
      const a = next[i]!;
      next[i] = next[j]!;
      next[j] = a;
      return next;
    });

  const [open, setOpen] = useState<"reward" | "vendor" | null>(null);

  const save = () =>
    onSave({
      show_reward_bar: form.show_reward_bar,
      reward_bar_link: form.reward_bar_link || "/rewards",
      reward_bar_icon: form.reward_bar_icon || "coin",
      show_vendor_join_cta: form.show_vendor_join_cta,
      vendor_join_cta_link: form.vendor_join_cta_link || "/vendor-signup",
      reward_bar_items: items.filter((it) => (it.ar || it.ku || it.en).trim().length > 0),
      reward_bar_cta: cta,
      vendor_cta: vendor,
    });

  const RewardIcon = marketingIcon(form.reward_bar_icon);
  const VendorIcon = marketingIcon(vendor.icon);

  return (
    <div className="space-y-3">
      <SectionHeader title={t("homeMarketing")} />

      {/* ---------- Reward points bar row ---------- */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 p-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <RewardIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-bold">
              {lab("شريط نقاط المكافأة", "هێڵی خاڵی پاداشت", "Reward points bar")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {items.length} {lab("سطر", "دێڕ", "lines")} ·{" "}
              {form.show_reward_bar ? t("visible") : t("hidden")}
            </p>
          </div>
          <Button
            size="sm"
            variant={form.show_reward_bar ? "outline" : "default"}
            className="h-8 shrink-0 text-[11px]"
            onClick={() => {
              setForm({ ...form, show_reward_bar: !form.show_reward_bar });
              onSave({ show_reward_bar: !form.show_reward_bar });
            }}
          >
            {form.show_reward_bar ? t("hidden") : t("visible")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1"
            onClick={() => setOpen(open === "reward" ? null : "reward")}
          >
            {t("edit")}
            <ChevronDown
              className={`size-3.5 transition-transform ${open === "reward" ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {open === "reward" && (
          <div className="space-y-3 border-t border-border p-2">
            <TextField
              label={t("rewardBarLink")}
              value={form.reward_bar_link}
              onChange={(v) => setForm({ ...form, reward_bar_link: v })}
            />
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                {lab("أيقونة الشريط", "ئایکۆنی هێڵ", "Bar icon")}
              </Label>
              <IconGrid
                value={form.reward_bar_icon}
                onChange={(key) => setForm({ ...form, reward_bar_icon: key })}
              />
            </div>
            <TextField
              label={lab("زر الشريط (عربي)", "دوگمە (عەرەبی)", "Bar button (Arabic)")}
              value={cta.ar}
              onChange={(v) => setCta({ ...cta, ar: v })}
            />
            <TextField
              label={lab("زر الشريط (كردي)", "دوگمە (کوردی)", "Bar button (Kurdish)")}
              value={cta.ku}
              onChange={(v) => setCta({ ...cta, ku: v })}
            />
            <TextField
              label={lab("زر الشريط (إنجليزي)", "دوگمە (ئینگلیزی)", "Bar button (English)")}
              value={cta.en}
              onChange={(v) => setCta({ ...cta, en: v })}
            />

            {items.map((it, i) => (
              <AdminCard key={i}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {lab("سطر", "دێڕ", "Line")} {i + 1}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => moveItem(i, -1)}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => moveItem(i, 1)}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <IconGrid value={it.icon} onChange={(key) => patchItem(i, { icon: key })} />
                <TextField
                  label={lab("النص (عربي)", "دەق (عەرەبی)", "Text (Arabic)")}
                  value={it.ar}
                  onChange={(v) => patchItem(i, { ar: v })}
                />
                <TextField
                  label={lab("النص (كردي)", "دەق (کوردی)", "Text (Kurdish)")}
                  value={it.ku}
                  onChange={(v) => patchItem(i, { ku: v })}
                />
                <TextField
                  label={lab("النص (إنجليزي)", "دەق (ئینگلیزی)", "Text (English)")}
                  value={it.en}
                  onChange={(v) => patchItem(i, { en: v })}
                />
              </AdminCard>
            ))}

            <Button
              variant="outline"
              className="w-full gap-1"
              onClick={() => setItems([...items, { icon: "sparkles", ar: "", ku: "", en: "" }])}
            >
              <Plus className="size-4" />
              {lab("إضافة سطر", "زیادکردنی دێڕ", "Add line")}
            </Button>

            <Button className="w-full" onClick={save}>
              {t("save")}
            </Button>
          </div>
        )}
      </div>

      {/* ---------- Vendor join CTA row ---------- */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 p-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <VendorIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-bold">
              {lab("بطاقة تسجيل البائع", "کارتی تۆمارکردنی فرۆشیار", "Vendor signup card")}
            </p>
            <p className="line-clamp-1 text-[11px] text-muted-foreground">
              {(lang === "ku" ? vendor.title_ku : lang === "en" ? vendor.title_en : vendor.title_ar) ||
                "—"}{" "}
              · {form.show_vendor_join_cta ? t("visible") : t("hidden")}
            </p>
          </div>
          <Button
            size="sm"
            variant={form.show_vendor_join_cta ? "outline" : "default"}
            className="h-8 shrink-0 text-[11px]"
            onClick={() => {
              setForm({ ...form, show_vendor_join_cta: !form.show_vendor_join_cta });
              onSave({ show_vendor_join_cta: !form.show_vendor_join_cta });
            }}
          >
            {form.show_vendor_join_cta ? t("hidden") : t("visible")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1"
            onClick={() => setOpen(open === "vendor" ? null : "vendor")}
          >
            {t("edit")}
            <ChevronDown
              className={`size-3.5 transition-transform ${open === "vendor" ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        {open === "vendor" && (
          <div className="space-y-3 border-t border-border p-2">
            <TextField
              label={t("vendorJoinCtaLink")}
              value={form.vendor_join_cta_link}
              onChange={(v) => setForm({ ...form, vendor_join_cta_link: v })}
            />
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                {lab("أيقونة البطاقة", "ئایکۆنی کارت", "Card icon")}
              </Label>
              <IconGrid value={vendor.icon} onChange={(key) => setVendor({ ...vendor, icon: key })} />
            </div>
            <TextField
              label={lab("العنوان (عربي)", "ناونیشان (عەرەبی)", "Title (Arabic)")}
              value={vendor.title_ar}
              onChange={(v) => setVendor({ ...vendor, title_ar: v })}
            />
            <TextField
              label={lab("العنوان (كردي)", "ناونیشان (کوردی)", "Title (Kurdish)")}
              value={vendor.title_ku}
              onChange={(v) => setVendor({ ...vendor, title_ku: v })}
            />
            <TextField
              label={lab("العنوان (إنجليزي)", "ناونیشان (ئینگلیزی)", "Title (English)")}
              value={vendor.title_en}
              onChange={(v) => setVendor({ ...vendor, title_en: v })}
            />
            <TextField
              label={lab("الوصف (عربي)", "وەسف (عەرەبی)", "Subtitle (Arabic)")}
              value={vendor.sub_ar}
              onChange={(v) => setVendor({ ...vendor, sub_ar: v })}
            />
            <TextField
              label={lab("الوصف (كردي)", "وەسف (کوردی)", "Subtitle (Kurdish)")}
              value={vendor.sub_ku}
              onChange={(v) => setVendor({ ...vendor, sub_ku: v })}
            />
            <TextField
              label={lab("الوصف (إنجليزي)", "وەسف (ئینگلیزی)", "Subtitle (English)")}
              value={vendor.sub_en}
              onChange={(v) => setVendor({ ...vendor, sub_en: v })}
            />
            <Button className="w-full" onClick={save}>
              {t("save")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


function Swatch({ label, hue, chroma }: { label: string; hue: string; chroma: string }) {
  return (
    <div className="flex-1 space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div
        className="h-10 rounded-lg border border-border"
        style={{ background: `oklch(0.55 ${Math.min(Number(chroma) || 0, 0.3)} ${Number(hue) || 0})` }}
      />
    </div>
  );
}
