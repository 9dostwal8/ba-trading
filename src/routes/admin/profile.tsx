import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Package,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { TwoFactorModal } from "@/components/profile/TwoFactorModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الملف الشخصي للمدير والأمان | دنتال ستور" },
      { name: "description", content: "إدارة حساب المدير وإعدادات المصادقة الثنائية Google Authenticator." },
    ],
  }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();

  const [show2FaModal, setShow2FaModal] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, authLoading, navigate]);

  // Check 2FA Status
  const { data: mfaActive, refetch: refetchMfa } = useQuery({
    queryKey: ["admin-mfa-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const { data } = await supabase.auth.mfa.listFactors();
        return Boolean(data?.totp?.some((f) => f.status === "verified"));
      } catch {
        return false;
      }
    },
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(
        lang === "ar"
          ? "كلمة المرور يجب أن لا تقل عن 6 خانات"
          : lang === "ku"
            ? "وشەی نهێنی نابێت لە 6 پیت کەمتر بێت"
            : "Password must be at least 6 characters"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        lang === "ar"
          ? "كلمتا المرور غير متطابقتين"
          : lang === "ku"
            ? "وشە نهێنییەکان هاوتا نین"
            : "Passwords do not match"
      );
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success(
        lang === "ar"
          ? "تم تحديث كلمة المرور بنجاح!"
          : lang === "ku"
            ? "وشەی نهێنی بە سەرکەوتوویی نوێکرایەوە!"
            : "Password updated successfully!"
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
    navigate({ to: "/admin", replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Profile...</span>
        </div>
      </div>
    );
  }

  // Not an admin
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AdminHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-8" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">
            {lang === "ar" ? "صلاحيات غير كافية" : lang === "ku" ? "دەسەڵاتی کەم" : "Insufficient Privileges"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {lang === "ar"
              ? `هذا الملف مخصص لمدير النظام فقط.`
              : lang === "ku"
                ? `ئەم پەڕەیە تەنها تایبەتە بە بەڕێوەبەری سیستم.`
                : `This page is exclusively for System Administrators.`}
          </p>
          <Button onClick={() => navigate({ to: "/profile" })} className="w-full font-bold">
            {lang === "ar" ? "الذهاب لملفي العادي" : lang === "ku" ? "چوون بۆ پرۆفایلی ئاسایی" : "Go to My Account"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-16">
      <AdminHeader />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <Link to="/admin/dashboard">
              <ArrowLeft className="size-4 me-1.5 rtl:rotate-180" />
              <span>{lang === "ar" ? "العودة إلى لوحة التحكم" : lang === "ku" ? "گەڕانەوە بۆ پانێڵی کۆنتڕۆڵ" : "Back to Dashboard"}</span>
            </Link>
          </Button>

          <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-xs font-black text-[#007979] dark:text-teal-400">
            {lang === "ar" ? "حساب مدير النظام" : lang === "ku" ? "هەژماری بەڕێوەبەر" : "Administrator Account"}
          </span>
        </div>

        {/* Card 1: Admin Identity Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-gradient-to-tr from-[#007979] to-teal-400 text-white grid place-items-center shadow-md shadow-teal-500/20">
                <UserCheck className="size-8" />
              </div>
              <div className="text-start">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {lang === "ar" ? "الملف الشخصي للمدير" : lang === "ku" ? "پرۆفایلی بەڕێوەبەر" : "Administrator Profile"}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.email || user?.phone || "admin@batrading.com"}
                </p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 rounded-xl self-start sm:self-auto"
            >
              <LogOut className="size-4 me-1.5" />
              <span>{lang === "ar" ? "تسجيل الخروج" : lang === "ku" ? "چوونەدەرەوە" : "Sign Out"}</span>
            </Button>
          </div>
        </div>

        {/* Card 2: Two-Factor Authentication (2FA - Google Authenticator) */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 grid place-items-center shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div className="text-start space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {lang === "ar"
                      ? "المصادقة الثنائية (Google Authenticator)"
                      : lang === "ku"
                        ? "پشتڕاستکردنەوەی دوو قۆناغی (2FA)"
                        : "Two-Factor Authentication (2FA)"}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      mfaActive
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {mfaActive
                      ? (lang === "ar" ? "مفعل ومحمي" : lang === "ku" ? "چالاکە و پارێزراوە" : "Active & Protected")
                      : (lang === "ar" ? "غير مفعل" : lang === "ku" ? "ناچالاکە" : "Not Enabled")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                  {lang === "ar"
                    ? "تأمين حساب المدير برمز تحقق يتجدد كل 30 ثانية في تطبيق Google Authenticator على هاتفك."
                    : lang === "ku"
                      ? "پاراستنی هەژماری بەڕێوەبەر بە کۆدێک کە هەر 30 چرکە جارێک لە ئەپی Google Authenticator نوێ دەبێتەوە."
                      : "Secure your administrative account with a 6-digit code from Google Authenticator on your phone."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShow2FaModal(true)}
              className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0"
            >
              {mfaActive
                ? (lang === "ar" ? "إدارة 2FA" : lang === "ku" ? "بەڕێوەبردنی 2FA" : "Manage 2FA")
                : (lang === "ar" ? "تفعيل الآن" : lang === "ku" ? "چالاککردنی ئێستا" : "Enable 2FA")}
            </Button>
          </div>
        </div>

        {/* Card 3: Change Password */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-teal-500/10 text-[#007979] dark:text-teal-400 grid place-items-center">
              <KeyRound className="size-5" />
            </div>
            <div className="text-start">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {lang === "ar" ? "تغيير كلمة المرور" : lang === "ku" ? "گۆڕینی وشەی نهێنی" : "Change Password"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === "ar" ? "تحديث كلمة مرور حساب المدير" : lang === "ku" ? "نوێکردنەوەی وشەی نهێنی بەڕێوەبەر" : "Update your admin password"}
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === "ar" ? "كلمة المرور الجديدة" : lang === "ku" ? "وشەی نهێنی نوێ" : "New Password"}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5 text-start">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === "ar" ? "تأكيد كلمة المرور" : lang === "ku" ? "دووبارەکردنەوەی وشەی نهێنی" : "Confirm New Password"}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="h-11 px-6 rounded-xl font-bold bg-[#007979] hover:bg-[#006666] text-white"
            >
              {passwordLoading
                ? (lang === "ar" ? "جاري التحديث..." : lang === "ku" ? "نوێکردنەوە..." : "Updating...")
                : (lang === "ar" ? "حفظ كلمة المرور الجديدة" : lang === "ku" ? "پاشەکەوتکردنی وشەی نوێ" : "Update Password")}
            </Button>
          </form>
        </div>

        {/* Card 4: Quick Admin Shortcuts */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 text-start">
            {lang === "ar" ? "اختصارات سريعة للإدارة" : lang === "ku" ? "بەستەرە خێراکان بۆ بەڕێوەبردن" : "Quick Admin Shortcuts"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button asChild variant="outline" className="h-14 rounded-2xl justify-start px-4 font-bold">
              <Link to="/admin/orders">
                <Package className="size-5 me-2 text-[#007979]" />
                <span className="text-xs">{lang === "ar" ? "إدارة الطلبات" : lang === "ku" ? "داواکارییەکان" : "Orders"}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-14 rounded-2xl justify-start px-4 font-bold">
              <Link to="/admin/products">
                <LayoutGrid className="size-5 me-2 text-purple-600" />
                <span className="text-xs">{lang === "ar" ? "المنتجات والمخزون" : lang === "ku" ? "بەرهەمەکان" : "Products"}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-14 rounded-2xl justify-start px-4 font-bold">
              <Link to="/admin/accounting">
                <Receipt className="size-5 me-2 text-emerald-600" />
                <span className="text-xs">{lang === "ar" ? "المحاسبة والمالية" : lang === "ku" ? "ژمێریاری و پارە" : "Accounting"}</span>
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* 2FA Setup Modal */}
      <TwoFactorModal
        open={show2FaModal}
        onOpenChange={setShow2FaModal}
        onStatusChange={() => refetchMfa()}
      />
    </div>
  );
}
