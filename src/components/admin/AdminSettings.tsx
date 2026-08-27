import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { StoreSettings } from "@/lib/store";

/** Bilingual labels kept local to this screen. */
const L = {
  identity: { ar: "هوية التطبيق", ku: "ناسنامەی ئەپ", en: "App Identity",},
  brandingFiles: { ar: "الشعار والأيقونة", ku: "لۆگۆ و ئایکۆن", en: "Logo & Icon",},
  seo: { ar: "SEO والمشاركة", ku: "SEO و بڵاوکردنەوە", en: "SEO & Sharing",},
  contact: { ar: "التواصل", ku: "پەیوەندی", en: "Communication",},
  commerce: { ar: "الشراء والتوصيل", ku: "کڕین و گەیاندن", en: "Purchase & Delivery",},
  announcement: { ar: "شريط الإعلان", ku: "شریتی ڕاگەیاندن", en: "Announcement Bar",},
  maintenance: { ar: "وضع الصيانة", ku: "دۆخی چاککردن", en: "Maintenance Mode",},
  siteNameAr: { ar: "اسم الموقع (عربي)", ku: "ناوی سایت (عەرەبی)", en: "Site Name (Arabic)",},
  siteNameKu: { ar: "اسم الموقع (كردي)", ku: "ناوی سایت (کوردی)", en: "Site Name (Kurdish)",},
  taglineAr: { ar: "الوصف القصير (عربي)", ku: "کورتەوەسف (عەرەبی)", en: "Short Description (Arabic)",},
  taglineKu: { ar: "الوصف القصير (كردي)", ku: "کورتەوەسف (کوردی)", en: "Short Description (Kurdish)",},
  metaTitleAr: { ar: "عنوان الصفحة Meta (عربي)", ku: "ناونیشانی Meta (عەرەبی)", en: "Page Title Meta (Arabic)",},
  metaTitleKu: { ar: "عنوان الصفحة Meta (كردي)", ku: "ناونیشانی Meta (کوردی)", en: "Page Title Meta (Kurdish)",},
  metaDescAr: { ar: "وصف Meta (عربي)", ku: "وەسفی Meta (عەرەبی)", en: "Meta Description (Arabic)",},
  metaDescKu: { ar: "وصف Meta (كردي)", ku: "وەسفی Meta (کوردی)", en: "Meta Description (Kurdish)",},
  logoUrl: { ar: "رابط الشعار", ku: "بەستەری لۆگۆ", en: "Logo URL",},
  faviconUrl: { ar: "رابط الأيقونة favicon", ku: "بەستەری favicon", en: "Favicon URL",},
  ogImage: { ar: "صورة المشاركة og:image", ku: "وێنەی بڵاوکردنەوە og:image", en: "og:image URL",},
  logoEmoji: { ar: "رمز بديل للشعار", ku: "هێمای جێگرەوەی لۆگۆ", en: "Logo Alt Text",},
  phone: { ar: "رقم الهاتف", ku: "ژمارەی مۆبایل", en: "Phone Number",},
  whatsapp: { ar: "واتساب", ku: "واتساپ", en: "WhatsApp",},
  email: { ar: "البريد الإلكتروني", ku: "ئیمەیل", en: "Email",},
  addressAr: { ar: "العنوان (عربي)", ku: "ناونیشان (عەرەبی)", en: "Address (Arabic)",},
  addressKu: { ar: "العنوان (كردي)", ku: "ناونیشان (کوردی)", en: "Address (Kurdish)",},
  instagram: { ar: "انستغرام", ku: "ئینستاگرام", en: "Instagram",},
  facebook: { ar: "فيسبوك", ku: "فەیسبووک", en: "Facebook",},
  telegram: { ar: "تليجرام", ku: "تێلێگرام", en: "Telegram",},
  currencyAr: { ar: "رمز العملة (عربي)", ku: "هێمای دراو (عەرەبی)", en: "Currency Symbol (Arabic)",},
  currencyKu: { ar: "رمز العملة (كردي)", ku: "هێمای دراو (کوردی)", en: "Currency Symbol (Kurdish)",},
  minOrder: { ar: "أقل مبلغ للطلب", ku: "کەمترین بڕی داواکاری", en: "Minimum Order Amount",},
  deliveryFee: { ar: "أجرة التوصيل", ku: "کرێی گەیاندن", en: "Delivery Fee",},
  freeOver: { ar: "توصيل مجاني فوق", ku: "گەیاندنی خۆڕایی سەروو", en: "Free Delivery Above",},
  announceAr: { ar: "نص الإعلان (عربي)", ku: "دەقی ڕاگەیاندن (عەرەبی)", en: "Ad Text (Arabic)",},
  announceKu: { ar: "نص الإعلان (كردي)", ku: "دەقی ڕاگەیاندن (کوردی)", en: "Ad Text (Kurdish)",},
  showAnnounce: { ar: "إظهار شريط الإعلان", ku: "پیشاندانی شریتی ڕاگەیاندن", en: "Show Ad Bar",},
  maintOn: { ar: "تشغيل وضع الصيانة", ku: "کارکردنی دۆخی چاککردن", en: "Enable Maintenance Mode",},
  maintAr: { ar: "رسالة الصيانة (عربي)", ku: "پەیامی چاککردن (عەرەبی)", en: "Maintenance Message (Arabic)",},
  maintKu: { ar: "رسالة الصيانة (كردي)", ku: "پەیامی چاککردن (کوردی)", en: "Maintenance Message (Kurdish)",},
  showSearch: { ar: "إظهار البحث", ku: "پیشاندانی گەڕان", en: "Show Search",},
  save: { ar: "حفظ الإعدادات", ku: "پاشەکەوتکردن", en: "Save Settings",},
  saved: { ar: "تم حفظ الإعدادات", ku: "ڕێکخستنەکان پاشەکەوت کران", en: "Settings Saved",},
  logoPreview: { ar: "معاينة", ku: "پێشبینین", en: "Preview",},
  languages: { ar: "اللغات", ku: "زمانەکان", en: "Languages",},
  languagesHint: {
    ar: "أطفئ أي لغة لإخفائها من زر تغيير اللغة في التطبيق.",
    ku: "هەر زمانێک بکوژێنە بۆ شاردنەوەی لە دوگمەی گۆڕینی زمان.",
    en: "Turn a language off to hide it from the app language switcher.",
  },
  langAr: { ar: "العربية", ku: "عەرەبی", en: "Arabic",},
  langKu: { ar: "الكردية", ku: "کوردی", en: "Kurdish",},
  langEn: { ar: "الإنجليزية", ku: "ئینگلیزی", en: "English",},
  danger: { ar: "تصفير البيانات", ku: "سفرکردنی داتا", en: "Data Reset",},
  dangerHint: {
    ar: "يحذف البيانات نهائياً. حسابات المدراء والإعدادات والأقسام تبقى كما هي.",
    ku: "داتا بە یەکجاری دەسڕێت. هەژماری ئەدمین و ڕێکخستن و بەشەکان دەمێننەوە.",
    en: "Permanently deletes data. Admin accounts, settings and categories are kept.",
  },
  resetSales: { ar: "حذف الطلبات والنقاط والمحافظ", ku: "سڕینەوەی داواکاری و خاڵ و جانتا", en: "Delete orders, points & wallets",},
  resetSalesHint: {
    ar: "الطلبات، التنبيهات، التقييمات، النقاط، المحافظ، العناوين.",
    ku: "داواکاری، ئاگادارکردنەوە، هەڵسەنگاندن، خاڵ، جانتا، ناونیشان.",
    en: "Orders, notifications, reviews, points, wallets, addresses.",
  },
  resetAll: { ar: "حذف كل البيانات ما عدا المدير", ku: "سڕینەوەی هەموو داتا جگە لە ئەدمین", en: "Delete everything except admin",},
  resetAllHint: {
    ar: "كل ما فوق + المنتجات، العروض، البانرات، الموردين، وحسابات الأطباء.",
    ku: "هەموو سەرەوە + بەرهەم، ئۆفەر، بانەر، فرۆشیار، و هەژماری پزیشکان.",
    en: "All the above + products, offers, banners, vendors and dentist accounts.",
  },
  confirmWord: { ar: "اكتب DELETE للتأكيد", ku: "بنووسە DELETE بۆ دڵنیایی", en: "Type DELETE to confirm",},
  resetDone: { ar: "تم حذف البيانات", ku: "داتا سڕایەوە", en: "Data deleted",},
} as const;

