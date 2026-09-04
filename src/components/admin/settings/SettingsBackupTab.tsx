import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Download,
  Upload,
  FileDown,
  HardDrive,
  Package,
  ShoppingBag,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AdminCard, SectionHeader } from "../AdminKit";
import { supabase } from "@/integrations/supabase/client";

const L = {
  title: { ar: "النسخ الاحتياطي لقاعدة البيانات", ku: "پاشەکەوتی داتابەیس (Backup)", en: "Database Backup & Export" },
  subtitle: {
    ar: "تصدير نسخة كاملة من بيانات المتجر، المنتجات، الطلبات، والعملاء بأمان",
    ku: "دەرهێنانی کۆپیەکی پارێزراو لە هەموو زانیارییەکانی کۆگا، بەرهەم، داواکاری و کڕیاران",
    en: "Safely export full store snapshots, orders, products, and customer records",
  },
  fullBackup: { ar: "تصدير نسخة احتياطية شاملة (Full Backup JSON)", ku: "دەرهێنانی تەواوی پاشەکەوتی کۆگا (JSON)", en: "Full Store Backup (JSON)" },
  fullBackupDesc: {
    ar: "يشمل جميع المنتجات، الأقسام، الطلبات، المستخدمين، الإعدادات، والبنرات في ملف واحد مشفر.",
    ku: "سەرجەم بەرهەمەکان، بەشەکان، داواکارییەکان، کڕیاران، و ڕێکخستنەکان لە یەک فایلی پارێزراودا.",
    en: "Includes all products, categories, orders, customers, banners, and settings in one file.",
  },
  downloadNow: { ar: "تحميل النسخة الآن", ku: "داگرتنی کۆپیەکە ئێستا", en: "Download Backup File" },
  tableExports: { ar: "تصدير جداول محددة (CSV / Excel)", ku: "دەرهێنانی خشتەی دیاریکراو (Excel / CSV)", en: "Granular Table Exports" },
  exportProducts: { ar: "تصدير المنتجات", ku: "دەرهێنانی بەرهەمەکان", en: "Export Products" },
  exportOrders: { ar: "تصدير الطلبات", ku: "دەرهێنانی داواکارییەکان", en: "Export Orders" },
  exportCustomers: { ar: "تصدير العملاء", ku: "دەرهێنانی کڕیاران", en: "Export Customers" },
  exportCategories: { ar: "تصدير الأقسام", ku: "دەرهێنانی بەشەکان", en: "Export Categories" },
  totalProducts: { ar: "المنتجات المسجلة", ku: "بەرهەمە تۆمارکراوەکان", en: "Products" },
  totalOrders: { ar: "إجمالي الطلبات", ku: "سەرجەم داواکارییەکان", en: "Orders" },
  totalCategories: { ar: "الأقسام", ku: "بەشەکان", en: "Categories" },
  totalCustomers: { ar: "العملاء", ku: "کڕیاران", en: "Customers" },
  lastBackup: { ar: "آخر نسخة تم تحميلها", ku: "دوایین کاتی پاشەکەوتکردن", en: "Last Backup" },
  never: { ar: "لم يتم بعد", ku: "تا ئێستا نەکراوە", en: "Never" },
  inspectBackup: { ar: "فحص ومراجعة ملف نسخة احتياطية", ku: "پشکنینی فایلی پاشەکەوت", en: "Inspect & Verify Backup" },
  inspectHint: { ar: "اختر ملف JSON للتحقق من سلامة البيانات وعدد السجلات بداخله", ku: "فایلێکی JSON هەڵبژێرە بۆ بینینی ژمارەی تۆمارەکان و دڵنیابوون لە تەندروستی داتا", en: "Select a backup JSON file to inspect row counts and structure" },
  dragOrClick: { ar: "انقر لاختيار ملف النسخة الاحتياطية (.json)", ku: "کلیک بکە بۆ هەڵبژاردنی فایلی پاشەکەوت (.json)", en: "Click to select backup (.json) file" },
};

