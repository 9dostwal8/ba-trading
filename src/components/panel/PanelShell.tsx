import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Grid3X3,
  ChevronDown,
  Sun,
  Moon,
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

  // User-specific dark/light mode preference with localStorage persistence
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_theme_mode");
      if (saved === "dark" || saved === "light") return saved;
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("admin_theme_mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin_theme_mode", "light");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

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
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 pb-16 font-sans transition-colors duration-200">
        {/* Minimal Odoo Top Bar with Back to Apps */}
        <div className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 backdrop-blur shadow-2xs">
          <div className="mx-auto flex max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between gap-3">
            
            {/* Left: Odoo Apps Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={onClose}
                className="group flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-[#007979] hover:text-white hover:border-[#007979] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95"
                title={lang === "ar" ? "العودة للتطبيقات" : lang === "ku" ? "گەڕانەوە بۆ ئەپەکان" : "Back to Apps"}
              >
                <Grid3X3 className="size-4" />
                <span>
                  {lang === "ar" ? "التطبيقات" : lang === "ku" ? "ئەپەکان" : "Apps"}
                </span>
                <Back className="size-3 text-slate-400 group-hover:text-white" />
              </button>

              <span className="text-slate-300 dark:text-slate-700 font-light">/</span>

              {/* Current App with quick switch dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className={`grid size-6 place-items-center rounded-lg bg-gradient-to-tr ${activeItem.color} text-white shadow-xs`}>
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="truncate max-w-[150px] sm:max-w-[280px]">
                    {activeItem.label}
                  </span>
                  <ChevronDown className="size-3 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl max-h-80 overflow-y-auto">
                  {allItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => onOpen(item.key)}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer ${
                          item.key === active
                            ? "bg-[#007979] text-white"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
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

            {/* Right: Theme Toggle + Close App Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                type="button"
                aria-label="Toggle Theme"
                title={
                  theme === "dark"
                    ? (lang === "ku" ? "دۆخی ڕووناک" : lang === "ar" ? "الوضع الفاتح" : "Light Mode")
                    : (lang === "ku" ? "دۆخی تاریک" : lang === "ar" ? "الوضع الداكن" : "Dark Mode")
                }
                className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#007979] dark:hover:text-teal-400 transition-colors active:scale-95"
              >
                {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600" />}
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors active:scale-95"
              >
                <X className="size-4" />
                <span className="hidden xs:inline">
                  {lang === "ar" ? "إغلاق" : lang === "ku" ? "داخستن" : "Close"}
                </span>
              </button>
            </div>
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
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-100/90 via-indigo-50/20 to-slate-100/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-start py-8 sm:py-12 px-4 sm:px-8 font-sans transition-colors duration-200">
      <div className="mx-auto w-full max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px]">
        
        {/* Top Control Bar with Theme Toggle on the Left and Search in the Center */}
        <div className="mb-8 sm:mb-12 flex items-center justify-between gap-4 w-full [direction:ltr]">
          
          {/* Physical Left: User Theme Toggle Button (Dark / Light) */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle Theme"
            title={
              theme === "dark"
                ? (lang === "ku" ? "دۆخی ڕووناک" : lang === "ar" ? "الوضع الفاتح" : "Light Mode")
                : (lang === "ku" ? "دۆخی تاریک" : lang === "ar" ? "الوضع الداكن" : "Dark Mode")
            }
            className="size-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-[#007979] dark:hover:border-teal-500 hover:text-[#007979] dark:hover:text-teal-400 transition-all active:scale-95 shrink-0"
          >
            {theme === "dark" ? (
              <Sun className="size-5 text-amber-400 transition-transform rotate-0 hover:rotate-45 duration-300" />
            ) : (
              <Moon className="size-5 text-slate-600 transition-transform -rotate-12 hover:rotate-0 duration-300" />
            )}
          </button>

          {/* Center: Search Bar */}
          <div
            className="relative flex-1 max-w-md mx-auto"
            style={{ direction: lang === "ar" || lang === "ku" ? "rtl" : "ltr" }}
          >
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
              className="w-full h-11 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur ps-10 pe-9 text-xs sm:text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#007979] focus:outline-none focus:ring-2 focus:ring-[#007979]/20 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Right: Invisible Counterweight Spacer to keep Search perfectly centered */}
          <div className="size-11 shrink-0 invisible pointer-events-none" />
        </div>

        {/* Odoo App Tiles Grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-12 text-center max-w-md mx-auto">
            <Search className="mx-auto size-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 sm:gap-y-10 gap-x-4 sm:gap-x-6 md:gap-x-8 lg:gap-x-10 place-items-center w-full">
            {filteredItems.map((app) => {
              const Icon = app.icon;

              return (
                <button
                  key={app.key}
                  onClick={() => onOpen(app.key)}
                  className="group flex flex-col items-center focus:outline-none transition-transform"
                >
                  {/* Odoo White Squircle Tile */}
                  <div className="relative size-20 sm:size-24 md:size-26 lg:size-28 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/40 group-hover:shadow-xl border border-slate-200/80 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700 flex items-center justify-center transition-all duration-200 group-hover:-translate-y-2 group-hover:scale-105 active:scale-95">
                    
                    {/* Centered Graphic Icon in Odoo Style */}
                    <span className={`grid size-11 sm:size-13 md:size-15 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-tr ${app.color} text-white shadow-sm transition-transform duration-200 group-hover:scale-110`}>
                      <Icon className="size-6 sm:size-7 md:size-8 stroke-[2.2]" />
                    </span>

                    {/* Badge if available */}
                    {app.badge && (
                      <span className="absolute -top-1.5 -end-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  {/* App Title Underneath */}
                  <span className="mt-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white text-center truncate max-w-[90px] sm:max-w-[115px] transition-colors leading-tight">
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
