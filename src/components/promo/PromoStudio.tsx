import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  Check,
  Hourglass,
  Image as ImageIcon,
  Layers,
  PackageOpen,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RewardSponsorField } from "@/components/rewards/RewardSponsorField";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, pick, pickName, useI18n } from "@/lib/i18n";
import { clearancePercent, clearanceUnitPrice } from "@/lib/clearance";


/* ------------------------------------------------------------------ */
/* Step 1 — pick a promotion type                                     */
/* ------------------------------------------------------------------ */

type PromoKind = "offer" | "deal" | "bundle" | "banner";
type ClearanceKind = "near_expiry" | "outlet";
type AnyKind = PromoKind | ClearanceKind;

const KIND_META: Record<
  AnyKind,
  { ar: string; ku: string; en: string; icon: typeof Zap; hintAr: string; hintKu: string }
> = {
  offer: {
    ar: "خصم على منتجات",
    ku: "بەرزکردنەوەی بەرهەمەکان",
    en: "Discount on products",
    icon: BadgePercent,
    hintAr: "خصم نسبة أو مبلغ على منتجات محددة",
    hintKu: "داکشانکردنی ڕێژەیی یان بڕ لە بەرهەمە دیاریکراوەکان",
  },
  deal: {
    ar: "عرض اليوم",
    ku: "ڕێککەوتنی ئەمڕۆ",
    en: "Deal of the day",
    icon: Zap,
    hintAr: "عرض محدود بمنتج واحد للبيع السريع",
    hintKu: "پێشکەشکردنی سنووردار بۆ یەک بەرهەم بۆ فرۆشی خێرا",
  },
  bundle: {
    ar: "باقة / حزمة",
    ku: "کۆمەڵە",
    en: "Bundle / Package",
    icon: Layers,
    hintAr: "مجموعة منتجات بسعر واحد",
    hintKu: "کۆمەڵە بەرهەم بە یەک نرخ",
  },
  banner: {
    ar: "إعلان (بانر)",
    ku: "بانر",
    en: "Banner Ad",
    icon: ImageIcon,
    hintAr: "بانر في مكان محدد بعرض سعره",
    hintKu: "بانر لە شوێنی دیاریکراو لەگەڵ نرخەکەی",
  },
  near_expiry: {
    ar: "قرب الانتهاء",
    ku: "نزیک بەسەرچوون",
    en: "Nearing Expiry",
    icon: Hourglass,
    hintAr: "منتجات قريبة الانتهاء بخصم تلقائي حسب المدة",
    hintKu: "بەرهەمی نزیک بەسەرچوون بە داشکاندنی خۆکار",
  },
  outlet: {
    ar: "أوتليت",
    ku: "ئاوتلێت",
    en: "Outlet",
    icon: PackageOpen,
    hintAr: "تصفية مخزون قديم بأسعار أقل",
    hintKu: "فرۆشتنی کۆگای کۆن بە نرخی کەمتر",
  },
};

/* how the customer price is calculated + how long the promo runs */
const KIND_RULES: Record<
  AnyKind,
  { priceAr: string; priceKu: string; durAr: string; durKu: string }
