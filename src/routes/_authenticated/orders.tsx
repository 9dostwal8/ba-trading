import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  Clock,
  ExternalLink,
  Filter,
  Package,
  PackageCheck,
  PackageOpen,
  Receipt,
  Search,
  ShoppingBag,
  Store,
  XCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "داواکارییەکانم | دنتال ستور" },
      { name: "description", content: "بەدواداچوون بۆ دۆخی داواکارییەکانت و وردەکارییەکانیان." },
      { property: "og:title", content: "داواکارییەکانم | دنتال ستور" },
      { property: "og:description", content: "بەدواداچوون بۆ دۆخی داواکارییەکانت." },
    ],
  }),
  component: OrdersPage,
});

const L = {
  title: {
    ar: "طلباتي",
    ku: "داواکارییەکانم",
    en: "My Orders",
  },
  subtitle: {
    ar: "تابع حالة طلباتك ومحتوياتها وتفاصيل التوصيل",
    ku: "بەدواداچوون بۆ دۆخی داواکارییەکانت و وردەکاریی گەیاندن",
    en: "Track the status, items, and delivery of your orders",
  },
  allOrders: {
    ar: "الكل",
    ku: "هەمووی",
    en: "All",
  },
  statusNew: {
    ar: "قيد المراجعة",
    ku: "لە پێداچوونەوەدایە",
    en: "Pending",
  },
  statusConfirmed: {
    ar: "مقبول ومكتمل",
    ku: "پەسەندکراو",
    en: "Confirmed",
  },
  statusCancelled: {
    ar: "ملغي",
    ku: "هەڵوەشاوە",
    en: "Cancelled",
  },
  searchPlaceholder: {
    ar: "بحث برقم الطلب أو اسم المنتج...",
    ku: "گەڕان بە ژمارەی داواکاری یان ناوی بەرهەم...",
    en: "Search by order # or product name...",
  },
  totalAmount: {
    ar: "المجموع الكلي",
    ku: "کۆی گشتی",
    en: "Total Amount",
  },
  viewDetails: {
    ar: "تفاصيل الطلب",
    ku: "وردەکاریی داواکاری",
    en: "View Details",
  },
  itemsCount: {
    ar: "عناصر",
    ku: "بەرهەم",
    en: "items",
  },
  itemSingle: {
    ar: "عنصر واحد",
    ku: "١ بەرهەم",
    en: "1 item",
  },
  noOrdersTitle: {
    ar: "لا توجد طلبات بعد",
    ku: "هێشتا هیچ داواکارییەکت نییە",
    en: "No orders yet",
  },
  noOrdersDesc: {
    ar: "عندما تقوم بإتمام أي طلب، ستتمكن من متابعة حالته وفواتيره من هنا.",
    ku: "کاتێک هەر داواکارییەک ئەنجام دەدەیت، دەتوانیت لێرە بەدواداچوونی بۆ بکەیت.",
    en: "When you place an order, you can track its progress and invoice here.",
  },
  noFilterMatch: {
    ar: "لا توجد طلبات تطابق هذا التصنيف",
    ku: "هیچ داواکارییەک لەم بەشەدا نییە",
    en: "No orders match this filter",
  },
  startShopping: {
    ar: "تصفح المنتجات وابدأ التسوق",
    ku: "دەستپێکردنی کڕین",
    en: "Start Shopping",
  },
  backToAll: {
    ar: "عرض كل الطلبات",
    ku: "پیشاندانی هەموو داواکارییەکان",
    en: "Show all orders",
  },
};

type FilterStatus = "all" | "new" | "confirmed" | "cancelled";

