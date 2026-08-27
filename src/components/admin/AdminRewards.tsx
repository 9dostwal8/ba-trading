import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  CreditCard,
  History,
  Minus,
  Plus,
  Power,
  Snowflake,
  Store,
  Trash2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCard, Field, SectionHeader, TextField, ToggleField } from "./AdminKit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { generateCardCode, txLabel } from "@/lib/wallet";
import {
  coinsToMoney,
  formatCoins,
  formatPoints,
  isMoneyRule,
  moneyToCoins,
  ruleLabel,
  useRewardRules,
  useRewardSettings,
} from "@/lib/rewards";


const L = {
  title: { ar: "نقاط المكافأة", ku: "خاڵی خەڵات", en: "Reward Points",},
  system: { ar: "نظام النقاط", ku: "سیستەمی خاڵ", en: "Rewards system",},
  on: { ar: "تشغيل نقاط المكافأة", ku: "کارخستنی خاڵی خەڵات", en: "Enable reward points",},
  onHint: {
    ar: "عند الإيقاف تختفي النقاط من حسابات الأطباء ولا يمكن ربحها أو استبدالها.",
    ku: "کاتێک بکوژێنرێت، خاڵەکان لە هەژماری پزیشکەکان نامێنن.",
    en: "When disabled, points disappear from dentists' accounts and cannot be earned or redeemed.",
  },
  maxBal: { ar: "أعلى رصيد نقاط مسموح", ku: "زۆرترین خاڵی ڕێگەپێدراو", en: "Maximum points balance",},
  noteAr: { ar: "ملاحظة للعميل (عربي)", ku: "تێبینی بۆ کڕیار (عەرەبی)", en: "Note to customer (Arabic)",},
  noteKu: { ar: "ملاحظة للعميل (كردي)", ku: "تێبینی بۆ کڕیار (کوردی)", en: "Note to customer (Kurdish)",},
  noteEn: { ar: "ملاحظة للعميل (إنجليزي)", ku: "تێبینی بۆ کڕیار (ئینگلیزی)", en: "Note to customer (English)",},
  rate: { ar: "عدد النقاط مقابل 1000 دينار", ku: "ژمارەی خاڵ بۆ ١٠٠٠ دینار", en: "Points equal to 1,000 IQD",},
  rateHint: {
    ar: "مثال: 100 نقطة = 1000 دينار عند الاستبدال.",
    ku: "نموونە: ١٠٠ خاڵ = ١٠٠٠ دینار لە گۆڕین.",
    en: "Example: 100 points = 1,000 IQD when redeemed.",
  },
  maxPct: { ar: "أعلى نسبة من الطلب تُدفع بالنقاط %", ku: "زۆرترین ڕێژەی داواکاری بە خاڵ %", en: "Max % of an order payable with points",},
  tabRules: { ar: "قيم المكافآت", ku: "بەهای خەڵاتەکان", en: "Reward values",},
  rulesHint: {
    ar: "حدد نقاط كل إجراء. التغيير يطبق على كل الأطباء فوراً.",
    ku: "خاڵی هەر کردارێک دیاری بکە. گۆڕانکاری بۆ هەموو کەس جێبەجێ دەبێت.",
    en: "Set the points for every action. Changes apply to all dentists instantly.",
  },
  points: { ar: "النقاط", ku: "خاڵ", en: "Points",},
  iqd: { ar: "المبلغ (دينار)", ku: "بڕ (دینار)", en: "Amount (IQD)",},
  iqdValue: { ar: "قيمتها بالدينار", ku: "بەهای بە دینار", en: "Value in IQD",},

  activeRule: { ar: "مفعّل", ku: "چالاک", en: "Active",},
  save: { ar: "حفظ", ku: "پاشەکەوت", en: "Save",},

  tabWallets: { ar: "نقاط الأطباء", ku: "خاڵی پزیشکەکان", en: "Dentist points",},
  tabCards: { ar: "كروت النقاط", ku: "کارتی خاڵ", en: "Points cards",},
  tabHistory: { ar: "الحركات", ku: "جوڵەکان", en: "Transactions",},

  search: { ar: "بحث بالاسم أو الهاتف", ku: "گەڕان بە ناو یان مۆبایل", en: "Search by Name or Phone",},
  balance: { ar: "النقاط", ku: "خاڵ", en: "Points",},
  addBal: { ar: "إضافة نقاط", ku: "زیادکردنی خاڵ", en: "Add points",},
  subBal: { ar: "خصم نقاط", ku: "کەمکردنی خاڵ", en: "Deduct points",},
  amount: { ar: "عدد النقاط", ku: "ژمارەی خاڵ", en: "Number of points",},
  note: { ar: "سبب / ملاحظة", ku: "هۆکار / تێبینی", en: "Reason / Note",},
  freeze: { ar: "تجميد", ku: "بەستن", en: "Freeze",},
  frozen: { ar: "مجمدة", ku: "بەستراو", en: "Frozen",},
  totalBal: { ar: "مجموع النقاط", ku: "کۆی خاڵەکان", en: "Total points",},
  walletsCount: { ar: "عدد الحسابات", ku: "ژمارەی هەژمار", en: "Accounts with points",},

  gen: { ar: "توليد كروت", ku: "دروستکردنی کارت", en: "Generate Cards",},
  count: { ar: "عدد الكروت", ku: "ژمارەی کارت", en: "Number of Cards",},
  cardValue: { ar: "نقاط الكارت", ku: "خاڵی کارت", en: "Card points",},
  prefix: { ar: "بادئة الكود", ku: "پێشگری کۆد", en: "Code Prefix",},
  batch: { ar: "اسم المجموعة", ku: "ناوی گرووپ", en: "Group Name",},
  expiry: { ar: "تاريخ الانتهاء", ku: "بەرواری بەسەرچوون", en: "Expiry Date",},
  maxUses: { ar: "عدد مرات الاستخدام", ku: "چەند جار بەکاربێت", en: "Usage Limit",},
  create: { ar: "توليد", ku: "دروستکردن", en: "Generate",},
  copied: { ar: "تم النسخ", ku: "کۆپی کرا", en: "Copied",},
  copyAll: { ar: "نسخ كل الأكواد", ku: "کۆپی هەموو کۆدەکان", en: "Copy All Codes",},
  used: { ar: "مستخدم", ku: "بەکارهێنراو", en: "Used",},
  active: { ar: "نشط", ku: "چالاک", en: "Active",},
  cardsValue: { ar: "نقاط الكروت غير المستخدمة", ku: "خاڵی کارتی بەکارنەهێنراو", en: "Points in unused cards",},
  noData: { ar: "لا يوجد شيء بعد", ku: "هێشتا هیچ نییە", en: "Nothing here yet",},

  vendorSec: { ar: "رعاية الموردين للنقاط", ku: "سپۆنسەری خاڵ لەلایەن فرۆشیار", en: "Vendor point sponsorship",},
  vendorOn: { ar: "السماح للموردين بمنح نقاط إضافية", ku: "ڕێگەدان بە فرۆشیار بۆ خاڵی زیادە", en: "Let vendors grant extra points",},
  vendorOnHint: {
    ar: "المورد يزيد نقاط الطبيب على منتجاته وعروضه، وتُحسب التكلفة على فاتورته الشهرية.",
    ku: "فرۆشیار خاڵی زیاتر دەدات لەسەر بەرهەم و ئۆفەرەکانی، تێچووی لە پسوولەی مانگانەی دادەنرێت.",
    en: "A vendor boosts points on their products and offers; the cost lands on their monthly invoice.",
  },
  vMaxMult: { ar: "أعلى مضاعف للمورد", ku: "زۆرترین چەندبارەکەر", en: "Max vendor multiplier",},
  vMaxBonus: { ar: "أعلى نقاط إضافية للقطعة", ku: "زۆرترین خاڵی زیادە بۆ دانە", en: "Max bonus points per unit",},
  vCostFactor: { ar: "معامل التكلفة على المورد", ku: "فاکتەری تێچوو بۆ فرۆشیار", en: "Vendor cost factor",},
  vCostHint: {
    ar: "1 = المورد يدفع القيمة الكاملة للنقاط. 0.5 = يدفع نصفها.",
    ku: "١ = فرۆشیار بەهای تەواو دەدات. ٠.٥ = نیوەی دەدات.",
    en: "1 = vendor pays the full point value. 0.5 = pays half.",
  },
  tabVendors: { ar: "نقاط الموردين", ku: "خاڵی فرۆشیارەکان", en: "Vendor points",},
  vendorPoints: { ar: "نقاط برعاية المورد", ku: "خاڵی سپۆنسەرکراو", en: "Sponsored points",},
  vendorCost: { ar: "تكلفة المورد", ku: "تێچووی فرۆشیار", en: "Vendor cost",},
};

