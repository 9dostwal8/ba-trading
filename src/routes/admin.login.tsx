import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminAuthPortal } from "@/components/admin/AdminAuthPortal";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول للمدير | دنتال ستور" },
      { name: "description", content: "تسجيل الدخول إلى لوحة التحكم المركزية." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && isAdmin === true) {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#007979] border-t-transparent animate-spin" />
          <span className="text-sm font-bold text-slate-400">Loading Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthPortal
      onSuccess={() => {
        navigate({ to: "/admin", replace: true });
      }}
    />
  );
}
