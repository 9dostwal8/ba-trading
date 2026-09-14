import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Grid,
  Layers,
  List,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  User,
  X,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pickName, useI18n, type Lang } from "@/lib/i18n";
import { ACTION_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";

const L = {
  ordersTitle: {
    ar: "إدارة الطلبات",
    ku: "بەڕێوەبردنی داواکاریەکان",
    en: "Orders Management",
  },
  ordersSubtitle: {
    ar: "متابعة الطلبات، تأكيد الدفع، والتواصل السريع مع العملاء",
    ku: "بەدواداچوونی داواکاریەکان، پەسەندکردنی پارەدان، و پەیوەندی خێرا بە کڕیار",
    en: "Track orders, confirm payments, and quickly contact customers",
  },
  refresh: {
    ar: "تحديث",
    ku: "نوێکردنەوە",
    en: "Refresh",
  },
  exportCsv: {
    ar: "تصدير CSV",
    ku: "داگرتنی ڕاپۆرت",
    en: "Export CSV",
  },
  searchPlaceholder: {
    ar: "بحث برقم الطلب، اسم العميل، الهاتف، المدينة...",
    ku: "گەڕان بە ژمارەی داواکاری، ناوی کڕیار، مۆبایل، شار...",
    en: "Search by order #, customer name, phone, city...",
  },
  all: {
    ar: "جميع الطلبات",
    ku: "هەموو داواکاریەکان",
    en: "All Orders",
  },
  newOrders: {
    ar: "بانتظار القبول",
    ku: "چاوەڕوانی پەسەندکردن",
    en: "Awaiting Approval",
  },
  confirmedOrders: {
    ar: "مقبول ومدفوع",
    ku: "پەسەندکراو و پارەدراو",
    en: "Approved & Paid",
  },
  cancelledOrders: {
    ar: "مرفوض",
    ku: "ڕەتکراوە",
    en: "Rejected",
  },
  totalRevenue: {
    ar: "إجمالي المبيعات",
    ku: "کۆی داهاتی فرۆش",
    en: "Total Revenue",
  },
  pendingVolume: {
    ar: "قيد المراجعة",
    ku: "داواکاری چاوەڕوان",
    en: "Pending Value",
  },
  allCities: {
    ar: "جميع المدن",
    ku: "هەموو شارەکان",
    en: "All Cities",
  },
  sortNewest: {
    ar: "الأحدث أولاً",
    ku: "نوێترین",
    en: "Newest First",
  },
  sortOldest: {
    ar: "الأقدم أولاً",
    ku: "کۆنترین",
    en: "Oldest First",
  },
  sortHighestPrice: {
    ar: "الأعلى سعراً",
    ku: "بەرزترین بڕ",
    en: "Highest Amount",
  },
  sortLowestPrice: {
    ar: "الأقل سعراً",
    ku: "نزمترین بڕ",
    en: "Lowest Amount",
  },
  noOrdersFound: {
    ar: "لا توجد طلبات مطابقة للبحث أو التصفية",
    ku: "هیچ داواکاریەک نەدۆزرایەوە بەم گەڕان و فلتەرە",
    en: "No orders match your search or filter",
  },
  clearFilters: {
    ar: "مسح التصفية",
    ku: "پاککردنەوەی فلتەر",
    en: "Clear filters",
  },
  approvePrompt: {
    ar: "قبول وتأكيد الدفع",
    ku: "پەسەندکردن و پارەدان",
    en: "Approve & Mark Paid",
  },
  rejectPrompt: {
    ar: "رفض الطلب",
    ku: "ڕەتکردنەوەی داواکاری",
    en: "Reject Order",
  },
  viewDetails: {
    ar: "عرض التفاصيل",
    ku: "بینینی وردەکاری",
    en: "View Details",
  },
  quickInvoice: {
    ar: "الوصل / الفاتورة",
    ku: "پسوولە / پسولە",
    en: "Invoice",
  },
  printReceipt: {
    ar: "طباعة الوصل",
    ku: "چاپکردنی پسوولە",
    en: "Print Receipt",
  },
  whatsappMsg: {
    ar: "مرحبا، بخصوص طلبك رقم #",
    ku: "سڵاو بەڕێزم، سەبارەت بە داواکاریەکەت ژمارە #",
    en: "Hello, regarding your order #",
  },
  paymentMethod: {
    ar: "طريقة الدفع",
    ku: "شێوازی پارەدان",
    en: "Payment Method",
  },
  cashOnDelivery: {
    ar: "الدفع عند الاستلام",
    ku: "کاش لەکاتی وەرگرتن",
    en: "Cash on Delivery",
  },
  paid: {
    ar: "مدفوع",
    ku: "پارەدراو",
    en: "Paid",
  },
  unpaid: {
    ar: "غير مدفوع",
    ku: "پارەنەدراو",
    en: "Unpaid",
  },
  customerNote: {
    ar: "ملاحظة العميل",
    ku: "تێبینی کڕیار",
    en: "Customer Note",
  },
  close: {
    ar: "إغلاق",
    ku: "داخستن",
    en: "Close",
  },
};

type OrderRecord = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  city: string;
  address_line: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  coins_discount: number;
  total: number;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  order_items: {
    id: string;
    name_ar?: string;
    name_ku?: string;
    quantity: number;
    unit_price: number;
    product_id?: string | null;
  }[];
};

