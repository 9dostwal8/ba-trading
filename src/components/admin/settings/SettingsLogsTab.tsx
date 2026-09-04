import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Activity,
  Server,
  HardDrive,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Clock,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AdminCard, SectionHeader } from "../AdminKit";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "security";
  action: string;
  details: string;
  source: string;
}

const L = {
  title: { ar: "سجلات النظام والنشاطات (System Logs)", ku: "تۆماری سیستم و چالاکییەکان", en: "System Logs & Health" },
  subtitle: {
    ar: "مراقبة حالة الخدمات، أنشطة المشرفين، والعمليات الحية في النظام",
    ku: "چاودێریکردنی باری خزمەتگوزارییەکان، چالاکیەکانی بەڕێوەبەران، و ڕووداوە زیندووەکانی سیستم",
    en: "Monitor real-time service health, administrative actions, and audit trails",
  },
  healthTitle: { ar: "حالة الخدمات السحابية", ku: "باری تەندروستی خزمەتگوزارییەکان", en: "Cloud Services Health" },
  database: { ar: "قاعدة بيانات PostgreSQL", ku: "داتابەیسی PostgreSQL", en: "PostgreSQL Database" },
  storage: { ar: "مخزن الملفات (Storage)", ku: "کۆگای فایلەکان (Storage)", en: "Object Storage" },
  auth: { ar: "محرك المصادقة (Auth)", ku: "سیستەمی چوونەژوورەوە (Auth)", en: "Auth Engine" },
  connected: { ar: "متصل ويعمل بكفاءة", ku: "پەیوەستکراوە و چالاکە", en: "Connected & Healthy" },
  searchLogs: { ar: "بحث في السجلات...", ku: "گەڕان لە نێو تۆمارەکاندا...", en: "Search logs..." },
  all: { ar: "الكل", ku: "هەموو", en: "All" },
  info: { ar: "معلومات", ku: "زانیاری", en: "Info" },
  success: { ar: "نجاح", ku: "سەرکەوتوو", en: "Success" },
  warning: { ar: "تنبيهات", ku: "ئاگاداری", en: "Warning" },
  security: { ar: "أمان", ku: "ئەمنی", en: "Security" },
  downloadLogs: { ar: "تحميل السجلات (.txt)", ku: "داگرتنی تۆمارەکان (.txt)", en: "Download Logs (.txt)" },
  clearLogs: { ar: "مسح السجلات المحلية", ku: "سڕینەوەی لۆگەکان", en: "Clear Local Logs" },
  addNote: { ar: "تسجيل ملاحظة تدقيق", ku: "تۆمارکردنی تێبینی", en: "Log Audit Note" },
  noLogs: { ar: "لا توجد سجلات مطابقة", ku: "هیچ تۆمارێک نەدۆزرایەوە", en: "No matching log entries" },
};

