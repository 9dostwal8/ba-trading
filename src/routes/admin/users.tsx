import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";

const AdminUsers = lazy(() => import("@/components/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user || isAdmin !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="size-8 animate-spin text-[#007979]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <AdminHeader />
      <div className="flex-1 p-3 sm:p-5 w-full">
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
          <AdminUsers />
        </Suspense>
      </div>
    </div>
  );
}
