import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building,
  Globe,
  Image as ImageIcon,
  Languages,
  Megaphone,
  Phone,
  Save,
  Trash2,
  Truck,
  Wrench,
  Loader2,
  CheckCircle2,
  UploadCloud,
  Users,
  Database,
  FileText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { uploadBannerImage, uploadMessage } from "@/lib/upload";
import type { StoreSettings } from "@/lib/store";
import { setDocumentFavicon } from "@/components/SiteMeta";
import { SettingsUsersTab } from "./settings/SettingsUsersTab";
import { SettingsBackupTab } from "./settings/SettingsBackupTab";
import { SettingsLogsTab } from "./settings/SettingsLogsTab";

/** Bilingual labels for Settings */
const L = {
  settingsTitle: { ar: "إعدادات النظام والمتجر", ku: "ڕێکخستنەکانی سیستم و فرۆشگا", en: "Store & System Settings" },
  settingsSubtitle: {
    ar: "تخصيص الهوية، اللغات، طرق التوصيل، قنوات التواصل والصيانة",
    ku: "دەستکاریکردنی ناسنامە، زمانەکان، گەیاندن، پەیوەندی و دۆخی چاککردن",
    en: "Configure identity, languages, commerce, social links and maintenance",
  },
  
  // Tabs
  tabIdentity: { ar: "الهوية وSEO", ku: "ناسنامە و SEO", en: "Identity & SEO" },
  tabBranding: { ar: "الشعار والأيقونة", ku: "لۆگۆ و ئایکۆن", en: "Logo & Icon" },
  tabLanguages: { ar: "اللغات", ku: "زمانەکان", en: "Languages" },
  tabCommerce: { ar: "الشراء والتوصيل", ku: "کڕین و گەیاندن", en: "Commerce & Delivery" },
  tabContact: { ar: "التواصل", ku: "پەیوەندی", en: "Contact" },
  tabMarketing: { ar: "الإعلانات والتسويق", ku: "ڕاگەیاندن و ڕیکلام", en: "Ad Bar & Marketing" },
  tabSystem: { ar: "الصيانة وتصفير البيانات", ku: "چاککردن و داتا", en: "System & Reset" },
  tabUsers: { ar: "المستخدمون والصلاحيات", ku: "بەکارهێنەران و دەسەڵات", en: "Users & Roles" },
  tabBackup: { ar: "النسخ الاحتياطي", ku: "پاشەکەوتی داتابەیس", en: "Database Backup" },
  tabLogs: { ar: "سجلات النظام", ku: "تۆماری سیستم", en: "System Logs" },

  identity: { ar: "هوية التطبيق", ku: "ناسنامەی ئەپ", en: "App Identity" },
  brandingFiles: { ar: "الشعار والأيقونة", ku: "لۆگۆ و ئایکۆن", en: "Logo & Icon" },
  seo: { ar: "SEO والمشاركة في شبكات التواصل", ku: "SEO و بڵاوکردنەوە لە تۆڕە کۆمەڵایەتییەکان", en: "SEO & Social Sharing" },
  contact: { ar: "التواصل والشبكات", ku: "پەیوەندی و تۆڕەکان", en: "Contact & Networks" },
  commerce: { ar: "الشراء والتوصيل", ku: "کڕین و گەیاندن", en: "Purchase & Delivery" },
  announcement: { ar: "شريط الإعلان", ku: "شریتی ڕاگەیاندن", en: "Announcement Bar" },
  maintenance: { ar: "وضع الصيانة", ku: "دۆخی چاککردن", en: "Maintenance Mode" },

  siteNameAr: { ar: "اسم الموقع (عربي)", ku: "ناوی سایت (عەرەبی)", en: "Site Name (Arabic)" },
  siteNameKu: { ar: "اسم الموقع (كردي)", ku: "ناوی سایت (کوردی)", en: "Site Name (Kurdish)" },
  taglineAr: { ar: "الوصف القصير (عربي)", ku: "کورتەوەسف (عەرەبی)", en: "Short Description (Arabic)" },
  taglineKu: { ar: "الوصف القصير (كردي)", ku: "کورتەوەسف (کوردی)", en: "Short Description (Kurdish)" },
  metaTitleAr: { ar: "عنوان الصفحة Meta (عربي)", ku: "ناونیشانی Meta (عەرەبی)", en: "Page Title Meta (Arabic)" },
  metaTitleKu: { ar: "عنوان الصفحة Meta (كردي)", ku: "ناونیشانی Meta (کوردی)", en: "Page Title Meta (Kurdish)" },
  metaDescAr: { ar: "وصف Meta (عربي)", ku: "وەسفی Meta (عەرەبی)", en: "Meta Description (Arabic)" },
  metaDescKu: { ar: "وصف Meta (كردي)", ku: "وەسفی Meta (کوردی)", en: "Meta Description (Kurdish)" },

  logoUpload: { ar: "شعار المتجر (Logo)", ku: "لۆگۆی کۆگا (Logo)", en: "Store Logo" },
  logoHint: { ar: "يظهر في أعلى الموقع والفواتير", ku: "لە سەرەوەی ماڵپەڕ و پسوولەکان دەردەکەوێت", en: "Displayed in header and invoices" },
  faviconUpload: { ar: "أيقونة المتصفح (Favicon)", ku: "ئایکۆنی تابەکانی وێبگەڕ (Favicon)", en: "Browser Favicon" },
  faviconHint: { ar: "تظهر بجانب اسم الموقع في متصفح الويب", ku: "لە تەنیشت ناوی سایت لە تابی برۆوسەر دەردەکەوێت", en: "Displayed in browser tab next to title" },
  ogImageUpload: { ar: "صورة المشاركة (og:image)", ku: "وێنەی بڵاوکردنەوە (og:image)", en: "Social Share Image" },
  ogImageHint: {
    ar: "تظهر كصورة معاينة عند إرسال الرابط في واتساب وفيسبوك وفايبر",
    ku: "دەردەکەوێت کاتێک لینکی ماڵپەڕ لە واتسئاپ، ڤایبەر یان فەیسبووک دەنێریت",
    en: "Preview image displayed when sharing store link on WhatsApp, Facebook, etc.",
  },

  logoEmoji: { ar: "رمز بديل للشعار", ku: "هێمای جێگرەوەی لۆگۆ", en: "Logo Alt Text" },

  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone Number" },
  whatsapp: { ar: "واتساب", ku: "واتساپ", en: "WhatsApp" },
  email: { ar: "البريد الإلكتروني", ku: "ئیمەیل", en: "Email" },
  addressAr: { ar: "العنوان (عربي)", ku: "ناونیشان (عەرەبی)", en: "Address (Arabic)" },
  addressKu: { ar: "العنوان (كردي)", ku: "ناونیشان (کوردی)", en: "Address (Kurdish)" },
  instagram: { ar: "انستغرام", ku: "ئینستاگرام", en: "Instagram" },
  facebook: { ar: "فيسبوك", ku: "فەیسبووک", en: "Facebook" },
  telegram: { ar: "تليجرام", ku: "تێلێگرام", en: "Telegram" },

  currencyAr: { ar: "رمز العملة (عربي)", ku: "هێمای دراو (عەرەبی)", en: "Currency Symbol (Arabic)" },
  currencyKu: { ar: "رمز العملة (كردي)", ku: "هێمای دراو (کوردی)", en: "Currency Symbol (Kurdish)" },
  minOrder: { ar: "أقل مبلغ للطلب", ku: "کەمترین بڕی داواکاری", en: "Minimum Order Amount" },
  deliveryFee: { ar: "أجرة التوصيل", ku: "کرێی گەیاندن", en: "Delivery Fee" },
  freeOver: { ar: "توصيل مجاني فوق", ku: "گەیاندنی خۆڕایی سەروو", en: "Free Delivery Above" },

  announceAr: { ar: "نص الإعلان (عربي)", ku: "دەقی ڕاگەیاندن (عەرەبی)", en: "Ad Text (Arabic)" },
  announceKu: { ar: "نص الإعلان (كردي)", ku: "دەقی ڕاگەیاندن (کوردی)", en: "Ad Text (Kurdish)" },
  showAnnounce: { ar: "إظهار شريط الإعلان", ku: "پیشاندانی شریتی ڕاگەیاندن", en: "Show Ad Bar" },

  maintOn: { ar: "تشغيل وضع الصيانة", ku: "کارکردنی دۆخی چاککردن", en: "Enable Maintenance Mode" },
  maintAr: { ar: "رسالة الصيانة (عربي)", ku: "پەیامی چاککردن (عەرەبی)", en: "Maintenance Message (Arabic)" },
  maintKu: { ar: "رسالة الصيانة (كردي)", ku: "پەیامی چاککردن (کوردی)", en: "Maintenance Message (Kurdish)" },
  showSearch: { ar: "إظهار البحث", ku: "پیشاندانی گەڕان", en: "Show Search" },

  save: { ar: "حفظ الإعدادات", ku: "پاشەکەوتکردنی ڕێکخستنەکان", en: "Save Settings" },
  saved: { ar: "تم حفظ الإعدادات بنجاح", ku: "ڕێکخستنەکان بەسەرکەوتوویی پاشەکەوت کران", en: "Settings saved successfully" },
  logoPreview: { ar: "معاينة", ku: "پێشبینین", en: "Preview" },

  languages: { ar: "اللغات", ku: "زمانەکان", en: "Languages" },
  languagesHint: {
    ar: "أطفئ أي لغة لإخفائها من زر تغيير اللغة في التطبيق.",
    ku: "هەر زمانێک بکوژێنە بۆ شاردنەوەی لە دوگمەی گۆڕینی زمان.",
    en: "Turn a language off to hide it from the app language switcher.",
  },
  langAr: { ar: "العربية", ku: "عەرەبی", en: "Arabic" },
  langKu: { ar: "الكردية", ku: "کوردی", en: "Kurdish" },
  langEn: { ar: "الإنجليزية", ku: "ئینگلیزی", en: "English" },

  danger: { ar: "تصفير البيانات", ku: "سفرکردنی داتا", en: "Data Reset" },
  dangerHint: {
    ar: "يحذف البيانات نهائياً. حسابات المدراء والإعدادات والأقسام تبقى كما هي.",
    ku: "داتا بە یەکجاری دەسڕێت. هەژماری ئەدمین و ڕێکخستن و بەشەکان دەمێننەوە.",
    en: "Permanently deletes data. Admin accounts, settings and categories are kept.",
  },
  resetSales: { ar: "حذف الطلبات والنقاط والمحافظ", ku: "سڕینەوەی داواکاری و خاڵ و جانتا", en: "Delete orders, points & wallets" },
  resetSalesHint: {
    ar: "الطلبات، التنبيهات، التقييمات، النقاط، المحافظ، العناوين.",
    ku: "داواکاری، ئاگادارکردنەوە، هەڵسەنگاندن، خاڵ، جانتا، ناونیشان.",
    en: "Orders, notifications, reviews, points, wallets, addresses.",
  },
  resetAll: { ar: "حذف كل البيانات ما عدا المدير", ku: "سڕینەوەی هەموو داتا جگە لە ئەدمین", en: "Delete everything except admin" },
  resetAllHint: {
    ar: "كل ما فوق + المنتجات، العروض، البانرات، الموردين، وحسابات الأطباء.",
    ku: "هەموو سەرەوە + بەرهەم، ئۆفەر، بانەر، فرۆشیار، و هەژماری پزیشکان.",
    en: "All the above + products, offers, banners, vendors and dentist accounts.",
  },
  confirmWord: { ar: "اكتب DELETE للتأكيد", ku: "بنووسە DELETE بۆ دڵنیایی", en: "Type DELETE to confirm" },
  resetDone: { ar: "تم حذف البيانات", ku: "داتا سڕایەوە", en: "Data deleted" },
} as const;