export function AdminOrders() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const Back = lang === "ar" || lang === "ku" ? ChevronLeft : ChevronRight;

  // Search, Filter, Sort & View State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Selected Order for Quick Invoice Modal
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderRecord | null>(null);

  // Fetch orders with order items
  const { data: orders = [], isFetching, refetch } = useQuery<OrderRecord[]>({
    queryKey: ["admin-orders"],
    queryFn: async () =>
      ((
        await supabase
          .from("orders")
          .select("*, order_items(*)")
          .order("created_at", { ascending: false })
      ).data ?? []) as OrderRecord[],
  });

  // Mutation to update order status
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
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
    onError: (e: unknown) =>
      toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  // Unique list of cities from orders
  const cities = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.city && o.city.trim()) set.add(o.city.trim());
    });
    return Array.from(set).sort();
  }, [orders]);

  // KPIs Calculations
  const stats = useMemo(() => {
    const totalCount = orders.length;
    let totalRevenue = 0;
    let pendingCount = 0;
    let pendingVolume = 0;
    let confirmedCount = 0;
    let confirmedVolume = 0;
    let cancelledCount = 0;

    orders.forEach((o) => {
      const amount = Number(o.total || 0);
      if (o.status === "confirmed") {
        confirmedCount++;
        confirmedVolume += amount;
        totalRevenue += amount;
      } else if (o.status === "new") {
        pendingCount++;
        pendingVolume += amount;
      } else if (o.status === "cancelled") {
        cancelledCount++;
      }
    });

    return {
      totalCount,
      totalRevenue,
      pendingCount,
      pendingVolume,
      confirmedCount,
      confirmedVolume,
      cancelledCount,
    };
  }, [orders]);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Status filter
        if (statusFilter !== "all" && o.status !== statusFilter) return false;

        // City filter
        if (cityFilter !== "all" && o.city !== cityFilter) return false;

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchNo = `#${o.order_no}`.includes(q) || String(o.order_no).includes(q);
          const matchCustomer = (o.customer_name || "").toLowerCase().includes(q);
          const matchPhone = (o.phone || "").toLowerCase().includes(q);
          const matchCity = (o.city || "").toLowerCase().includes(q);
          const matchAddress = (o.address_line || "").toLowerCase().includes(q);
          const matchItems = (o.order_items || []).some((item) =>
            ((item.name_ku || "") + " " + (item.name_ar || "")).toLowerCase().includes(q)
          );

          if (!matchNo && !matchCustomer && !matchPhone && !matchCity && !matchAddress && !matchItems) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "highest") {
          return Number(b.total || 0) - Number(a.total || 0);
        }
        if (sortBy === "lowest") {
          return Number(a.total || 0) - Number(b.total || 0);
        }
        return 0;
      });
  }, [orders, statusFilter, cityFilter, search, sortBy]);

  // Export to CSV helper
  const handleExportCsv = () => {
    if (!orders.length) return;
    const headers = [
      "Order No",
      "Customer",
      "Phone",
      "City",
      "Address",
      "Status",
      "Payment Status",
      "Subtotal",
      "Discount",
      "Total",
      "Date",
    ];

    const rows = filteredOrders.map((o) => [
      `#${o.order_no}`,
      `"${o.customer_name || ""}"`,
      `"${o.phone || ""}"`,
      `"${o.city || ""}"`,
      `"${(o.address_line || "").replace(/"/g, '""')}"`,
      o.status,
      o.payment_status,
      o.subtotal,
      o.discount,
      o.total,
      `"${new Date(o.created_at).toLocaleString()}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "ku" ? "ڕاپۆرت بەسەرکەوتوویی داگیرا" : "تم تصدير التقرير بنجاح");
  };

  // WhatsApp quick link builder
  const getWhatsAppLink = (phone: string, orderNo: number) => {
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("07")) {
      cleanPhone = "964" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("7")) {
      cleanPhone = "964" + cleanPhone;
    }
    const message = encodeURIComponent(`${L.whatsappMsg[lang]}${orderNo}`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  // Format date readable
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(lang === "en" ? "en-US" : lang === "ar" ? "ar-IQ" : "ckb", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      
      {/* -------------------------------------------------------------
          1. HEADER WITH ACTIONS (Refresh, Export, Title)
      ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-blue-500/20">
            <Receipt className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {L.ordersTitle[lang]}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {orders.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {L.ordersSubtitle[lang]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title={L.refresh[lang]}
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin text-[#007979]")} />
            <span className="hidden xs:inline">{L.refresh[lang]}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#007979] hover:bg-[#006666] text-white text-xs font-bold shadow-sm shadow-[#007979]/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="size-3.5" />
            <span>{L.exportCsv[lang]}</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          2. KPI METRICS CARDS (Total, Pending, Confirmed, Cancelled)
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders & Volume */}
        <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {L.all[lang]}
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Package className="size-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalCount}
          </div>
          <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {formatPrice(stats.totalRevenue, lang)}
          </div>
        </div>

        {/* Pending Orders (Awaiting Approval) */}
        <div
          onClick={() => setStatusFilter("new")}
          className={cn(
            "rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border shadow-sm relative overflow-hidden group transition-all duration-200 cursor-pointer",
            statusFilter === "new"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {L.newOrders[lang]}
              </span>
              {stats.pendingCount > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.pendingCount}
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {formatPrice(stats.pendingVolume, lang)}
          </div>
        </div>

        {/* Confirmed Orders (Approved & Paid) */}
        <div
          onClick={() => setStatusFilter("confirmed")}
          className={cn(
            "rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border shadow-sm relative overflow-hidden group transition-all duration-200 cursor-pointer",
            statusFilter === "confirmed"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {L.confirmedOrders[lang]}
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.confirmedCount}
          </div>
          <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatPrice(stats.confirmedVolume, lang)}
          </div>
        </div>

        {/* Cancelled / Rejected Orders */}
        <div
          onClick={() => setStatusFilter("cancelled")}
          className={cn(
            "rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border shadow-sm relative overflow-hidden group transition-all duration-200 cursor-pointer",
            statusFilter === "cancelled"
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20"
              : "border-slate-200/80 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {L.cancelledOrders[lang]}
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <XCircle className="size-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats.cancelledCount}
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {stats.cancelledCount} {lang === "ku" ? "ڕەتکراوە" : "مرفوض"}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          3. SEARCH, STATUS TABS, CITY FILTER & SORT CONTROLS
      ------------------------------------------------------------- */}
      <div className="space-y-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Top Controls Row: Search + City Filter + Sort + View Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={L.searchPlaceholder[lang]}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl ps-10 pe-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007979] focus:ring-2 focus:ring-[#007979]/20 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center hover:scale-110 active:scale-95"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* City Filter Selector */}
            {cities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007979] cursor-pointer"
              >
                <option value="all">{L.allCities[lang]}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#007979] cursor-pointer"
            >
              <option value="newest">{L.sortNewest[lang]}</option>
              <option value="oldest">{L.sortOldest[lang]}</option>
              <option value="highest">{L.sortHighestPrice[lang]}</option>
              <option value="lowest">{L.sortLowestPrice[lang]}</option>
            </select>

            {/* View Mode Switcher (Grid vs Table) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid View"
                className={cn(
                  "p-1.5 rounded-xl transition-all",
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-[#007979] dark:text-teal-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <Grid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table View"
                className={cn(
                  "p-1.5 rounded-xl transition-all",
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-700 text-[#007979] dark:text-teal-400 shadow-xs"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: "all", label: L.all[lang], count: orders.length },
            { id: "new", label: L.newOrders[lang], count: stats.pendingCount, alert: stats.pendingCount > 0 },
            { id: "confirmed", label: L.confirmedOrders[lang], count: stats.confirmedCount },
            { id: "cancelled", label: L.cancelledOrders[lang], count: stats.cancelledCount },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-[#007979] text-white shadow-sm shadow-[#007979]/20"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {tab.count}
                </span>
                {tab.alert && !isActive && (
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------
          4. ORDERS VIEW (GRID CARDS or TABLE)
      ------------------------------------------------------------- */}
      {filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur p-12 text-center max-w-md mx-auto my-12">
          <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto mb-3">
            <Receipt className="size-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {L.noOrdersFound[lang]}
          </h3>
          {(search || statusFilter !== "all" || cityFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCityFilter("all");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#007979] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            >
              {L.clearFilters[lang]}
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* -------------------------------------------------------------
            CARD GRID VIEW (Modern 2-Column Responsive Layout)
        ------------------------------------------------------------- */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredOrders.map((o) => {
            const isConfirmed = o.status === "confirmed";
            const isCancelled = o.status === "cancelled";
            const isNew = o.status === "new";

            return (
              <div
                key={o.id}
                className={cn(
                  "rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group",
                  isNew
                    ? "border-amber-300/80 dark:border-amber-900/40 hover:border-amber-400"
                    : isConfirmed
                    ? "border-emerald-300/70 dark:border-emerald-900/40 hover:border-emerald-400"
                    : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300"
                )}
              >
                <div>
                  {/* Card Header: Order No + Date + Status Badge */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white text-xs sm:text-sm font-black tracking-wider shadow-2xs">
                        #{o.order_no}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(o.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <OrderStatusBadge status={o.status} lang={lang} size="sm" />
                    </div>
                  </div>

                  {/* Customer Information & Contact Buttons */}
                  <div className="py-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white font-black text-xs shrink-0 shadow-2xs">
                          {(o.customer_name || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {o.customer_name || (lang === "ku" ? "کڕیار" : "العميل")}
                          </h4>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                            {o.phone}
                          </p>
                        </div>
                      </div>

                      {/* Contact Quick Buttons (Phone Call + WhatsApp) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {o.phone && (
                          <>
                            <a
                              href={`tel:${o.phone}`}
                              className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
                              title="Call Phone"
                            >
                              <Phone className="size-3.5" />
                            </a>
                            <a
                              href={getWhatsAppLink(o.phone, o.order_no)}
                              target="_blank"
                              rel="noreferrer"
                              className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center justify-center transition active:scale-95 shadow-2xs"
                              title="WhatsApp Chat"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address & Location Link */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="size-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {o.city || "—"}
                        </span>
                        {o.address_line && (
                          <span className="text-slate-400 truncate">
                            · {o.address_line}
                          </span>
                        )}
                      </div>

                      {o.latitude && o.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${o.latitude},${o.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[11px] font-extrabold text-[#007979] dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <MapPin className="size-3" />
                          <span>Google Maps</span>
                        </a>
                      )}
                    </div>

                    {/* Customer Note if any */}
                    {o.note && (
                      <div className="text-[11px] font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="size-3.5 shrink-0 text-amber-500" />
                        <span className="truncate">
                          <strong className="font-bold">{L.customerNote[lang]}:</strong> {o.note}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ordered Items Preview */}
                  <div className="space-y-1.5 py-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-400">
                      {lang === "ku" ? "بەرهەمەکان" : lang === "ar" ? "المنتجات" : "Items"} (
                      {(o.order_items ?? []).reduce((sum, item) => sum + (item.quantity || 1), 0)}
                      )
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                      {(o.order_items ?? []).map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.2 rounded-md bg-[#007979]/10 text-[#007979] dark:text-teal-400 font-extrabold text-[10px]">
                              ×{item.quantity}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {pickName(item, lang)}
                            </span>
                          </div>
                          <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0 text-[11px]">
                            {formatPrice(Number(item.unit_price * item.quantity), lang)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Financial Total + Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      {lang === "ku" ? "کۆی گشتی" : lang === "ar" ? "المجموع الكلي" : "Total"}
                    </span>
                    <span className="text-base sm:text-lg font-black text-[#007979] dark:text-teal-400">
                      {formatPrice(Number(o.total || 0), lang)}
                    </span>
                  </div>

                  {/* Status Change Buttons & Quick Invoice Modal Button */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* Approve Button */}
                    <button
                      type="button"
                      disabled={isConfirmed || setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: o.id, status: "confirmed" })}
                      className={cn(
                        "h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs",
                        isConfirmed
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 opacity-60 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      )}
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>{ACTION_LABELS.confirmed[lang]}</span>
                    </button>

                    {/* Reject Button */}
                    <button
                      type="button"
                      disabled={isCancelled || setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: o.id, status: "cancelled" })}
                      className={cn(
                        "h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer",
                        isCancelled
                          ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 opacity-60 cursor-not-allowed"
                          : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      )}
                    >
                      <XCircle className="size-3.5" />
                      <span>{ACTION_LABELS.cancelled[lang]}</span>
                    </button>

                    {/* Quick Invoice Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceOrder(o)}
                      className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Printer className="size-3.5" />
                      <span>{L.quickInvoice[lang]}</span>
                    </button>

                    {/* Details Link */}
                    <Link
                      to="/orders/$id"
                      params={{ id: o.id }}
                      className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                      <span>{L.viewDetails[lang]}</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* -------------------------------------------------------------
            TABLE LIST VIEW (Professional Data Table)
        ------------------------------------------------------------- */
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black">
                <th className="p-4 text-start">#</th>
                <th className="p-4 text-start">{lang === "ku" ? "کڕیار و مۆبایل" : "العميل والهاتف"}</th>
                <th className="p-4 text-start">{lang === "ku" ? "شوێن" : "الموقع"}</th>
                <th className="p-4 text-start">{lang === "ku" ? "بەرهەمەکان" : "المنتجات"}</th>
                <th className="p-4 text-start">{lang === "ku" ? "بڕی پارە" : "المبلغ"}</th>
                <th className="p-4 text-start">{lang === "ku" ? "دۆخ" : "الحالة"}</th>
                <th className="p-4 text-center">{lang === "ku" ? "کردارەکان" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Order No & Date */}
                  <td className="p-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold">
                      #{o.order_no}
                    </span>
                    <div className="text-[10px] text-slate-400 font-normal mt-1">
                      {formatDate(o.created_at)}
                    </div>
                  </td>

                  {/* Customer & Phone */}
                  <td className="p-4 whitespace-nowrap">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {o.customer_name || "—"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {o.phone}
                      </span>
                      {o.phone && (
                        <a
                          href={getWhatsAppLink(o.phone, o.order_no)}
                          target="_blank"
                          rel="noreferrer"
                          className="size-5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center hover:scale-110"
                        >
                          <MessageCircle className="size-3" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="p-4 max-w-[180px]">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {o.city || "—"}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {o.address_line || "—"}
                    </div>
                  </td>

                  {/* Items summary */}
                  <td className="p-4 max-w-[200px]">
                    <div className="text-slate-700 dark:text-slate-300 truncate font-semibold">
                      {(o.order_items ?? []).map((i) => `${pickName(i, lang)} ×${i.quantity}`).join(" · ")}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {(o.order_items ?? []).length} {lang === "ku" ? "جۆر" : "عنصر"}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="p-4 whitespace-nowrap">
                    <span className="font-black text-sm text-[#007979] dark:text-teal-400">
                      {formatPrice(Number(o.total || 0), lang)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4 whitespace-nowrap">
                    <OrderStatusBadge status={o.status} lang={lang} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="p-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={o.status === "confirmed" || setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: o.id, status: "confirmed" })}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 transition active:scale-95 disabled:opacity-40"
                        title={ACTION_LABELS.confirmed[lang]}
                      >
                        <CheckCircle2 className="size-4" />
                      </button>

                      <button
                        type="button"
                        disabled={o.status === "cancelled" || setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: o.id, status: "cancelled" })}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition active:scale-95 disabled:opacity-40"
                        title={ACTION_LABELS.cancelled[lang]}
                      >
                        <XCircle className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceOrder(o)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition active:scale-95"
                        title={L.quickInvoice[lang]}
                      >
                        <Printer className="size-4" />
                      </button>

                      <Link
                        to="/orders/$id"
                        params={{ id: o.id }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition active:scale-95"
                        title={L.viewDetails[lang]}
                      >
                        <Eye className="size-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. QUICK INVOICE / RECEIPT MODAL OVERLAY
      ------------------------------------------------------------- */}
      {selectedInvoiceOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedInvoiceOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-[#007979]" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {L.quickInvoice[lang]} #{selectedInvoiceOrder.order_no}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div id="printable-order-invoice" className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              {/* Store & Order Head */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  BA Trading
                </h2>
                <p className="text-xs text-slate-400">
                  {formatDate(selectedInvoiceOrder.created_at)}
                </p>
                <span className="inline-block px-3 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-mono font-bold text-xs">
                  ORDER #{selectedInvoiceOrder.order_no}
                </span>
              </div>

              {/* Customer Info */}
              <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div><strong>{lang === "ku" ? "کڕیار" : "العميل"}:</strong> {selectedInvoiceOrder.customer_name}</div>
                <div><strong>{lang === "ku" ? "مۆبایل" : "الهاتف"}:</strong> {selectedInvoiceOrder.phone}</div>
                <div><strong>{lang === "ku" ? "ناونیشان" : "العنوان"}:</strong> {selectedInvoiceOrder.city} — {selectedInvoiceOrder.address_line}</div>
                {selectedInvoiceOrder.note && (
                  <div><strong>{L.customerNote[lang]}:</strong> {selectedInvoiceOrder.note}</div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400">{lang === "ku" ? "بەرهەمەکان" : "قائمة الأصناف"}</div>
                <div className="space-y-1.5">
                  {(selectedInvoiceOrder.order_items ?? []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {pickName(item, lang)} ×{item.quantity}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatPrice(Number(item.unit_price * item.quantity), lang)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>{lang === "ku" ? "کۆی کاتی" : "المجموع الفرعي"}</span>
                  <span>{formatPrice(Number(selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total), lang)}</span>
                </div>
                {selectedInvoiceOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{lang === "ku" ? "داشکاندن" : "الخصم"}</span>
                    <span>-{formatPrice(Number(selectedInvoiceOrder.discount), lang)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-[#007979] dark:text-teal-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>{lang === "ku" ? "کۆی کۆتایی" : "المجموع الكلي"}</span>
                  <span>{formatPrice(Number(selectedInvoiceOrder.total), lang)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {L.close[lang]}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007979] hover:bg-[#006666] text-white text-xs font-bold shadow-md shadow-[#007979]/20 transition active:scale-95 cursor-pointer"
              >
                <Printer className="size-3.5" />
                <span>{L.printReceipt[lang]}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
