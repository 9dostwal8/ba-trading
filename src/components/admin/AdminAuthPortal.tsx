import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
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

  // Security: Brute-Force Rate Limiting
  const MAX_FAILED_ATTEMPTS = 5;
  const [failedAttempts, setFailedAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("admin_failed_attempts") || "0", 10);
  });
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Security: Human Anti-Bot Challenge
  const [challenge, setChallenge] = useState(() => ({
    a: Math.floor(Math.random() * 8) + 3,
    b: Math.floor(Math.random() * 8) + 2,
  }));
  const [challengeInput, setChallengeInput] = useState("");

  const refreshChallenge = () => {
    setChallenge({
      a: Math.floor(Math.random() * 8) + 3,
      b: Math.floor(Math.random() * 8) + 2,
    });
    setChallengeInput("");
  };

  // Security: 2FA Step State
  const [mfaStep, setMfaStep] = useState<{ factorId: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkLockout = () => {
      const lockUntil = parseInt(localStorage.getItem("admin_lockout_until") || "0", 10);
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setLockoutSeconds(remaining);
      if (remaining === 0 && lockUntil > 0) {
        localStorage.removeItem("admin_lockout_until");
        localStorage.setItem("admin_failed_attempts", "0");
        setFailedAttempts(0);
      }
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  // Security: Check if active session requires 2FA on mount
  useEffect(() => {
    async function checkPendingMfa() {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");
          if (verifiedTotp) {
            setMfaStep({ factorId: verifiedTotp.id });
          }
        }
      } catch (err) {
        console.warn("MFA on mount check:", err);
      }
    }
    checkPendingMfa();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutSeconds > 0) {
      toast.error(
        lang === "ar"
          ? `النظام مغلق مؤقتاً لأسباب أمنية. يرجى الانتظار ${lockoutSeconds} ثانية.`
          : lang === "ku"
            ? `سیستم بە شێوەیەکی کاتی قوفڵ کراوە. تکایە ${lockoutSeconds} چرکە چاوەڕێ بکە.`
            : `Login is temporarily locked for security. Please wait ${lockoutSeconds}s.`
      );
      return;
    }

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

    if (parseInt(challengeInput.trim(), 10) !== challenge.a + challenge.b) {
      toast.error(
        lang === "ar"
          ? "رمز التحقق البشري غير صحيح، يرجى إعادة المحاولة"
          : lang === "ku"
            ? "پشکنینی مرۆڤ هەڵەیە، تکایە دووبارە تاقی بکەرەوە"
            : "Human verification failed. Please try again."
      );
      refreshChallenge();
      return;
    }

    setLoginLoading(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        const raw = normalizePhone(email);
        email = `${raw}@${PHONE_DOMAIN}`;
      }

      const [{ data, error }] = await Promise.all([
        supabase.auth.signInWithPassword({ email, password }),
        minDelay,
      ]);

      if (error) throw error;

      if (data.user) {
        // Check if account has 2FA (TOTP) enabled
        try {
          const [{ data: aal }, { data: factors }] = await Promise.all([
            supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
            supabase.auth.mfa.listFactors(),
          ]);
          const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");
          if ((aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") || verifiedTotp) {
            if (verifiedTotp) {
              setMfaStep({ factorId: verifiedTotp.id });
              setLoginLoading(false);
              return;
            }
          }
        } catch (mfaErr) {
          console.warn("MFA check:", mfaErr);
        }

        // Complete normal login
        if (typeof window !== "undefined") {
          localStorage.removeItem("admin_failed_attempts");
          localStorage.removeItem("admin_lockout_until");
        }
        setFailedAttempts(0);
        setLockoutSeconds(0);
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
    } catch {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      refreshChallenge();

      if (typeof window !== "undefined") {
        localStorage.setItem("admin_failed_attempts", String(newAttempts));
      }

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + 300 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_lockout_until", String(lockUntil));
        }
        setLockoutSeconds(300);
        toast.error(
          lang === "ar"
            ? "تم قفل الدخول لمدة 5 دقائق لتكرار المحاولات الخاطئة."
            : lang === "ku"
              ? "چوونەژوورەوە بۆ ماوەی 5 خولەک قوفڵ کرا بەهۆی هەڵەی بەردەوام."
              : "Too many failed attempts. Login locked for 5 minutes."
        );
      } else if (newAttempts >= 3) {
        const lockUntil = Date.now() + 30 * 1000;
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_lockout_until", String(lockUntil));
        }
        setLockoutSeconds(30);
        toast.error(
          lang === "ar"
            ? `بيانات الدخول غير صحيحة. تم تفعيل قفل حماية لمدة 30 ثانية (المحاولة ${newAttempts} من ${MAX_FAILED_ATTEMPTS})`
            : lang === "ku"
              ? `زانیاری هەڵەیە. قوفڵی پاراستن بۆ 30 چرکە چالاک کرا (هەوڵی ${newAttempts} لە ${MAX_FAILED_ATTEMPTS})`
              : `Invalid credentials. 30s security cooldown enabled (Attempt ${newAttempts} of ${MAX_FAILED_ATTEMPTS})`
        );
      } else {
        toast.error(
          lang === "ar"
            ? `بيانات الدخول غير صحيحة (المتبقي ${MAX_FAILED_ATTEMPTS - newAttempts} محاولات قبل القفل)`
            : lang === "ku"
              ? `زانیاری هەڵەیە (${MAX_FAILED_ATTEMPTS - newAttempts} هەوڵ ماوە پێش قوفڵ)`
              : `Invalid credentials (${MAX_FAILED_ATTEMPTS - newAttempts} attempts remaining before lockout)`
        );
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaStep || totpCode.trim().length < 6) return;

    setMfaVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaStep.factorId });
      if (challenge.error) throw challenge.error;

      const verifyRes = await supabase.auth.mfa.verify({
        factorId: mfaStep.factorId,
        challengeId: challenge.data.id,
        code: totpCode.trim(),
      });

      if (verifyRes.error) throw verifyRes.error;

      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_failed_attempts");
        localStorage.removeItem("admin_lockout_until");
      }
      setFailedAttempts(0);
      setLockoutSeconds(0);
      setMfaStep(null);
      toast.success(
        lang === "ar"
          ? "تم تأكيد الرمز وتسجيل الدخول بنجاح!"
          : lang === "ku"
            ? "کۆدی 2FA پەسەندکرا و چوونەژوورەوە سەرکەوتوو بوو!"
            : "Two-Factor authentication verified!"
      );
      queryClient.invalidateQueries();
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch {
      toast.error(
        lang === "ar"
          ? "رمز المصادقة (2FA) غير صحيح أو منتهي الصلاحية"
          : lang === "ku"
            ? "کۆدی 2FA هەڵەیە یان بەسەرچووە"
            : "Invalid or expired 2FA code."
      );
    } finally {
      setMfaVerifying(false);
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

            {mfaStep ? (
              /* Step 2: 2FA Verification Form */
              <form onSubmit={handleMfaVerify} className="space-y-5 animate-in fade-in zoom-in-95">
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-center space-y-1">
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-300">
                    {lang === "ar"
                      ? "المصادقة الثنائية (Google Authenticator) مطلوبة"
                      : lang === "ku"
                        ? "پشتڕاستکردنەوەی دوو قۆناغی (Google Authenticator) پێویستە"
                        : "Two-Factor Authentication Required"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === "ar"
                      ? "أدخل الرمز المكون من 6 أرقام من تطبيق Google Authenticator:"
                      : lang === "ku"
                        ? "کۆدی 6 ژمارەیی لە ئەپی Google Authenticator بنووسە:"
                        : "Enter the 6-digit code from your Google Authenticator app:"}
                  </p>
                </div>

                <div className="space-y-2 text-start">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="h-14 text-center text-3xl font-mono font-black tracking-widest rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-purple-600 dark:text-purple-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    disabled={mfaVerifying || totpCode.trim().length < 6}
                    className="w-full h-12 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-extrabold text-sm shadow-xl shadow-purple-600/25 hover:shadow-purple-600/35 transition-all"
                  >
                    {mfaVerifying ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>{lang === "ar" ? "جاري التحقق..." : lang === "ku" ? "پشکنین..." : "Verifying..."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>{lang === "ar" ? "تأكيد والدخول" : lang === "ku" ? "پەسەندکردن و چوونەژوورەوە" : "Verify & Sign In"}</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setMfaStep(null);
                      setTotpCode("");
                    }}
                    className="w-full text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    {lang === "ar" ? "إلغاء والعودة لتسجيل الدخول" : lang === "ku" ? "پاشگەزبوونەوە و چوونەژوورەوە لە سەرەتاوە" : "Cancel & Return to Login"}
                  </Button>
                </div>
              </form>
            ) : (
              /* Step 1: Standard Credentials Form */
              <form onSubmit={handleAdminLogin} className="space-y-4">
                
                {/* Security Lockout Banner */}
                {lockoutSeconds > 0 && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-red-600 dark:text-red-300 flex items-center gap-3 text-xs animate-in fade-in zoom-in-95">
                    <Clock className="size-5 shrink-0 text-red-500 animate-pulse" />
                    <div>
                      <p className="font-bold">
                        {lang === "ar" ? "قفل الحماية الأمني نشط" : lang === "ku" ? "قوفڵی پاراستن چالاکە" : "Security Lockout Active"}
                      </p>
                      <p className="opacity-90 mt-0.5">
                        {lang === "ar"
                          ? `تم تجميد تسجيل الدخول مؤقتاً. يرجى الانتظار ${lockoutSeconds} ثانية.`
                          : lang === "ku"
                            ? `چوونەژوورەوە بە کاتی قوفڵ کراوە. تکایە ${lockoutSeconds} چرکە چاوەڕێ بکە.`
                            : `Too many failed attempts. Try again in ${lockoutSeconds}s.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Failed Attempt Warning Banner */}
                {failedAttempts > 0 && lockoutSeconds === 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-300 flex items-center gap-2 text-xs">
                    <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                    <span>
                      {lang === "ar"
                        ? `تحذير أمني: محاولة خاطئة (${failedAttempts} من ${MAX_FAILED_ATTEMPTS})`
                        : lang === "ku"
                          ? `ئاگاداری ئاسایش: هەوڵی هەڵە (${failedAttempts} لە ${MAX_FAILED_ATTEMPTS})`
                          : `Security Alert: ${failedAttempts} of ${MAX_FAILED_ATTEMPTS} failed attempts`}
                    </span>
                  </div>
                )}

                {/* Phone / Email Input */}
                <div className="space-y-1.5 text-start">
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
                      disabled={lockoutSeconds > 0}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 text-start">
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
                      disabled={lockoutSeconds > 0}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition-colors"
                      disabled={lockoutSeconds > 0}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4.5 text-purple-600" />
                      ) : (
                        <Eye className="size-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Anti-Bot Security Challenge */}
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 ps-1">
                    <span>{lang === "ar" ? "التحقق الأمني (منع الروبوتات)" : lang === "ku" ? "پشکنینی ئاسایش (دژی ڕۆبۆت)" : "Security Challenge (Anti-Bot)"}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono tracking-wider uppercase bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">Human Check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-between h-12 rounded-2xl border border-purple-500/20 bg-purple-500/5 px-4 text-sm font-mono select-none">
                      <span className="tracking-widest text-purple-600 dark:text-purple-400 font-bold text-base">
                        {challenge.a} + {challenge.b} = ?
                      </span>
                      <button
                        type="button"
                        onClick={refreshChallenge}
                        title="Refresh Challenge"
                        className="text-slate-400 hover:text-purple-600 transition p-1"
                        disabled={lockoutSeconds > 0}
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      placeholder={lang === "ar" ? "الناتج" : lang === "ku" ? "وەڵام" : "Answer"}
                      className="w-24 h-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-center font-black text-base text-purple-600 dark:text-purple-400 placeholder:text-slate-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                      required
                      disabled={lockoutSeconds > 0}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loginLoading || lockoutSeconds > 0}
                  className={`w-full h-12 rounded-full font-extrabold text-sm shadow-xl transition-all duration-200 mt-3 ${
                    lockoutSeconds > 0
                      ? "bg-red-500/20 text-red-500 border border-red-500/30 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white shadow-purple-600/25 hover:shadow-purple-600/35 hover:scale-[1.005] active:scale-[0.995]"
                  }`}
                >
                  {lockoutSeconds > 0 ? (
                    <div className="flex items-center justify-center gap-2 text-red-500">
                      <Clock className="size-4 animate-pulse" />
                      <span>
                        {lang === "ar"
                          ? `مغلق مؤقتاً (انتظر ${lockoutSeconds} ثانية)`
                          : lang === "ku"
                            ? `قوفڵ کراوە (${lockoutSeconds} چرکە)`
                            : `Security Locked (${lockoutSeconds}s)`}
                      </span>
                    </div>
                  ) : loginLoading ? (
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
            )}
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
