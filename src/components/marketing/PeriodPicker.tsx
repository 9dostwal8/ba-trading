import { CalendarRange } from "lucide-react";
import { chargeMonths, chargeYears, periodLabel, type VendorCharge } from "@/lib/charges";
import { useI18n } from "@/lib/i18n";

/**
 * Year + month selector for vendor marketing charges.
 * `value` is "all", a year ("2026") or a month ("2026-08").
 */
export function PeriodPicker({
  rows,
  value,
  onChange,
}: {
  rows: VendorCharge[];
  value: string;
  onChange: (period: string) => void;
}) {
  const { t, lang } = useI18n();
  const years = chargeYears(rows);
  const activeYear = value === "all" ? years[0] : value.slice(0, 4);
  const months = chargeMonths(rows, activeYear);

  if (years.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-2.5 shadow-card">
      <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
        <CalendarRange className="size-4 text-primary" />
        {t("billingPeriod")}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip active={value === "all"} onClick={() => onChange("all")}>
          {t("allPeriods")}
        </Chip>
        {years.map((y) => (
          <Chip key={y} active={value === y} onClick={() => onChange(y)}>
            {y}
          </Chip>
        ))}
      </div>

      {value !== "all" && months.length > 0 && (
        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={value === activeYear} onClick={() => onChange(activeYear!)} small>
            {t("wholeYear")}
          </Chip>
          {months.map((m) => (
            <Chip key={m} active={value === m} onClick={() => onChange(m)} small>
              {periodLabel(m, lang)}
            </Chip>
          ))}
        </div>
      )}

      <p className="text-[10.5px] leading-snug text-muted-foreground">{t("periodHint")}</p>
    </div>
  );
}

function Chip({
  active,
  small,
  onClick,
  children,
}: {
  active: boolean;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full font-extrabold transition-colors active:scale-95 ${
        small ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-1.5 text-[11.5px]"
      } ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}
