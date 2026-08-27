import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { defaultTexts, useI18n } from "@/lib/i18n";
import { SECTIONS, keysBySection, sectionOf, type SectionId } from "@/lib/text-sections";

const L = {
  title: { ar: "نصوص التطبيق", ku: "دەقەکانی ئەپ", en: "App Texts",},
  hint: {
    ar: "عدّل أي نص يظهر في التطبيق بالعربية والكردية. اتركه فارغاً لاستخدام النص الأصلي.",
    ku: "هەر دەقێک لە ئەپ بە عەرەبی و کوردی دەستکاری بکە. بەتاڵی بەجێبهێڵە بۆ دەقی بنەڕەتی.",
    en: "Edit any text appearing in the app in Arabic and Kurdish. Leave it blank to use the original text.",
  },
  search: { ar: "ابحث في النصوص...", ku: "لە دەقەکان بگەڕێ...", en: "Search texts...",},
  ar: { ar: "عربي", ku: "عەرەبی", en: "Arabic",},
  ku: { ar: "كردي", ku: "کوردی", en: "Kurdish",},
  en: { ar: "إنجليزي", ku: "ئینگلیزی", en: "English" },
  save: { ar: "حفظ النصوص", ku: "پاشەکەوتکردنی دەقەکان", en: "Save Texts",},
  saved: { ar: "تم حفظ النصوص", ku: "دەقەکان پاشەکەوت کران", en: "Texts Saved",},
  reset: { ar: "إرجاع الأصلي", ku: "گەڕاندنەوەی بنەڕەتی", en: "Restore Original",},
  none: { ar: "لا توجد نتائج", ku: "هیچ ئەنجامێک نییە", en: "No Results",},
  count: { ar: "نص", ku: "دەق", en: "Text",},
} as const;

type Draft = Record<string, { ar: string; ku: string; en: string }>;

export function AdminTexts() {
  const { lang, reloadTexts } = useI18n();
  const tx = (k: keyof typeof L) => L[k][lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];
  const qc = useQueryClient();
  const [section, setSection] = useState<SectionId>("home");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft>({});

  const { data: rows } = useQuery({
    queryKey: ["admin-ui-texts"],
    queryFn: async () =>
      ((await supabase.from("ui_texts").select("key, ar, ku, en")).data ?? []) as {
        key: string;
        ar: string;
        ku: string;
        en: string | null;
      }[],
  });

  const stored = useMemo(() => {
    const map: Draft = {};
    for (const r of rows ?? [])
      map[r.key] = { ar: r.ar ?? "", ku: r.ku ?? "", en: r.en ?? "" };
    return map;
  }, [rows]);

  const groups = useMemo(() => keysBySection(), []);

  const base = (key: string) => defaultTexts[key] ?? { ar: "", ku: "", en: "" };

  const value = (key: string, l: "ar" | "ku" | "en") =>
    draft[key]?.[l] ?? stored[key]?.[l] ?? base(key)[l];

  const set = (key: string, l: "ar" | "ku" | "en", v: string) =>
    setDraft((d) => {
      const current = {
        ar: d[key]?.ar ?? stored[key]?.ar ?? base(key).ar,
        ku: d[key]?.ku ?? stored[key]?.ku ?? base(key).ku,
        en: d[key]?.en ?? stored[key]?.en ?? base(key).en,
      };
      current[l] = v;
      return { ...d, [key]: current };
    });

  const resetKey = (key: string) => setDraft((d) => ({ ...d, [key]: { ...base(key) } }));

  const keys = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return (groups[section] ?? []) as string[];
    return Object.keys(defaultTexts).filter(
      (k) =>
        k.toLowerCase().includes(needle) ||
        base(k).ar.includes(q.trim()) ||
        base(k).ku.includes(q.trim()),
    );
  }, [q, section, groups]);


  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(draft).map(([key, v]) => ({
        key,
        section: sectionOf(key),
        ar: v.ar,
        ku: v.ku,
        en: v.en,
      }));
      if (!payload.length) return;
      const { error } = await supabase.from("ui_texts").upsert(payload, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tx("saved"));
      setDraft({});
      qc.invalidateQueries({ queryKey: ["admin-ui-texts"] });
      reloadTexts();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = Object.keys(draft).length;

  return (
    <div className="space-y-2.5">
      <AdminCard>
        <SectionHeader
          title={tx("title")}
          action={
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
              {keys.length} {tx("count")}
            </span>
          }
        />
        <p className="text-[11px] text-muted-foreground">{tx("hint")}</p>
        <div className="relative mt-2">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("search")}
            className="h-9 ps-8"
          />
        </div>
        <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 no-scrollbar">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSection(s.id);
                setQ("");
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                section === s.id && !q
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 bg-card text-muted-foreground"
              }`}
            >
              {lang === "ku" ? s.ku : s.ar}
            </button>
          ))}
        </div>
      </AdminCard>

      {!keys.length && (
        <p className="p-4 text-center text-xs text-muted-foreground">{tx("none")}</p>
      )}

      {keys.map((key) => (
        <AdminCard key={key}>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-[10px] font-bold text-muted-foreground">{key}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetKey(key)}
              className="h-7 gap-1 rounded-full px-2 text-[10px]"
            >
              <RotateCcw className="size-3" />
              {tx("reset")}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{tx("ar")}</Label>
              <Input
                value={value(key, "ar")}
                onChange={(e) => set(key, "ar", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{tx("ku")}</Label>
              <Input
                value={value(key, "ku")}
                onChange={(e) => set(key, "ku", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{tx("en")}</Label>
              <Input
                value={value(key, "en")}
                onChange={(e) => set(key, "en", e.target.value)}
                className="h-9"
                dir="ltr"
              />
            </div>
          </div>
        </AdminCard>
      ))}

      <div className="sticky bottom-3 z-10">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
          className="h-11 w-full gap-2 rounded-full text-[13px] font-extrabold shadow-card"
        >
          <Save className="size-4" />
          {tx("save")} {dirty ? `(${dirty})` : ""}
        </Button>
      </div>
    </div>
  );
}
