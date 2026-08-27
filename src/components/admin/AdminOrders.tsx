import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Receipt } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "./AdminKit";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { ACTION_LABELS } from "@/lib/status";

export function AdminOrders() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // accepting an order means the money is in: no customer receivable stays open
      const { error } = await supabase
        .from("orders")
        .update(
          status === "confirmed"
            ? { status, payment_status: "paid", paid_at: new Date().toISOString() }
            : { status },
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  return (
    <div className="space-y-3">
      <SectionHeader title={t("orders")} />

      <ul className="divide-y-2 divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {(orders ?? []).map((o) => (
          <li key={o.id} className="p-3">
            <Link
              to="/orders/$id"
              params={{ id: o.id }}
              aria-label={t("openDetails")}
              className="flex items-start gap-2"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">#{o.order_no}</span>
                  <OrderStatusBadge status={o.status} lang={lang} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {o.customer_name} · {o.phone}
                </p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {o.city} — {o.address_line}
                </p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {(o.order_items ?? []).map((i) => `${pickName(i, lang)} ×${i.quantity}`).join(" · ")}
                </p>
                <p className="text-sm font-extrabold text-primary">
                  {formatPrice(Number(o.total), lang)}
                </p>
              </div>
              <ChevronLeft className="mt-2 size-4 shrink-0 text-muted-foreground" />
            </Link>

            <div className="mt-2 flex items-center gap-2">
              {o.latitude && (
                <a
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-bold text-primary"
                  href={`https://maps.google.com/?q=${o.latitude},${o.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="size-3.5" />
                  {t("useMyLocation")}
                </a>
              )}
              <button
                type="button"
                disabled={o.status === "confirmed"}
                onClick={() => setStatus.mutate({ id: o.id, status: "confirmed" })}
                className="h-9 flex-1 rounded-lg bg-primary text-xs font-extrabold text-primary-foreground disabled:opacity-40"
              >
                {ACTION_LABELS.confirmed[lang]}
              </button>
              <button
                type="button"
                disabled={o.status === "cancelled"}
                onClick={() => setStatus.mutate({ id: o.id, status: "cancelled" })}
                className="h-9 flex-1 rounded-lg border border-border text-xs font-extrabold text-muted-foreground disabled:opacity-40"
              >
                {ACTION_LABELS.cancelled[lang]}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {(orders ?? []).length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("noOrders")}</p>
      )}
    </div>
  );
}
