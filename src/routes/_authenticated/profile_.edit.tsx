import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { SubPage } from "@/components/profile/SubPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile_/edit")({
  head: () => ({
    meta: [
      { title: "دەستکاری پرۆفایل و وشەی نهێنی | دنتال ستور" },
      {
        name: "description",
        content: "دەستکاری زانیارییە کەسییەکان، گۆڕینی وشەی نهێنی و ڕێکخستنی هەژمار.",
      },
      { property: "og:title", content: "دەستکاری پرۆفایل و وشەی نهێنی | دنتال ستور" },
      { property: "og:description", content: "دەستکاری زانیارییە کەسییەکان و وشەی نهێنی." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditProfilePage,
});

const L = {
  title: {
    ar: "تعديل الملف والأمان",
    ku: "دەستکاری پرۆفایل و ئاسایش",
    en: "Edit Profile & Security",
  },
  subtitle: {
    ar: "إدارة بياناتك الشخصية وتغيير كلمة المرور لحماية حسابك",
    ku: "بەڕێوەبردنی زانیارییە کەسییەکان و گۆڕینی وشەی نهێنی بۆ پاراستنی هەژمارەکەت",
    en: "Manage your personal information and change your password to secure your account",
  },
  tabInfo: {
    ar: "البيانات الشخصية",
    ku: "زانیاری کەسی",
    en: "Personal Info",
  },
  tabSecurity: {
    ar: "تغيير كلمة المرور",
    ku: "گۆڕینی وشەی نهێنی",
    en: "Change Password",
  },
  fullName: {
    ar: "الاسم الكامل",
    ku: "ناوی تەواو",
    en: "Full Name",
  },
  fullNamePlaceholder: {
    ar: "اكتب اسمك الكامل...",
    ku: "ناوی تەواوت بنووسە...",
    en: "Enter your full name...",
  },
  mobile: {
    ar: "رقم الموبايل",
    ku: "ژمارەی مۆبایل",
    en: "Mobile Number",
  },
  mobilePlaceholder: {
    ar: "0750XXXXXXX",
    ku: "0750XXXXXXX",
    en: "0750XXXXXXX",
  },
  email: {
    ar: "البريد الإلكتروني (لتسجيل الدخول)",
    ku: "ئیمەیل (بۆ چوونەژوورەوە)",
    en: "Email (Login)",
  },
  saveInfoBtn: {
    ar: "حفظ البيانات الشخصية",
    ku: "پاشەکەوتکردنی زانیارییەکان",
    en: "Save Personal Info",
  },
  saving: {
    ar: "جاري الحفظ...",
    ku: "پاشەکەوت دەکرێت...",
    en: "Saving...",
  },
  savedSuccess: {
    ar: "تم حفظ البيانات بنجاح!",
    ku: "زانیارییەکان بە سەرکەوتوویی پاشەکەوت کران!",
    en: "Personal information saved successfully!",
  },
  saveError: {
    ar: "حدث خطأ أثناء حفظ البيانات",
    ku: "هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن",
    en: "An error occurred while saving",
  },
  newPassword: {
    ar: "كلمة المرور الجديدة",
    ku: "وشەی نهێنی نوێ",
    en: "New Password",
  },
  newPasswordPlaceholder: {
    ar: "اكتب كلمة المرور الجديدة (6 أحرف على الأقل)...",
    ku: "وشەی نهێنی نوێ بنووسە (لانیکەم 6 پیت)...",
    en: "Enter new password (min. 6 characters)...",
  },
  confirmPassword: {
    ar: "تأكيد كلمة المرور الجديدة",
    ku: "دووپاتکردنەوەی وشەی نهێنی",
    en: "Confirm New Password",
  },
  confirmPasswordPlaceholder: {
    ar: "أعد كتابة كلمة المرور للتأكيد...",
    ku: "دووبارە وشەی نهێنی بنووسەوە بۆ دڵنیابوونەوە...",
    en: "Re-enter new password to confirm...",
  },
  updatePasswordBtn: {
    ar: "تحديث كلمة المرور",
    ku: "نوێکردنەوەی وشەی نهێنی",
    en: "Update Password",
  },
  updatingPassword: {
    ar: "جاري تحديث كلمة المرور...",
    ku: "وشەی نهێنی نوێ دەکرێتەوە...",
    en: "Updating password...",
  },
  passwordSuccess: {
    ar: "تم تغيير كلمة المرور بنجاح!",
    ku: "وشەی نهێنی بە سەرکەوتوویی گۆڕدرا!",
    en: "Password changed successfully!",
  },
  passwordMinLength: {
    ar: "كلمة المرور يجب أن لا تقل عن 6 أحرف",
    ku: "وشەی نهێنی نابێت لە 6 پیت کەمتر بێت",
    en: "Password must be at least 6 characters",
  },
  passwordMismatch: {
    ar: "كلمتا المرور غير متطابقتين",
    ku: "وشە نهێنییەکان هاوتا نین",
    en: "Passwords do not match",
  },
  passwordHint: {
    ar: "استخدم كلمة مرور قوية تحتوي على أحرف وأرقام لضمان حماية حسابك.",
    ku: "وشەیەکی نهێنی بەهێز بەکاربهێنە کە پیت و ژمارە لەخۆ بگرێت بۆ پاراستنی هەژمارەکەت.",
    en: "Use a strong password with letters and numbers to protect your account.",
  },
};

type TabType = "info" | "password";

function EditProfilePage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Personal Info Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  // Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || (user?.user_metadata?.["full_name"] as string) || "");
      setPhone(profile.phone || user?.phone || "");
    }
  }, [profile, user]);

  // Handle Save Personal Info
  async function handleSaveInfo(e: React.FormEvent) {
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

      toast.success(L.savedSuccess[lang]);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["admin-profile"] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || L.saveError[lang]);
    } finally {
      setInfoSaving(false);
    }
  }

  // Handle Update Password
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    if (newPassword.length < 6) {
      toast.error(L.passwordMinLength[lang]);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(L.passwordMismatch[lang]);
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success(L.passwordSuccess[lang]);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || L.saveError[lang]);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <SubPage title={L.title[lang]} subtitle={L.subtitle[lang]}>
      {/* Navigation Segmented Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl mb-4 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
            activeTab === "info"
              ? "bg-white dark:bg-slate-900 text-[#007979] dark:text-teal-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <User className="size-4" />
          <span>{L.tabInfo[lang]}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
            activeTab === "password"
              ? "bg-white dark:bg-slate-900 text-[#007979] dark:text-teal-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <KeyRound className="size-4" />
          <span>{L.tabSecurity[lang]}</span>
        </button>
      </div>

      {/* 1. PERSONAL INFO SECTION */}
      {activeTab === "info" && (
        <form
          onSubmit={handleSaveInfo}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-[#007979] dark:text-teal-400">
              <User className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {L.tabInfo[lang]}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "ku"
                  ? "ناو و ژمارەی مۆبایل بۆ پەسەندکردنی داواکاری و گەیاندن بەکاردێن"
                  : "يستخدم الاسم ورقم الهاتف في تأكيد الطلبات والتوصيل"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="size-3.5 text-slate-400" />
                <span>{L.fullName[lang]}</span>
              </label>
              <Input
                className="h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition"
                placeholder={L.fullNamePlaceholder[lang]}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="size-3.5 text-slate-400" />
                <span>{L.mobile[lang]}</span>
              </label>
              <Input
                className="h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 transition"
                inputMode="tel"
                dir="ltr"
                placeholder={L.mobilePlaceholder[lang]}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Email (Read-only Login Identifier) */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="size-3.5 text-slate-400" />
                <span>{L.email[lang]}</span>
              </label>
              <div className="relative">
                <Input
                  className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-600 dark:text-slate-400 cursor-not-allowed select-none"
                  dir="ltr"
                  readOnly
                  value={user?.email ?? "—"}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={infoSaving}
            className="w-full h-12 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white text-sm font-black shadow-md transition active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            <Save className="size-4" />
            <span>{infoSaving ? L.saving[lang] : L.saveInfoBtn[lang]}</span>
          </Button>
        </form>
      )}

      {/* 2. CHANGE PASSWORD SECTION */}
      {activeTab === "password" && (
        <form
          onSubmit={handleUpdatePassword}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {L.tabSecurity[lang]}
              </h2>
              <p className="text-xs text-slate-400">
                {L.passwordHint[lang]}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="size-3.5 text-slate-400" />
                <span>{L.newPassword[lang]}</span>
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  className="h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 ltr:pr-11 rtl:pl-11 focus:bg-white dark:focus:bg-slate-900 transition"
                  placeholder={L.newPasswordPlaceholder[lang]}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute top-1/2 -translate-y-1/2 ltr:right-3.5 rtl:left-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4.5" />
                  ) : (
                    <Eye className="size-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-slate-400" />
                <span>{L.confirmPassword[lang]}</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  className="h-12 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 ltr:pr-11 rtl:pl-11 focus:bg-white dark:focus:bg-slate-900 transition"
                  placeholder={L.confirmPasswordPlaceholder[lang]}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-1/2 -translate-y-1/2 ltr:right-3.5 rtl:left-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4.5" />
                  ) : (
                    <Eye className="size-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Validation helper badge */}
            <div className="p-3 rounded-2xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/15 flex items-center gap-2 text-xs text-teal-800 dark:text-teal-300">
              <Shield className="size-4 shrink-0 text-[#007979] dark:text-teal-400" />
              <span>{L.passwordHint[lang]}</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={passwordSaving || !newPassword || !confirmPassword}
            className="w-full h-12 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white text-sm font-black shadow-md transition active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            <KeyRound className="size-4" />
            <span>{passwordSaving ? L.updatingPassword[lang] : L.updatePasswordBtn[lang]}</span>
          </Button>
        </form>
      )}
    </SubPage>
  );
}