function OrdersPage() {
  const { lang, t } = useI18n();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load orders:", error);
        return [];
      }
      return data ?? [];
    },
  });

  const orders = rawOrders ?? [];

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (filter === "new" && o.status !== "new") return false;
      if (
        filter === "confirmed" &&
        !["confirmed", "shipped", "done"].includes(o.status)
      )
        return false;
      if (filter === "cancelled" && o.status !== "cancelled") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNo = String(o.order_no ?? "").toLowerCase().includes(q);
        const matchesItems = (o.order_items ?? []).some((item: any) =>
          [item.name_ar, item.name_ku, item.name_en]
            .filter(Boolean)
            .some((name) => String(name).toLowerCase().includes(q))
        );
        if (!matchesNo && !matchesItems) return false;
      }

      return true;
    });
  }, [orders, filter, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "new").length;
    const completed = orders.filter((o) =>
      ["confirmed", "shipped", "done"].includes(o.status)
    ).length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    return { total, pending, completed, cancelled };
  }, [orders]);

  return (
    <StoreLayout>
      <div className="min-h-[80vh] bg-slate-50/70 dark:bg-slate-950 pb-16">
        {/* Top Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/profile"
                aria-label={t("back")}
                className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95 border border-slate-200 dark:border-slate-700 shadow-xs"
              >
                <ArrowRight className="size-5 rtl:rotate-0 ltr:rotate-180" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {L.title[lang]}
                  </h1>
                  {!isLoading && orders.length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-teal-500/10 dark:bg-teal-500/20 text-[#007979] dark:text-teal-400 font-black text-xs px-2.5 py-0.5 border border-teal-500/20">
                      {orders.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {L.subtitle[lang]}
                </p>
              </div>
            </div>

            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition active:scale-95 shrink-0"
            >
              <ShoppingBag className="size-4" />
              <span>{L.startShopping[lang]}</span>
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6 space-y-4">
          {/* Filter Tabs & Search Bar */}
          {!isLoading && orders.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filter === "all"
                      ? "bg-white dark:bg-slate-900 text-[#007979] dark:text-teal-400 shadow-xs font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>{L.allOrders[lang]}</span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold">
                    {counts.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("new")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filter === "new"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Clock className="size-3.5 text-amber-500" />
                  <span>{L.statusNew[lang]}</span>
                  {counts.pending > 0 && (
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[10px] font-bold">
                      {counts.pending}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("confirmed")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filter === "confirmed"
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <PackageCheck className="size-3.5 text-emerald-500" />
                  <span>{L.statusConfirmed[lang]}</span>
                  {counts.completed > 0 && (
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold">
                      {counts.completed}
                    </span>
                  )}
                </button>

                {counts.cancelled > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter("cancelled")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      filter === "cancelled"
                        ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-black"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <XCircle className="size-3.5 text-rose-500" />
                    <span>{L.statusCancelled[lang]}</span>
                    <span className="rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-1.5 py-0.2 text-[10px] font-bold">
                      {counts.cancelled}
                    </span>
                  </button>
                )}
              </div>

              {/* Search input */}
              {orders.length > 3 && (
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-slate-400 ltr:left-3 rtl:right-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={L.searchPlaceholder[lang]}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007979]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24 rounded-md" />
                        <Skeleton className="h-3 w-32 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Orders List */}
          {!isLoading && filteredOrders.length > 0 && (
            <div className="space-y-3.5">
              {filteredOrders.map((o) => {
                const items = o.order_items ?? [];
                const totalItemsCount = items.reduce(
                  (sum: number, item: any) => sum + (Number(item.quantity) || 1),
                  0
                );
                const isPending = o.status === "new";

                return (
                  <div
                    key={o.id}
                    className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-teal-500/40 dark:hover:border-teal-500/30 transition-all duration-200 overflow-hidden"
                  >
                    {/* Top Status & Order No Accent */}
                    <div className="p-4 sm:p-5">
                      {/* Header row */}
                      <div className="flex items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-[#007979] dark:text-teal-400 border border-teal-500/20 shadow-xs">
                            <Receipt className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black text-slate-900 dark:text-white tracking-tight">
                                #{String(o.order_no).padStart(4, "0")}
                              </span>
                              {isPending && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <Calendar className="size-3.5" />
                              <span>{new Date(o.created_at).toLocaleDateString(lang === "ku" ? "ckb" : lang === "ar" ? "ar-IQ" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <OrderStatusBadge status={o.status} lang={lang} size="md" />
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="py-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                              <Package className="size-4 text-slate-400" />
                              <span>
                                {totalItemsCount === 1
                                  ? L.itemSingle[lang]
                                  : `${totalItemsCount} ${L.itemsCount[lang]}`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {items.map((i: any) => `${pickName(i, lang)} (×${i.quantity})`).join(" • ")}
                            </p>
                          </div>

                          {/* Image Thumbnails if available */}
                          {items.some((i: any) => i.image_url) && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {items
                                .filter((i: any) => i.image_url)
                                .slice(0, 3)
                                .map((item: any, idx: number) => (
                                  <img
                                    key={idx}
                                    src={item.image_url}
                                    alt={pickName(item, lang)}
                                    className="size-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  />
                                ))}
                              {items.filter((i: any) => i.image_url).length > 3 && (
                                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500">
                                  +{items.filter((i: any) => i.image_url).length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Total & Action Button */}
                      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold text-slate-400">
                            {L.totalAmount[lang]}
                          </p>
                          <p className="text-base sm:text-lg font-black text-[#007979] dark:text-teal-400 tracking-tight">
                            {formatPrice(Number(o.total), lang)}
                          </p>
                        </div>

                        <Link
                          to="/orders/$id"
                          params={{ id: o.id }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#007979] hover:text-white dark:hover:bg-teal-600 dark:hover:text-white px-4 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 transition-all duration-150 active:scale-95 shadow-2xs"
                        >
                          <span>{L.viewDetails[lang]}</span>
                          <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty Filter Match State */}
          {!isLoading && orders.length > 0 && filteredOrders.length === 0 && (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <PackageOpen className="size-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                {L.noFilterMatch[lang]}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearchQuery("");
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#007979] dark:text-teal-400 hover:underline"
              >
                {L.backToAll[lang]}
              </button>
            </div>
          )}

          {/* Completely Empty State */}
          {!isLoading && orders.length === 0 && (
            <div className="text-center py-16 px-4 max-w-md mx-auto">
              <div className="flex size-20 items-center justify-center rounded-3xl bg-teal-500/10 dark:bg-teal-500/20 text-[#007979] dark:text-teal-400 border border-teal-500/20 mx-auto mb-4 shadow-sm">
                <ShoppingBag className="size-10" />
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">
                {L.noOrdersTitle[lang]}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {L.noOrdersDesc[lang]}
              </p>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white px-6 py-3 text-sm font-extrabold shadow-md transition active:scale-95"
              >
                <ShoppingBag className="size-4" />
                <span>{L.startShopping[lang]}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