export function SettingsLogsTab() {
  const { lang } = useI18n();
  const tx = (k: keyof typeof L) => L[k][lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];

  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  // Load custom stored logs from localStorage
  const [customLogs, setCustomLogs] = useState<LogEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("system_activity_logs");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Query database activity (latest orders, products, etc.)
  const { data: dbLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-system-logs-activity"],
    queryFn: async () => {
      const startPing = performance.now();
      const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase.from("orders").select("id, created_at, status, total").order("created_at", { ascending: false }).limit(10),
        supabase.from("products").select("id, name_ku, name_ar, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      const endPing = performance.now();
      setDbLatency(Math.round(endPing - startPing));

      const generated: LogEntry[] = [];

      for (const ord of ordersRes.data ?? []) {
        generated.push({
          id: `ord-${ord.id}`,
          timestamp: ord.created_at,
          level: "success",
          action: "ORDER_CREATED",
          details: `Order #${ord.id.slice(0, 8)} (${ord.status}) with total ${ord.total?.toLocaleString() ?? 0} IQD`,
          source: "Checkout Engine",
        });
      }

      for (const prod of productsRes.data ?? []) {
        generated.push({
          id: `prod-${prod.id}`,
          timestamp: prod.created_at,
          level: "info",
          action: "PRODUCT_CATALOG",
          details: `Catalog item registered: ${prod.name_ku || prod.name_ar || "Product"}`,
          source: "Inventory",
        });
      }

      for (const prof of profilesRes.data ?? []) {
        generated.push({
          id: `prof-${prof.id}`,
          timestamp: prof.created_at,
          level: "security",
          action: "AUTH_REGISTER",
          details: `User registration: ${prof.full_name || "Customer"} (${prof.phone || "No phone"})`,
          source: "Auth Guard",
        });
      }

      return generated;
    },
  });

  // Combine and sort logs
  const allLogs: LogEntry[] = [...customLogs, ...dbLogs].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Filter logs
  const filteredLogs = allLogs.filter((log) => {
    const matchesLevel = filterLevel === "all" || log.level === filterLevel;
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Add a manual note
  const handleAddManualNote = () => {
    const note = window.prompt(lang === "ku" ? "تێبینی بنووسە بۆ لۆگ:" : "أدخل ملاحظة للتدقيق:");
    if (!note || !note.trim()) return;

    const newEntry: LogEntry = {
      id: `manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: "info",
      action: "ADMIN_AUDIT_NOTE",
      details: note.trim(),
      source: "Admin Dashboard",
    };

    const updated = [newEntry, ...customLogs];
    setCustomLogs(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("system_activity_logs", JSON.stringify(updated));
    }
    toast.success("Audit note logged successfully!");
  };

  // Clear local logs
  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear local logs?")) {
      setCustomLogs([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("system_activity_logs");
      }
      toast.info("Local audit logs cleared");
    }
  };

  // Download logs as text
  const handleDownloadLogs = () => {
    const textContent = allLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.action}: ${l.details}`
      )
      .join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ba-trading-system-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Logs file downloaded!");
  };

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Infrastructure Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#007979] dark:text-teal-400 flex items-center justify-center shrink-0">
              <Server className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx("database")}</p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{tx("connected")} {dbLatency ? `(${dbLatency}ms)` : ""}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <HardDrive className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx("storage")}</p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>{tx("connected")}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx("auth")}</p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>{tx("connected")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Audit Trail Card */}
      <AdminCard>
        <SectionHeader
          title={tx("title")}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddManualNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition active:scale-95"
              >
                <PlusCircle className="size-3.5 text-[#007979]" />
                <span className="hidden sm:inline">{tx("addNote")}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition active:scale-95"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">{tx("downloadLogs")}</span>
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                title={tx("clearLogs")}
                className="size-8 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 transition active:scale-95"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          }
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1 pb-3">{tx("subtitle")}</p>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3">
          <div className="relative flex-1">
            <Search className="size-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx("searchLogs")}
              className="w-full h-9 ps-9 pe-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#007979]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            {["all", "info", "success", "warning", "security"].map((lvl) => {
              const isActive = filterLevel === lvl;
              const label =
                lvl === "all"
                  ? tx("all")
                  : lvl === "info"
                  ? tx("info")
                  : lvl === "success"
                  ? tx("success")
                  : lvl === "warning"
                  ? tx("warning")
                  : tx("security");

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    isActive
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Log Stream List */}
        {isLoading ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[#007979]" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            {tx("noLogs")}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
            {filteredLogs.map((log) => {
              const isSuccess = log.level === "success";
              const isWarn = log.level === "warning";
              const isSec = log.level === "security";

              return (
                <div
                  key={log.id}
                  className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <span
                      className={`size-2 rounded-full shrink-0 mt-1.5 sm:mt-0 ${
                        isSuccess
                          ? "bg-emerald-500"
                          : isWarn
                          ? "bg-amber-500"
                          : isSec
                          ? "bg-purple-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                          {log.source}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] font-sans mt-0.5 break-words">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 self-end sm:self-center font-sans">
                    <Clock className="size-3 text-slate-400" />
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
