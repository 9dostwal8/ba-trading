import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronUp, Copy, Eye, EyeOff, GripVertical, Laptop, LayoutPanelLeft,
  Loader2, Lock, Monitor, Plus, RotateCcw, Save, Send, Smartphone, Trash2, Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { CustomBlock } from "@/components/blocks/CustomBlock";
import { NativeSection } from "@/components/blocks/NativeSection";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { MARKETING_ICON_KEYS, marketingIcon } from "@/lib/marketing-icons";
import {
  DEFAULT_BLOCK_CONFIG, BLOCK_KIND_META, fetchPageBlocks, type BlockKind, type PageBlock,
} from "@/lib/page-blocks";
import {
  dedupeModules, defaultPageDocument, MODULE_TEMPLATES, PAGE_REGISTRY, pageDocumentFor, usePageDocuments,
  type BuilderLang, type BuilderPage, type PageDocument, type PageModule,
} from "@/lib/page-documents";
import { fetchStoreData } from "@/lib/store";

const WORDS = {
  title: { ar: "محرر كل الصفحات", ku: "دەستکاریکەری هەموو پەیجەکان", en: "Full app page editor" },
  hint: { ar: "كل صف يعكس جزءاً حقيقياً في الصفحة. العناصر المحمية تقبل التصميم والنص والترتيب، لكن لا يمكن حذف وظيفتها.", ku: "هەر ڕیزێک بەشێکی ڕاستەقینەی پەیجە. بەشە پارێزراوەکان دیزاین و دەق و ڕیزکردن دەگرن، بەڵام کارەکەیان ناسڕێتەوە.", en: "Every row is a real page module. Protected modules allow styling, copy and safe ordering, but their function cannot be removed." },
  draft: { ar: "حفظ المسودة", ku: "پاشەکەوتی ڕەشنووس", en: "Save draft" },
  publish: { ar: "نشر الصفحة", ku: "بڵاوکردنەوەی پەیج", en: "Publish page" },
  published: { ar: "تم نشر الصفحة", ku: "پەیج بڵاوکرایەوە", en: "Page published" },
  drafted: { ar: "تم حفظ المسودة", ku: "ڕەشنووس پاشەکەوت کرا", en: "Draft saved" },
  modules: { ar: "أجزاء الصفحة", ku: "بەشەکانی پەیج", en: "Page modules" },
  properties: { ar: "خصائص العنصر", ku: "تایبەتمەندی بەش", en: "Module properties" },
  canvas: { ar: "المعاينة", ku: "پێشبینین", en: "Canvas" },
  protected: { ar: "وظيفة محمية", ku: "کاری پارێزراو", en: "Protected function" },
  noSelection: { ar: "اختر عنصراً لتعديله", ku: "بەشێک هەڵبژێرە بۆ دەستکاری", en: "Select a module to edit" },
  titleAr: { ar: "العنوان العربي", ku: "سەردێری عەرەبی", en: "Arabic title" },
  titleKu: { ar: "العنوان الكردي", ku: "سەردێری کوردی", en: "Kurdish title" },
  titleEn: { ar: "العنوان الإنجليزي", ku: "سەردێری ئینگلیزی", en: "English title" },
  subtitleAr: { ar: "النص العربي", ku: "دەقی عەرەبی", en: "Arabic supporting text" },
  subtitleKu: { ar: "النص الكردي", ku: "دەقی کوردی", en: "Kurdish supporting text" },
  subtitleEn: { ar: "النص الإنجليزي", ku: "دەقی ئینگلیزی", en: "English supporting text" },
  template: { ar: "قالب القسم", ku: "تێمپلەیتی بەش", en: "Section template" },
  tone: { ar: "لون القسم", ku: "ڕەنگی بەش", en: "Section colour" },
  spacing: { ar: "المسافة", ku: "بۆشایی", en: "Spacing" },
  mobile: { ar: "إظهار بالموبايل", ku: "پیشاندان لە مۆبایل", en: "Show on mobile" },
  desktop: { ar: "إظهار بالكمبيوتر", ku: "پیشاندان لە کۆمپیوتەر", en: "Show on desktop" },
  reset: { ar: "استعادة المنشور", ku: "گەڕاندنەوەی بڵاوکراو", en: "Restore published" },
  defaults: { ar: "قالب الصفحة الأصلي", ku: "تێمپلەیتی ڕەسەنی پەیج", en: "Original page layout" },
  unsaved: { ar: "تغييرات غير محفوظة", ku: "گۆڕانکاری پاشەکەوت نەکراو", en: "Unsaved changes" },
  live: { ar: "فتح الصفحة المنشورة", ku: "کردنەوەی پەیجی بڵاوکراو", en: "Open published page" },
  add: { ar: "إضافة", ku: "زیادکردن", en: "Add" },
};

