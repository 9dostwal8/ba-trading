import { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard, Sparkles } from "lucide-react";
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
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const activeItem = groups.flatMap((g) => g.items).find((i) => i.key === active);

  // Active Item Detail View
  if (activeItem) {
    const Icon = activeItem.icon;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-4 py-3 backdrop-blur shadow-sm">
          <button
            onClick={onClose}
            aria-label={activeItem.label}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors active:scale-95"
          >
            <Back className="size-4.5" />
          </button>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
            <Icon className="size-4.5" />
          </span>
          <p className="min-w-0 flex-1 truncate text-base font-extrabold text-slate-900 dark:text-white">
            {activeItem.label}
          </p>
        </div>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</div>
      </div>
    );
  }

  // Filter groups
  const filteredGroups =
    selectedFilter === "all"
      ? groups
      : groups.filter((g) => g.label === selectedFilter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16 font-sans">
      
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 sm:px-8 py-6 shadow-lg border-b border-purple-800/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-white/10 text-purple-300">
                  <LayoutDashboard className="size-4.5" />
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{title}</h1>
              </div>
              {subtitle && (
                <p className="mt-1 text-xs sm:text-sm font-semibold text-purple-200/90 ps-10">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Quick Stats Grid */}
            {!!kpis?.length && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2 sm:mt-0">
                {kpis.map((k) => (
                  <div
                    key={k.label}
                    className="rounded-2xl bg-white/10 hover:bg-white/15 px-3.5 py-2.5 backdrop-blur-md border border-white/10 transition-colors"
                  >
                    <p className="truncate text-[11px] font-medium text-purple-200/80">{k.label}</p>
                    <p className="mt-0.5 truncate text-base sm:text-lg font-extrabold text-white">{k.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Filter Category Pills */}
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === "all"
                  ? "bg-white text-purple-950 shadow-md scale-105"
                  : "bg-white/10 text-purple-100 hover:bg-white/20"
              }`}
            >
              {lang === "ar" ? "الكل" : lang === "ku" ? "هەمووی" : "All Sections"}
            </button>
            {groups.map((g) => (
              <button
                key={g.label}
                onClick={() => setSelectedFilter(g.label)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedFilter === g.label
                    ? "bg-white text-purple-950 shadow-md scale-105"
                    : "bg-white/10 text-purple-100 hover:bg-white/20"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Multi-Column Section Grid */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredGroups.map((g) => (
            <section
              key={g.label}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 hover:border-purple-500/30 transition-all duration-300"
            >
              {/* Group Category Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-purple-600" />
                  <span>{g.label}</span>
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {g.items.length}
                </span>
              </div>

              {/* Grid Tiles */}
              <div className="grid grid-cols-1 gap-2.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onOpen(item.key)}
                      className="group flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-950/40 dark:hover:to-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:border-purple-300 dark:hover:border-purple-800 text-start transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                    >
                      {/* Icon Container */}
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-purple-600/10 to-indigo-600/10 group-hover:from-purple-600 group-hover:to-indigo-600 text-purple-600 group-hover:text-white transition-colors duration-200 shadow-sm">
                        <Icon className="size-5 stroke-[2]" />
                      </span>

                      {/* Text Details */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          {item.label}
                        </span>
                        {item.hint && (
                          <span className="block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.hint}
                          </span>
                        )}
                      </span>

                      {/* Arrow Icon */}
                      <Go className="size-4 shrink-0 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

    </div>
  );
}
