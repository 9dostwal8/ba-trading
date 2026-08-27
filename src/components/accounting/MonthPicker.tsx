import { CalendarRange } from "lucide-react";
import { periodLabel } from "@/lib/charges";
import { useI18n } from "@/lib/i18n";

/** Last 12 months + "all" — the only period control accounting needs. */
export function MonthPicker({
  value,
  onChange,
  months = 12,
}: {
  value: string;
  onChange: (period: string) => void;
  months?: number;
}) {
  const { t, lang } = useI18n();
  const now = new Date();
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-2.5 shadow-card">
      <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
        <CalendarRange className="size-4 text-primary" />
        {t("billingPeriod")}
      </div>
      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={value === "all"} onClick={() => onChange("all")}>
          {t("allPeriods")}
        </Chip>
        {keys.map((k) => (
          <Chip key={k} active={value === k} onClick={() => onChange(k)}>
            {periodLabel(k, lang)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition-colors active:scale-95 ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
