import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, MapPin, Store, X } from "lucide-react";
import { toast } from "sonner";
import { AdminCard, SectionHeader } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { reviewVendorApplication } from "@/lib/vendor-applications.functions";
import { useI18n } from "@/lib/i18n";

type App = {
  id: string;
  store_name: string;
  city: string;
  address_line: string;
  phone: string;
  status: string;
  created_at: string;
};

/** Admin: review vendor sign-up requests. Approving unlocks the vendor login. */
export function VendorApplications() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const review = useServerFn(reviewVendorApplication);
  const tx = (ar: string, ku: string, en: string) => (lang === "ku" ? ku : lang === "en" ? en : ar);

  const { data: apps } = useQuery({
    queryKey: ["admin-vendor-applications"],
    queryFn: async () =>
      ((
        await supabase
          .from("vendor_applications")
          .select("id, store_name, city, address_line, phone, status, created_at")
          .order("created_at", { ascending: false })
      ).data ?? []) as App[],
  });

  const act = useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) =>
      review({ data: { id: v.id, approve: v.approve, note: "" } }),
    onSuccess: () => {
      toast.success(tx("تم التحديث", "نوێکرایەوە", "Updated"));
      qc.invalidateQueries({ queryKey: ["admin-vendor-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (apps ?? []).filter((a) => a.status === "pending");

  return (
    <div className="space-y-2">
      <SectionHeader
        title={tx("طلبات البائعين", "داواکاری فرۆشیارەکان", "Vendor requests")}
        action={
          <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-extrabold text-primary">
            {pending.length}
          </span>
        }
      />
      {(apps ?? []).length === 0 && (
        <p className="text-[11.5px] text-muted-foreground">
          {tx("لا توجد طلبات", "داواکاری نییە", "No requests yet")}
        </p>
      )}
      {(apps ?? []).map((a) => (
        <AdminCard key={a.id}>
          <div className="flex items-start gap-2">
            <span className="head-icon">
              <Store className="size-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold">{a.store_name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                <MapPin className="size-3.5" />
                {[a.city, a.address_line].filter(Boolean).join(" — ")}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
                {a.phone}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${
                a.status === "approved"
                  ? "bg-success/12 text-success"
                  : a.status === "rejected"
                    ? "bg-destructive/12 text-destructive"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {a.status === "approved"
                ? tx("مقبول", "پەسەندکرا", "Approved")
                : a.status === "rejected"
                  ? tx("مرفوض", "ڕەتکرا", "Rejected")
                  : tx("قيد المراجعة", "چاوەڕوان", "Pending")}
            </span>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={act.isPending || a.status === "approved"}
              onClick={() => act.mutate({ id: a.id, approve: true })}
            >
              <Check className="size-4" />
              {tx("قبول وتفعيل الدخول", "پەسەندکردن", "Approve login")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={act.isPending || a.status === "rejected"}
              onClick={() => act.mutate({ id: a.id, approve: false })}
            >
              <X className="size-4" />
              {tx("رفض", "ڕەتکردن", "Reject")}
            </Button>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}