type Lang = BuilderLang;
const pick = (value: Record<Lang, string>, lang: Lang) => value[lang];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function Chips<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((option) => (
    <Button key={option.value} type="button" size="sm" variant={value === option.value ? "default" : "secondary"} onClick={() => onChange(option.value)}>{option.label}</Button>
  ))}</div>;
}

function IconPicker({ value, onChange }: { value: string | undefined; onChange: (value: string) => void }) {
  return <div className="grid grid-cols-8 gap-1.5">{MARKETING_ICON_KEYS.map((key) => {
    const Icon = marketingIcon(key);
    return <Button key={key} type="button" size="icon" variant={value === key ? "default" : "outline"} title={key} onClick={() => onChange(key)}><Icon /></Button>;
  })}</div>;
}

function ModulePreview({ module, lang }: { module: PageModule; lang: Lang }) {
  const Icon = marketingIcon(module.style.icon);
  const title = module.content.title?.[lang] || module.label[lang];
  const subtitle = module.content.subtitle?.[lang];
  if (module.block) {
    const block: PageBlock = { id: module.id, page: "preview", kind: module.block.kind, sort_order: 0, is_active: true, config: module.block.config };
    return module.block.kind === "section" ? <NativeSection sectionKey={block.config.section ?? "featured"} slot={block.config.slot} /> : <CustomBlock block={block} />;
  }
  const frame = module.style.template;
  return <div className={`mx-3 ${module.style.padding === "compact" ? "py-2" : module.style.padding === "spacious" ? "py-6" : "py-4"}`}>
    <div className={`${frame === "outlined" ? "border border-primary/35" : ""} ${frame === "soft" ? "bg-secondary/60" : ""} ${frame === "band" ? "border-y border-primary/30 bg-primary/10" : ""} ${frame === "editorial" ? "border-s-4 border-primary" : ""} rounded-[var(--section-radius)] p-3`}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="text-[13px] font-black">{title}</p>{subtitle ? <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{subtitle}</p> : null}<p className="mt-1 text-[9px] font-bold uppercase text-muted-foreground">{module.type}</p></div>
        {module.locked ? <Lock className="size-3.5 text-muted-foreground" /> : null}
      </div>
    </div>
  </div>;
}

