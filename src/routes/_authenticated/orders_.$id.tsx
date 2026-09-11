import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Printer,
  Receipt,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { printOrderInvoice } from "@/lib/orderInvoice";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/orders_/$id")({
  head: () => ({
    meta: [
      { title: "وردەکاریی داواکاری | دنتال ستور" },
      { name: "description", content: "تفاصيل الطلب: المنتجات، العنوان، الحالة والإجمالي." },
      { property: "og:title", content: "وردەکاریی داواکاری | دنتال ستور" },
      { property: "og:description", content: "تفاصيل كاملة عن طلبك." },
    ],
  }),
  component: OrderDetailPage,
});

const L = {
  orderDetails: {
    ar: "تفاصيل الطلب",
    ku: "وردەکاریی داواکاری",
    en: "Order Details",
  },
  orderSummary: {
    ar: "ملخص الطلب",
    ku: "کورتەی داواکاری",
    en: "Order Summary",
  },
  itemsOrdered: {
    ar: "المنتجات المطلوبة",
    ku: "بەرهەمە داواکراوەکان",
    en: "Ordered Items",
  },
  customerInfo: {
    ar: "بيانات التوصيل والعميل",
    ku: "زانیاریی کڕیار و گەیاندن",
    en: "Customer & Delivery Info",
  },
  placedAt: {
    ar: "تاريخ ووقت الطلب",
    ku: "کاتی تۆمارکردن",
    en: "Order Placed At",
  },
  subtotal: {
    ar: "المجموع الفرعي",
    ku: "کۆی بەرهەمەکان",
    en: "Subtotal",
  },
  discount: {
    ar: "الخصم",
    ku: "داشکاندن",
    en: "Discount",
  },
  shipping: {
    ar: "أجور التوصيل",
    ku: "کرێی گەیاندن",
    en: "Delivery Fee",
  },
  freeShipping: {
    ar: "مجاني",
    ku: "بێبەرامبەر",
    en: "Free",
  },
  total: {
    ar: "المجموع الكلي",
    ku: "کۆی گشتی",
    en: "Total",
  },
  printInvoice: {
    ar: "طباعة الفاتورة الرسمية",
    ku: "چاپکردنی پسوڵەی فەرمی",
    en: "Print Official Invoice",
  },
  backToOrders: {
    ar: "العودة إلى طلباتي",
    ku: "گەڕانەوە بۆ داواکارییەکانم",
    en: "Back to My Orders",
  },
  notes: {
    ar: "ملاحظات إضافية",
    ku: "تێبینی",
    en: "Notes",
  },
  timelineStep1: {
    ar: "تم استلام الطلب",
    ku: "داواکاری وەرگیرا",
    en: "Order Received",
  },
  timelineStep2: {
    ar: "قيد التجهيز والمراجعة",
    ku: "لە ئامادەکردندایە",
    en: "Processing",
  },
  timelineStep3: {
    ar: "تم التأكيد والدفع",
    ku: "پەسەندکراو و تەواوکراو",
    en: "Confirmed & Completed",
  },
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { lang, t } = useI18n();

  const { data: order, isLoading } = useQuery({
    queryKey: ["my-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error("Failed to load order detail:", error);
        return null;
      }
      return data;
    },
  });

  const isConfirmed = order?.status === "confirmed" || order?.status === "shipped" || order?.status === "done";
  const isCancelled = order?.status === "cancelled";

  return (
    <StoreLayout>
      <div className="min-h-[80vh] bg-slate-50/70 dark:bg-slate-950 pb-16">
        {/* Top Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/orders"
                aria-label={t("back")}
                className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95 border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <ArrowRight className="size-5 rtl:rotate-0 ltr:rotate-180" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {L.orderDetails[lang]}
                  </h1>
                  {order && (
                    <span className="font-mono text-sm font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg">
                      #{String(order.order_no).padStart(4, "0")}
                    </span>
                  )}
                </div>
                {order && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {new Date(order.created_at).toLocaleDateString(
                      lang === "ku" ? "ckb" : lang === "ar" ? "ar-IQ" : "en-US",
                      { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                )}
              </div>
            </div>

            {order && <OrderStatusBadge status={order.status} lang={lang} size="md" />}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6 space-y-4 sm:space-y-6">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          )}

          {!isLoading && !order && (
            <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Package className="size-12 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-black text-slate-800 dark:text-slate-200">
                {t("orderNotFound")}
              </p>
              <Link
                to="/orders"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                {L.backToOrders[lang]}
              </Link>
            </div>
          )}

          {order && (
            <>
              {/* Order Status Progress Tracker */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
                  {/* Step 1: Placed */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-emerald-500 text-white font-bold mb-2 shadow-xs ring-4 ring-emerald-50 dark:ring-emerald-950">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-200">
                      {L.timelineStep1[lang]}
                    </span>
                  </div>

                  {/* Step 2: Processing */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`flex size-9 sm:size-10 items-center justify-center rounded-full font-bold mb-2 shadow-xs ring-4 ${
                        isCancelled
                          ? "bg-rose-500 text-white ring-rose-50 dark:ring-rose-950"
                          : isConfirmed
                          ? "bg-emerald-500 text-white ring-emerald-50 dark:ring-emerald-950"
                          : "bg-amber-500 text-white ring-amber-50 dark:ring-amber-950 animate-pulse"
                      }`}
                    >
                      {isCancelled ? (
                        <XCircle className="size-5" />
                      ) : isConfirmed ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Clock className="size-5" />
                      )}
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-200">
                      {isCancelled ? t("rejected") || "ڕەتکراوە" : L.timelineStep2[lang]}
                    </span>
                  </div>

                  {/* Step 3: Completed */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`flex size-9 sm:size-10 items-center justify-center rounded-full font-bold mb-2 shadow-xs ring-4 ${
                        isConfirmed
                          ? "bg-emerald-500 text-white ring-emerald-50 dark:ring-emerald-950"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 ring-slate-50 dark:ring-slate-900"
                      }`}
                    >
                      <PackageCheck className="size-5" />
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-black ${
                        isConfirmed
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400"
                      }`}
                    >
                      {L.timelineStep3[lang]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List Card */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <Package className="size-4 text-[#007979] dark:text-teal-400" />
                    <span>{L.itemsOrdered[lang]}</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    {(order.order_items ?? []).length} {L.itemsOrdered[lang]}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {(order.order_items ?? []).map((i: any) => (
                    <div key={i.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {i.image_url ? (
                          <img
                            src={i.image_url}
                            alt={pickName(i, lang)}
                            className="size-14 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 object-cover bg-slate-50 dark:bg-slate-800"
                          />
                        ) : (
                          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <ShoppingBag className="size-6" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                            {pickName(i, lang)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{formatPrice(Number(i.unit_price), lang)}</span>
                            <span>×</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {i.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-[#007979] dark:text-teal-400">
                          {formatPrice(Number(i.unit_price) * Number(i.quantity), lang)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two Column Layout for Customer Info & Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer & Delivery Card */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3.5">
                  <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                    <Truck className="size-4 text-[#007979] dark:text-teal-400" />
                    <span>{L.customerInfo[lang]}</span>
                  </h2>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        <User className="size-4" />
                      </div>
                      <span className="font-bold">{order.customer_name || "—"}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        <Phone className="size-4" />
                      </div>
                      <span className="font-mono font-bold">{order.phone || "—"}</span>
                    </div>

                    <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 mt-0.5">
                        <MapPin className="size-4" />
                      </div>
                      <div className="leading-relaxed">
                        <span className="font-bold">{order.city}</span>
                        {order.address_line && (
                          <span className="text-slate-500 dark:text-slate-400">
                            {" "}
                            — {order.address_line}
                          </span>
                        )}
                      </div>
                    </div>

                    {order.note && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
                        <span className="font-bold block mb-0.5">{L.notes[lang]}:</span>
                        {order.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Breakdown Card */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3.5">
                  <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                    <Receipt className="size-4 text-[#007979] dark:text-teal-400" />
                    <span>{L.orderSummary[lang]}</span>
                  </h2>

                  <dl className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <dt>{L.subtotal[lang]}</dt>
                      <dd className="font-bold text-slate-700 dark:text-slate-200">
                        {formatPrice(Number(order.subtotal), lang)}
                      </dd>
                    </div>

                    {Number(order.discount) > 0 && (
                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold">
                        <dt>{L.discount[lang]}</dt>
                        <dd>-{formatPrice(Number(order.discount), lang)}</dd>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <dt>{L.shipping[lang]}</dt>
                      <dd className="font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.max(
                          0,
                          Number(order.total) - Number(order.subtotal) + Number(order.discount)
                        ) > 0
                          ? formatPrice(
                              Number(order.total) - Number(order.subtotal) + Number(order.discount),
                              lang
                            )
                          : L.freeShipping[lang]}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <dt className="text-sm font-black text-slate-900 dark:text-white">
                        {L.total[lang]}
                      </dt>
                      <dd className="text-lg font-black text-[#007979] dark:text-teal-400">
                        {formatPrice(Number(order.total), lang)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                {isConfirmed && (
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
                        items: (order.order_items ?? []).map((i: any) => ({
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
                                Number(order.total) - Number(order.subtotal) + Number(order.discount)
                              ),
                              lang
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
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 text-xs font-black shadow-sm transition active:scale-95"
                  >
                    <Printer className="size-4" />
                    <span>{L.printInvoice[lang]}</span>
                  </button>
                )}

                <Link
                  to="/orders"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-5 py-3 text-xs font-black shadow-xs transition active:scale-95"
                >
                  <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
                  <span>{L.backToOrders[lang]}</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
