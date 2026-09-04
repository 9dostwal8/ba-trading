import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Grid3X3,
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

export type PanelItem = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  color?: string; // Gradient or accent color
  badge?: string | number;
};

export type PanelGroup = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
  badge?: string | number;
  items: PanelItem[];
};

export function PanelShell({
  title,
  groups,
  active,
  onOpen,
  onClose,
  children,
}: {
  title?: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  showKpis?: boolean;
  groups: PanelGroup[];
  active: string | null;
  onOpen: (key: string) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  const Back = lang === "ar" || lang === "ku" ? ChevronRight : ChevronLeft;

  const [searchQuery, setSearchQuery] = useState<string>("");

  // Flatten all items across all groups into the Odoo app list
  const allItems = useMemo(() => {
    return groups.flatMap((g) =>
      g.items.map((item) => ({
        ...item,
        groupLabel: g.label,
        color: item.color || g.color || "from-teal-500 to-emerald-600",
      }))
    );
  }, [groups]);

  const activeItem = allItems.find((i) => i.key === active);

  // Filter apps by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.hint && item.hint.toLowerCase().includes(q))
    );
  }, [allItems, searchQuery]);

  // -------------------------------------------------------------
  // VIEW 1: ACTIVE MODULE WORKSPACE (Odoo Breadcrumb View)
  // -------------------------------------------------------------
  if (activeItem) {
    const ActiveIcon = activeItem.icon;

    return (
      <div className="min-h-screen bg-slate-50/70 pb-16 font-sans">
        {/* Minimal Odoo Top Bar with Back to Apps */}
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur shadow-2xs">
          <div className="mx-auto flex max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between gap-3">
            
            {/* Left: Odoo Apps Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={onClose}
                className="group flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-[#007979] hover:text-white hover:border-[#007979] px-3 py-1.5 text-xs font-bold text-slate-700 transition-all active:scale-95"
                title={lang === "ar" ? "العودة للتطبيقات" : lang === "ku" ? "گەڕانەوە بۆ ئەپەکان" : "Back to Apps"}
              >
                <Grid3X3 className="size-4" />
                <span>
                  {lang === "ar" ? "التطبيقات" : lang === "ku" ? "ئەپەکان" : "Apps"}
                </span>
                <Back className="size-3 text-slate-400 group-hover:text-white" />
              </button>

              <span className="text-slate-300 font-light">/</span>

              {/* Current App with quick switch dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-slate-100 transition-colors">
                  <span className={`grid size-6 place-items-center rounded-lg bg-gradient-to-tr ${activeItem.color} text-white shadow-xs`}>
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="truncate max-w-[150px] sm:max-w-[280px]">
                    {activeItem.label}
                  </span>
                  <ChevronDown className="size-3 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1 bg-white border border-slate-200 shadow-xl rounded-2xl max-h-80 overflow-y-auto">
                  {allItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => onOpen(item.key)}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer ${
                          item.key === active
                            ? "bg-[#007979] text-white"
                            : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <span className={`grid size-6 place-items-center rounded-md bg-gradient-to-tr ${item.color} text-white shrink-0`}>
                          <ItemIcon className="size-3" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Close App Button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors active:scale-95"
            >
              <X className="size-4" />
              <span className="hidden xs:inline">
                {lang === "ar" ? "إغلاق" : lang === "ku" ? "داخستن" : "Close"}
              </span>
            </button>
          </div>
        </div>

        {/* Active Tool Content */}
        <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] p-3 sm:p-6">
          {children}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ODOO APP LAUNCHER GRID (Matching Screenshot)
  // -------------------------------------------------------------
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-100/90 via-indigo-50/20 to-slate-100/90 flex flex-col justify-start py-8 sm:py-12 px-4 font-sans">
      <div className="mx-auto w-full max-w-5xl">
        
        {/* Discreet Search Bar (Odoo Type-to-Filter) */}
        <div className="mb-8 sm:mb-10 max-w-sm mx-auto">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "ابحث عن تطبيق..."
                  : lang === "ku"
                  ? "گەڕان لە ئەپەکان..."
                  : "Search apps..."
              }
              className="w-full h-10 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur ps-10 pe-9 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#007979] focus:outline-none focus:ring-2 focus:ring-[#007979]/20 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Odoo App Tiles Grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 backdrop-blur p-12 text-center max-w-md mx-auto">
            <Search className="mx-auto size-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">
              {lang === "ar"
                ? "لم يتم العثور على أي تطبيق"
                : lang === "ku"
                ? "هیچ ئەپێک نەدۆزرایەوە"
                : "No apps match your search"}
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#007979] text-white text-xs font-bold shadow-xs"
            >
              {lang === "ar" ? "مسح البحث" : lang === "ku" ? "سڕینەوە" : "Clear search"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-7 sm:gap-y-9 gap-x-4 sm:gap-x-8 place-items-center">
            {filteredItems.map((app) => {
              const Icon = app.icon;

              return (
                <button
                  key={app.key}
                  onClick={() => onOpen(app.key)}
                  className="group flex flex-col items-center focus:outline-none transition-transform"
                >
                  {/* Odoo White Squircle Tile */}
                  <div className="relative size-20 sm:size-24 rounded-2xl sm:rounded-3xl bg-white shadow-sm group-hover:shadow-xl border border-slate-200/80 group-hover:border-slate-300 flex items-center justify-center transition-all duration-200 group-hover:-translate-y-2 group-hover:scale-105 active:scale-95">
                    
                    {/* Centered Graphic Icon in Odoo Style */}
                    <span className={`grid size-11 sm:size-13 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-tr ${app.color} text-white shadow-sm transition-transform duration-200 group-hover:scale-110`}>
                      <Icon className="size-6 sm:size-7 stroke-[2.2]" />
                    </span>

                    {/* Badge if available */}
                    {app.badge && (
                      <span className="absolute -top-1.5 -end-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  {/* App Title Underneath */}
                  <span className="mt-2 text-xs font-bold text-slate-700 group-hover:text-slate-950 text-center truncate max-w-[84px] sm:max-w-[105px] transition-colors leading-tight">
                    {app.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
