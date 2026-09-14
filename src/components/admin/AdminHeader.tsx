import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Globe,
  LogOut,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

export function AdminHeader({
  searchQuery,
  onSearchChange,
  showSearch = true,
}: AdminHeaderProps) {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [localQuery, setLocalQuery] = useState("");

  // Sync with prop if controlled
  const currentQuery = searchQuery !== undefined ? searchQuery : localQuery;

  const handleQueryChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalQuery(val);
    }
  };

  // Dark / Light theme toggle with localStorage persistence
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
      const surfaceProps = [
        "--card",
        "--background",
        "--foreground",
        "--card-foreground",
        "--border",
        "--input",
        "--popover",
        "--popover-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--design-surface",
      ];
      for (const prop of surfaceProps) {
        document.documentElement.style.removeProperty(prop);
      }
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin_theme_mode", "light");
    }
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Fetch admin profile safely
  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        if (!user?.id) return null;
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
    window.location.reload();
  };

  const metadataName = (user?.user_metadata?.["full_name"] || user?.user_metadata?.["name"]) as string | undefined;

  const displayName =
    profile?.full_name ||
    metadataName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    (user?.phone ? user.phone : "") ||
    (lang === "ar" ? "مدير المتجر" : lang === "ku" ? "بەڕێوەبەری کۆگا" : "Admin");

  const displayPhoneOrEmail = profile?.phone || user?.phone || user?.email || "";

  const langNames: Record<string, string> = {
    ku: "کوردی",
    ar: "العربية",
    en: "English",
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xs transition-colors">
      <div className="w-full flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4">
        
        {/* Brand & Admin Badge */}
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 group"
          title="Dashboard"
        >
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#007979] to-teal-500 text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                BA Trading
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500 hidden md:block">
              {lang === "ar"
                ? "إدارة المتجر والطلبات والأسعار"
                : lang === "ku"
                ? "بەڕێوەبردنی کۆگا و داواکاری و نرخەکان"
                : "Store Operations & Management"}
            </p>
          </div>
        </Link>

        {/* Central Live Search Bar */}
        {showSearch && (
          <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={currentQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "ابحث عن تطبيق..."
                  : lang === "ku"
                  ? "گەڕان لە ئەپەکان..."
                  : "Search apps..."
              }
              className="w-full h-9 sm:h-10 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/80 backdrop-blur ps-9 pe-8 text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#007979] focus:outline-none focus:ring-2 focus:ring-[#007979]/20 shadow-2xs transition-all"
            />
            {currentQuery && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Right Actions: Theme Toggle, Language Dropdown & User Profile Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* 1. Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle Theme"
            title={
              theme === "dark"
                ? lang === "ku"
                  ? "دۆخی ڕووناک"
                  : lang === "ar"
                  ? "الوضع الفاتح"
                  : "Light Mode"
                : lang === "ku"
                ? "دۆخی تاریک"
                : lang === "ar"
                ? "الوضع الداكن"
                : "Dark Mode"
            }
            className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs hover:border-[#007979] dark:hover:border-teal-500 hover:text-[#007979] dark:hover:text-teal-400 active:scale-95 transition"
          >
            {theme === "dark" ? (
              <Sun className="size-4.5 text-amber-400 transition-transform rotate-0 hover:rotate-45 duration-300" />
            ) : (
              <Moon className="size-4.5 text-slate-600 dark:text-slate-300 transition-transform -rotate-12 hover:rotate-0 duration-300" />
            )}
          </button>

          {/* 2. Language Changer Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-2.5 sm:px-3 h-9 sm:h-10 text-xs font-black text-slate-700 dark:text-slate-200 shadow-2xs hover:border-[#007979] hover:text-[#007979] active:scale-95 transition"
              >
                <Globe className="size-3.5 sm:size-4 text-[#007979] dark:text-teal-400" />
                <span className="hidden xs:inline">{langNames[lang] || "Language"}</span>
                <ChevronDown className="size-3.5 text-slate-400 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 rounded-xl p-1 shadow-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <DropdownMenuItem
                onClick={() => setLang("ku")}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>کوردی (Kurdish)</span>
                {lang === "ku" && <Check className="size-3.5 text-[#007979] dark:text-teal-400" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("ar")}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>العربية (Arabic)</span>
                {lang === "ar" && <Check className="size-3.5 text-[#007979] dark:text-teal-400" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("en")}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>English (EN)</span>
                {lang === "en" && <Check className="size-3.5 text-[#007979] dark:text-teal-400" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 3. User Profile & Logout Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-1 sm:pe-3 ps-1 h-9 sm:h-10 text-xs font-black text-slate-800 dark:text-slate-100 shadow-2xs hover:border-[#007979] active:scale-95 transition"
              >
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-[#007979] text-white font-black text-xs shadow-2xs">
                  {displayName.charAt(0).toUpperCase() || <User className="size-4" />}
                </div>
                <div className="text-start hidden sm:block">
                  <p className="text-[11.5px] font-black text-slate-800 dark:text-slate-100 leading-tight max-w-[110px] truncate">
                    {displayName}
                  </p>
                  <p className="text-[9.5px] font-extrabold text-[#007979] dark:text-teal-400 leading-tight">
                    {lang === "ar" ? "مدير النظام" : lang === "ku" ? "بەڕێوەبەر" : "Administrator"}
                  </p>
                </div>
                <ChevronDown className="size-3.5 text-slate-400 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              
              {/* Header Info */}
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#007979] dark:text-teal-400 font-black text-xs border border-teal-200/80 dark:border-teal-800">
                    <UserCheck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    {displayPhoneOrEmail && (
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate">
                        {displayPhoneOrEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

              {/* Profile Button */}
              <DropdownMenuItem
                onClick={() => navigate({ to: "/admin/profile" })}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              >
                <User className="size-4 text-[#007979] dark:text-teal-400" />
                <span>{lang === "ar" ? "الملف الشخصي" : lang === "ku" ? "پڕۆفایل" : "Profile"}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

              {/* Logout Button */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700"
              >
                <LogOut className="size-4 text-rose-600 dark:text-rose-400" />
                <span>{lang === "ar" ? "تسجيل الخروج" : lang === "ku" ? "چوونەدەرەوە" : "Log Out"}</span>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

        </div>

      </div>
    </header>
  );
}
