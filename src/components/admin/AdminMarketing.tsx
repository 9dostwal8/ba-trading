import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  BadgePercent,
  Hourglass,
  Image as ImageIcon,
  Layers,
  PackageOpen,
  Save,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminCard, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_BADGES, badgeLabel } from "@/lib/badges";
import { formatPrice, useI18n } from "@/lib/i18n";

/** promo kinds admins can price + time-limit for every vendor */
const KINDS: Record<
  string,
  { ar: string; ku: string; en: string; icon: typeof Zap; hintAr: string; hintKu: string }
> = {
  flash_deal: {
    ar: "هيرو / عرض سريع",
    ku: "هیرۆ / ئۆفەری خێرا",
    en: "Hero / Quick View",
    icon: Zap,
    hintAr: "بطاقة الهيرو في الصفحة الرئيسية مع عدّاد",
    hintKu: "کارتی هیرۆ لە پەیجی سەرەکی لەگەڵ کاتژمێر",
  },
  offer: {
    ar: "عرض خصم",
    ku: "ئۆفەری داشکاندن",
    en: "Discount Offer",
    icon: BadgePercent,
    hintAr: "خصم على منتج أو مجموعة منتجات",
    hintKu: "داشکاندن لەسەر بەرهەم یان کۆمەڵێک بەرهەم",
  },
  bundle: {
    ar: "حزمة",
    ku: "کۆمەڵە",
    en: "Bundle",
    icon: Layers,
    hintAr: "عدة منتجات بسعر واحد",
    hintKu: "چەند بەرهەم بە یەک نرخ",
  },
  near_expiry: {
    ar: "قريب الانتهاء",
    ku: "نزیک بەسەرچوون",
    en: "Expiring Soon",
    icon: Hourglass,
    hintAr: "منتجات قريبة من تاريخ الانتهاء",
    hintKu: "بەرهەمی نزیک لە بەرواری بەسەرچوون",
  },
  outlet: {
    ar: "أوتليت",
    ku: "ئاوتلێت",
    en: "Outlet",
    icon: PackageOpen,
    hintAr: "تصفية مخزون قديم",
    hintKu: "فرۆشتنی کۆگای کۆن",
  },
  badge: {
    ar: "ملصق منتج",
    ku: "ستیکەری بەرهەم",
    en: "Product Label",
    icon: BadgeCheck,
    hintAr: "ملصقات مثل Premium / Hot Sale على المنتج",
    hintKu: "ستیکەر وەکو Premium / Hot Sale لەسەر بەرهەم",
  },
};

const L = {
  title: { ar: "أجور ومدة التسويق", ku: "کرێ و ماوەی بازاڕکردن", en: "Marketing Fees & Durations",},
  hint: {
    ar: "الأسعار والمدد التي تحددها هنا تُطبَّق على جميع البائعين فوراً.",
    ku: "نرخ و ماوەکان کە لێرە دیاری دەکەی، دەستبەجێ بۆ هەموو فرۆشیارەکان جێبەجێ دەبن.",
    en: "Prices and durations defined here are applied to all sellers immediately.",
  },
  price: { ar: "الأجرة (لكل مدة)", ku: "کرێ (بۆ هەر ماوە)", en: "Fee (per duration)",},
  days: { ar: "المدة (أيام)", ku: "ماوە (ڕۆژ)", en: "Duration (days)",},
  allowed: { ar: "مسموح للبائعين", ku: "ڕێگەپێدراو بۆ فرۆشیار", en: "Allowed for sellers",},
  noteAr: { ar: "ملاحظة للبائع (عربي)", ku: "تێبینی بۆ فرۆشیار (عەرەبی)", en: "Note for Seller (Arabic)",},
  noteKu: { ar: "ملاحظة للبائع (كردي)", ku: "تێبینی بۆ فرۆشیار (کوردی)", en: "Note for Seller (Kurdish)",},
  free: { ar: "مجاني", ku: "بێ بەرامبەر", en: "Free",},
  banners: { ar: "أماكن البانرات (للإدارة فقط)", ku: "شوێنی بانەرەکان (تەنیا بەڕێوەبەر)", en: "Banner Locations (Admin Only)",},
  slotPrice: { ar: "الأجرة", ku: "کرێ", en: "Fee",},
  slotMax: { ar: "أقصى عدد", ku: "زۆرترین ژمارە", en: "Max Count",},
  active: { ar: "مُفعَّل", ku: "چالاک", en: "Active",},
  save: { ar: "حفظ", ku: "پاشەکەوت", en: "Save",},
  saved: { ar: "تم الحفظ", ku: "پاشەکەوت کرا", en: "Saved",},
  summary: { ar: "الملخص", ku: "کورتە", en: "Summary",},
  perDays: { ar: "يوم", ku: "ڕۆژ", en: "Day",},
  badgeFees: { ar: "أجور الملصقات (لكل ملصق)", ku: "کرێی ستیکەرەکان (بۆ هەر ستیکەر)", en: "Sticker Fees (per sticker)",},
  badgeFeesHint: {
    ar: "اختر أي ملصق مجاني وأي ملصق مدفوع. اتركه صفراً لاستخدام سعر الملصق العام.",
    ku: "دیاری بکە کام ستیکەر خۆڕاییە و کامەیان پارەدارە. سفر بەجێبهێڵە بۆ نرخی گشتی.",
    en: "Pick which stickers are free and which are paid. Leave 0 to use the general sticker fee.",
  },
  paid: { ar: "مدفوع", ku: "پارەدار", en: "Paid",},
  customPrice: { ar: "سعر خاص (0 = السعر العام)", ku: "نرخی تایبەت (0 = نرخی گشتی)", en: "Custom price (0 = general)",},
};