> = {
  offer: {
    priceAr: "السعر النهائي = سعر المنتج − الخصم (نسبة أو مبلغ) الذي تحدده.",
    priceKu: "نرخی کۆتایی = نرخی بەرهەم − داشکاندن (ڕێژە یان بڕ) کە تۆ دیاری دەکەی.",
    durAr: "يظهر ٣٠ يوماً من لحظة النشر، ثم يتوقف تلقائياً.",
    durKu: "٣٠ ڕۆژ دەردەکەوێت لە کاتی بڵاوکردنەوە، پاشان بەخۆکارانە دەوەستێت.",
  },
  deal: {
    priceAr: "منتج واحد بسعر مخفّض = سعر المنتج − الخصم، ويظهر في هيرو الصفحة الرئيسية.",
    priceKu: "یەک بەرهەم بە نرخی کەمتر = نرخی بەرهەم − داشکاندن، لە هیرۆی پەیجی سەرەکی دەردەکەوێت.",
    durAr: "يظهر ٣٠ يوماً في مكان الهيرو مع عدّاد الوقت.",
    durKu: "٣٠ ڕۆژ لە شوێنی هیرۆ دەردەکەوێت لەگەڵ کاتژمێر.",
  },
  bundle: {
    priceAr: "تحدد سعر الحزمة كاملاً + السعر الأصلي للمقارنة. الحزمة تُضاف للسلة كوحدة واحدة.",
    priceKu: "نرخی تەواوی کۆمەڵە + نرخی ئەسڵی بۆ بەراورد دیاری دەکەی. کۆمەڵە وەک یەک یەکە دەچێتە سەبەتە.",
    durAr: "تظهر ٣٠ يوماً في قسم الحزم.",
    durKu: "٣٠ ڕۆژ لە بەشی کۆمەڵەکان دەردەکەوێت.",
  },
  banner: {
    priceAr: "لا يغيّر أسعار المنتجات — الأجرة تعتمد على مكان البانر (هيرو، سلة، أسفل).",
    priceKu: "نرخی بەرهەم ناگۆڕێت — کرێ بەپێی شوێنی بانرە (هیرۆ، سەبەتە، خوارەوە).",
    durAr: "يظهر ٣٠ يوماً في المكان المدفوع.",
    durKu: "٣٠ ڕۆژ لە شوێنی پارەدراو دەردەکەوێت.",
  },
  near_expiry: {
    priceAr: "تحدد السعر الأصلي وسعر العرض. إن تركت سعر العرض فارغاً يُحسب الخصم تلقائياً حسب المدة المتبقية للانتهاء.",
    priceKu: "نرخی ئەسڵی و نرخی ئۆفەر دیاری دەکەی. ئەگەر نرخی ئۆفەر بەتاڵ بێت، داشکاندن بەخۆکارانە بەپێی ماوەی مابوو دەژمێردرێت.",
    durAr: "يبقى معروضاً حتى بيع الكمية أو حتى تاريخ الانتهاء (بدون أجرة).",
    durKu: "دەمێنێتەوە هەتا فرۆشتنی بڕەکە یان بەرواری بەسەرچوون (بێ کرێ).",
  },
  outlet: {
    priceAr: "تحدد السعر الأصلي وسعر الأوتليت يدوياً — الفرق يظهر كنسبة خصم.",
    priceKu: "نرخی ئەسڵی و نرخی ئاوتلێت بە دەست دیاری دەکەی — جیاوازی وەک ڕێژەی داشکاندن دەردەکەوێت.",
    durAr: "يبقى معروضاً حتى تنتهي الكمية أو تلغيه (بدون أجرة).",
    durKu: "دەمێنێتەوە هەتا بڕەکە تەواو دەبێت یان هەڵی دەگرێت (بێ کرێ).",
  },
};



