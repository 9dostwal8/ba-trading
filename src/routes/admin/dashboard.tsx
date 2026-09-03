import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    async function enforceAuthAndMfa() {
      if (!authLoading && !user) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      if (!authLoading && user) {
        try {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
            navigate({ to: "/admin", replace: true });
          }
        } catch (err) {
          console.warn("AAL error:", err);
        }
      }
    }
    enforceAuthAndMfa();
  }, [user, authLoading, navigate]);

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

  // 2. Unauthenticated -> Handled by navigate in useEffect
  if (!user) {
    return null;
  }

  // 3. Authenticated Admin Dashboard
  return <AdminDashboard initialTab={tab} />;
}
