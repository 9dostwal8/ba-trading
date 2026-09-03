import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/dashboard")({
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
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    toast.info(lang === "ar" ? "تم تسجيل الخروج" : lang === "ku" ? "چوویتەدەرەوە" : "Signed out");
    navigate({ to: "/admin", replace: true });
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Redirected to /admin via useEffect, fallback UI
  if (!user) {
    return null;
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
                ? `چوویتەژوورەوە بە هەژماري (${user.email || user.phone})، بەڵام دەسەڵاتی بەڕێوەبەرت نییە.`
                : `Logged in as (${user.email || user.phone}), but this account is not registered as Admin.`}
          </p>

          <div className="space-y-2.5">
            <Button onClick={handleLogout} className="w-full font-bold bg-[#007979] hover:bg-[#006666] text-white">
              <LogOut className="size-4 me-1.5" />
              {lang === "ar"
                ? "تسجيل الخروج والتبديل لحساب المدير"
                : lang === "ku"
                  ? "چوونەدەرەوە و گۆڕین بۆ هەژماري بەڕێوەبەر"
                  : "Sign Out & Switch Account"}
            </Button>
            <Button asChild variant="outline" className="w-full font-bold">
              <Link to="/">
                {lang === "ar" ? "العودة إلى المتجر الرئيسي" : lang === "ku" ? "گەڕانەوە بۆ فرۆشگا" : "Return to Store"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated Admin Dashboard
  return <AdminDashboard initialTab={tab} />;
}