const S = {
  days: { ar: "يوم", ku: "ڕۆژ", en: "Day",},
  staysLive: {
    ar: "يظهر {d} يوماً من لحظة النشر، ثم يتوقف تلقائياً.",
    ku: "{d} ڕۆژ دەردەکەوێت لە کاتی بڵاوکردنەوە، پاشان بەخۆکارانە دەوەستێت.",
    en: "Appears for {d} days from publication, then stops automatically.",
  },
  adminNote: { ar: "ملاحظة الإدارة", ku: "تێبینی بەڕێوەبەر", en: "Admin Note",},
  studio: { ar: "استوديو العروض", ku: "ستودیۆی پێشکەشکردن", en: "Deals Studio",},
  details: { ar: "التفاصيل", ku: "وردەکاری", en: "Details",},
  look: { ar: "المظهر", ku: "دەرکەوتن", en: "Appearance",},
  title: { ar: "العنوان", ku: "ناونیشان", en: "Title",},
  subtitle: { ar: "وصف قصير", ku: "وەسفی کورت", en: "Short Description",},
  pickOne: { ar: "اختر منتجاً", ku: "بەرهەمێک هەڵبژێرە", en: "Select a product",},
  pickMany: { ar: "اختر المنتجات", ku: "بەرهەمەکان هەڵبژێرە", en: "Select products",},
  slot: { ar: "مكان الإعلان", ku: "شوێنی بانر", en: "Ad Placement",},
  advanced: { ar: "خيارات إضافية", ku: "هەڵبژاردەی زیاتر", en: "Additional Options",},
  next: { ar: "التالي", ku: "دواتر", en: "Next",},
  publish: { ar: "نشر العرض", ku: "بڵاوکردنەوە", en: "Publish Offer",},
  activeList: { ar: "العروض النشطة", ku: "پێشکەشکردنە چالاکەکان", en: "Active Offers",},
  active: { ar: "نشط", ku: "چالاک", en: "Active",},
  create: { ar: "إنشاء", ku: "دروستکردن", en: "Create",},
  expiry: { ar: "تاريخ الانتهاء", ku: "بەرواری بەسەرچوون", en: "Expiry Date",},
  since: { ar: "في المخزن من", ku: "لە کۆگا لەوەتەی", en: "In stock from",},
  autoMarkdown: {
    ar: "الخصم يُحسب تلقائياً حسب المدة المتبقية",
    ku: "داشکاندن بەخۆکارانە بەپێی ماوەی مابوو دەژمێردرێت",
    en: "Discount is calculated automatically based on remaining duration",
  },
  emptyList: { ar: "لا يوجد شيء هنا بعد", ku: "هێشتا هیچ نییە", en: "Nothing here yet",},
  perMonth: { ar: "شهر", ku: "مانگ", en: "Month",},
  feeFrom: { ar: "من", ku: "لە", en: "From",},
  free: { ar: "مجاني", ku: "بێ بەرامبەر", en: "Free",},
  howPrice: { ar: "كيف يُحسب السعر", ku: "نرخ چۆن دەژمێردرێت", en: "How Price Is Calculated",},
  howLong: { ar: "مدة الظهور", ku: "ماوەی دەرکەوتن", en: "Display Duration",},
  fee: { ar: "الأجرة", ku: "کرێ", en: "Fee",},
  regPrice: { ar: "السعر الأصلي", ku: "نرخی ئەسڵی", en: "Original Price",},
  offPrice: { ar: "سعر العرض", ku: "نرخی ئۆفەر", en: "Offer Price",},
  onePriceNote: {
    ar: "اختر منتجاً واحداً لتحديد السعر الأصلي وسعر العرض",
    ku: "یەک بەرهەم هەڵبژێرە بۆ دیاریکردنی نرخی ئەسڵی و نرخی ئۆفەر",
    en: "Select one product to set original and offer prices",
  },
  monthNote: {
    ar: "كل عرض يظهر لمدة شهر واحد (الأجور لشهر واحد)",
    ku: "هەموو ئۆفەرێک بۆ ماوەی یەک مانگ دەردەکەوێت (کرێ بۆ یەک مانگە)",
    en: "Each offer appears for one month (fees for one month)",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Shared draft + bilingual helper                                    */
/* ------------------------------------------------------------------ */

type Draft = {
  id?: string;
  kind: AnyKind;
  title_ar: string;
  title_ku: string;
  subtitle_ar: string;
  subtitle_ku: string;
  badge_ar: string;
  badge_ku: string;
  discount_type: string;
  discount_value: string;
  price: string;
  compare_price: string;
  ends_at: string;
  starts_at: string;
  hue: string;
  chroma: string;
  productIds: string[]; // selected products
  slot_key: string;
  image_url: string;
  date: string;
  is_active: boolean;
  reward_multiplier: string;
  reward_bonus_points: string;
};

const fresh = (kind: AnyKind): Draft => ({
  kind,
  title_ar: "",
  title_ku: "",
  subtitle_ar: "",
  subtitle_ku: "",
  badge_ar: "",
  badge_ku: "",
  discount_type: "percent",
  discount_value: "20",
  price: "",
  compare_price: "",
  ends_at: "",
  starts_at: "",
  hue: "250",
  chroma: "0.14",
  productIds: [],
  slot_key: "",
  image_url: "",
  date: "",
  is_active: true,
  reward_multiplier: "1",
  reward_bonus_points: "0",
});

/* ------------------------------------------------------------------ */
/* Existing promos (unified list)                                     */
/* ------------------------------------------------------------------ */

type ListRow = {
  id: string;
  kind: AnyKind;
  name: string;
  active: boolean;
  hue: string;
  chroma: string;
  before: number | null;
  after: number | null;
  endsAt: string | null;
};

/** fallback duration when admin has not set one */
const MONTH_DAYS = 30;

function afterPrice(before: number, type: string, value: number) {
  if (type === "percent") return Math.max(0, before * (1 - value / 100));
  if (type === "fixed") return Math.max(0, before - value);
  if (type === "fixed_price") return Math.max(0, value);
  return before;
}


export function PromoStudio({ vendorId }: { vendorId?: string }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [section, setSection] = useState<AnyKind | null>(null);

  const products = useQuery({
    queryKey: ["promo-products", vendorId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name_ar, name_ku, price, image_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(300);
      if (vendorId) q = q.eq("vendor_id", vendorId);
      return (await q).data ?? [];
    },
  });

  const slots = useQuery({
    queryKey: ["promo-banner-slots"],
    queryFn: async () =>
      (
        await supabase
          .from("banner_slots")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
      ).data ?? [],
  });

  /* --------- marketing fees + durations set by admin (apply to all vendors) --------- */
  const plans = useQuery({
    queryKey: ["promo-plans"],
    queryFn: async () =>
      (await supabase.from("marketing_plans").select("*")).data ?? [],
  });

  const planKey = (kind: AnyKind) => (kind === "deal" ? "flash_deal" : kind);
  const planFor = (kind: AnyKind): any =>
    (plans.data ?? []).find((p: any) => p.kind === planKey(kind)) ?? null;

  /** fee for a promo kind, as set by admin */
  const feeFor = (kind: AnyKind): number | null => {
    if (kind === "banner") {
      const list = (slots.data ?? []).map((x: any) => Number(x.price) || 0).filter((n) => n > 0);
      return list.length ? Math.min(...list) : null;
    }
    const p = planFor(kind);
    if (!p) return null;
    return Number(p.price) || 0;
  };

  /** how many days the promo stays live, as set by admin */
  const daysFor = (kind: AnyKind): number => {
    const p = planFor(kind);
    return Math.max(1, Number(p?.duration_days) || MONTH_DAYS);
  };

  const endsAtFor = (kind: AnyKind) =>
    new Date(Date.now() + daysFor(kind) * 86400_000).toISOString();

  const allowedKinds = (kind: AnyKind) => {
    if (!vendorId) return true;
    const p = planFor(kind);
    return p ? p.vendor_allowed !== false : true;
  };

  /* --------- promos grouped per kind, with before / after pricing --------- */
  const list = useQuery({
    queryKey: ["promo-list", vendorId ?? "all", lang],
    queryFn: async () => {
      const vf = <T extends { eq: any }>(q: T) => (vendorId ? (q as any).eq("vendor_id", vendorId) : q);
      const [offers, deals, bundles, banners] = await Promise.all([
        vf(
          supabase
            .from("offers")
            .select("id,title_ar,title_ku,is_active,hue,chroma,discount_type,discount_value,ends_at,offer_products(product_id)")
            .order("sort_order"),
        ),
        vf(
          supabase
            .from("flash_deals")
            .select("id,title_ar,title_ku,is_active,hue,chroma,discount_type,discount_value,ends_at,product_id")
            .order("sort_order"),
        ),
        vf(
          supabase
            .from("bundles")
            .select("id,title_ar,title_ku,is_active,hue,chroma,price,compare_price,product_ids")
            .order("sort_order"),
        ),
        vendorId
          ? Promise.resolve({ data: [] as any[] })
          : supabase
              .from("banners")
              .select("id,title_ar,title_ku,is_active,text_color,bg_color,ends_at")
              .order("sort_order"),
      ]);

      /* clearance-tagged products behave like promos of their own kind */
      let cq = supabase
        .from("products")
        .select("id,name_ar,name_ku,price,compare_price,clearance_kind,expiry_date,stocked_since")
        .neq("clearance_kind", "none")
        .limit(400);
      if (vendorId) cq = cq.eq("vendor_id", vendorId);
      const [clearanceRes, rulesRes] = await Promise.all([
        cq,
        supabase.from("clearance_rules").select("*").eq("is_active", true).order("months_left"),
      ]);
      const rules = (rulesRes.data ?? []) as any[];

      /* price lookup for every product referenced by a promo */
      const ids = new Set<string>();
      (offers.data ?? []).forEach((o: any) =>
        (o.offer_products ?? []).forEach((l: any) => l.product_id && ids.add(l.product_id)),
      );
      (deals.data ?? []).forEach((d: any) => d.product_id && ids.add(d.product_id));
      (bundles.data ?? []).forEach((b: any) => (b.product_ids ?? []).forEach((id: string) => ids.add(id)));

      const priceMap: Record<string, number> = {};
      if (ids.size) {
        const { data } = await supabase.from("products").select("id, price").in("id", [...ids]);
        (data ?? []).forEach((p: any) => (priceMap[p.id] = Number(p.price) || 0));
      }
      const sum = (arr: string[]) => arr.reduce((s, id) => s + (priceMap[id] ?? 0), 0);

      const base = (r: any, kind: PromoKind) => ({
        id: r.id,
        kind,
        name: pick(r.title_ar, r.title_ku, lang) || "—",
        active: r.is_active,
        hue: r.hue ?? "250",
        chroma: r.chroma ?? 0.14,
        endsAt: r.ends_at ?? null,
      });

      const rows: ListRow[] = [
        ...(offers.data ?? []).map((r: any) => {
          const before = sum((r.offer_products ?? []).map((l: any) => l.product_id));
          return {
            ...base(r, "offer" as PromoKind),
            before: before || null,
            after: before ? afterPrice(before, r.discount_type, Number(r.discount_value) || 0) : null,
          };
        }),
        ...(deals.data ?? []).map((r: any) => {
          const before = r.product_id ? (priceMap[r.product_id] ?? 0) : 0;
          return {
            ...base(r, "deal" as PromoKind),
            before: before || null,
            after: before ? afterPrice(before, r.discount_type, Number(r.discount_value) || 0) : null,
          };
        }),
        ...(bundles.data ?? []).map((r: any) => {
          const before = Number(r.compare_price) || sum(r.product_ids ?? []) || null;
          return {
            ...base(r, "bundle" as PromoKind),
            before,
            after: Number(r.price) || null,
          };
        }),
        ...(banners.data ?? []).map((r: any) => ({
          ...base(r, "banner" as PromoKind),
          before: null,
          after: null,
        })),
        ...(clearanceRes.data ?? []).map((p: any) => {
          const price = Number(p.price) || 0;
          const cmp = Number(p.compare_price) || 0;
          const pct = clearancePercent(p, rules);
          /* manual pricing wins: compare_price = regular, price = offer price */
          const manual = cmp > price;
          const before = manual ? cmp : price;
          const after = manual ? price : pct > 0 ? clearanceUnitPrice(price, pct) : null;
          return {
            id: p.id,
            kind: p.clearance_kind as AnyKind,
            name: pickName(p, lang),
            active: true,
            hue: "250",
            chroma: "0.14",
            before: before || null,
            after,
            endsAt: p.clearance_kind === "near_expiry" ? (p.expiry_date ?? null) : (p.stocked_since ?? null),
          } as ListRow;
        }),
      ];
      return rows;
    },
  });


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["promo-list", vendorId ?? "all"] });
    qc.invalidateQueries({ queryKey: ["store"] });
    qc.invalidateQueries();
  };

  const isClearanceKind = (k: AnyKind): k is ClearanceKind =>
    k === "near_expiry" || k === "outlet";

  const remove = useMutation({
    mutationFn: async (r: ListRow) => {
      if (isClearanceKind(r.kind)) {
        const { error } = await supabase
          .from("products")
          .update({ clearance_kind: "none", expiry_date: null, stocked_since: null })
          .eq("id", r.id);
        if (error) throw error;
        return;
      }
      const table =
        r.kind === "offer" ? "offers" : r.kind === "deal" ? "flash_deals" : r.kind === "bundle" ? "bundles" : "banners";
      const { error } = await supabase.from(table).delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  const toggle = useMutation({
    mutationFn: async (r: ListRow) => {
      if (isClearanceKind(r.kind)) {
        const { error } = await supabase
          .from("products")
          .update({ clearance_kind: "none" })
          .eq("id", r.id);
        if (error) throw error;
        return;
      }
      const table =
        r.kind === "offer" ? "offers" : r.kind === "deal" ? "flash_deals" : r.kind === "bundle" ? "bundles" : "banners";
      const { error } = await supabase
        .from(table)
        .update({ is_active: !r.active })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message ? e.message : t("error")),
  });

  /* --------- save --------- */
  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const common = {
        title_ar: d.title_ar.trim(),
        title_ku: d.title_ku.trim() || d.title_ar.trim(),
        subtitle_ar: d.subtitle_ar.trim(),
        subtitle_ku: d.subtitle_ku.trim() || d.subtitle_ar.trim(),
        is_active: d.is_active,
        ...(vendorId ? { vendor_id: vendorId } : {}),
      };

      if (d.kind === "near_expiry" || d.kind === "outlet") {
        const patch: any =
          d.kind === "near_expiry"
            ? { clearance_kind: "near_expiry", expiry_date: d.date || null }
            : { clearance_kind: "outlet", stocked_since: d.date || null };
        /* manual pricing only makes sense for a single product */
        if (d.productIds.length === 1) {
          const reg = Number(d.compare_price) || 0;
          const off = Number(d.price) || 0;
          if (off > 0 && reg > off) {
            patch.price = off;
            patch.compare_price = reg;
          } else if (off > 0) {
            patch.price = off;
          }
        }
        const { error } = await supabase.from("products").update(patch).in("id", d.productIds);
        if (error) throw error;
        return;
      }

      if (d.kind === "offer") {
        const row = {
          ...common,
          badge_ar: d.badge_ar,
          badge_ku: d.badge_ku || d.badge_ar,
          discount_type: d.discount_type,
          discount_value: Number(d.discount_value) || 0,
          ends_at: endsAtFor("offer"),
          scope: "products",
          min_qty: 1,
          priority: 0,
          hue: Number(d.hue),
          chroma: Number(d.chroma),
          sort_order: 0,
          reward_multiplier: Math.max(1, Number(d.reward_multiplier) || 1),
          reward_bonus_points: Math.max(0, Math.round(Number(d.reward_bonus_points) || 0)),
        };
        const res = d.id
          ? await supabase.from("offers").update(row).eq("id", d.id).select("id").single()
          : await supabase.from("offers").insert(row).select("id").single();
        if (res.error) throw res.error;
        await supabase.from("offer_products").delete().eq("offer_id", res.data.id);
        if (d.productIds.length) {
          const link = await supabase
            .from("offer_products")
            .insert(d.productIds.map((product_id) => ({ offer_id: res.data.id, product_id })));
          if (link.error) throw link.error;
        }
      } else if (d.kind === "deal") {
        const row = {
          ...common,
          badge_ar: d.badge_ar,
          badge_ku: d.badge_ku || d.badge_ar,
          product_id: d.productIds[0] || null,
          image_url: d.image_url.trim() || null,
          discount_type: d.discount_type,
          discount_value: Number(d.discount_value) || 0,
          starts_at: new Date().toISOString(),
          ends_at: endsAtFor("deal"),
          min_qty: 1,
          priority: 0,
          hue: Number(d.hue),
          chroma: Number(d.chroma),
          sort_order: 0,
        };
        const { error } = d.id
          ? await supabase.from("flash_deals").update(row).eq("id", d.id)
          : await supabase.from("flash_deals").insert(row);
        if (error) throw error;
      } else if (d.kind === "bundle") {
        const row = {
          ...common,
          product_ids: d.productIds,
          price: Number(d.price) || 0,
          compare_price: d.compare_price ? Number(d.compare_price) : null,
          image_url: d.image_url.trim() || null,
          hue: Number(d.hue),
          chroma: Number(d.chroma),
          sort_order: 0,
          kind: "fixed",
          stock: 100,
        };
        const { error } = d.id
          ? await supabase.from("bundles").update(row).eq("id", d.id)
          : await supabase.from("bundles").insert(row);
        if (error) throw error;
      } else {
        const row = {
          slot_key: d.slot_key || (slots.data?.[0]?.slot_key ?? "home_hero"),
          ...(vendorId ? { vendor_id: vendorId } : {}),
          title_ar: d.title_ar,
          title_ku: d.title_ku || d.title_ar,
          subtitle_ar: d.subtitle_ar || null,
          subtitle_ku: d.subtitle_ku || null,
          image_url: d.image_url.trim() || null,
          bg_color: `oklch(0.34 ${(Number(d.chroma) || 0.14) * 0.85} ${Number(d.hue)})`,
          text_color: "oklch(0.98 0.01 250)",
          starts_at: new Date().toISOString(),
          ends_at: endsAtFor("banner"),
          sort_order: 0,
          is_active: d.is_active,
        };
        const { error } = d.id
          ? await supabase.from("banners").update(row).eq("id", d.id)
          : await supabase.from("banners").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setDraft(null);
            invalidate();
    },
    onError: (e: Error) => toast.error(e.message || t("error")),
  });

  /** Paid banner placements are an admin-only tool. */
  const canBanners = !vendorId;
  const listRows = (list.data ?? []).filter((r) => canBanners || r.kind !== "banner");

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-extrabold">
          <Sparkles className="size-4 text-primary" />
          {S.studio[lang]}
        </h3>
      </div>

      {!draft && !section ? (
        /* ---------- Step 0: choose type ---------- */
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(KIND_META) as AnyKind[])
            .filter((kind) => (canBanners || kind !== "banner") && allowedKinds(kind))
            .map((kind) => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            const count = listRows.filter((r) => r.kind === kind && r.active).length;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setSection(kind)}
                className="group rounded-2xl border border-border bg-card p-3 text-start shadow-card transition-all active:scale-[0.98]"
              >

                <div className="flex items-center gap-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[13px] font-extrabold leading-tight">{meta[lang]}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{lang === "ku" ? meta.hintKu : meta.hintAr}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {count} {S.active[lang]}
                  </span>
                  {(() => {
                    const f = feeFor(kind);
                    if (f == null) return null;
                    return (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          f > 0 ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                        }`}
                      >
                        {f > 0
                          ? `${kind === "banner" ? S.feeFrom[lang] + " " : ""}${formatPrice(f, lang)} / ${daysFor(kind)} ${S.days[lang]}`
                          : S.free[lang]}
                      </span>
                    );
                  })()}
                </div>

              </button>
            );
          })}

        </div>
      ) : section && !draft ? (
        /* ---------- Section: only this kind's promos ---------- */
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSection(null)} className="text-muted-foreground">
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </button>
            <h4 className="flex-1 text-[13px] font-extrabold">{KIND_META[section][lang]}</h4>
            <Button
              size="sm"
              onClick={() => {
                const d = fresh(section);
                if (section === "banner") d.slot_key = slots.data?.[0]?.slot_key ?? "home_hero";
                setDraft(d);
                              }}
            >
              <Plus className="size-4" />
              {S.create[lang]}
            </Button>
          </div>
          {/* pricing + duration explainer for this promo type */}
          <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/60 p-2.5">
            <p className="text-[11px] leading-snug">
              <span className="font-extrabold">{S.howPrice[lang]}: </span>
              <span className="text-muted-foreground">
                {lang === "ku" ? KIND_RULES[section].priceKu : KIND_RULES[section].priceAr}
              </span>
            </p>
            <p className="text-[11px] leading-snug">
              <span className="font-extrabold">{S.howLong[lang]}: </span>
              <span className="text-muted-foreground">
                {S.staysLive[lang].replace("{d}", String(daysFor(section)))}
              </span>
            </p>
            {(() => {
              const note = lang === "ku" ? planFor(section)?.note_ku : planFor(section)?.note_ar;
              if (!note) return null;
              return (
                <p className="text-[11px] leading-snug">
                  <span className="font-extrabold">{S.adminNote[lang]}: </span>
                  <span className="text-muted-foreground">{note}</span>
                </p>
              );
            })()}
            {(() => {
              const f = feeFor(section);
              if (f == null) return null;
              return (
                <p className="text-[11px] leading-snug">
                  <span className="font-extrabold">{S.fee[lang]}: </span>
                  <span className={f > 0 ? "font-extrabold text-primary" : "font-extrabold text-emerald-600"}>
                    {f > 0
                      ? `${section === "banner" ? S.feeFrom[lang] + " " : ""}${formatPrice(f, lang)} / ${daysFor(section)} ${S.days[lang]}`
                      : S.free[lang]}
                  </span>
                </p>
              );
            })()}
          </div>


          {listRows.filter((r) => r.kind === section).length === 0 ? (
            <p className="py-10 text-center text-[12px] text-muted-foreground">{S.emptyList[lang]}</p>
          ) : (
            <div className="space-y-1.5">
              {listRows
                .filter((r) => r.kind === section)
                .map((r) => {
                  const Icon = KIND_META[r.kind].icon;
                  return (
                    <div
                      key={r.kind + r.id}
                      className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-2 shadow-card"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold">{r.name}</p>
                        {r.before && r.after != null ? (
                          <p className="flex items-center gap-1.5 text-[11px] font-bold">
                            <span className="text-muted-foreground line-through">
                              {formatPrice(r.before, lang)}
                            </span>
                            <span className="text-primary">{formatPrice(r.after, lang)}</span>
                            {r.before > r.after && (
                              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
                                −{Math.round(((r.before - r.after) / r.before) * 100)}%
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {r.endsAt
                              ? new Date(r.endsAt).toLocaleDateString(lang === "ku" ? "ckb-IQ" : "ar-IQ")
                              : "—"}
                          </p>
                        )}
                      </div>
                      <Switch checked={r.active} onCheckedChange={() => toggle.mutate(r)} />
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                        onClick={() => remove.mutate(r)}
                        aria-label={t("delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : draft ? (

        /* ---------- Wizard ---------- */
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3 shadow-card">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDraft(null)} className="text-muted-foreground">
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </button>
            <h4 className="flex-1 text-[13px] font-extrabold">{KIND_META[draft.kind][lang]}</h4>
          </div>

          <div className="space-y-2.5">
              {/* basic title */}
              {!(draft.kind === "near_expiry" || draft.kind === "outlet") && (
              <>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{S.title[lang]}</Label>
                <Input
                  className="h-10 text-[14px] font-bold"
                  placeholder={lang === "ku" ? "ناونیشانی پێشکەشکردن" : "عنوان العرض"}
                  value={draft.title_ar}
                  onChange={(e) => setDraft({ ...draft, title_ar: e.target.value, title_ku: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{S.subtitle[lang]}</Label>
                <Input
                  className="h-9 text-[12px]"
                  placeholder={lang === "ku" ? "وەسفی کورت" : "وصف قصير"}
                  value={draft.subtitle_ar}
                  onChange={(e) => setDraft({ ...draft, subtitle_ar: e.target.value, subtitle_ku: e.target.value })}
                />
              </div>
              </>
              )}

              {/* products */}
              {draft.kind !== "banner" && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {draft.kind === "deal" || isClearanceKind(draft.kind) ? S.pickOne[lang] : S.pickMany[lang]}
                  </Label>
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {(products.data ?? []).map((p: any) => {
                      const on = draft.productIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              ...(isClearanceKind(draft.kind)
                                ? {
                                    compare_price: String(Number(p.price) || ""),
                                    price: "",
                                  }
                                : {}),
                              productIds:
                                draft.kind === "deal" || isClearanceKind(draft.kind)
                                  ? [p.id]
                                  : on
                                    ? draft.productIds.filter((x) => x !== p.id)
                                    : [...draft.productIds, p.id],
                            })
                          }
                          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-start transition-all ${
                            on ? "border-primary bg-primary/10" : "border-border bg-background"
                          }`}
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="size-8 shrink-0 rounded-md bg-muted object-cover" />
                          ) : (
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                              {pickName(p, lang).slice(0, 2)}
                            </span>
                          )}
                          <span className="flex-1 text-[12px] font-semibold leading-tight">{pickName(p, lang)}</span>
                          {on && <Check className="size-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* price / discount */}
              {(draft.kind === "near_expiry" || draft.kind === "outlet") ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {draft.kind === "near_expiry" ? S.expiry[lang] : S.since[lang]}
                    </Label>
                    <Input
                      className="h-9"
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    />
                  </div>

                  {draft.productIds.length === 1 ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{S.regPrice[lang]}</Label>
                          <Input
                            className="h-9"
                            type="number"
                            inputMode="numeric"
                            value={draft.compare_price}
                            onChange={(e) => setDraft({ ...draft, compare_price: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold text-primary">{S.offPrice[lang]}</Label>
                          <Input
                            className="h-9 font-bold"
                            type="number"
                            inputMode="numeric"
                            value={draft.price}
                            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                          />
                        </div>
                      </div>
                      {(() => {
                        const reg = Number(draft.compare_price) || 0;
                        const off = Number(draft.price) || 0;
                        if (reg > 0 && off > 0 && reg > off) {
                          const pct = Math.round(((reg - off) / reg) * 100);
                          return (
                            <p className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-extrabold text-primary">
                              {pct}%
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <p className="text-[10.5px] font-bold text-muted-foreground">{S.onePriceNote[lang]}</p>
                  )}

                  {draft.kind === "near_expiry" && (
                    <p className="text-[10.5px] font-bold text-muted-foreground">{S.autoMarkdown[lang]}</p>
                  )}
                </div>
              ) : draft.kind === "banner" ? (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{S.slot[lang]}</Label>
                  <Select value={draft.slot_key} onValueChange={(v) => setDraft({ ...draft, slot_key: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(slots.data ?? []).map((s: any) => (
                        <SelectItem key={s.slot_key} value={s.slot_key}>
                          {pick(s.name_ar, s.name_ku, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {draft.kind === "bundle" ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("bundlePrice")}</Label>
                        <Input className="h-9" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("comparePrice")}</Label>
                        <Input className="h-9" type="number" value={draft.compare_price} onChange={(e) => setDraft({ ...draft, compare_price: e.target.value })} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("discountType")}</Label>
                        <Select value={draft.discount_type} onValueChange={(v) => setDraft({ ...draft, discount_type: v })}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">{t("percent")}</SelectItem>
                            <SelectItem value="fixed">{t("fixed")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{t("discountValue")}</Label>
                        <Input
                          className="h-9"
                          type="number"
                          value={draft.discount_value}
                          onChange={(e) => setDraft({ ...draft, discount_value: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}




              {/* vendor-funded reward points on this offer */}
              {draft.kind === "offer" && (
                <RewardSponsorField
                  multiplier={draft.reward_multiplier}
                  bonus={draft.reward_bonus_points}
                  onChange={(patch) =>
                    setDraft({
                      ...draft,
                      ...(patch.multiplier !== undefined
                        ? { reward_multiplier: patch.multiplier }
                        : {}),
                      ...(patch.bonus !== undefined ? { reward_bonus_points: patch.bonus } : {}),
                    })
                  }
                />
              )}

              {/* duration is fixed at one month */}
              {!(draft.kind === "near_expiry" || draft.kind === "outlet") && (
                <p className="rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground">
                  {S.monthNote[lang]}
                </p>
              )}

              {/* advanced toggle */}
              {!(draft.kind === "near_expiry" || draft.kind === "outlet") && (
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-[11px] font-bold text-primary"
              >
                {showAdvanced ? "−" : "+"} {S.advanced[lang]}
              </button>
              )}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{lang === "ku" ? "ناونیشانی کوردی" : "العنوان الكردي"}</Label>
                    <Input className="h-9 text-[12px]" value={draft.title_ku} onChange={(e) => setDraft({ ...draft, title_ku: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{lang === "ku" ? "وەسفی کوردی" : "الوصف الكردي"}</Label>
                    <Input className="h-9 text-[12px]" value={draft.subtitle_ku} onChange={(e) => setDraft({ ...draft, subtitle_ku: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t("imageUrl")}</Label>
                    <Input className="h-9 text-[12px]" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5">
                    <Label className="text-[11px]">{S.active[lang]}</Label>
                    <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={save.isPending}
                onClick={() => {
                  const clearanceDraft = draft.kind === "near_expiry" || draft.kind === "outlet";
                  const needsProduct = draft.kind !== "banner";
                  if (!clearanceDraft && !draft.title_ar.trim()) {
                    toast.error(lang === "ku" ? "ناونیشان بنووسە" : "أدخل العنوان");
                    return;
                  }
                  if (needsProduct && !draft.productIds.length) {
                    toast.error(lang === "ku" ? "بەرهەمێک هەڵبژێرە" : "اختر منتجاً على الأقل");
                    return;
                  }
                  if (draft.kind === "bundle" && !(Number(draft.price) > 0)) {
                    toast.error(lang === "ku" ? "نرخی کۆمەڵە بنووسە" : "أدخل سعر الباقة");
                    return;
                  }
                  save.mutate(draft);
                }}
              >
                {save.isPending ? "..." : S.publish[lang]}
              </Button>
            </div>
        </div>
      ) : null}

    </div>
  );
}
