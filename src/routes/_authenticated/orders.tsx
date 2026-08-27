import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, Receipt } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { BannerSlot } from "@/components/BannerSlot";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "طلباتي | دنتال ستور" },
      { name: "description", content: "تابع حالة طلباتك ومحتوياتها وإجمالي كل طلب." },
      { property: "og:title", content: "طلباتي | دنتال ستور" },
      { property: "og:description", content: "متابعة حالة الطلبات." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { lang, t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  return (
    <StoreLayout>
      <div className="p-3">
        <div className="mb-3 flex items-center gap-3">
          <Link
            to="/profile"
            aria-label={t("back")}
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-foreground shadow-card"
          >
            <ArrowRight className="size-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-base font-extrabold">{t("myOrders")}</h1>
        </div>
        <div className="mb-3">
          <BannerSlot slot="orders_page" />
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}

        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {(data ?? []).map((o) => (
            <li key={o.id}>
              <Link
                to="/orders/$id"
                params={{ id: o.id }}
                aria-label={t("openDetails")}
                className="flex items-start gap-2 p-3 transition-colors active:bg-muted"
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
                    {new Date(o.created_at).toLocaleString("ar-IQ")} · {t("itemsCount")}:{" "}
                    {(o.order_items ?? []).length}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    {(o.order_items ?? []).map((i) => pickName(i, lang)).join(" · ")}
                  </p>
                  <p className="text-sm font-extrabold text-primary">
                    {formatPrice(Number(o.total), lang)}
                  </p>
                </div>
                <ChevronLeft className="mt-2 size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

        {!isLoading && (data ?? []).length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noOrders")}</p>
        )}
      </div>
    </StoreLayout>
  );
}
