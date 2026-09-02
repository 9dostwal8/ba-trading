import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminAuthPortal } from "@/components/admin/AdminAuthPortal";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "لوحة التحكم المركزية | دنتال ستور" },
      { name: "description", content: "إدارة المنتجات والعروض وأكواد الخصم والطلبات." },
      { property: "og:title", content: "لوحة التحكم | دنتال ستور" },
      { property: "og:description", content: "إدارة المتجر بالكامل." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { tab } = Route.useSearch();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_admin");
      if (error) throw error;
      if (data) {
        toast.success(
          lang === "ar"
            ? "تم تفعيل صلاحيات المدير بنجاح!"
            : lang === "ku"
              ? "دەسەڵاتی بەڕێوەبەر بە سەرکەوتوویی چالاک کرا!"
              : "Admin rights claimed successfully!"
        );
        window.location.reload();
      } else {
        toast.error(
          lang === "ar"
            ? "يوجد مدير مسجل مسبقاً في النظام"
            : lang === "ku"
              ? "بەڕێوەبەرێکی تر لە پێشدا تۆمارکراوە"
              : "An admin already exists"
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Error claiming admin");
    } finally {
      setClaiming(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Admin Portal...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Split-Screen Executive Auth Portal
  if (!user) {
    return <AdminAuthPortal />;
  }

  // 3. User logged in, but not an admin
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
              ? `أنت مسجل الدخول بالحساب (${user.email || user.phone})، ولكن هذا الحساب ليس لديه صلاحية مدير.`
              : lang === "ku"
                ? `چوویتەژوورەوە بە هەژماری (${user.email || user.phone})، بەڵام دەسەڵاتی بەڕێوەبەرت نییە.`
                : `Logged in as (${user.email || user.phone}), but this account is not registered as Admin.`}
          </p>

          <div className="space-y-2.5">
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full font-bold bg-[#007979] hover:bg-[#006666] text-white"
            >
              {claiming
                ? "..."
                : lang === "ar"
                  ? "تفعيل حساب المدير الأول (Claim Admin)"
                  : lang === "ku"
                    ? "چالاککردنی بەڕێوەبەری یەکەم"
                    : "Claim First Admin Account"}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full font-bold">
              <LogOut className="size-4 me-1.5" />
              {lang === "ar"
                ? "تسجيل الخروج والتبديل لحساب المدير"
                : lang === "ku"
                  ? "چوونەدەرەوە و گۆڕین بۆ هەژماری بەڕێوەبەر"
                  : "Sign Out & Switch Account"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated Admin Dashboard
  return <AdminDashboard initialTab={tab} />;
}