type Row = Record<string, unknown> & { id: string };

/** Interactive Image Upload Field with Dropzone, Preview, and Delete */
function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  shape = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  shape?: "square" | "wide";
}) {
  const { lang } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadBannerImage(file, "branding");
      onChange(url);
      toast.success(
        lang === "ku"
          ? "وێنەکە بە سەرکەوتوویی بارکرا"
          : lang === "ar"
          ? "تم رفع الصورة بنجاح"
          : "Image uploaded successfully"
      );
    } catch (err) {
      toast.error(uploadMessage(err, lang));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
        {label}
      </label>
      {hint && (
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div
            className={`overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-2xs ${
              shape === "wide" ? "w-36 h-20" : "size-16"
            }`}
          >
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain p-1"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate font-mono">
              {value}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 shadow-2xs"
              >
                {isUploading ? (
                  <Loader2 className="size-3.5 animate-spin text-[#007979]" />
                ) : (
                  <UploadCloud className="size-3.5 text-[#007979]" />
                )}
                <span>
                  {lang === "ku"
                    ? "گۆڕینی وێنە"
                    : lang === "ar"
                    ? "تغيير الصورة"
                    : "Change Image"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChange("")}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-xs font-bold text-rose-600 dark:text-rose-400 transition-all active:scale-95"
              >
                <Trash2 className="size-3.5" />
                <span>
                  {lang === "ku" ? "سڕینەوە" : lang === "ar" ? "حذف" : "Remove"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-[#007979] dark:hover:border-teal-500 rounded-2xl p-5 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-teal-50/20 dark:hover:bg-slate-800/60 transition-all duration-200 flex flex-col items-center justify-center gap-2"
        >
          <div className="size-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            {isUploading ? (
              <Loader2 className="size-5 animate-spin text-[#007979]" />
            ) : (
              <UploadCloud className="size-5 text-[#007979] group-hover:text-teal-600" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#007979] transition-colors">
              {isUploading
                ? (lang === "ku" ? "بارکردنی وێنە..." : lang === "ar" ? "جاري الرفع..." : "Uploading...")
                : (lang === "ku" ? "کلیک بکە بۆ بارکردنی وێنە لە ئامێرەکەت" : lang === "ar" ? "انقر لاختيار ورفع صورة من جهازك" : "Click to select and upload image")}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              PNG, JPG, WEBP, SVG (Max 8MB)
            </p>
          </div>
        </div>
      )}

      {/* Manual URL entry toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-bold text-slate-400 hover:text-[#007979] transition-colors flex items-center gap-1"
        >
          <span>
            {showUrlInput
              ? (lang === "ku" ? "▲ شاردنەوەی لینکی دەستی" : lang === "ar" ? "▲ إخفاء الرابط اليدوي" : "▲ Hide Manual URL")
              : (lang === "ku" ? "▼ یان لینکی وێنەکە بنووسە بە دەستی" : lang === "ar" ? "▼ أو أدخل رابط الصورة يدوياً" : "▼ Or enter image URL manually")}
          </span>
        </button>
        {showUrlInput && (
          <div className="mt-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007979]"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminSettings() {
  const { lang, t } = useI18n();
  const tx = (k: keyof typeof L) => L[k][lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("identity");
  const [draft, setDraft] = useState<Row | null>(null);
  const [confirmWord, setConfirmWord] = useState("");

  const reset = useMutation({
    mutationFn: async (scope: "sales" | "all") => {
      const { error } = await supabase.rpc("admin_reset_data" as never, {
        _scope: scope,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tx("resetDone"));
      setConfirmWord("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: async () =>
      (await supabase.from("store_settings").select("*").limit(1).maybeSingle())
        .data as unknown as StoreSettings | null,
  });

  useEffect(() => {
    if (data && !draft) setDraft(data as unknown as Row);
  }, [data, draft]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { id, created_at: _c, updated_at: _u, singleton: _s, ...patch } = draft as Row & {
        created_at?: string;
        updated_at?: string;
        singleton?: boolean;
      };
      const { error } = await supabase
        .from("store_settings")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tx("saved"));
      if (draft && draft["favicon_url"]) {
        setDocumentFavicon(String(draft["favicon_url"]));
      }
      qc.invalidateQueries({ queryKey: ["admin-store-settings"] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !draft) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#007979]" />
      </div>
    );
  }

  const str = (k: string) => String(draft[k] ?? "");
  const set = (k: string, v: unknown) => setDraft({ ...draft, [k]: v });
  const text = (k: string, label: keyof typeof L, type = "text") => (
    <TextField label={tx(label)} value={str(k)} type={type} onChange={(v) => set(k, v)} />
  );

  const tabs = [
    { key: "identity", label: tx("tabIdentity"), icon: Building },
    { key: "branding", label: tx("tabBranding"), icon: ImageIcon },
    { key: "languages", label: tx("tabLanguages"), icon: Globe },
    { key: "commerce", label: tx("tabCommerce"), icon: Truck },
    { key: "contact", label: tx("tabContact"), icon: Phone },
    { key: "marketing", label: tx("tabMarketing"), icon: Megaphone },
    { key: "system", label: tx("tabSystem"), icon: Wrench },
    { key: "users", label: tx("tabUsers"), icon: Users },
    { key: "backup", label: tx("tabBackup"), icon: Database },
    { key: "logs", label: tx("tabLogs"), icon: FileText },
  ];

  return (
    <div className="space-y-6 w-full font-sans">
      
      {/* Top Header with Instant Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {tx("settingsTitle")}
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {tx("settingsSubtitle")}
          </p>
        </div>

        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="h-10 px-5 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-700/20 gap-2 shrink-0 active:scale-95 transition-all"
        >
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          <span>{tx("save")}</span>
        </Button>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-[#007979] text-white shadow-sm scale-100 font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-200">
        
        {/* TAB 1: IDENTITY & SEO */}
        {activeTab === "identity" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("identity")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {text("site_name_ar", "siteNameAr")}
                {text("site_name_ku", "siteNameKu")}
                {text("tagline_ar", "taglineAr")}
                {text("tagline_ku", "taglineKu")}
              </div>
              <div className="pt-2">
                <ToggleField
                  label={tx("showSearch")}
                  checked={Boolean(draft["show_search"])}
                  onChange={(v) => set("show_search", v)}
                />
              </div>
            </AdminCard>

            <AdminCard>
              <SectionHeader title={tx("seo")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {text("meta_title_ar", "metaTitleAr")}
                {text("meta_title_ku", "metaTitleKu")}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {text("meta_description_ar", "metaDescAr")}
                {text("meta_description_ku", "metaDescKu")}
              </div>

              {/* Upload og:image for Social Sharing */}
              <div className="pt-2">
                <ImageUploadField
                  label={tx("ogImageUpload")}
                  hint={tx("ogImageHint")}
                  value={str("og_image_url")}
                  onChange={(url) => set("og_image_url", url)}
                  shape="wide"
                />
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 2: BRANDING (LOGO & FAVICON UPLOAD) */}
        {activeTab === "branding" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("brandingFiles")} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* 1. Logo Upload with live preview */}
                <ImageUploadField
                  label={tx("logoUpload")}
                  hint={tx("logoHint")}
                  value={str("logo_url")}
                  onChange={(url) => set("logo_url", url)}
                  shape="square"
                />

                {/* 2. Favicon Upload */}
                <ImageUploadField
                  label={tx("faviconUpload")}
                  hint={tx("faviconHint")}
                  value={str("favicon_url")}
                  onChange={(url) => {
                    set("favicon_url", url);
                    if (url) setDocumentFavicon(url);
                  }}
                  shape="square"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                {text("logo_emoji", "logoEmoji")}
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 3: LANGUAGES */}
        {activeTab === "languages" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("languages")} />
              <p className="text-xs text-muted-foreground pb-2">{tx("languagesHint")}</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2">
                  <ToggleField
                    label={tx("langKu")}
                    checked={draft["lang_ku_enabled"] !== false}
                    onChange={(v) => set("lang_ku_enabled", v)}
                  />
                </div>
                <div className="py-2">
                  <ToggleField
                    label={tx("langAr")}
                    checked={draft["lang_ar_enabled"] !== false}
                    onChange={(v) => set("lang_ar_enabled", v)}
                  />
                </div>
                <div className="py-2">
                  <ToggleField
                    label={tx("langEn")}
                    checked={draft["lang_en_enabled"] !== false}
                    onChange={(v) => set("lang_en_enabled", v)}
                  />
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 4: COMMERCE & DELIVERY */}
        {activeTab === "commerce" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("commerce")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {text("currency_ar", "currencyAr")}
                {text("currency_ku", "currencyKu")}
                {text("min_order_total", "minOrder", "number")}
                {text("delivery_fee", "deliveryFee", "number")}
                {text("free_delivery_over", "freeOver", "number")}
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 5: CONTACT & SOCIALS */}
        {activeTab === "contact" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("contact")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {text("contact_phone", "phone")}
                {text("whatsapp", "whatsapp")}
                {text("contact_email", "email")}
                {text("instagram_url", "instagram")}
                {text("facebook_url", "facebook")}
                {text("telegram_url", "telegram")}
                {text("address_ar", "addressAr")}
                {text("address_ku", "addressKu")}
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 6: AD BAR & MARKETING */}
        {activeTab === "marketing" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("announcement")} />
              <ToggleField
                label={tx("showAnnounce")}
                checked={Boolean(draft["show_announcement"])}
                onChange={(v) => set("show_announcement", v)}
              />
              <div className="grid grid-cols-1 gap-3 pt-2">
                {text("announcement_ar", "announceAr")}
                {text("announcement_ku", "announceKu")}
              </div>
            </AdminCard>

            <AdminCard>
              <SectionHeader title={t("marketingPricing")} />
              <p className="text-xs text-muted-foreground pb-2">{t("marketingPricingHint")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  label={t("priceFlashDeal")}
                  type="number"
                  value={str("price_flash_deal")}
                  onChange={(v) => set("price_flash_deal", Number(v) || 0)}
                />
                <TextField
                  label={t("priceOffer")}
                  type="number"
                  value={str("price_offer")}
                  onChange={(v) => set("price_offer", Number(v) || 0)}
                />
                <TextField
                  label={t("priceBundle")}
                  type="number"
                  value={str("price_bundle")}
                  onChange={(v) => set("price_bundle", Number(v) || 0)}
                />
                <TextField
                  label={t("priceBadge")}
                  type="number"
                  value={str("price_badge")}
                  onChange={(v) => set("price_badge", Number(v) || 0)}
                />
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 7: SYSTEM & DATA RESET */}
        {activeTab === "system" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AdminCard>
              <SectionHeader title={tx("maintenance")} />
              <ToggleField
                label={tx("maintOn")}
                checked={Boolean(draft["maintenance_mode"])}
                onChange={(v) => set("maintenance_mode", v)}
              />
              <div className="grid grid-cols-1 gap-3 pt-2">
                {text("maintenance_note_ar", "maintAr")}
                {text("maintenance_note_ku", "maintKu")}
              </div>
            </AdminCard>

            <AdminCard>
              <SectionHeader
                title={tx("danger")}
                action={<AlertTriangle className="size-4 text-destructive" />}
              />
              <p className="text-xs text-muted-foreground">{tx("dangerHint")}</p>
              <TextField
                label={tx("confirmWord")}
                value={confirmWord}
                onChange={setConfirmWord}
                placeholder="DELETE"
              />
              <div className="space-y-3 pt-2">
                <div className="rounded-2xl border border-dashed border-destructive/40 p-3 bg-rose-50/20 dark:bg-rose-950/10">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx("resetSales")}</p>
                  <p className="mb-2 text-[11px] text-muted-foreground">{tx("resetSalesHint")}</p>
                  <Button
                    variant="outline"
                    disabled={confirmWord !== "DELETE" || reset.isPending}
                    onClick={() => reset.mutate("sales")}
                    className="h-9 w-full gap-2 rounded-xl text-xs font-bold text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{tx("resetSales")}</span>
                  </Button>
                </div>

                <div className="rounded-2xl border border-dashed border-destructive/40 p-3 bg-rose-50/20 dark:bg-rose-950/10">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{tx("resetAll")}</p>
                  <p className="mb-2 text-[11px] text-muted-foreground">{tx("resetAllHint")}</p>
                  <Button
                    variant="destructive"
                    disabled={confirmWord !== "DELETE" || reset.isPending}
                    onClick={() => reset.mutate("all")}
                    className="h-9 w-full gap-2 rounded-xl text-xs font-extrabold"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{tx("resetAll")}</span>
                  </Button>
                </div>
              </div>
            </AdminCard>
          </div>
        )}

        {/* TAB 8: USERS & ROLES */}
        {activeTab === "users" && <SettingsUsersTab />}

        {/* TAB 9: DATABASE BACKUP */}
        {activeTab === "backup" && <SettingsBackupTab />}

        {/* TAB 10: SYSTEM LOGS & HEALTH */}
        {activeTab === "logs" && <SettingsLogsTab />}

      </div>

      {/* Bottom Floating Save Button (for store configuration tabs) */}
      {!["users", "backup", "logs"].includes(activeTab) && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="h-11 px-8 rounded-2xl bg-[#007979] hover:bg-teal-700 text-white font-extrabold text-xs shadow-lg shadow-teal-700/25 gap-2 active:scale-95 transition-all"
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            <span>{tx("save")}</span>
          </Button>
        </div>
      )}

    </div>
  );
}
