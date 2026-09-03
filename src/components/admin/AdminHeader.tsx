import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Globe,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
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

export function AdminHeader() {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex h-14 sm:h-16 max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] items-center justify-between px-3 sm:px-6">
        
        {/* Brand & Admin Badge */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#007979] to-teal-500 text-white shadow-md shadow-teal-500/20">
            <ShieldCheck className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                BA Trading
              </span>
              <span className="rounded-md bg-[#007979]/10 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-[#007979]">
                {lang === "ar" ? "لوحة الإدارة" : lang === "ku" ? "بەڕێوەبردن" : "Admin Panel"}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 hidden xs:block">
              {lang === "ar" ? "إدارة المتجر والطلبات والأسعار" : lang === "ku" ? "بەڕێوەبردنی کۆگا و داواکاری و نرخەکان" : "Store Operations & Management"}
            </p>
          </div>
        </div>

        {/* Right Actions: Language Dropdown & User Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* 1. Language Changer Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-black text-slate-700 shadow-2xs hover:border-[#007979] hover:text-[#007979] active:scale-95 transition"
              >
                <Globe className="size-3.5 sm:size-4 text-[#007979]" />
                <span>{langNames[lang] || "Language"}</span>
                <ChevronDown className="size-3.5 text-slate-400 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 rounded-xl p-1 shadow-lg border-slate-200">
              <DropdownMenuItem
                onClick={() => setLang("ku")}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <span>کوردی (Kurdish)</span>
                {lang === "ku" && <Check className="size-3.5 text-[#007979]" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("ar")}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <span>العربية (Arabic)</span>
                {lang === "ar" && <Check className="size-3.5 text-[#007979]" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("en")}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                <span>English (EN)</span>
                {lang === "en" && <Check className="size-3.5 text-[#007979]" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. User Profile & Logout Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 sm:pe-3 ps-1 text-xs font-black text-slate-800 shadow-2xs hover:border-[#007979] active:scale-95 transition"
              >
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-lg bg-[#007979] text-white font-black text-xs shadow-2xs">
                  {displayName.charAt(0).toUpperCase() || <User className="size-4" />}
                </div>
                <div className="text-start hidden sm:block">
                  <p className="text-[11.5px] font-black text-slate-800 leading-tight max-w-[110px] truncate">
                    {displayName}
                  </p>
                  <p className="text-[9.5px] font-extrabold text-[#007979] leading-tight">
                    {lang === "ar" ? "مدير النظام" : lang === "ku" ? "بەڕێوەبەر" : "Administrator"}
                  </p>
                </div>
                <ChevronDown className="size-3.5 text-slate-400 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-slate-200">
              
              {/* Header Info */}
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-teal-50 text-[#007979] font-black text-xs border border-teal-200/80">
                    <UserCheck className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 truncate">
                      {displayName}
                    </p>
                    {displayPhoneOrEmail && (
                      <p className="text-[10px] font-semibold text-slate-400 truncate">
                        {displayPhoneOrEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1 bg-slate-100" />

              {/* Profile Button */}
              <DropdownMenuItem
                onClick={() => navigate({ to: "/admin/profile" })}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 hover:text-slate-900"
              >
                <User className="size-4 text-[#007979]" />
                <span>{lang === "ar" ? "ملف المدير والأمان (2FA)" : lang === "ku" ? "پرۆفایلی بەڕێوەبەر (2FA)" : "Admin Profile & 2FA"}</span>
              </DropdownMenuItem>

              {/* Store Settings Quick Link */}
              <DropdownMenuItem
                onClick={() => navigate({ to: "/admin", search: { tab: "settings" } })}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings className="size-4 text-slate-500" />
                <span>{lang === "ar" ? "إعدادات المتجر" : lang === "ku" ? "ڕێکخستنەکانی کۆگا" : "Store Settings"}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-slate-100" />

              {/* Logout Button */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-black text-rose-600 cursor-pointer hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700"
              >
                <LogOut className="size-4 text-rose-500" />
                <span>{lang === "ar" ? "تسجيل الخروج" : lang === "ku" ? "چوونەدەرەوە" : "Log Out"}</span>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

        </div>

      </div>
    </header>
  );
}
