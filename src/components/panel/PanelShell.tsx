import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export type PanelItem = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
};

export type PanelGroup = {
  label: string;
  items: PanelItem[];
};

/**
 * One simple panel layout for admin + vendor:
 * a plain menu of tools, and one full screen per tool with a back button.
 * No nested tab strips, no hidden state.
 */
export function PanelShell({
  title,
  subtitle,
  kpis,
  groups,
  active,
  onOpen,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  groups: PanelGroup[];
  active: string | null;
  onOpen: (key: string) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  const Back = lang === "ar" || lang === "ku" ? ChevronRight : ChevronLeft;
  const Go = lang === "ar" || lang === "ku" ? ChevronLeft : ChevronRight;

  const activeItem = groups.flatMap((g) => g.items).find((i) => i.key === active);

  if (activeItem) {
    const Icon = activeItem.icon;
    return (
      <div className="min-h-screen bg-secondary/40 pb-10">
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-card/95 px-3 py-2.5 backdrop-blur">
          <button
            onClick={onClose}
            aria-label={activeItem.label}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-background active:scale-95"
          >
            <Back className="size-4" />
          </button>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold">{activeItem.label}</p>
        </div>
        <div className="p-3">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 pb-10">
      <div className="bg-gradient-hero px-4 pb-5 pt-4 text-primary-foreground">
        <h1 className="text-[17px] font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[11.5px] font-semibold opacity-90">{subtitle}</p>}
        {!!kpis?.length && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
                <p className="truncate text-[10.5px] font-semibold opacity-85">{k.label}</p>
                <p className="mt-0.5 truncate text-[14px] font-extrabold">{k.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 p-3">
        {groups.map((g) => (
          <section key={g.label} className="space-y-2">
            <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
              {g.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => onOpen(item.key)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-start transition-colors active:bg-secondary/60 ${
                      i ? "border-t border-border/60" : ""
                    }`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-extrabold">{item.label}</span>
                      {item.hint && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </span>
                    <Go className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