function Properties({ module, lang, onChange }: { module: PageModule; lang: Lang; onChange: (module: PageModule) => void }) {
  const patch = (next: Partial<PageModule>) => onChange({ ...module, ...next });
  const style = (next: Partial<PageModule["style"]>) => patch({ style: { ...module.style, ...next } });
  const content = (key: "title" | "subtitle", language: Lang, value: string) => patch({ content: { ...module.content, [key]: { ...module.content[key], [language]: value } } });
  return <div className="space-y-4">
    <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">{module.locked ? <Lock /> : <LayoutPanelLeft />}</span><div><p className="text-[13px] font-black">{module.label[lang]}</p><p className="text-[10px] font-bold text-muted-foreground">{module.type}</p></div></div>
    {module.locked ? <p className="rounded-lg border border-info/35 bg-info/10 px-2.5 py-2 text-[10.5px] font-bold text-info">{pick(WORDS.protected, lang)}</p> : null}
    <div className="space-y-2"><TextField label={pick(WORDS.titleAr, lang)} value={module.content.title?.ar ?? ""} onChange={(v) => content("title", "ar", v)} /><TextField label={pick(WORDS.titleKu, lang)} value={module.content.title?.ku ?? ""} onChange={(v) => content("title", "ku", v)} /><TextField label={pick(WORDS.titleEn, lang)} value={module.content.title?.en ?? ""} onChange={(v) => content("title", "en", v)} /></div>
    <div className="space-y-2"><TextField label={pick(WORDS.subtitleAr, lang)} value={module.content.subtitle?.ar ?? ""} onChange={(v) => content("subtitle", "ar", v)} /><TextField label={pick(WORDS.subtitleKu, lang)} value={module.content.subtitle?.ku ?? ""} onChange={(v) => content("subtitle", "ku", v)} /><TextField label={pick(WORDS.subtitleEn, lang)} value={module.content.subtitle?.en ?? ""} onChange={(v) => content("subtitle", "en", v)} /></div>
    <div className="space-y-1.5"><p className="text-[11px] font-extrabold text-muted-foreground">{pick(WORDS.template, lang)}</p><Chips value={module.style.template} options={MODULE_TEMPLATES.map((item) => ({ value: item.key, label: item[lang] }))} onChange={(template) => style({ template })} /></div>
    <div className="space-y-1.5"><p className="text-[11px] font-extrabold text-muted-foreground">{pick(WORDS.tone, lang)}</p><Chips value={module.style.tone} options={(["primary", "success", "info", "warning", "neutral"] as const).map((value) => ({ value, label: value }))} onChange={(tone) => style({ tone })} /></div>
    <div className="space-y-1.5"><p className="text-[11px] font-extrabold text-muted-foreground">{pick(WORDS.spacing, lang)}</p><Chips value={module.style.padding} options={(["compact", "normal", "spacious"] as const).map((value) => ({ value, label: value }))} onChange={(padding) => style({ padding })} /></div>
    <IconPicker value={module.style.icon} onChange={(icon) => style({ icon })} />
    <div className="grid gap-2 sm:grid-cols-2"><ToggleField label={pick(WORDS.mobile, lang)} checked={module.style.showMobile} onChange={(showMobile) => style({ showMobile })} /><ToggleField label={pick(WORDS.desktop, lang)} checked={module.style.showDesktop} onChange={(showDesktop) => style({ showDesktop })} /></div>
  </div>;
}

function legacyModules(blocks: PageBlock[], page: BuilderPage): PageModule[] {
  return blocks.filter((block) => block.page === page.key).map((block) => ({
    id: `legacy-${block.id}`, type: `custom-${block.kind}`, label: { ar: "محتوى مخصص", ku: "ناوەڕۆکی تایبەت", en: "Custom content" }, locked: false,
    enabled: block.is_active, region: block.config.position === "bottom" ? "footer" : "content",
    content: { title: { ar: block.config.title_ar ?? "", ku: block.config.title_ku ?? "", en: block.config.title_en ?? "" } },
    style: { template: "default", tone: block.config.tone ?? "primary", ...(block.config.icon ? { icon: block.config.icon } : {}), padding: "normal", showMobile: true, showDesktop: true },
    block: { kind: block.kind, config: block.config },
  }));
}