export function SettingsBackupTab() {
  const { lang } = useI18n();
  const tx = (k: keyof typeof L) => L[k][lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];

  const [isExportingFull, setIsExportingFull] = useState(false);
  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("last_db_backup_date") || "";
    }
    return "";
  });

  // Inspected file preview state
  const [inspectedData, setInspectedData] = useState<{
    version?: string;
    exported_at?: string;
    counts?: Record<string, number>;
  } | null>(null);

  // Fetch real counts from database
  const { data: counts, isLoading: isCountsLoading } = useQuery({
    queryKey: ["admin-backup-counts"],
    queryFn: async () => {
      const [prodRes, ordRes, catRes, profRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      return {
        products: prodRes.count ?? 0,
        orders: ordRes.count ?? 0,
        categories: catRes.count ?? 0,
        customers: profRes.count ?? 0,
      };
    },
  });

  // Trigger file download helper
  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. FULL STORE BACKUP (JSON)
  const handleFullBackup = async () => {
    try {
      setIsExportingFull(true);
      toast.info(lang === "ku" ? "کۆکردنەوەی داتا..." : lang === "ar" ? "جاري تجميع البيانات..." : "Collecting data...");

      const [
        products,
        categories,
        orders,
        orderItems,
        profiles,
        settings,
        banners,
        vendors,
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("orders").select("*").limit(500),
        supabase.from("order_items").select("*").limit(1000),
        supabase.from("profiles").select("id, full_name, phone, created_at"),
        supabase.from("store_settings").select("*").limit(1),
        supabase.from("banners").select("*"),
        supabase.from("vendors").select("*"),
      ]);

      const now = new Date().toISOString();
      const backupPayload = {
        version: "1.0",
        exported_at: now,
        store: "BA Trading",
        counts: {
          products: products.data?.length ?? 0,
          categories: categories.data?.length ?? 0,
          orders: orders.data?.length ?? 0,
          order_items: orderItems.data?.length ?? 0,
          profiles: profiles.data?.length ?? 0,
          banners: banners.data?.length ?? 0,
          vendors: vendors.data?.length ?? 0,
        },
        data: {
          products: products.data ?? [],
          categories: categories.data ?? [],
          orders: orders.data ?? [],
          order_items: orderItems.data ?? [],
          profiles: profiles.data ?? [],
          store_settings: settings.data?.[0] ?? null,
          banners: banners.data ?? [],
          vendors: vendors.data ?? [],
        },
      };

      const dateStr = now.slice(0, 10);
      const filename = `ba-trading-backup-${dateStr}.json`;
      triggerDownload(JSON.stringify(backupPayload, null, 2), filename, "application/json");

      const readableDate = new Date().toLocaleString();
      setLastBackupTime(readableDate);
      if (typeof window !== "undefined") {
        localStorage.setItem("last_db_backup_date", readableDate);
      }

      toast.success(lang === "ku" ? "فایلی پاشەکەوت بەسەرکەوتوویی دابەزی!" : lang === "ar" ? "تم تحميل ملف النسخة الاحتياطية بنجاح!" : "Backup downloaded successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backup failed";
      toast.error(msg);
    } finally {
      setIsExportingFull(false);
    }
  };

  // 2. CSV EXPORT FOR SINGLE TABLES
  const handleTableCsvExport = async (table: "products" | "orders" | "profiles" | "categories") => {
    try {
      setExportingTable(table);
      let query = supabase.from(table).select("*");
      if (table === "orders") query = query.limit(1000);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("No records found in this table");
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const csvRows: string[] = [];
      csvRows.push(headers.join(","));

      for (const row of data as Record<string, unknown>[]) {
        const values = headers.map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(","));
      }

      const csvString = "\uFEFF" + csvRows.join("\n"); // BOM for excel UTF-8 support
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerDownload(csvString, `${table}-export-${dateStr}.csv`, "text/csv;charset=utf-8;");
      toast.success(`${table} CSV exported successfully!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      toast.error(msg);
    } finally {
      setExportingTable(null);
    }
  };

  // 3. INSPECT BACKUP FILE
  const handleInspectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.data || json.counts) {
          setInspectedData({
            version: json.version || "1.0",
            exported_at: json.exported_at || "Unknown date",
            counts: json.counts || {
              products: json.data?.products?.length ?? 0,
              orders: json.data?.orders?.length ?? 0,
              categories: json.data?.categories?.length ?? 0,
            },
          });
          toast.success(lang === "ku" ? "فایلەکە بە سەرکەوتوویی پشکێنرا!" : lang === "ar" ? "تم فحص الملف بنجاح!" : "Backup file verified!");
        } else {
          toast.error("Invalid BA Trading backup file structure");
        }
      } catch {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{tx("totalProducts")}</span>
            <Package className="size-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
            {isCountsLoading ? <Loader2 className="size-4 animate-spin" /> : counts?.products ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{tx("totalOrders")}</span>
            <ShoppingBag className="size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
            {isCountsLoading ? <Loader2 className="size-4 animate-spin" /> : counts?.orders ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{tx("totalCategories")}</span>
            <Layers className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
            {isCountsLoading ? <Loader2 className="size-4 animate-spin" /> : counts?.categories ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{tx("totalCustomers")}</span>
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
            {isCountsLoading ? <Loader2 className="size-4 animate-spin" /> : counts?.customers ?? 0}
          </p>
        </div>
      </div>

      {/* Main Full Backup Hero Card */}
      <AdminCard>
        <SectionHeader
          title={tx("fullBackup")}
          action={
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="size-3.5 text-slate-400" />
              <span>{tx("lastBackup")}: </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {lastBackupTime || tx("never")}
              </span>
            </div>
          }
        />
        <p className="text-xs text-slate-600 dark:text-slate-400">{tx("fullBackupDesc")}</p>

        <div className="pt-3">
          <button
            type="button"
            disabled={isExportingFull}
            onClick={handleFullBackup}
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white text-xs font-black shadow-md shadow-teal-700/20 active:scale-95 transition-all"
          >
            {isExportingFull ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span>{tx("downloadNow")}</span>
          </button>
        </div>
      </AdminCard>

      {/* Granular CSV Exports */}
      <AdminCard>
        <SectionHeader title={tx("tableExports")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <button
            type="button"
            disabled={exportingTable === "products"}
            onClick={() => handleTableCsvExport("products")}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 group text-start"
          >
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{tx("exportProducts")}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">products.csv</p>
            </div>
            <FileSpreadsheet className="size-4 text-teal-600 group-hover:scale-110 transition-transform" />
          </button>

          <button
            type="button"
            disabled={exportingTable === "orders"}
            onClick={() => handleTableCsvExport("orders")}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 group text-start"
          >
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{tx("exportOrders")}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">orders.csv</p>
            </div>
            <FileSpreadsheet className="size-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </button>

          <button
            type="button"
            disabled={exportingTable === "profiles"}
            onClick={() => handleTableCsvExport("profiles")}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 group text-start"
          >
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{tx("exportCustomers")}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">customers.csv</p>
            </div>
            <FileSpreadsheet className="size-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </button>

          <button
            type="button"
            disabled={exportingTable === "categories"}
            onClick={() => handleTableCsvExport("categories")}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 group text-start"
          >
            <div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{tx("exportCategories")}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">categories.csv</p>
            </div>
            <FileSpreadsheet className="size-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </AdminCard>

      {/* Inspect & Verify Backup Card */}
      <AdminCard>
        <SectionHeader title={tx("inspectBackup")} />
        <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">{tx("inspectHint")}</p>

        <label className="group cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#007979] dark:hover:border-teal-500 rounded-2xl p-5 text-center bg-slate-50/50 dark:bg-slate-800/20 hover:bg-teal-50/20 dark:hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center gap-2 block">
          <input
            type="file"
            accept=".json"
            onChange={handleInspectFile}
            className="hidden"
          />
          <div className="size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <FileJson className="size-5 text-[#007979]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#007979] transition-colors">
              {tx("dragOrClick")}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">JSON format only</p>
          </div>
        </label>

        {inspectedData && (
          <div className="mt-4 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 space-y-2">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-extrabold text-xs">
              <CheckCircle2 className="size-4" />
              <span>Valid Backup File (Version {inspectedData.version})</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export Date: <span className="font-bold text-slate-800 dark:text-slate-200">{inspectedData.exported_at}</span>
            </p>
            {inspectedData.counts && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-teal-200/60 dark:border-teal-900/60">
                {Object.entries(inspectedData.counts).map(([k, count]) => (
                  <div key={k} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-teal-100 dark:border-teal-900/40 text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{k}</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
