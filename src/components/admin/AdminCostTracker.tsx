import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, DollarSign, Save, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCard, SectionHeader, TextField } from "@/components/admin/AdminKit";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

/**
 * Running-cost tracker.
 *
 * Lovable bills in credits. We can't read the credit meter from inside the app,
 * so the admin stores the per-credit price + per-event credit assumptions once,
 * and this panel turns the store's real activity (orders, vendors, dentists)
 * into a monthly USD estimate, plus two forward-looking scenarios.
 */

const L = {
  title: { ar: "تكلفة تشغيل التطبيق", ku: "تێچووی کارپێکردنی ئەپ", en: "App running cost" },
  assumptions: { ar: "أسعار وافتراضات", ku: "نرخ و پێشبینی", en: "Prices & assumptions" },
  usdPerCredit: { ar: "سعر الكريدت (دولار)", ku: "نرخی کرێدت (دۆلار)", en: "USD per credit" },
  subscription: { ar: "الاشتراك الشهري (دولار)", ku: "بەشداری مانگانە (دۆلار)", en: "Monthly subscription (USD)" },
  fixed: { ar: "كريدت ثابت شهرياً", ku: "کرێدتی جێگیر مانگانە", en: "Fixed credits / month" },
  perOrder: { ar: "كريدت لكل طلب", ku: "کرێدت بۆ هەر داواکاری", en: "Credits per order" },
  perVendor: { ar: "كريدت لكل بائع", ku: "کرێدت بۆ هەر فرۆشیار", en: "Credits per vendor" },
  perDentist: { ar: "كريدت لكل طبيب نشط", ku: "کرێدت بۆ هەر پزیشک", en: "Credits per active dentist" },
  rate: { ar: "سعر الدولار (دينار)", ku: "نرخی دۆلار (دینار)", en: "USD → IQD rate" },
  save: { ar: "حفظ", ku: "پاشەکەوت", en: "Save" },
  live: { ar: "النشاط الحالي (هذا الشهر)", ku: "چالاکی ئێستا (ئەم مانگە)", en: "Live activity (this month)" },
  vendors: { ar: "بائعون", ku: "فرۆشیار", en: "Vendors" },
  dentists: { ar: "أطباء", ku: "پزیشک", en: "Dentists" },
  orders: { ar: "طلبات هذا الشهر", ku: "داواکاری ئەم مانگە", en: "Orders this month" },
  cost: { ar: "تكلفة هذا الشهر", ku: "تێچووی ئەم مانگە", en: "Cost this month" },
  income: { ar: "دخل المنصة (عمولة + تسويق)", ku: "داهاتی پلاتفۆرم", en: "Platform income (commission + marketing)" },
  profit: { ar: "الربح بعد التكلفة", ku: "قازانج دوای تێچوو", en: "Profit after cost" },
  perOrderCost: { ar: "تكلفة الطلب الواحد", ku: "تێچووی یەک داواکاری", en: "Cost per order" },
  scenarios: { ar: "تقديرات مستقبلية", ku: "خەملاندنی داهاتوو", en: "Forward estimates" },
  scenario: { ar: "الحالة", ku: "دۆخ", en: "Scenario" },
  credits: { ar: "كريدت", ku: "کرێدت", en: "Credits" },
  usd: { ar: "دولار/شهر", ku: "دۆلار/مانگ", en: "USD / month" },
  scHigh: { ar: "ذروة النشاط (100 بائع، 5000 طبيب)", ku: "چالاکی زۆر (١٠٠ فرۆشیار، ٥٠٠٠ پزیشک)", en: "High traffic (100 vendors, 5,000 dentists)" },
  sc5k: { ar: "5000 طلب شهرياً", ku: "٥٠٠٠ داواکاری مانگانە", en: "5,000 orders / month" },
  scNow: { ar: "وضعك الحالي", ku: "دۆخی ئێستا", en: "Your current level" },
  note: {
    ar: "هذه تكلفة تشغيل فقط (قاعدة البيانات + الطلبات + النقل). كريدت التطوير (بناء وتعديل التطبيق) منفصل ولا يتكرر مع كل طلب. حسابك يحتوي 20 كريدت شهرياً مجاناً للتشغيل + 4 للذكاء الاصطناعي.",
    ku: "ئەمە تەنها تێچووی کارپێکردنە (داتابەیس + داواکاری + گواستنەوە). کرێدتی دروستکردنی ئەپ جیاوازە و بە هەر داواکارییەک دووبارە نابێتەوە. ٢٠ کرێدت مانگانە بەخۆڕایی هەیە بۆ کارپێکردن.",
    en: "This is runtime cost only (database + requests + bandwidth). Build/plan credits used to develop the app are separate and are NOT charged per order. Your plan also includes 20 free Cloud credits + 4 AI credits every month.",
  },

};