type Row = Record<string, unknown> & { id: string };

export function AdminSettings() {
  const { lang, t } = useI18n();
  const tx = (k: keyof typeof L) => L[k][lang === "ku" ? "ku" : lang === "en" ? "en" : "ar"];
  const qc = useQueryClient();
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

  const { data } = useQuery({
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
      qc.invalidateQueries({ queryKey: ["admin-store-settings"] });
      qc.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!draft) return <p className="p-4 text-center text-xs text-muted-foreground">…</p>;

  const str = (k: string) => String(draft[k] ?? "");
  const set = (k: string, v: unknown) => setDraft({ ...draft, [k]: v });
  const text = (k: string, label: keyof typeof L, type = "text") => (
    <TextField label={tx(label)} value={str(k)} type={type} onChange={(v) => set(k, v)} />
  );

  return (
    <div className="space-y-2.5">
      <AdminCard>
        <SectionHeader title={tx("identity")} />
        <div className="grid grid-cols-2 gap-2">
          {text("site_name_ar", "siteNameAr")}
          {text("site_name_ku", "siteNameKu")}
          {text("tagline_ar", "taglineAr")}
          {text("tagline_ku", "taglineKu")}
        </div>
        <ToggleField
          label={tx("showSearch")}
          checked={Boolean(draft["show_search"])}
          onChange={(v) => set("show_search", v)}
        />
      </AdminCard>

      <AdminCard>
        <SectionHeader title={tx("languages")} />
        <p className="text-[11px] text-muted-foreground">{tx("languagesHint")}</p>
        <ToggleField
          label={tx("langAr")}
          checked={draft["lang_ar_enabled"] !== false}
          onChange={(v) => set("lang_ar_enabled", v)}
        />
        <ToggleField
          label={tx("langKu")}
          checked={draft["lang_ku_enabled"] !== false}
          onChange={(v) => set("lang_ku_enabled", v)}
        />
        <ToggleField
          label={tx("langEn")}
          checked={draft["lang_en_enabled"] !== false}
          onChange={(v) => set("lang_en_enabled", v)}
        />
      </AdminCard>

      <AdminCard>
        <SectionHeader
          title={tx("brandingFiles")}
          action={
            str("logo_url") ? (
              <img
                src={str("logo_url")}
                alt={tx("logoPreview")}
                className="size-9 rounded-lg object-contain"
              />
            ) : (
              <span className="text-lg">{str("logo_emoji") || "🦷"}</span>
            )
          }
        />
        <div className="space-y-2">
          {text("logo_url", "logoUrl")}
          {text("favicon_url", "faviconUrl")}
          {text("logo_emoji", "logoEmoji")}
        </div>
      </AdminCard>

      <AdminCard>
        <SectionHeader title={tx("seo")} />
        <div className="grid grid-cols-2 gap-2">
          {text("meta_title_ar", "metaTitleAr")}
          {text("meta_title_ku", "metaTitleKu")}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {text("meta_description_ar", "metaDescAr")}
          {text("meta_description_ku", "metaDescKu")}
          {text("og_image_url", "ogImage")}
        </div>
      </AdminCard>

      <AdminCard>
        <SectionHeader title={tx("contact")} />
        <div className="grid grid-cols-2 gap-2">
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

      <AdminCard>
        <SectionHeader title={tx("commerce")} />
        <div className="grid grid-cols-2 gap-2">
          {text("currency_ar", "currencyAr")}
          {text("currency_ku", "currencyKu")}
          {text("min_order_total", "minOrder", "number")}
          {text("delivery_fee", "deliveryFee", "number")}
          {text("free_delivery_over", "freeOver", "number")}
        </div>
      </AdminCard>

      <AdminCard>
        <SectionHeader title={t("marketingPricing")} />
        <p className="text-[11px] text-muted-foreground">{t("marketingPricingHint")}</p>
        <div className="grid grid-cols-2 gap-2">
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

      <AdminCard>
        <SectionHeader title={tx("announcement")} />
        <ToggleField
          label={tx("showAnnounce")}
          checked={Boolean(draft["show_announcement"])}
          onChange={(v) => set("show_announcement", v)}
        />
        <div className="grid grid-cols-1 gap-2">
          {text("announcement_ar", "announceAr")}
          {text("announcement_ku", "announceKu")}
        </div>
      </AdminCard>

      <AdminCard>
        <SectionHeader title={tx("maintenance")} />
        <ToggleField
          label={tx("maintOn")}
          checked={Boolean(draft["maintenance_mode"])}
          onChange={(v) => set("maintenance_mode", v)}
        />
        <div className="grid grid-cols-1 gap-2">
          {text("maintenance_note_ar", "maintAr")}
          {text("maintenance_note_ku", "maintKu")}
        </div>
      </AdminCard>

      <AdminCard>
        <SectionHeader
          title={tx("danger")}
          action={<AlertTriangle className="size-4 text-destructive" />}
        />
        <p className="text-[11px] text-muted-foreground">{tx("dangerHint")}</p>
        <TextField
          label={tx("confirmWord")}
          value={confirmWord}
          onChange={setConfirmWord}
        />
        <div className="space-y-2">
          <div className="rounded-xl border border-dashed border-destructive/40 p-2.5">
            <p className="text-[12px] font-bold">{tx("resetSales")}</p>
            <p className="mb-2 text-[11px] text-muted-foreground">{tx("resetSalesHint")}</p>
            <Button
              variant="outline"
              disabled={confirmWord !== "DELETE" || reset.isPending}
              onClick={() => reset.mutate("sales")}
              className="h-9 w-full gap-2 rounded-full text-[12px] font-bold text-destructive"
            >
              <Trash2 className="size-3.5" />
              {tx("resetSales")}
            </Button>
          </div>
          <div className="rounded-xl border border-dashed border-destructive/40 p-2.5">
            <p className="text-[12px] font-bold">{tx("resetAll")}</p>
            <p className="mb-2 text-[11px] text-muted-foreground">{tx("resetAllHint")}</p>
            <Button
              variant="destructive"
              disabled={confirmWord !== "DELETE" || reset.isPending}
              onClick={() => reset.mutate("all")}
              className="h-9 w-full gap-2 rounded-full text-[12px] font-extrabold"
            >
              <Trash2 className="size-3.5" />
              {tx("resetAll")}
            </Button>
          </div>
        </div>
      </AdminCard>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="h-11 w-full gap-2 rounded-full text-[13px] font-extrabold"
      >
        <Save className="size-4" />
        {tx("save")}
      </Button>
    </div>
  );
}
