import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  Save,
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
import { updateCurrentAdminEmail } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دەستکاری پڕۆفایلی بەڕێوەبەر | دنتال ستور" },
      { name: "description", content: "دەستکاری زانیارییە کەسییەکان، ئاسایش و 2FA، و ئیمەیڵی چوونەژوورەوە." },
    ],
  }),
  component: AdminProfilePage,
});

type AdminProfileTab = "info" | "security" | "email";

function AdminProfilePage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<AdminProfileTab>("info");
  const [show2FaModal, setShow2FaModal] = useState(false);

  // 1. Personal Info State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  // 2. Email Change State
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // 3. Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Fetch admin profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
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

  // Populate form fields on profile load
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || (user?.user_metadata?.["full_name"] as string) || "");
      setPhone(profile.phone || user?.phone || "");
    }
  }, [profile, user]);

  // Check 2FA & AAL Status
  const { data: mfaData, refetch: refetchMfa } = useQuery({
    queryKey: ["admin-mfa-details", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const [{ data: factors }, { data: aal }] = await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
        const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");
        return {
          isEnrolled: Boolean(verifiedTotp),
          currentLevel: aal?.currentLevel || "aal1",
          nextLevel: aal?.nextLevel || "aal1",
        };
      } catch {
        return { isEnrolled: false, currentLevel: "aal1", nextLevel: "aal1" };
      }
    },
  });

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, authLoading, navigate]);

  // Save Name & Phone
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setInfoSaving(true);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (profileErr) throw profileErr;

      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          phone: phone.trim(),
        },
      });

      toast.success(
        lang === "ar"
          ? "تم حفظ البيانات الشخصية بنجاح!"
          : lang === "ku"
            ? "زانیارییە کەسییەکان بە سەرکەوتوویی پاشەکەوت کران!"
            : "Personal information saved successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save profile");
    } finally {
      setInfoSaving(false);
    }
  };

  // Update Email Address (Direct Server Function + Client Fallback)
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error(
        lang === "ar"
          ? "يرجى كتابة بريد إلكتروني صحيح"
          : lang === "ku"
            ? "تکایە ئیمەیڵێکی دروست بنووسە"
            : "Please enter a valid email address"
      );
      return;
    }

    setEmailSaving(true);
    try {
      try {
        await updateCurrentAdminEmail({ data: { newEmail: newEmail.trim() } });
        await supabase.auth.refreshSession();
        toast.success(
          lang === "ar"
            ? "تم تحديث البريد الإلكتروني بنجاح!"
            : lang === "ku"
              ? "ئیمەیڵ بە سەرکەوتوویی نوێکرایەوە!"
              : "Email updated successfully!"
        );
        setNewEmail("");
        queryClient.invalidateQueries();
        setTimeout(() => window.location.reload(), 800);
        return;
      } catch (srvErr: any) {
        console.warn("Direct admin email update fallback:", srvErr);
      }

      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/admin/profile`
        : "https://ba-trading.vercel.app/admin/profile";

      const { error } = await supabase.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: redirectUrl }
      );
      if (error) throw error;

      toast.success(
        lang === "ar"
          ? "تم إرسال رابط تأكيد إلى بريدك الجديد!"
          : lang === "ku"
            ? "بەستەری پشتڕاستکردنەوە بۆ ئیمەیڵە نوێکەت نێردرا!"
            : "Confirmation link sent to your new email!"
      );
      setNewEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update email");
    } finally {
      setEmailSaving(false);
    }
  };

  // Change Password
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
    queryClient.invalidateQueries();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
    navigate({ to: "/admin", replace: true });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Profile...</span>
        </div>
      </div>
    );
  }

  // Non-admin guard
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

  const displayName: string =
    fullName ||
    profile?.full_name ||
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    (user?.email ? (user.email.split("@")[0] ?? "Admin") : "Admin");

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans pb-16">
      <AdminHeader />

      {/* Main Container: Wide layout that matches the full AdminHeader width */}
      <main className="flex-1 mx-auto w-full max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3 sm:px-6 py-6 space-y-6">
        
        {/* Top Breadcrumb & Role Banner */}
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <Link to="/admin/dashboard">
              <ArrowLeft className="size-4 me-1.5 rtl:rotate-180" />
              <span>
                {lang === "ar"
                  ? "العودة إلى لوحة التحكم"
                  : lang === "ku"
                    ? "گەڕانەوە بۆ داشبۆرد"
                    : "Back to Dashboard"}
              </span>
            </Link>
          </Button>

          <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-3.5 py-1 text-xs font-black text-[#007979] dark:text-teal-400">
            {lang === "ar" ? "حساب المدير العام" : lang === "ku" ? "هەژماری بەڕێوەبەری گشتی" : "Super Admin"}
          </span>
        </div>

        {/* 1. Header Overview Hero Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-tr from-[#007979] via-teal-600 to-emerald-500 text-white grid place-items-center shadow-lg shadow-teal-500/25 text-2xl sm:text-3xl font-black">
                {(displayName.charAt(0) || "A").toUpperCase()}
              </div>
              <div className="text-start space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Mail className="size-3.5 text-teal-600" />
                    <span>{user?.email || "—"}</span>
                  </span>
                  {phone && (
                    <span className="flex items-center gap-1">
                      <span>•</span>
                      <Phone className="size-3.5 text-teal-600" />
                      <span dir="ltr">{phone}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span>•</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        mfaData?.isEnrolled
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <ShieldCheck className="size-3" />
                      {mfaData?.isEnrolled ? "2FA Active" : "2FA Off"}
                    </span>
                  </span>
                </div>
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

        {/* 2. Interactive Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          {/* Tab 1: Personal Info */}
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "info"
                ? "bg-[#007979] text-white shadow-md shadow-teal-500/25"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <UserCheck className="size-4" />
            <span>
              {lang === "ar"
                ? "البيانات الشخصية"
                : lang === "ku"
                  ? "زانیارییە کەسییەکان"
                  : "Personal Info"}
            </span>
          </button>

          {/* Tab 2: Security & 2FA */}
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "security"
                ? "bg-[#007979] text-white shadow-md shadow-teal-500/25"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>
              {lang === "ar"
                ? "الأمان و 2FA"
                : lang === "ku"
                  ? "ئاسایش و 2FA"
                  : "Security & 2FA"}
            </span>
          </button>

          {/* Tab 3: Login Email */}
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              activeTab === "email"
                ? "bg-[#007979] text-white shadow-md shadow-teal-500/25"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800"
            }`}
          >
            <Mail className="size-4" />
            <span>
              {lang === "ar"
                ? "البريد الإلكتروني"
                : lang === "ku"
                  ? "ئیمەیڵی چوونەژوورەوە"
                  : "Login Email"}
            </span>
          </button>
        </div>

        {/* TAB 1: Personal Information Form */}
        {activeTab === "info" && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-teal-500/10 text-[#007979] dark:text-teal-400 grid place-items-center">
                <UserCheck className="size-5" />
              </div>
              <div className="text-start">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {lang === "ar" ? "تعديل البيانات الشخصية" : lang === "ku" ? "دەستکاری زانیارییە کەسییەکان" : "Edit Personal Information"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === "ar" ? "تحديث الاسم ورقم هاتف التواصل للمدير" : lang === "ku" ? "نوێکردنەوەی ناو و ژمارەی مۆبایلی بەڕێوەبەر" : "Update your admin display name and phone number"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePersonalInfo} className="space-y-4 max-w-xl">
              <div className="space-y-1.5 text-start">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ps-0.5">
                  {lang === "ar" ? "الاسم الكامل" : lang === "ku" ? "ناوی تەواو" : "Full Name"}
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dosty Rebwar"
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5 text-start">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ps-0.5">
                  {lang === "ar" ? "رقم الهاتف" : lang === "ku" ? "ژمارەی مۆبایل" : "Phone Number"}
                </label>
                <Input
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0770XXXXXXX"
                  className="h-11 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={infoSaving}
                className="h-11 px-6 rounded-xl font-bold bg-[#007979] hover:bg-[#006666] text-white shadow-md shadow-teal-500/20 mt-2"
              >
                {infoSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>{lang === "ar" ? "جاري الحفظ..." : lang === "ku" ? "پاشەکەوتکردن..." : "Saving..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="size-4" />
                    <span>{lang === "ar" ? "حفظ التغييرات" : lang === "ku" ? "پاشەکەوتکردنی گۆڕانکارییەکان" : "Save Changes"}</span>
                  </div>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* TAB 2: Security, 2FA & Password */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* 2FA Google Authenticator Card */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
                            ? "پشتڕاستکردنەوەی دوو قۆناغی (Google Authenticator)"
                            : "Two-Factor Authentication (2FA)"}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          mfaData?.isEnrolled
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {mfaData?.isEnrolled
                          ? (lang === "ar" ? "مفعل ومحمي" : lang === "ku" ? "چالاکە و پارێزراوە" : "Active & Protected")
                          : (lang === "ar" ? "غير مفعل" : lang === "ku" ? "ناچالاکە" : "Disabled")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                      {lang === "ar"
                        ? "عند تفعيل المصادقة الثنائية، لن يتمكن أي شخص من الدخول لحسابك دون إدخال الرمز السري المتغير من تطبيق هاتفك."
                        : lang === "ku"
                          ? "کاتێک 2FA چالاک دەکەیت، هیچ کەس ناتوانێت بچێتە ژوورەوە بەبێ کۆدی 6 ژمارەیی لە ئەپی Google Authenticator."
                          : "When 2FA is enabled, login requires the 6-digit code from Google Authenticator on your physical phone."}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setShow2FaModal(true)}
                  className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shrink-0 shadow-md shadow-purple-600/20 self-start sm:self-auto"
                >
                  {mfaData?.isEnrolled
                    ? (lang === "ar" ? "إدارة أو إلغاء 2FA" : lang === "ku" ? "بەڕێوەبردن یان ڕاگرتن" : "Manage 2FA")
                    : (lang === "ar" ? "تفعيل الآن" : lang === "ku" ? "چالاککردنی ئێستا" : "Enable 2FA")}
                </Button>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-teal-500/10 text-[#007979] dark:text-teal-400 grid place-items-center">
                  <KeyRound className="size-5" />
                </div>
                <div className="text-start">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {lang === "ar" ? "تغيير كلمة المرور" : lang === "ku" ? "گۆڕینی وشەی نهێنی" : "Change Password"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === "ar" ? "تحديث كلمة مرور الدخول للوحة التحكم" : lang === "ku" ? "نوێکردنەوەی وشەی نهێنی چوونەژوورەوەی بەڕێوەبەر" : "Update your admin portal login password"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
                <div className="space-y-1.5 text-start">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ps-0.5">
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ps-0.5">
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
                  className="h-11 px-6 rounded-xl font-bold bg-[#007979] hover:bg-[#006666] text-white mt-2"
                >
                  {passwordLoading
                    ? (lang === "ar" ? "جاري التحديث..." : lang === "ku" ? "نوێکردنەوە..." : "Updating...")
                    : (lang === "ar" ? "حفظ كلمة المرور" : lang === "ku" ? "پاشەکەوتکردنی وشەی نوێ" : "Update Password")}
                </Button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: Change Email */}
        {activeTab === "email" && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
                <Mail className="size-5" />
              </div>
              <div className="text-start">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {lang === "ar" ? "تغيير البريد الإلكتروني" : lang === "ku" ? "گۆڕینی ئیمەیڵ" : "Change Login Email"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === "ar"
                    ? `البريد الحالي المسجل: ${user?.email}`
                    : lang === "ku"
                      ? `ئیمەیڵی تۆمارکراوی ئێستا: ${user?.email}`
                      : `Current active email: ${user?.email}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-xl">
              <div className="space-y-1.5 text-start">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ps-0.5">
                  {lang === "ar" ? "البريد الإلكتروني الجديد" : lang === "ku" ? "ئیمەیڵی نوێ" : "New Email Address"}
                </label>
                <Input
                  type="email"
                  dir="ltr"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@batrading.iq"
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={emailSaving || !newEmail}
                className="h-11 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                {emailSaving
                  ? (lang === "ar" ? "جاري التحديث..." : lang === "ku" ? "نوێکردنەوە..." : "Updating...")
                  : (lang === "ar" ? "تحديث البريد فوراً" : lang === "ku" ? "نوێکردنەوەی ئیمەیڵ ئێستا" : "Update Email Now")}
              </Button>
            </form>
          </div>
        )}

      </main>

      {/* Two-Factor Authentication Modal */}
      <TwoFactorModal
        open={show2FaModal}
        onOpenChange={setShow2FaModal}
        onStatusChange={() => {
          refetchMfa();
          queryClient.invalidateQueries({ queryKey: ["admin-mfa-details"] });
        }}
      />
    </div>
  );
}
