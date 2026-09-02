import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";

const AdminTexts = lazy(() => import("@/components/admin/AdminTexts").then((m) => ({ default: m.AdminTexts })));

export const Route = createFileRoute("/admin/texts")({
  ssr: false,
  component: AdminTextsPage,
});

function AdminTextsPage() {
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AdminHeader />
      <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
          <AdminTexts />
        </Suspense>
      </div>
    </div>
  );
}
