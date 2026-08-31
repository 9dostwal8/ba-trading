import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Globe,
  LogOut,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export function AdminHeader() {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
    window.location.reload();
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
              {lang === "ar" ? "إدارة المتجر والطلبات والأسعار" : lang === "ku" ? "بەڕێوەبردنی کۆگا و داواکاری و نرخەکان" : "Store Operations & Catalog"}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Language Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 sm:p-1 text-slate-600">
            <button
              type="button"
              onClick={() => setLang("ku")}
              className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs font-black transition-all ${
                lang === "ku" ? "bg-white text-[#007979] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              کوردی
            </button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs font-black transition-all ${
                lang === "ar" ? "bg-white text-[#007979] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs font-black transition-all ${
                lang === "en" ? "bg-white text-[#007979] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              EN
            </button>
          </div>

          {/* Return to Live Store */}
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-black text-slate-700 shadow-xs hover:border-[#007979] hover:text-[#007979] active:scale-95 transition"
          >
            <Store className="size-3.5 sm:size-4 text-[#007979]" />
            <span className="hidden sm:inline">
              {lang === "ar" ? "عرض المتجر" : lang === "ku" ? "بینینی کۆگا" : "Live Store"}
            </span>
            <ExternalLink className="size-3 text-slate-400" />
          </Link>

          {/* Admin User / Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title={lang === "ar" ? "تسجيل الخروج" : lang === "ku" ? "چوونەدەرەوە" : "Log out"}
            className="flex size-8 sm:size-9 items-center justify-center rounded-xl border border-rose-200/80 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition"
          >
            <LogOut className="size-4" />
          </button>

        </div>

      </div>
    </header>
  );
}
