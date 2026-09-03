import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminAuthPortal } from "@/components/admin/AdminAuthPortal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول للمدير | دنتال ستور" },
      { name: "description", content: "تسجيل الدخول إلى لوحة التحكم المركزية." },
      { property: "og:title", content: "تسجيل الدخول للمدير | دنتال ستور" },
    ],
  }),
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAndNavigate() {
      if (!authLoading && user) {
        try {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
            // 2FA is required and not yet verified. Stay on login page to prompt for 6-digit code!
            return;
          }
        } catch (e) {
          console.warn("AAL check:", e);
        }
        navigate({ to: "/admin/dashboard", replace: true });
      }
    }
    checkAndNavigate();
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Login Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthPortal
      onSuccess={() => {
        navigate({ to: "/admin/dashboard", replace: true });
      }}
    />
  );
}