type CostSettings = {
  cost_usd_per_credit: number;
  cost_subscription_usd: number;
  cost_fixed_credits: number;
  cost_credits_per_order: number;
  cost_credits_per_vendor: number;
  cost_credits_per_dentist: number;
  cost_usd_iqd_rate: number;
};

// Runtime-only defaults. Cloud (database/hosting) usage is metered in credits and
// the plan already includes 20 free Cloud credits per month, which covers a small
// store entirely. Per-order runtime cost is a few DB queries + a little bandwidth,
// i.e. fractions of a credit — NOT the build-mode credits spent developing the app.
const DEFAULTS: CostSettings = {
  cost_usd_per_credit: 0.25,
  cost_subscription_usd: 25,
  cost_fixed_credits: 20,
  cost_credits_per_order: 0.01,
  cost_credits_per_vendor: 0.05,
  cost_credits_per_dentist: 0.005,
  cost_usd_iqd_rate: 1320,
};


const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const usd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const int = (v: number) => Math.round(v).toLocaleString("en-US");

export function AdminCostTracker() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const month = new Date().toISOString().slice(0, 7);

  const { data: row } = useQuery({
    queryKey: ["cost-settings"],
    queryFn: async () =>
      (await supabase.from("store_settings").select("*").limit(1).maybeSingle()).data as
        | (Record<string, unknown> & { id: string })
        | null,
  });

  const [draft, setDraft] = useState<Partial<CostSettings>>({});
  const cfg: CostSettings = useMemo(() => {
    const base = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as (keyof CostSettings)[]) {
      base[k] = num(row?.[k], DEFAULTS[k]);
      if (draft[k] !== undefined) base[k] = num(draft[k], base[k]);
    }
    return base;
  }, [row, draft]);

  const save = useMutation({
    mutationFn: async () => {
      if (!row?.id) throw new Error("settings row missing");
      const { error } = await supabase
        .from("store_settings")
        .update(cfg as never)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.save[lang]);
      setDraft({});
      qc.invalidateQueries({ queryKey: ["cost-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-store-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: live } = useQuery({
    queryKey: ["cost-live", month],
    queryFn: async () => {
      const monthStart = `${month}-01T00:00:00Z`;
      const [vendors, profiles, staff, orders, items, charges] = await Promise.all([
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id").in("role", ["admin", "brand_manager"]),
        supabase.from("orders").select("id, total, status").gte("created_at", monthStart),
        supabase.from("order_items").select("order_id, commission_amount"),
        supabase.from("vendor_charges").select("amount, created_at").gte("created_at", monthStart),
      ]);
      const staffIds = new Set((staff.data ?? []).map((r) => r.user_id));
      const good = (orders.data ?? []).filter((o) => o.status !== "cancelled");
      const ids = new Set(good.map((o) => o.id));
      const commission = (items.data ?? [])
        .filter((i) => ids.has(i.order_id))
        .reduce((s, i) => s + num(i.commission_amount), 0);
      return {
        vendors: vendors.count ?? 0,
        dentists: Math.max(0, (profiles.count ?? 0) - staffIds.size),
        orders: good.length,
        sales: good.reduce((s, o) => s + num(o.total), 0),
        commission,
        marketing: (charges.data ?? []).reduce((s, c) => s + num(c.amount), 0),
      };
    },
  });

  const estimate = (orders: number, vendors: number, dentists: number) => {
    const credits =
      cfg.cost_fixed_credits +
      orders * cfg.cost_credits_per_order +
      vendors * cfg.cost_credits_per_vendor +
      dentists * cfg.cost_credits_per_dentist;
    return { credits, usd: cfg.cost_subscription_usd + credits * cfg.cost_usd_per_credit };
  };

  const now = estimate(live?.orders ?? 0, live?.vendors ?? 0, live?.dentists ?? 0);
  const high = estimate(2500, 100, 5000);
  const bulk = estimate(5000, 100, 5000);

  const incomeIqd = (live?.commission ?? 0) + (live?.marketing ?? 0);
  const incomeUsd = cfg.cost_usd_iqd_rate > 0 ? incomeIqd / cfg.cost_usd_iqd_rate : 0;
  const profitUsd = incomeUsd - now.usd;

  const numField = (key: keyof CostSettings, label: string) => (
    <TextField
      label={label}
      type="number"
      value={String(cfg[key])}
      onChange={(v) => setDraft((d) => ({ ...d, [key]: v === "" ? 0 : Number(v) }))}
    />
  );

  return (
    <div className="space-y-4">
      <AdminCard>
        <SectionHeader title={`${L.live[lang]} · ${month}`} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi icon={Activity} label={L.orders[lang]} value={int(live?.orders ?? 0)} />
          <Kpi icon={Activity} label={L.vendors[lang]} value={int(live?.vendors ?? 0)} />
          <Kpi icon={Activity} label={L.dentists[lang]} value={int(live?.dentists ?? 0)} />
          <Kpi icon={DollarSign} label={L.cost[lang]} value={usd(now.usd)} tone="rose" />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Kpi icon={TrendingUp} label={L.income[lang]} value={usd(incomeUsd)} tone="emerald" />
          <Kpi
            icon={TrendingUp}
            label={L.profit[lang]}
            value={usd(profitUsd)}
            tone={profitUsd >= 0 ? "emerald" : "rose"}
          />
          <Kpi
            icon={DollarSign}
            label={L.perOrderCost[lang]}
            value={live?.orders ? usd(now.usd / live.orders) : "—"}
          />
        </div>
      </AdminCard>

      <AdminCard>
        <SectionHeader title={L.scenarios[lang]} />
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="p-2 text-start font-medium">{L.scenario[lang]}</th>
                <th className="p-2 text-end font-medium">{L.credits[lang]}</th>
                <th className="p-2 text-end font-medium">{L.usd[lang]}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: L.scNow[lang], e: now },
                { label: L.scHigh[lang], e: high },
                { label: L.sc5k[lang], e: bulk },
              ].map((r) => (
                <tr key={r.label} className="border-t">
                  <td className="p-2">{r.label}</td>
                  <td className="p-2 text-end tabular-nums">{int(r.e.credits)}</td>
                  <td className="p-2 text-end font-semibold tabular-nums">{usd(r.e.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{L.note[lang]}</p>
      </AdminCard>

      <AdminCard>
        <SectionHeader
          title={L.assumptions[lang]}
          action={
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="me-1 h-4 w-4" />
              {L.save[lang]}
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {numField("cost_usd_per_credit", L.usdPerCredit[lang])}
          {numField("cost_subscription_usd", L.subscription[lang])}
          {numField("cost_fixed_credits", L.fixed[lang])}
          {numField("cost_credits_per_order", L.perOrder[lang])}
          {numField("cost_credits_per_vendor", L.perVendor[lang])}
          {numField("cost_credits_per_dentist", L.perDentist[lang])}
          {numField("cost_usd_iqd_rate", L.rate[lang])}
        </div>
      </AdminCard>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "rose";
}) {
  const tones = {
    slate: "bg-muted text-foreground",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  } as const;
  return (
    <div className={`rounded-xl p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1 text-[11px] opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
