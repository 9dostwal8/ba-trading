import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const PHONE_DOMAIN = "batrading.com";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
}

interface AdminAuthPortalProps {
  onSuccess?: () => void;
}

export function AdminAuthPortal({ onSuccess }: AdminAuthPortalProps) {
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error(
        lang === "ar"
          ? "يرجى كتابة رقم الهاتف / البريد وكلمة المرور"
          : lang === "ku"
            ? "تکایە ژمارەی مۆبایل یان ئیمەیڵ و وشەی نهێنی بنووسە"
            : "Please enter login credentials"
      );
      return;
    }

    setLoginLoading(true);
    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        const raw = normalizePhone(email);
        email = `${raw}@${PHONE_DOMAIN}`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success(
          lang === "ar"
            ? "تم تسجيل الدخول بنجاح!"
            : lang === "ku"
              ? "چوونەژوورەوە سەرکەوتوو بوو!"
              : "Login successful!"
        );
        queryClient.invalidateQueries();
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (/invalid login credentials/i.test(msg)) {
        toast.error(
          lang === "ar"
            ? "بيانات الدخول غير صحيحة"
            : lang === "ku"
              ? "زانیاری چوونەژوورەوە هەڵەیە"
              : "Invalid login credentials"
        );
      } else {
        toast.error(msg || "Failed to sign in");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 text-slate-900 dark:text-slate-100 font-sans">
      {/* Main Outer Container */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[2.5rem] p-3 sm:p-4 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[620px] items-stretch">
        
        {/* Left Column: Form Section (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Brand Logo Icon */}
            <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-purple-500/30">
              <ShieldCheck className="size-7 stroke-[2.2]" />
            </div>

            {/* Title & Subtitle */}
            <div className="mb-8 text-start">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {lang === "ar" ? "أهلاً بك مجدداً" : lang === "ku" ? "بەخێربێنەوە" : "Welcome Back"}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                {lang === "ar"
                  ? "قم بتسجيل الدخول للوصول إلى لوحة التحكم"
                  : lang === "ku"
                    ? "چوونەژوورەوە بۆ هەژمارەکەت بۆ بەردەوامبوون"
                    : "Sign in to your account to continue"}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-5">
              {/* Phone / Email Input */}
              <div className="space-y-2 text-start">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 ps-1">
                  {lang === "ar"
                    ? "رقم الهاتف أو البريد الإلكتروني"
                    : lang === "ku"
                      ? "ژمارەی مۆبایل یان ئیمەیڵ"
                      : "Admin Phone / Email"}
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="0770XXXXXXX / admin@batrading.iq"
                    className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2 text-start">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 ps-1">
                  {lang === "ar" ? "كلمة المرور السرية" : lang === "ku" ? "وشەی نهێنی" : "Password"}
                </label>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 pe-11 ps-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4.5 text-purple-600" />
                    ) : (
                      <Eye className="size-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold text-sm shadow-xl shadow-purple-600/25 hover:shadow-purple-600/35 hover:scale-[1.005] active:scale-[0.995] transition-all duration-200 mt-4"
              >
                {loginLoading ? (
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="size-4.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span className="tracking-wide">
                      {lang === "ar" ? "جاري التحقق..." : lang === "ku" ? "پشکنین..." : "Authenticating..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="size-4.5" />
                    <span className="tracking-wide">
                      {lang === "ar" ? "تسجيل الدخول" : lang === "ku" ? "چوونەژوورەوە" : "Sign In to Account"}
                    </span>
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Footer / Powered by Google */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs">
            <span className="flex items-center justify-center gap-2 font-medium text-slate-400 dark:text-slate-500">
              <svg className="size-4 shrink-0 opacity-80" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Powered by Google</span>
            </span>
          </div>
        </div>

        {/* Right Column: 3D Visual Hero Panel (5 cols) */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-[2rem] bg-gradient-to-tr from-purple-950 via-indigo-900 to-violet-950 flex flex-col justify-end text-white min-h-[420px] lg:min-h-full shadow-inner">
          <img
            src="/login-hero-3d.png"
            alt="3D Hero"
            className="absolute inset-0 size-full object-cover object-center transition-scale duration-700 hover:scale-105 pointer-events-none"
          />
        </div>

      </div>
    </div>
  );
}
