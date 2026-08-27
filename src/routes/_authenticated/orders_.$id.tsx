import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, MapPin, Phone, Receipt, User } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { printOrderInvoice } from "@/lib/orderInvoice";

export const Route = createFileRoute("/_authenticated/orders_/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الطلب | دنتال ستور" },
      { name: "description", content: "تفاصيل الطلب: المنتجات، العنوان، الحالة والإجمالي." },
      { property: "og:title", content: "تفاصيل الطلب | دنتال ستور" },
      { property: "og:description", content: "تفاصيل كاملة عن طلبك." },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { lang, t } = useI18n();

  const { data: order, isLoading } = useQuery({
    queryKey: ["my-order", id],
    queryFn: async () =>
      (await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle()).data,
  });

  return (
    <StoreLayout>
      <div className="space-y-3 p-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"
        >
          <ArrowRight className="size-4" />
          {t("back")}
        </Link>

        {isLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
        {!isLoading && !order && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("orderNotFound")}</p>
        )}

        {order && (
          <>
            <section className="rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h1 className="flex items-center gap-1.5 text-base font-extrabold">
                  <Receipt className="size-4 text-primary" />#{order.order_no}
                </h1>
                <OrderStatusBadge status={order.status} lang={lang} size="md" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("orderDate")}: {new Date(order.created_at).toLocaleString("ar-IQ")}
              </p>
            </section>

            <section className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-card">
              <h2 className="text-sm font-extrabold">{t("deliveryAddress")}</h2>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="size-3.5" />
                {order.customer_name}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3.5" />
                {order.phone}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {order.city} — {order.address_line}
              </p>
              {order.note && <p className="text-xs text-muted-foreground">{order.note}</p>}
            </section>

            <section className="rounded-xl border border-border bg-card p-3 shadow-card">
              <h2 className="mb-2 text-sm font-extrabold">{t("orderItems")}</h2>
              <ul className="divide-y divide-border">
                {(order.order_items ?? []).map((i) => (
                  <li key={i.id} className="flex items-center gap-2 py-2">
                    {i.image_url && (
                      <img
                        src={i.image_url}
                        alt={pickName(i, lang)}
                        loading="lazy"
                        className="size-11 shrink-0 rounded-lg border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-bold">{pickName(i, lang)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatPrice(Number(i.unit_price), lang)} × {i.quantity}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-extrabold">
                      {formatPrice(Number(i.unit_price) * i.quantity, lang)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("subtotal")}</dt>
                  <dd>{formatPrice(Number(order.subtotal), lang)}</dd>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("discount")}</dt>
                    <dd className="text-deal">-{formatPrice(Number(order.discount), lang)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-1.5 text-sm font-extrabold">
                  <dt>{t("total")}</dt>
                  <dd className="text-primary">{formatPrice(Number(order.total), lang)}</dd>
                </div>
              </dl>
            </section>

            {order.status === "confirmed" && (
              <button
                type="button"
                onClick={() =>
                  printOrderInvoice({
                    lang,
                    storeName: t("storeName"),
                    party: t("storeName"),
                    caption: `${t("ordInvoiceCaption")} · #${order.order_no}`,
                    orderNo: order.order_no,
                    date: order.created_at,
                    customerName: order.customer_name,
                    phone: order.phone,
                    address: `${order.city} — ${order.address_line}`,
                    items: (order.order_items ?? []).map((i) => ({
                      name: pickName(i, lang),
                      quantity: i.quantity,
                      unit_price: Number(i.unit_price),
                    })),
                    extras: [
                      { label: t("discount"), value: formatPrice(Number(order.discount), lang) },
                      {
                        label: t("shippingFee"),
                        value: formatPrice(
                          Math.max(
                            0,
                            Number(order.total) - Number(order.subtotal) + Number(order.discount),
                          ),
                          lang,
                        ),
                      },
                    ],
                    totalLabel: t("total"),
                    total: Number(order.total),
                    money: (n) => formatPrice(n, lang),
                    t: (k) => t(k as Parameters<typeof t>[0]),
                    footer: `${order.city} — ${order.address_line}`,
                  })
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-card"
              >
                <FileText className="size-4" />
                {t("ordInvoice")}
              </button>
            )}
          </>
        )}
      </div>
    </StoreLayout>
  );
}
