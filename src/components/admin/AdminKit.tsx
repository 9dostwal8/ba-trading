import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-muted-foreground dark:text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl"
      />
    </Field>
  );
}

/** Visual palette: admins pick a color, we store its hue/chroma pair. */
export const CARD_COLORS = [
  { key: "red", ar: "أحمر", ku: "سوور", en: "Red", hue: 25 },
  { key: "coral", ar: "مرجاني", ku: "کۆراڵ", en: "Coral", hue: 40 },
  { key: "orange", ar: "برتقالي", ku: "پرتەقاڵی", en: "Orange", hue: 55 },
  { key: "amber", ar: "عسلي", ku: "هەنگوینی", en: "Honey", hue: 75 },
  { key: "yellow", ar: "أصفر", ku: "زەرد", en: "Yellow", hue: 95 },
  { key: "lime", ar: "ليموني", ku: "لیمۆیی", en: "Lemon", hue: 120 },
  { key: "green", ar: "أخضر", ku: "سەوز", en: "Green", hue: 150 },
  { key: "emerald", ar: "زمردي", ku: "زمروودی", en: "Emerald", hue: 165 },
  { key: "teal", ar: "تركوازي", ku: "تورکوازی", en: "Turquoise", hue: 190 },
  { key: "sky", ar: "سماوي", ku: "ئاسمانی", en: "Sky Blue", hue: 220 },
  { key: "blue", ar: "أزرق", ku: "شین", en: "Blue", hue: 250 },
  { key: "indigo", ar: "نيلي", ku: "نیلی", en: "Indigo", hue: 275 },
  { key: "violet", ar: "بنفسجي", ku: "مۆر", en: "Purple", hue: 295 },
  { key: "purple", ar: "أرجواني", ku: "ئەرخەوانی", en: "Purple", hue: 315 },
  { key: "magenta", ar: "فوشيا", ku: "فوکسیا", en: "Fuchsia", hue: 335 },
  { key: "pink", ar: "وردي", ku: "پەمەیی", en: "Pink", hue: 355 },
  { key: "brown", ar: "بني", ku: "قاوەیی", en: "Brown", hue: 60 },
  { key: "grey", ar: "رمادي", ku: "خۆڵەمێشی", en: "Gray", hue: 250 },
] as const;

/** Color strength: same hue, different saturation. */
export const CARD_TONES = [
  { key: "soft", ar: "هادئ", ku: "نەرم", en: "Calm", chroma: 0.06 },
  { key: "balanced", ar: "متوازن", ku: "هاوسەنگ", en: "Balanced", chroma: 0.12 },
  { key: "vivid", ar: "زاهي", ku: "زیندوو", en: "Vivid", chroma: 0.17 },
  { key: "neon", ar: "ساطع", ku: "درەوشاوە", en: "Bright", chroma: 0.23 },
] as const;

const gradientOf = (hue: number, chroma: number) =>
  `linear-gradient(135deg, oklch(0.34 ${chroma * 0.85} ${hue}), oklch(0.63 ${chroma} ${hue}))`;

const MUTED_KEYS = new Set(["brown", "grey"]);

export function ColorField({
  label,
  hue,
  chroma,
  onChange,
}: {
  label: string;
  hue: string;
  chroma: string;
  onChange: (hue: string, chroma: string) => void;
}) {
  const { lang, t } = useI18n();
  const h = Number(hue) || 0;
  const c = Number(chroma) || 0;
  const swatch =
    CARD_COLORS.find((sw) => Math.abs(sw.hue - h) < 6 && (MUTED_KEYS.has(sw.key) ? c < 0.09 : c >= 0.09)) ??
    CARD_COLORS.find((sw) => Math.abs(sw.hue - h) < 6);
  const tone = CARD_TONES.reduce((best, tn) =>
    Math.abs(tn.chroma - c) < Math.abs(best.chroma - c) ? tn : best,
  );

  return (
    <Field label={label}>
      <div className="space-y-2.5 rounded-xl border border-border bg-secondary/40 p-2.5">
        {/* live card preview */}
        <div
          className="flex h-16 items-end justify-between rounded-lg p-2.5 text-primary-foreground shadow-card"
          style={{ backgroundImage: gradientOf(h, c) }}
        >
          <span className="text-[12px] font-extrabold drop-shadow">
            {swatch ? swatch[lang] : ""} · {tone[lang]}
          </span>
          <span className="rounded-full bg-background/25 px-2 py-0.5 text-[10px] font-bold">
            {t("preview")}
          </span>
        </div>

        {/* hue swatches */}
        <div className="grid grid-cols-9 gap-1.5">
          {CARD_COLORS.map((sw) => {
            const swChroma = MUTED_KEYS.has(sw.key) ? Math.min(c, 0.05) || 0.04 : c || 0.12;
            const active = swatch?.key === sw.key;
            return (
              <button
                key={sw.key}
                type="button"
                title={sw[lang]}
                aria-label={sw[lang]}
                onClick={() =>
                  onChange(
                    String(sw.hue),
                    String(MUTED_KEYS.has(sw.key) ? 0.04 : Math.max(c, 0.06) || 0.12),
                  )
                }
                className={`grid aspect-square place-items-center rounded-lg border-2 transition-transform active:scale-90 ${
                  active ? "border-foreground scale-105" : "border-transparent"
                }`}
                style={{ backgroundImage: gradientOf(sw.hue, swChroma) }}
              >
                {active && <Check className="size-3.5 text-primary-foreground drop-shadow" />}
              </button>
            );
          })}
        </div>

        {/* tone row */}
        <div className="grid grid-cols-4 gap-1.5">
          {CARD_TONES.map((tn) => {
            const active = tone.key === tn.key;
            return (
              <button
                key={tn.key}
                type="button"
                onClick={() => onChange(String(h || 250), String(tn.chroma))}
                className={`space-y-1 rounded-lg border p-1 text-[10px] font-bold ${
                  active ? "border-foreground bg-background" : "border-border"
                }`}
              >
                <span
                  className="block h-5 rounded"
                  style={{ backgroundImage: gradientOf(h || 250, tn.chroma) }}
                />
                {tn[lang]}
              </button>
            );
          })}
        </div>
      </div>
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-3.5 py-2.5 transition-colors">
      <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs dark:shadow-none text-slate-900 dark:text-slate-100 transition-colors duration-200", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-3">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
        <span className="h-4 w-1 rounded-full bg-[#007979]" />
        {title}
      </h2>
      {action}
    </div>
  );
}

