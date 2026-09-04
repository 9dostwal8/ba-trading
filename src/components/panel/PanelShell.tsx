import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Grid3X3,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PanelQuickAction = {
  key: string;
  label: string;
  icon?: LucideIcon;
  primary?: boolean;
};

export type PanelItem = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
};

export type PanelGroup = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  color?: "teal" | "amber" | "emerald" | "purple" | "indigo" | "slate" | string;
  badge?: string | number;
  quickActions?: PanelQuickAction[];
  items: PanelItem[];
};

export function PanelShell({
  title,
  subtitle,
  kpis,
  showKpis = false,
  groups,
  active,
  topQuickActions,
  onOpen,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  showKpis?: boolean;
  groups: PanelGroup[];
  active: string | null;
  topQuickActions?: { key: string; label: string; icon: LucideIcon; external?: boolean; url?: string }[];
  onOpen: (key: string) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  const Back = lang === "ar" || lang === "ku" ? ChevronRight : ChevronLeft;
  const Go = lang === "ar" || lang === "ku" ? ChevronLeft : ChevronRight;

  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeItem = allItems.find((i) => i.key === active);
  const activeGroup = groups.find((g) => g.items.some((i) => i.key === active));

  // Search filtering logic (searches group labels, descriptions, item labels, and quick actions)
  const filteredGroups = useMemo(() => {
    let result = groups;

    if (selectedFilter !== "all") {
      result = result.filter((g) => g.label === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result
        .map((g) => {
          const matchGroup =
            g.label.toLowerCase().includes(q) ||
            (g.description && g.description.toLowerCase().includes(q));

          const matchingItems = g.items.filter(
            (i) =>
              i.label.toLowerCase().includes(q) ||
              (i.hint && i.hint.toLowerCase().includes(q))
          );

          const matchingQuick =
            g.quickActions?.filter((qa) => qa.label.toLowerCase().includes(q)) ?? [];

          if (matchGroup || matchingItems.length > 0 || matchingQuick.length > 0) {
            return {
              ...g,
              items: matchGroup ? g.items : matchingItems,
            };
          }
          return null;
        })
        .filter(Boolean) as PanelGroup[];
    }

    return result;
  }, [groups, selectedFilter, searchQuery]);

  // COLOR ACCENTS HELPER (Odoo-style vibrant ERP themes)
  const getColorStyles = (color?: string) => {
    switch (color) {
      case "teal":
        return {
          badgeBg: "bg-teal-500/10 text-teal-700 border-teal-200",
          iconBg: "bg-teal-600 text-white shadow-teal-500/25",
          primaryBtn: "bg-[#007979] hover:bg-teal-700 text-white shadow-teal-600/20",
          secondaryBtn: "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200/80",
          cardBorder: "hover:border-teal-400/60",
          bannerGrad: "from-teal-600/10 via-teal-500/5 to-transparent",
        };
      case "amber":
        return {
          badgeBg: "bg-amber-500/10 text-amber-800 border-amber-200",
          iconBg: "bg-amber-500 text-white shadow-amber-500/25",
          primaryBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
          secondaryBtn: "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200/80",
          cardBorder: "hover:border-amber-400/60",
          bannerGrad: "from-amber-600/10 via-amber-500/5 to-transparent",
        };
      case "emerald":
        return {
          badgeBg: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
          iconBg: "bg-emerald-600 text-white shadow-emerald-500/25",
          primaryBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
          secondaryBtn: "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80",
          cardBorder: "hover:border-emerald-400/60",
          bannerGrad: "from-emerald-600/10 via-emerald-500/5 to-transparent",
        };
      case "purple":
        return {
          badgeBg: "bg-purple-500/10 text-purple-700 border-purple-200",
          iconBg: "bg-purple-600 text-white shadow-purple-500/25",
          primaryBtn: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20",
          secondaryBtn: "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200/80",
          cardBorder: "hover:border-purple-400/60",
          bannerGrad: "from-purple-600/10 via-purple-500/5 to-transparent",
        };
      case "indigo":
        return {
          badgeBg: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
          iconBg: "bg-indigo-600 text-white shadow-indigo-500/25",
          primaryBtn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20",
          secondaryBtn: "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200/80",
          cardBorder: "hover:border-indigo-400/60",
          bannerGrad: "from-indigo-600/10 via-indigo-500/5 to-transparent",
        };
      case "slate":
      default:
        return {
          badgeBg: "bg-slate-500/10 text-slate-700 border-slate-200",
          iconBg: "bg-slate-700 text-white shadow-slate-500/25",
          primaryBtn: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-700/20",
          secondaryBtn: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200",
          cardBorder: "hover:border-slate-400/60",
          bannerGrad: "from-slate-600/10 via-slate-500/5 to-transparent",
        };
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: ACTIVE MODULE DETAIL VIEW (Odoo Breadcrumb Workspace)
  // -------------------------------------------------------------
  if (activeItem) {
    const ActiveIcon = activeItem.icon;
    const styles = getColorStyles(activeGroup?.color);

    return (
      <div className="min-h-screen bg-slate-50/70 pb-16 font-sans">
        {/* Odoo Top Breadcrumb Bar */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur shadow-2xs">
          <div className="mx-auto flex max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between gap-3">
            
            {/* Left: Odoo Breadcrumb Trail */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={onClose}
                className="group flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#007979] hover:text-white hover:border-[#007979] transition-all"
                title={lang === "ar" ? "العودة للتطبيقات" : lang === "ku" ? "گەڕانەوە بۆ ئەپەکان" : "Back to Apps"}
              >
                <Grid3X3 className="size-3.5" />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "التطبيقات" : lang === "ku" ? "ئەپەکان" : "Apps"}
                </span>
                <Back className="size-3 text-slate-400 group-hover:text-white" />
              </button>

              <span className="text-slate-300 font-light">/</span>

              {/* Current App with quick switch dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-900 hover:bg-slate-100 transition-colors">
                  <span className={`grid size-6 place-items-center rounded-md ${styles.iconBg} text-white`}>
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="truncate max-w-[150px] sm:max-w-[280px]">
                    {activeItem.label}
                  </span>
                  <ChevronDown className="size-3 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1 bg-white border border-slate-200 shadow-xl rounded-xl">
                  {allItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => onOpen(item.key)}
                        className={`flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                          item.key === active
                            ? "bg-[#007979] text-white"
                            : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <ItemIcon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Quick Action to close/return */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors"
            >
              <X className="size-3.5" />
              <span className="hidden xs:inline">
                {lang === "ar" ? "إغلاق" : lang === "ku" ? "داخستن" : "Close"}
              </span>
            </button>
          </div>
        </div>

        {/* Work Area Content */}
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] p-3 sm:p-6">
          {children}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ODOO APPS LAUNCHER & QUICK BUTTONS DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      
      {/* 1. Odoo Command Header Bar */}
      <div className="border-b border-slate-200/90 bg-white shadow-2xs sticky top-0 z-20">
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            
            {/* Odoo App Launcher Title & Search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-[#007979] to-teal-500 text-white shadow-sm">
                  <Grid3X3 className="size-5" />
                </span>
                <div>
                  <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Instant Search Bar */}
              <div className="relative flex-1 max-w-md ms-2">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === "ar"
                      ? "ابحث عن تطبيق، أمر، أو زر سريع..."
                      : lang === "ku"
                      ? "گەڕان لە ئەپەکان، بەشەکان یان دوگمە خێراکان..."
                      : "Search apps, modules, or quick buttons..."
                  }
                  className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/80 ps-9 pe-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#007979] focus:outline-none focus:ring-1 focus:ring-[#007979] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Top Quick Actions Ribbon */}
            {topQuickActions && topQuickActions.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0 no-scrollbar">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider hidden lg:inline me-1">
                  {lang === "ar" ? "أزرار سريعة:" : lang === "ku" ? "کرداری خێرا:" : "Quick Actions:"}
                </span>
                {topQuickActions.map((qa) => {
                  const Icon = qa.icon;
                  if (qa.external && qa.url) {
                    return (
                      <a
                        key={qa.key}
                        href={qa.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs whitespace-nowrap active:scale-95"
                      >
                        <Icon className="size-3.5 text-slate-500" />
                        <span>{qa.label}</span>
                        <ExternalLink className="size-3 text-slate-400" />
                      </a>
                    );
                  }

                  return (
                    <button
                      key={qa.key}
                      onClick={() => onOpen(qa.key)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#007979]/20 bg-[#007979]/10 hover:bg-[#007979] text-[#007979] hover:text-white text-xs font-bold transition-all shadow-2xs whitespace-nowrap active:scale-95"
                    >
                      <Icon className="size-3.5" />
                      <span>{qa.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Module Filter Pills */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-2.5">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100/90 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang === "ar" ? "جميع التطبيقات" : lang === "ku" ? "هەموو ئەپەکان" : "All Apps"}
            </button>
            {groups.map((g) => (
              <button
                key={g.label}
                onClick={() => setSelectedFilter(g.label)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedFilter === g.label
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/90 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{g.label}</span>
                {g.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                    {g.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Optional KPIs strip (kept strictly conditional for backwards compatibility, hidden by default) */}
      {showKpis && !!kpis?.length && (
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3 sm:px-6 pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-xl bg-white border border-slate-200/80 p-3 shadow-2xs"
              >
                <p className="truncate text-xs font-semibold text-slate-500">{k.label}</p>
                <p className="mt-1 truncate text-base font-black text-slate-900">{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Odoo Kanban Modular Apps Grid */}
      <main className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] p-3 sm:p-6">
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Search className="mx-auto size-10 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">
              {lang === "ar"
                ? "لم يتم العثور على أي تطبيقات أو أزرار تطابق بحثك"
                : lang === "ku"
                ? "هیچ ئەپ یان کردارێک نەدۆزرایەوە کە لەگەڵ گەڕانەکەت بگونجێت"
                : "No modules or actions match your search query"}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("all");
              }}
              className="mt-3 px-4 py-1.5 rounded-lg bg-[#007979] text-white text-xs font-bold shadow-sm"
            >
              {lang === "ar" ? "إعادة تعيين البحث" : lang === "ku" ? "سڕینەوەی گەڕان" : "Reset Filter"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
            {filteredGroups.map((group) => {
              const styles = getColorStyles(group.color);
              const GroupIcon = group.icon || Grid3X3;

              return (
                <div
                  key={group.label}
                  className={`group rounded-2xl bg-white border border-slate-200/80 shadow-2xs ${styles.cardBorder} hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}
                >
                  {/* Card Header (Odoo App identity banner) */}
                  <div className={`p-4 bg-gradient-to-b ${styles.bannerGrad} border-b border-slate-100 flex items-start justify-between gap-3`}>
                    <div className="flex items-center gap-3">
                      <span className={`grid size-11 place-items-center rounded-xl ${styles.iconBg} shadow-sm shrink-0`}>
                        <GroupIcon className="size-5.5" />
                      </span>
                      <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">
                          {group.label}
                        </h2>
                        {group.description && (
                          <p className="text-[11px] font-semibold text-slate-500 line-clamp-1 mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${styles.badgeBg} shrink-0`}>
                      {group.items.length} {lang === "ar" ? "أدوات" : lang === "ku" ? "بەش" : "tools"}
                    </span>
                  </div>

                  {/* Odoo Quick Buttons Section (The primary highlight of Odoo!) */}
                  {group.quickActions && group.quickActions.length > 0 && (
                    <div className="p-3 bg-slate-50/70 border-b border-slate-100">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                        {lang === "ar" ? "أزرار الوصول السريع" : lang === "ku" ? "دوگمە خێراکان" : "Quick Action Buttons"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.quickActions.map((qa) => {
                          const Icon = qa.icon;
                          return (
                            <button
                              key={qa.key}
                              onClick={() => onOpen(qa.key)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all shadow-2xs active:scale-95 ${
                                qa.primary
                                  ? `${styles.primaryBtn}`
                                  : `${styles.secondaryBtn} border`
                              }`}
                            >
                              {Icon && <Icon className="size-3.5 shrink-0" />}
                              <span>{qa.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-Items List (All accessible sub-features) */}
                  <div className="p-2 space-y-1 flex-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => onOpen(item.key)}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-start hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all group/item"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600 group-hover/item:bg-slate-900 group-hover/item:text-white transition-colors shrink-0">
                              <ItemIcon className="size-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-800 group-hover/item:text-[#007979] transition-colors">
                                {item.label}
                              </p>
                              {item.hint && (
                                <p className="truncate text-[10px] font-medium text-slate-400">
                                  {item.hint}
                                </p>
                              )}
                            </div>
                          </div>

                          <Go className="size-3.5 text-slate-300 group-hover/item:text-[#007979] group-hover/item:translate-x-0.5 transition-all shrink-0 ms-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