type PlanRow = {
  id: string;
  kind: string;
  price: number;
  duration_days: number;
  vendor_allowed: boolean;
  note_ar: string;
  note_ku: string;
  sort_order: number;
};

export function AdminMarketing() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [plans, setPlans] = useState<Record<string, PlanRow>>({});
  const [slots, setSlots] = useState<any[]>([]);
  const [fees, setFees] = useState<Record<string, { is_paid: boolean; price: number }>>({});

  const planQ = useQuery({
    queryKey: ["admin-marketing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const slotQ = useQuery({
    queryKey: ["admin-marketing-slots"],
    queryFn: async () =>
      (await supabase.from("banner_slots").select("*").order("sort_order")).data ?? [],
  });

  const feeQ = useQuery({
    queryKey: ["admin-badge-fees"],
    queryFn: async () =>
      ((await (supabase as any).from("badge_fees").select("*").order("sort_order")).data ??
        []) as { badge_key: string; is_paid: boolean; price: number }[],
  });



  useEffect(() => {
    if (!planQ.data) return;
    const map: Record<string, PlanRow> = {};
    for (const k of Object.keys(KINDS)) {
      const row = planQ.data.find((p) => p.kind === k);
      map[k] =
        row ??
        ({
          id: "",
          kind: k,
          price: 0,
          duration_days: 30,
          vendor_allowed: true,
          note_ar: "",
          note_ku: "",
          sort_order: 99,
        } as PlanRow);
    }
    setPlans(map);
  }, [planQ.data]);

  useEffect(() => {
    if (slotQ.data) setSlots(slotQ.data as any[]);
  }, [slotQ.data]);

  useEffect(() => {
    if (!feeQ.data) return;
    const map: Record<string, { is_paid: boolean; price: number }> = {};
    for (const b of PRODUCT_BADGES) {
      const row = feeQ.data.find((f) => f.badge_key === b.key);
      map[b.key] = {
        is_paid: row ? Boolean(row.is_paid) : b.key !== "discount",
        price: Number(row?.price ?? 0) || 0,
      };
    }
    setFees(map);
  }, [feeQ.data]);


  const setPlan = (kind: string, patch: Partial<PlanRow>) =>
    setPlans((p) => ({ ...p, [kind]: { ...p[kind], ...patch } as PlanRow }));

  const save = useMutation({
    mutationFn: async () => {
      const rows = Object.values(plans).map((p) => ({
        kind: p.kind,
        price: Number(p.price) || 0,
        duration_days: Math.max(1, Number(p.duration_days) || 30),
        vendor_allowed: p.vendor_allowed,
        note_ar: p.note_ar ?? "",
        note_ku: p.note_ku ?? "",
        sort_order: Number(p.sort_order) || 0,
      }));
      const up = await supabase.from("marketing_plans").upsert(rows, { onConflict: "kind" });
      if (up.error) throw up.error;

      for (const s of slots) {
        const { error } = await supabase
          .from("banner_slots")
          .update({
            price: Number(s.price) || 0,
            max_banners: Math.max(1, Number(s.max_banners) || 1),
            is_active: Boolean(s.is_active),
          })
          .eq("id", s.id);
        if (error) throw error;
      }

      const feeRows = PRODUCT_BADGES.map((b, i) => ({
        badge_key: b.key,
        is_paid: Boolean(fees[b.key]?.is_paid),
        price: Number(fees[b.key]?.price) || 0,
        sort_order: i + 1,
      }));
      const fUp = await (supabase as any)
        .from("badge_fees")
        .upsert(feeRows, { onConflict: "badge_key" });
      if (fUp.error) throw fUp.error;
    },
    onSuccess: () => {
      toast.success(L.saved[lang]);
      qc.invalidateQueries({ queryKey: ["admin-marketing-plans"] });
      qc.invalidateQueries({ queryKey: ["admin-marketing-slots"] });
      qc.invalidateQueries({ queryKey: ["admin-badge-fees"] });
      qc.invalidateQueries({ queryKey: ["badge-fees"] });
      qc.invalidateQueries({ queryKey: ["promo-plans"] });
      qc.invalidateQueries({ queryKey: ["promo-banner-slots"] });
      qc.invalidateQueries({ queryKey: ["marketing-rate-card"] });

    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="space-y-3">
      <AdminCard>
        <SectionHeader title={L.title[lang]} />
        <p className="text-[11px] leading-snug text-muted-foreground">{L.hint[lang]}</p>
      </AdminCard>

      {Object.entries(KINDS).map(([kind, meta]) => {
        const p = plans[kind];
        if (!p) return null;
        const Icon = meta.icon;
        return (
          <AdminCard key={kind}>
            <div className="flex items-start gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold leading-tight">{meta[lang]}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {lang === "ku" ? meta.hintKu : meta.hintAr}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  Number(p.price) > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {Number(p.price) > 0
                  ? `${formatPrice(Number(p.price), lang)} / ${p.duration_days} ${L.perDays[lang]}`
                  : L.free[lang]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TextField
                label={L.price[lang]}
                type="number"
                value={String(p.price ?? 0)}
                onChange={(v) => setPlan(kind, { price: Number(v) || 0 })}
              />
              <TextField
                label={L.days[lang]}
                type="number"
                value={String(p.duration_days ?? 30)}
                onChange={(v) => setPlan(kind, { duration_days: Number(v) || 0 })}
              />
            </div>
            <ToggleField
              label={L.allowed[lang]}
              checked={p.vendor_allowed}
              onChange={(v) => setPlan(kind, { vendor_allowed: v })}
            />
            <div className="grid grid-cols-1 gap-2">
              <TextField
                label={L.noteAr[lang]}
                value={p.note_ar ?? ""}
                onChange={(v) => setPlan(kind, { note_ar: v })}
              />
              <TextField
                label={L.noteKu[lang]}
                value={p.note_ku ?? ""}
                onChange={(v) => setPlan(kind, { note_ku: v })}
              />
            </div>
          </AdminCard>
        );
      })}

      <AdminCard>
        <SectionHeader title={L.badgeFees[lang]} />
        <p className="text-[11px] leading-snug text-muted-foreground">{L.badgeFeesHint[lang]}</p>
        <div className="space-y-2">
          {PRODUCT_BADGES.map((b) => {
            const f = fees[b.key] ?? { is_paid: false, price: 0 };
            const Icon = b.icon;
            const general = Number(plans["badge"]?.price ?? 0);
            const effective = !f.is_paid ? 0 : Number(f.price) > 0 ? Number(f.price) : general;
            return (
              <div key={b.key} className="space-y-2 rounded-xl border border-border/70 p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg"
                    style={{
                      backgroundColor: `oklch(from ${b.ink} 0.94 calc(c * 0.34) h)`,
                      color: `oklch(from ${b.ink} 0.42 calc(c * 0.95) h)`,
                    }}
                  >
                    <Icon className="size-4" strokeWidth={2.4} />
                  </span>
                  <p className="flex-1 truncate text-[12.5px] font-bold">{badgeLabel(b, lang)}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      effective > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {effective > 0 ? formatPrice(effective, lang) : L.free[lang]}
                  </span>
                </div>
                <ToggleField
                  label={L.paid[lang]}
                  checked={f.is_paid}
                  onChange={(v) =>
                    setFees((m) => ({ ...m, [b.key]: { ...f, is_paid: v } }))
                  }
                />
                {f.is_paid && (
                  <TextField
                    label={L.customPrice[lang]}
                    type="number"
                    value={String(f.price ?? 0)}
                    onChange={(v) =>
                      setFees((m) => ({ ...m, [b.key]: { ...f, price: Number(v) || 0 } }))
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </AdminCard>


      <AdminCard>
        <SectionHeader title={L.banners[lang]} />
        {slots.map((s, i) => (
          <div key={s.id} className="space-y-2 rounded-xl border border-border/70 p-2.5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="size-4" />
              </span>
              <p className="flex-1 text-[12.5px] font-bold">
                {lang === "ku" ? s.name_ku : s.name_ar}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label={L.slotPrice[lang]}
                type="number"
                value={String(s.price ?? 0)}
                onChange={(v) =>
                  setSlots((list) =>
                    list.map((x, ix) => (ix === i ? { ...x, price: Number(v) || 0 } : x)),
                  )
                }
              />
              <TextField
                label={L.slotMax[lang]}
                type="number"
                value={String(s.max_banners ?? 1)}
                onChange={(v) =>
                  setSlots((list) =>
                    list.map((x, ix) => (ix === i ? { ...x, max_banners: Number(v) || 1 } : x)),
                  )
                }
              />
            </div>
            <ToggleField
              label={L.active[lang]}
              checked={Boolean(s.is_active)}
              onChange={(v) =>
                setSlots((list) => list.map((x, ix) => (ix === i ? { ...x, is_active: v } : x)))
              }
            />
          </div>
        ))}
      </AdminCard>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="h-11 w-full gap-2 rounded-full text-[13px] font-extrabold"
      >
        <Save className="size-4" />
        {L.save[lang]}
      </Button>
    </div>
  );
}