export function AdminBuilder() {
  const { lang } = useI18n();
  const language = lang as Lang;
  const qc = useQueryClient();
  const { data: documents } = usePageDocuments();
  const { data: legacy = [] } = useQuery({ queryKey: ["page_blocks"], queryFn: fetchPageBlocks });
  const { data: store } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const [pageKey, setPageKey] = useState("home");
  const [draft, setDraft] = useState<PageDocument | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [previewLang, setPreviewLang] = useState<Lang>(language);
  const [dragId, setDragId] = useState<string | null>(null);
  const [history, setHistory] = useState<PageDocument[]>([]);
  const page = PAGE_REGISTRY.find((entry) => entry.key === pageKey) ?? PAGE_REGISTRY[0];
  const row = documents?.find((item) => item.page === pageKey);

  useEffect(() => {
    if (!page) return;
    const base = pageDocumentFor(documents, page, "draft");
    const extras = row ? [] : legacyModules(legacy, page);
    setDraft({ ...base, modules: dedupeModules([...base.modules, ...extras]) });
    setSelectedId(base.modules.at(0)?.id ?? null);
    setHistory([]);
  }, [documents, legacy, page, pageKey, row]);

  const modules = draft?.modules ?? [];
  const selected = modules.find((item) => item.id === selectedId);
  const dirty = useMemo(() => draft && page ? JSON.stringify(draft) !== JSON.stringify(pageDocumentFor(documents, page, "draft")) : false, [draft, documents, page]);
  if (!page) return null;

  const commit = (next: PageDocument) => { if (draft) setHistory((items) => [...items.slice(-14), clone(draft)]); setDraft(next); };
  const updateModule = (next: PageModule) => commit({ version: draft?.version ?? 1, modules: modules.map((item) => item.id === next.id ? next : item) });
  const move = (id: string, direction: -1 | 1) => { const from = modules.findIndex((item) => item.id === id); const to = from + direction; if (from < 0 || to < 0 || to >= modules.length) return; const next = [...modules]; const [item] = next.splice(from, 1); if (!item) return; next.splice(to, 0, item); commit({ version: draft?.version ?? 1, modules: next }); };
  const drop = (id: string) => { if (!dragId || dragId === id) return; const from = modules.findIndex((item) => item.id === dragId); const to = modules.findIndex((item) => item.id === id); if (from < 0 || to < 0) return; const next = [...modules]; const [item] = next.splice(from, 1); if (!item) return; next.splice(to, 0, item); commit({ version: draft?.version ?? 1, modules: next }); setDragId(null); };
  const previewPath = (() => {
    if (page.dynamic === "product") return store?.products?.at(0)?.id ? `/product/${store.products[0]?.id}` : page.path;
    if (page.dynamic === "vendor") return page.path;
    if (page.dynamic === "bundle") return store?.bundles?.at(0)?.id ? `/bundle/${store.bundles[0]?.id}` : page.path;
    return page.path;
  })();

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!draft) throw new Error("No page draft");
      const payload = publish
        ? { page: page.key, draft: draft as never, published: draft as never, version: (row?.version ?? 0) + 1, published_at: new Date().toISOString() }
        : { page: page.key, draft: draft as never, version: row?.version ?? 1 };
      const { error } = await supabase.from("page_documents").upsert(payload as never, { onConflict: "page" });
      if (error) throw error;
    },
    onSuccess: (_data, publish) => { toast.success(pick(publish ? WORDS.published : WORDS.drafted, language)); qc.invalidateQueries({ queryKey: ["page_documents"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addCustom = (kind: BlockKind) => {
    const id = `custom-${Date.now()}`;
    const module: PageModule = { id, type: `custom-${kind}`, label: { ar: "محتوى مخصص", ku: "ناوەڕۆکی تایبەت", en: "Custom content" }, locked: false, enabled: true, region: "content", content: {}, style: { template: "default", tone: "primary", icon: "sparkles", padding: "normal", showMobile: true, showDesktop: true }, block: { kind, config: clone(DEFAULT_BLOCK_CONFIG[kind]) } };
    commit({ version: draft?.version ?? 1, modules: [...modules, module] }); setSelectedId(id);
  };

  return <div className="space-y-3">
    <SectionHeader title={pick(WORDS.title, language)} action={<div className="flex gap-1.5"><Button size="sm" variant="outline" disabled={!dirty || save.isPending} onClick={() => save.mutate(false)}>{save.isPending ? <Loader2 className="animate-spin" /> : <Save />}{pick(WORDS.draft, language)}</Button><Button size="sm" disabled={!draft || save.isPending} onClick={() => save.mutate(true)}><Send />{pick(WORDS.publish, language)}</Button></div>} />
    <AdminCard><p className="rounded-lg bg-info/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-info">{pick(WORDS.hint, language)}</p><div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{PAGE_REGISTRY.map((item) => <Button key={item.key} size="sm" variant={item.key === pageKey ? "default" : "secondary"} className="shrink-0" onClick={() => setPageKey(item.key)}>{item[language]}</Button>)}</div></AdminCard>
    <div className="grid gap-3 xl:grid-cols-[280px_minmax(420px,1fr)_320px]">
      <AdminCard><div className="flex items-center justify-between"><p className="text-[12px] font-black">{pick(WORDS.modules, language)}</p>{dirty ? <span className="rounded-full bg-warning/15 px-2 py-1 text-[9px] font-black text-warning">{pick(WORDS.unsaved, language)}</span> : null}</div><div className="mt-3 space-y-1.5">{modules.map((module, index) => <div key={module.id} draggable onDragStart={() => setDragId(module.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(module.id)} className={`border p-2 ${selectedId === module.id ? "border-primary bg-primary/5" : "border-border bg-card"} rounded-lg`}><div className="flex items-center gap-1"><GripVertical className="size-4 cursor-grab text-muted-foreground" /><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start px-1 py-1 text-start" onClick={() => setSelectedId(module.id)}><span className="truncate text-[11px] font-extrabold">{module.label[language]}</span></Button>{module.locked ? <Lock className="size-3 text-muted-foreground" /> : null}</div><div className="mt-1 flex justify-end gap-1"><Button size="icon" variant="ghost" disabled={index === 0} onClick={() => move(module.id, -1)}><ChevronUp /></Button><Button size="icon" variant="ghost" disabled={index === modules.length - 1} onClick={() => move(module.id, 1)}><ChevronDown /></Button><Button size="icon" variant="ghost" onClick={() => updateModule({ ...module, enabled: module.locked ? true : !module.enabled })}>{module.enabled ? <Eye /> : <EyeOff />}</Button>{!module.locked ? <><Button size="icon" variant="ghost" onClick={() => { const copy = clone(module); copy.id = `${module.id}-${Date.now()}`; commit({ version: draft?.version ?? 1, modules: [...modules.slice(0, index + 1), copy, ...modules.slice(index + 1)] }); }}><Copy /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => commit({ version: draft?.version ?? 1, modules: modules.filter((item) => item.id !== module.id) })}><Trash2 /></Button></> : null}</div></div>)}</div><div className="mt-3 flex flex-wrap gap-1">{BLOCK_KIND_META.filter((item) => item.key !== "section").map((item) => <Button key={item.key} size="sm" variant="secondary" onClick={() => addCustom(item.key)}><Plus />{item[language]}</Button>)}</div></AdminCard>
      <AdminCard><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[12px] font-black">{pick(WORDS.canvas, language)}</p><div className="flex gap-1"><Chips value={previewLang} options={(["ar", "ku", "en"] as const).map((value) => ({ value, label: value.toUpperCase() }))} onChange={setPreviewLang} /><Button size="icon" variant={device === "mobile" ? "default" : "secondary"} title="Mobile" onClick={() => setDevice("mobile")}><Smartphone /></Button><Button size="icon" variant={device === "desktop" ? "default" : "secondary"} title="Desktop" onClick={() => setDevice("desktop")}><Monitor /></Button></div></div><div className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-2"><div dir={previewLang === "en" ? "ltr" : "rtl"} className="mx-auto min-h-[580px] overflow-hidden rounded-lg border border-border bg-[var(--design-surface)]" style={{ width: device === "mobile" ? 390 : 900, maxWidth: "100%" }}>{modules.filter((module) => module.enabled && (device === "mobile" ? module.style.showMobile : module.style.showDesktop)).map((module) => <div key={module.id} className={`relative w-full text-start ${selectedId === module.id ? "ring-2 ring-inset ring-primary" : ""}`}><div className="pointer-events-none"><ModulePreview module={module} lang={previewLang} /></div><div role="button" tabIndex={0} aria-label={`${pick(WORDS.properties, language)}: ${module.label[language]}`} onClick={() => setSelectedId(module.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(module.id); } }} className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" /></div>)}</div></div><div className="mt-3 flex flex-wrap gap-1.5"><Button size="sm" variant="outline" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { setDraft(previous); setHistory((items) => items.slice(0, -1)); } }}><Undo2 />Undo</Button><Button size="sm" variant="outline" onClick={() => setDraft(row?.published ?? defaultPageDocument(page))}><RotateCcw />{pick(WORDS.reset, language)}</Button><Button size="sm" variant="outline" onClick={() => setDraft(defaultPageDocument(page))}><Laptop />{pick(WORDS.defaults, language)}</Button><Button asChild size="sm" variant="secondary"><a href={previewPath} target="_blank" rel="noreferrer"><Eye />{pick(WORDS.live, language)}</a></Button></div></AdminCard>
      <AdminCard><p className="mb-3 text-[12px] font-black">{pick(WORDS.properties, language)}</p>{selected ? <Properties module={selected} lang={language} onChange={updateModule} /> : <p className="py-12 text-center text-[11px] font-bold text-muted-foreground">{pick(WORDS.noSelection, language)}</p>}</AdminCard>
    </div>
  </div>;
}