type Tab = "rules" | "vendors" | "wallets" | "cards" | "history";

export function AdminRewards() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("rules");

  return (
    <div className="space-y-3">
      <SectionHeader title={L.title[lang]} />
      <WalletSwitch />

      <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-secondary/60 p-1">
        {(
          [
            ["rules", L.tabRules[lang], Sparkles],
            ["vendors", L.tabVendors[lang], Store],
            ["wallets", L.tabWallets[lang], Users],
            ["cards", L.tabCards[lang], CreditCard],
            ["history", L.tabHistory[lang], History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold transition ${
              tab === key ? "bg-card text-primary shadow-card" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "rules" && <RulesTab />}
      {tab === "vendors" && <VendorPointsTab />}
      {tab === "wallets" && <WalletsTab onChanged={() => qc.invalidateQueries()} />}
      {tab === "cards" && <CardsTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

/* ---------- system switch ---------- */

function WalletSwitch() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<null | {
    rewards_enabled: boolean;
    points_per_1000_iqd: string;
    rewards_max_redeem_percent: string;
    wallet_max_balance: string;
    rewards_note_ar: string;
    rewards_note_ku: string;
    rewards_note_en: string;
    reward_vendor_enabled: boolean;
    reward_vendor_max_multiplier: string;
    reward_vendor_max_bonus: string;
    reward_vendor_cost_factor: string;
  }>(null);

  const { data: settings } = useQuery({
    queryKey: ["admin-wallet-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form =
    draft ??
    {
      rewards_enabled: settings?.rewards_enabled ?? false,
      points_per_1000_iqd: String(settings?.points_per_1000_iqd ?? 100),
      rewards_max_redeem_percent: String(settings?.rewards_max_redeem_percent ?? 50),
      wallet_max_balance: String(settings?.wallet_max_balance ?? 0),
      rewards_note_ar: settings?.rewards_note_ar ?? "",
      rewards_note_ku: settings?.rewards_note_ku ?? "",
      rewards_note_en: settings?.rewards_note_en ?? "",
      reward_vendor_enabled: settings?.reward_vendor_enabled ?? false,
      reward_vendor_max_multiplier: String(settings?.reward_vendor_max_multiplier ?? 5),
      reward_vendor_max_bonus: String(settings?.reward_vendor_max_bonus ?? 2000),
      reward_vendor_cost_factor: String(settings?.reward_vendor_cost_factor ?? 1),
    };

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("settings missing");
      const { error } = await supabase
        .from("store_settings")
        .update({
          rewards_enabled: form.rewards_enabled,
          wallet_enabled: form.rewards_enabled,
          points_per_1000_iqd: Number(form.points_per_1000_iqd) || 0,
          rewards_max_redeem_percent: Math.min(
            100,
            Math.max(0, Number(form.rewards_max_redeem_percent) || 0),
          ),
          wallet_max_balance: Number(form.wallet_max_balance) || 0,
          rewards_note_ar: form.rewards_note_ar,
          rewards_note_ku: form.rewards_note_ku,
          rewards_note_en: form.rewards_note_en,
          reward_vendor_enabled: form.reward_vendor_enabled,
          reward_vendor_max_multiplier: Math.max(1, Number(form.reward_vendor_max_multiplier) || 1),
          reward_vendor_max_bonus: Math.max(0, Number(form.reward_vendor_max_bonus) || 0),
          reward_vendor_cost_factor: Math.max(0, Number(form.reward_vendor_cost_factor) || 0),
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.save[lang]);
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-wallet-settings"] });
      qc.invalidateQueries({ queryKey: ["wallet-settings"] });
      qc.invalidateQueries({ queryKey: ["reward-settings"] });
      qc.invalidateQueries({ queryKey: ["reward-sponsor-settings"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "error"),
  });

  return (
    <AdminCard>
      <div className="flex items-center gap-2 text-sm font-extrabold">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Power className="size-4" />
        </span>
        {L.system[lang]}
      </div>
      <ToggleField
        label={L.on[lang]}
        checked={form.rewards_enabled}
        onChange={(v) => setDraft({ ...form, rewards_enabled: v })}
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">{L.onHint[lang]}</p>
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label={L.rate[lang]}
          type="number"
          value={form.points_per_1000_iqd}
          onChange={(v) => setDraft({ ...form, points_per_1000_iqd: v })}
        />
        <TextField
          label={L.maxPct[lang]}
          type="number"
          value={form.rewards_max_redeem_percent}
          onChange={(v) => setDraft({ ...form, rewards_max_redeem_percent: v })}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{L.rateHint[lang]}</p>
      <div className="grid grid-cols-1 gap-2">
        <TextField
          label={L.maxBal[lang]}
          type="number"
          value={form.wallet_max_balance}
          onChange={(v) => setDraft({ ...form, wallet_max_balance: v })}
        />
        <TextField
          label={L.noteAr[lang]}
          value={form.rewards_note_ar}
          onChange={(v) => setDraft({ ...form, rewards_note_ar: v })}
        />
        <TextField
          label={L.noteKu[lang]}
          value={form.rewards_note_ku}
          onChange={(v) => setDraft({ ...form, rewards_note_ku: v })}
        />
        <TextField
          label={L.noteEn[lang]}
          value={form.rewards_note_en}
          onChange={(v) => setDraft({ ...form, rewards_note_en: v })}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-primary">
          <Store className="size-4" />
          {L.vendorSec[lang]}
        </div>
        <ToggleField
          label={L.vendorOn[lang]}
          checked={form.reward_vendor_enabled}
          onChange={(v) => setDraft({ ...form, reward_vendor_enabled: v })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{L.vendorOnHint[lang]}</p>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label={L.vMaxMult[lang]}
            type="number"
            value={form.reward_vendor_max_multiplier}
            onChange={(v) => setDraft({ ...form, reward_vendor_max_multiplier: v })}
          />
          <TextField
            label={L.vMaxBonus[lang]}
            type="number"
            value={form.reward_vendor_max_bonus}
            onChange={(v) => setDraft({ ...form, reward_vendor_max_bonus: v })}
          />
        </div>
        <TextField
          label={L.vCostFactor[lang]}
          type="number"
          value={form.reward_vendor_cost_factor}
          onChange={(v) => setDraft({ ...form, reward_vendor_cost_factor: v })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{L.vCostHint[lang]}</p>
      </div>

      <Button className="h-10 w-full rounded-xl" disabled={save.isPending} onClick={() => save.mutate()}>
        {L.save[lang]}
      </Button>
    </AdminCard>
  );
}

/* ---------- vendor sponsored points ---------- */

function VendorPointsTab() {
  const { lang } = useI18n();

  const { data } = useQuery({
    queryKey: ["admin-vendor-reward-points"],
    queryFn: async () => {
      const [rows, vendors] = await Promise.all([
        supabase.from("vendor_reward_points").select("vendor_id, points, cost"),
        supabase.from("vendors").select("id, name"),
      ]);
      if (rows.error) throw rows.error;
      if (vendors.error) throw vendors.error;
      const agg = new Map<string, { points: number; cost: number }>();
      for (const r of rows.data ?? []) {
        const cur = agg.get(r.vendor_id) ?? { points: 0, cost: 0 };
        cur.points += Number(r.points ?? 0);
        cur.cost += Number(r.cost ?? 0);
        agg.set(r.vendor_id, cur);
      }
      return (vendors.data ?? [])
        .map((v) => ({ id: v.id, name: v.name, ...(agg.get(v.id) ?? { points: 0, cost: 0 }) }))
        .sort((a, b) => b.points - a.points);
    },
  });

  const list = data ?? [];

  return (
    <div className="space-y-1.5">
      {list.map((v) => (
        <AdminCard key={v.id}>
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-4" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold">{v.name}</p>
            <div className="text-end">
              <p className="text-[12.5px] font-extrabold text-primary">
                {formatPoints(v.points, lang)}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground">
                {L.vendorCost[lang]}: {formatPrice(v.cost, lang)}
              </p>
            </div>
          </div>
        </AdminCard>
      ))}
      {!list.length && (
        <AdminCard>
          <p className="py-4 text-center text-xs text-muted-foreground">{L.noData[lang]}</p>
        </AdminCard>
      )}
    </div>
  );
}

/* ---------- customer wallets ---------- */

function WalletsTab({ onChanged }: { onChanged: () => void }) {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const [profiles, wallets] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone"),
        supabase.from("wallets").select("*"),
      ]);
      if (profiles.error) throw profiles.error;
      if (wallets.error) throw wallets.error;
      const byUser = new Map((wallets.data ?? []).map((w) => [w.user_id, w]));
      return (profiles.data ?? []).map((p) => ({
        ...p,
        balance: Number(byUser.get(p.id)?.balance ?? 0),
        frozen: byUser.get(p.id)?.is_frozen ?? false,
        hasWallet: byUser.has(p.id),
      }));
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = data ?? [];
    const filtered = needle
      ? all.filter(
          (r) =>
            (r.full_name ?? "").toLowerCase().includes(needle) ||
            (r.phone ?? "").includes(needle),
        )
      : all;
    return [...filtered].sort((a, b) => b.balance - a.balance);
  }, [data, q]);

  const adjust = useMutation({
    mutationFn: async ({ userId, value }: { userId: string; value: number }) => {
      const { error } = await supabase.rpc("wallet_admin_adjust", {
        _user_id: userId,
        _amount: value,
        _note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.save[lang]);
      setAmount("");
      setNote("");
      setOpenId(null);
      qc.invalidateQueries({ queryKey: ["admin-wallets"] });
      qc.invalidateQueries({ queryKey: ["admin-wallet-tx"] });
      onChanged();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "error"),
  });

  const freeze = useMutation({
    mutationFn: async ({ userId, frozen }: { userId: string; frozen: boolean }) => {
      const { error } = await supabase
        .from("wallets")
        .upsert({ user_id: userId, is_frozen: frozen }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-wallets"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "error"),
  });

  const total = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Stat label={L.totalBal[lang]} value={formatPoints(total, lang)} />
        <Stat label={L.walletsCount[lang]} value={String(rows.filter((r) => r.hasWallet).length)} />
      </div>

      <Input
        className="h-10 rounded-xl"
        placeholder={L.search[lang]}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {rows.length === 0 && <Empty />}

      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-3 shadow-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold">{r.full_name || "—"}</p>
              <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
                {r.phone || "—"}
              </p>
            </div>
            <div className="text-end">
              <p className="text-[10px] text-muted-foreground">{L.balance[lang]}</p>
              <p className="text-[13px] font-extrabold text-primary">
                {formatPoints(r.balance, lang)}
              </p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              className="h-8 rounded-xl text-[11px]"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
            >
              <Plus className="size-3.5" />
              {L.addBal[lang]}
            </Button>
            <Button
              size="sm"
              variant={r.frozen ? "default" : "secondary"}
              className="h-8 rounded-xl text-[11px]"
              onClick={() => freeze.mutate({ userId: r.id, frozen: !r.frozen })}
            >
              <Snowflake className="size-3.5" />
              {r.frozen ? L.frozen[lang] : L.freeze[lang]}
            </Button>
          </div>

          {openId === r.id && (
            <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-secondary/40 p-2.5">
              <Field label={L.amount[lang]}>
                <Input
                  className="h-9"
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label={L.note[lang]}>
                <Input className="h-9" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="h-9 rounded-xl text-[11px]"
                  disabled={adjust.isPending || !Number(amount)}
                  onClick={() => adjust.mutate({ userId: r.id, value: Math.abs(Number(amount)) })}
                >
                  <Plus className="size-3.5" />
                  {L.addBal[lang]}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 rounded-xl text-[11px]"
                  disabled={adjust.isPending || !Number(amount)}
                  onClick={() => adjust.mutate({ userId: r.id, value: -Math.abs(Number(amount)) })}
                >
                  <Minus className="size-3.5" />
                  {L.subBal[lang]}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- balance cards ---------- */

const emptyCard = {
  count: "10",
  amount: "25000",
  prefix: "DENT",
  batch: "",
  expires_at: "",
  max_uses: "1",
};

function CardsTab() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(emptyCard);

  const { data: cards } = useQuery({
    queryKey: ["admin-wallet-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_cards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const count = Math.min(Math.max(Number(draft.count) || 1, 1), 200);
      const amount = Number(draft.amount) || 0;
      if (amount <= 0) throw new Error(L.cardValue[lang]);
      const rows = Array.from({ length: count }, () => ({
        code: generateCardCode(draft.prefix || "DENT"),
        amount,
        batch: draft.batch.trim(),
        max_uses: Math.max(Number(draft.max_uses) || 1, 1),
        expires_at: draft.expires_at ? new Date(draft.expires_at).toISOString() : null,
      }));
      const { error } = await supabase.from("wallet_cards").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.create[lang]);
      qc.invalidateQueries({ queryKey: ["admin-wallet-cards"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "error"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("wallet_cards").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-wallet-cards"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wallet_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-wallet-cards"] }),
  });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(L.copied[lang]);
  };

  const unusedValue = (cards ?? [])
    .filter((c) => c.is_active && c.used_count < c.max_uses)
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-2.5">
      <AdminCard>
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="size-4" />
          </span>
          {L.gen[lang]}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TextField label={L.count[lang]} type="number" value={draft.count} onChange={(v) => setDraft({ ...draft, count: v })} />
          <TextField label={L.cardValue[lang]} type="number" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} />
          <TextField label={L.prefix[lang]} value={draft.prefix} onChange={(v) => setDraft({ ...draft, prefix: v })} />
          <TextField label={L.batch[lang]} value={draft.batch} onChange={(v) => setDraft({ ...draft, batch: v })} />
          <TextField label={L.expiry[lang]} type="date" value={draft.expires_at} onChange={(v) => setDraft({ ...draft, expires_at: v })} />
          <TextField label={L.maxUses[lang]} type="number" value={draft.max_uses} onChange={(v) => setDraft({ ...draft, max_uses: v })} />
        </div>
        <Button className="h-10 w-full rounded-xl" disabled={create.isPending} onClick={() => create.mutate()}>
          <Plus className="size-4" />
          {L.create[lang]}
        </Button>
      </AdminCard>

      <div className="grid grid-cols-2 gap-2">
        <Stat label={L.cardsValue[lang]} value={formatPoints(unusedValue, lang)} />
        <Stat label={L.tabCards[lang]} value={String(cards?.length ?? 0)} />
      </div>

      {(cards?.length ?? 0) > 0 && (
        <Button
          variant="secondary"
          className="h-9 w-full rounded-xl text-[11px]"
          onClick={() => copy((cards ?? []).map((c) => c.code).join("\n"))}
        >
          <Copy className="size-3.5" />
          {L.copyAll[lang]}
        </Button>
      )}

      {(cards?.length ?? 0) === 0 && <Empty />}

      {(cards ?? []).map((c) => {
        const spent = c.used_count >= c.max_uses;
        return (
          <div
            key={c.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-card"
          >
            <div className="min-w-0">
              <button
                onClick={() => copy(c.code)}
                className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-wide"
                dir="ltr"
              >
                {c.code}
                <Copy className="size-3.5 text-muted-foreground" />
              </button>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {formatPoints(Number(c.amount), lang)}
                {c.batch ? ` · ${c.batch}` : ""} · {L.used[lang]} {c.used_count}/{c.max_uses}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={c.is_active && !spent ? "default" : "secondary"}
                className="h-8 rounded-xl text-[10px]"
                onClick={() => toggle.mutate({ id: c.id, is_active: !c.is_active })}
              >
                {c.is_active ? L.active[lang] : L.freeze[lang]}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive"
                onClick={() => remove.mutate(c.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- history ---------- */

function HistoryTab() {
  const { lang } = useI18n();
  const { data } = useQuery({
    queryKey: ["admin-wallet-tx"],
    queryFn: async () => {
      const [txs, profiles] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (txs.error) throw txs.error;
      const names = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name]));
      return (txs.data ?? []).map((t) => ({ ...t, name: names.get(t.user_id) ?? "—" }));
    },
  });

  if ((data?.length ?? 0) === 0) return <Empty />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <div className="divide-y divide-border/50">
        {(data ?? []).map((t) => {
          const positive = Number(t.amount) >= 0;
          return (
            <div
              key={t.id}
              className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2"
            >
              <Wallet className={`size-4 ${positive ? "text-primary" : "text-destructive"}`} />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-bold leading-tight">
                  {t.name}
                  <span className="font-normal text-muted-foreground">
                    {" · "}
                    {txLabel(t.kind, lang)}
                    {t.note ? ` · ${t.note}` : ""}
                  </span>
                </p>
                <p className="text-[9px] leading-tight text-muted-foreground" dir="ltr">
                  {new Date(t.created_at).toLocaleString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-end" dir="ltr">
                <p
                  className={`text-[11.5px] font-extrabold leading-tight ${
                    positive ? "text-primary" : "text-destructive"
                  }`}
                >
                  {positive ? "+" : "−"}
                  {formatPoints(Math.abs(Number(t.amount)), lang)}
                </p>
                <p className="text-[9px] leading-tight text-muted-foreground">
                  {formatPoints(Number(t.balance_after ?? 0), lang)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- reward values ---------- */

function RulesTab() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const { data: rules } = useRewardRules();
  const { data: settings } = useRewardSettings();
  const rate = Number(settings?.points_per_1000_iqd ?? 0);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: async ({ id, points }: { id: string; points: number }) => {
      const { error } = await supabase.from("reward_rules").update({ points }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.save[lang]);
      qc.invalidateQueries({ queryKey: ["reward-rules"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "error"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("reward_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reward-rules"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "error"),
  });

  return (
    <div className="space-y-2.5">
      <p className="rounded-2xl border border-border/60 bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
        {L.rulesHint[lang]}
        {rate > 0 ? ` · ${formatPoints(rate, lang)} = ${formatPrice(1000, lang)}` : ""}
      </p>
      {(rules ?? []).map((r) => {
        const value = draft[r.id] ?? String(r.points);
        const points = Number(value) || 0;
        const dirty = points !== Number(r.points);
        const money = isMoneyRule(r.key) ? points : coinsToMoney(points, rate);
        return (
          <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-3 shadow-card">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <p className="min-w-0 truncate text-[12.5px] font-extrabold">{ruleLabel(r.key, lang)}</p>
              <Button
                size="sm"
                variant={r.is_active ? "default" : "secondary"}
                className="h-8 rounded-xl text-[10px]"
                onClick={() => toggle.mutate({ id: r.id, is_active: !r.is_active })}
              >
                {r.is_active ? L.activeRule[lang] : L.freeze[lang]}
              </Button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Field label={isMoneyRule(r.key) ? L.iqd[lang] : L.points[lang]}>
                <Input
                  className="h-9"
                  type="number"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })}
                />
              </Field>
              {!isMoneyRule(r.key) && (
                <Field label={L.iqdValue[lang]}>
                  <Input
                    className="h-9"
                    type="number"
                    inputMode="numeric"
                    disabled={rate <= 0}
                    value={String(money)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [r.id]: String(moneyToCoins(Number(e.target.value) || 0, rate)),
                      })
                    }
                  />
                </Field>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground" dir="ltr">
                {isMoneyRule(r.key)
                  ? formatPrice(points, lang)
                  : `${formatCoins(points, lang)} = ${formatPrice(money, lang)}`}
              </p>
              <Button
                size="sm"
                className="h-9 rounded-xl text-[11px]"
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate({ id: r.id, points })}
              >
                {L.save[lang]}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-card">
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-[14px] font-extrabold text-primary">{value}</p>
    </div>
  );
}

function Empty() {
  const { lang } = useI18n();
  return (
    <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-[11px] text-muted-foreground">
      {L.noData[lang]}
    </p>
  );
}
