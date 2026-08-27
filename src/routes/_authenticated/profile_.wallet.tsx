import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  Copy,
  Gift,
  Receipt,
  Snowflake,
  Sparkles,
  Ticket,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SubPage } from "@/components/profile/SubPage";
import { TxRow } from "@/components/wallet/TxRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, useI18n } from "@/lib/i18n";
import {
  COIN_WORD,
  coinsToMoney,
  formatCoins,
  formatPoints,
  REWARD_TITLE,
  rewardNote,
  ruleLabel,
  ruleMap,
  useRewardRules,
  useRewardSettings,
  useRewardSummary,
} from "@/lib/rewards";
import { useMyWallet, useMyWalletLedger } from "@/lib/wallet";

export const Route = createFileRoute("/_authenticated/profile_/wallet")({
  head: () => ({
    meta: [
      { title: "نقاط المكافأة | أوفر دنت" },
      {
        name: "description",
        content: "رصيد نقاط المكافأة، طرق ربح النقاط، تحدي الشهر، الدعوات وكشف الحركات.",
      },
      { property: "og:title", content: "نقاط المكافأة | أوفر دنت" },
      { property: "og:description", content: "اربح نقاط المكافأة واستبدلها بخصم على طلباتك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RewardsPage,
});

const L = {
  sub: { ar: "اربح نقاط واستبدلها بخصم على طلبك", ku: "خاڵ بەدەست بهێنە و بگۆڕە بە داشکاندن", en: "Earn points, use them as a discount",},
  balance: { ar: "نقاطك الآن", ku: "خاڵی ئێستات", en: "Your points",},
  worth: { ar: "تساوي", ku: "یەکسانە بە", en: "Worth",},
  useAtCheckout: { ar: "استخدمها في السلة كخصم على الطلب", ku: "لە سەبەتەدا وەک داشکاندن بەکاری بهێنە", en: "Use them in the cart as an order discount",},
  frozen: { ar: "النقاط موقوفة، راجع الإدارة", ku: "خاڵەکان بەستراون، پەیوەندی بکە", en: "Points frozen, contact support",},
  off: { ar: "نظام النقاط غير مفعّل حالياً", ku: "سیستەمی خاڵ چالاک نییە", en: "The reward points system is currently off",},
  simple: { ar: "بكل بساطة", ku: "بە سادەیی", en: "In short",},
  step1: { ar: "اشترِ منتجات", ku: "بەرهەم بکڕە", en: "Buy products",},
  step1h: { ar: "كل شراء يعطيك نقاط", ku: "هەموو کڕینێک خاڵ دەداتێ", en: "Every order gives you points",},
  step2: { ar: "اجمع النقاط", ku: "خاڵ کۆبکەرەوە", en: "Collect points",},
  step2h: { ar: "تقييمات، دعوات، ملف كامل", ku: "هەڵسەنگاندن، بانگهێشت، پرۆفایل", en: "Reviews, invites, full profile",},
  step3: { ar: "اخصم من طلبك", ku: "داشکاندن بکە", en: "Spend on an order",},
  step3h: { ar: "من السلة عند الدفع", ku: "لە سەبەتەدا", en: "At cart checkout",},
  earn: { ar: "طرق ربح النقاط", ku: "ڕێگەکانی بەدەستهێنانی خاڵ", en: "Ways to earn points",},
  challenge: { ar: "هدف هذا الشهر", ku: "ئامانجی ئەم مانگە", en: "This month's goal",},
  remaining: { ar: "باقي", ku: "ماوە", en: "Left",},
  done: { ar: "تم تحقيق الهدف 🎉", ku: "ئامانج پێکهات 🎉", en: "Goal reached 🎉",},
  streak: { ar: "شهر شراء متواصل", ku: "مانگ بەردەوام", en: "months in a row",},
  invite: { ar: "ادعُ زميلاً", ku: "هاوکارێک بانگهێشت بکە", en: "Invite a colleague",},
  inviteHint: { ar: "شارك كودك، وتحصل على نقاط بعد أول طلب لزميلك.", ku: "کۆدەکەت هاوبەش بکە و دوای یەکەم داواکاری خاڵ وەربگرە.", en: "Share your code and get points after their first order.",},
  myCode: { ar: "كودك", ku: "کۆدی تۆ", en: "Your code",},
  copied: { ar: "تم النسخ", ku: "کۆپی کرا", en: "Copied",},
  friendCode: { ar: "كود دعوة زميل", ku: "کۆدی بانگهێشت", en: "Friend's invite code",},
  useCode: { ar: "تطبيق", ku: "جێبەجێکردن", en: "Apply",},
  refs: { ar: "دعوات ناجحة", ku: "بانگهێشتی سەرکەوتوو", en: "Referrals",},
  clinic: { ar: "أكمل ملف العيادة", ku: "پرۆفایلی کلینیک تەواو بکە", en: "Complete your clinic profile",},
  claim: { ar: "استلم النقاط", ku: "خاڵ وەربگرە", en: "Claim points",},
  claimed: { ar: "تمت إضافة النقاط", ku: "خاڵ زیادکرا", en: "Points added",},
  nothing: { ar: "لا نقاط جديدة الآن", ku: "خاڵی نوێ نییە", en: "No new points right now",},
  editProfile: { ar: "تعديل الملف", ku: "دەستکاری پرۆفایل", en: "Edit profile",},
  card: { ar: "عندك كود كارت نقاط؟", ku: "کۆدی کارتی خاڵ هەیە؟", en: "Have a points card code?",},
  code: { ar: "أدخل كود الكارت", ku: "کۆدی کارت بنووسە", en: "Enter card code",},
  apply: { ar: "تفعيل", ku: "چالاککردن", en: "Activate",},
  cardOk: { ar: "تم إضافة النقاط", ku: "خاڵ زیادکرا", en: "Points added",},
  cardBad: { ar: "الكود غير صحيح أو مستخدم", ku: "کۆد هەڵەیە یان بەکارهێنراوە", en: "Invalid or used code",},
  codeOk: { ar: "تم ربط الدعوة", ku: "بانگهێشت بەستراوە", en: "Invite linked",},
  latest: { ar: "آخر الحركات", ku: "دوا جوڵەکان", en: "Recent activity",},
  statement: { ar: "كل الحركات", ku: "هەموو جوڵەکان", en: "See all activity",},
  empty: { ar: "لا حركات بعد", ku: "هێشتا جوڵە نییە", en: "No activity yet",},
  more: { ar: "المزيد", ku: "زیاتر", en: "More",},
};

const EARN_KEYS = [
  "purchase_per_1000_iqd",
  "first_order",
  "review",
  "review_photo",
  "referral_inviter",
  "challenge_bonus",
  "profile_complete",
  "streak_3",
  "streak_6",
  "streak_12",
] as const;

function RewardsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useRewardSettings();
  const on = settings?.rewards_enabled === true;
  const rate = Number(settings?.points_per_1000_iqd ?? 0);
  const { data: wallet } = useMyWallet(user?.id, on);
  const { data: ledger } = useMyWalletLedger(user?.id, on);
  const { data: summary } = useRewardSummary(user?.id, on);
  const { data: rules } = useRewardRules();
  const [card, setCard] = useState("");
  const [invite, setInvite] = useState("");

  const points = Number(summary?.balance ?? wallet?.balance ?? 0);
  const rmap = ruleMap(rules);

  const { data: profile } = useQuery({
    queryKey: ["reward-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("clinic_name, specialty, city, preferred_categories, referral_code")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-wallet"] });
    qc.invalidateQueries({ queryKey: ["my-wallet-ledger"] });
    qc.invalidateQueries({ queryKey: ["reward-summary"] });
    qc.invalidateQueries({ queryKey: ["reward-profile"] });
  };

  const redeemCard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("wallet_redeem_card", { _code: card });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L.cardOk[lang]);
      setCard("");
      refresh();
    },
    onError: () => toast.error(L.cardBad[lang]),
  });

  const useInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reward_use_referral", { _code: invite });
      if (error) throw error;
      if (data !== true) throw new Error("invalid");
    },
    onSuccess: () => {
      toast.success(L.codeOk[lang]);
      setInvite("");
      refresh();
    },
    onError: () => toast.error(L.cardBad[lang]),
  });

  const claimProfile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reward_claim_profile");
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: (got) => {
      if (got > 0) toast.success(`${L.claimed[lang]} +${formatCoins(got, lang)}`);
      else toast.info(L.nothing[lang]);
      refresh();
    },
    onError: () => toast.error(L.cardBad[lang]),
  });

  const note = rewardNote(settings, lang);
  const latest = (ledger?.rows ?? []).slice(0, 3);
  const target = Number(summary?.challenge_target ?? 0);
  const spent = Number(summary?.month_spend ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((spent / target) * 100)) : 0;
  const streak = Number(summary?.streak_months ?? 0);
  const refs = Number(summary?.referrals_done ?? 0);
  const myCode = summary?.referral_code || profile?.referral_code || "";
  const profileDone =
    !!profile?.clinic_name &&
    !!profile?.specialty &&
    !!profile?.city &&
    (profile?.preferred_categories?.length ?? 0) > 0;

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    toast.success(L.copied[lang]);
  };

  return (
    <SubPage title={REWARD_TITLE[lang]} subtitle={L.sub[lang]}>
      {!on ? (
        <p className="rounded-2xl border border-dashed border-border/70 bg-card p-5 text-center text-base text-muted-foreground">
          {L.off[lang]}
        </p>
      ) : (
        <>
          {/* Balance — one number, one meaning */}
          <div className="overflow-hidden rounded-3xl border border-border/60 shadow-card">
            <div className="bg-gradient-hero p-5 text-center text-primary-foreground">
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold opacity-90">
                <Sparkles className="size-4" />
                {L.balance[lang]}
              </p>
              <p className="mt-1 text-4xl font-extrabold leading-none" dir="ltr">
                {formatPoints(points, lang)}
              </p>
              <p className="mt-1 text-sm font-bold opacity-90">{COIN_WORD[lang]}</p>
              <p className="mx-auto mt-3 inline-flex rounded-full bg-background/20 px-3 py-1.5 text-sm font-extrabold">
                {L.worth[lang]} {formatPrice(coinsToMoney(points, rate), lang)}
              </p>
              {wallet?.frozen && (
                <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-background/20 px-2.5 py-1.5 text-sm font-bold">
                  <Snowflake className="size-4" />
                  {L.frozen[lang]}
                </p>
              )}
            </div>
            <p className="bg-card px-4 py-3 text-center text-sm font-bold text-muted-foreground">
              {L.useAtCheckout[lang]}
            </p>
          </div>

          {/* 3-step explainer */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <p className="text-sm font-extrabold">{L.simple[lang]}</p>
            <div className="mt-3 space-y-3">
              {[
                [L.step1[lang], L.step1h[lang]],
                [L.step2[lang], L.step2h[lang]],
                [L.step3[lang], L.step3h[lang]],
              ].map(([title, hint], i) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{title}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </div>
              ))}
            </div>
            {note ? (
              <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs leading-snug text-muted-foreground">
                {note}
              </p>
            ) : null}
          </div>

          {/* Month goal */}
          {target > 0 && (
            <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-extrabold">
                  <Trophy className="size-4 text-primary" />
                  {L.challenge[lang]}
                </p>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary" dir="ltr">
                  +{formatPoints(rmap.get("challenge_bonus") ?? 0, lang)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm font-bold">
                {pct >= 100
                  ? L.done[lang]
                  : `${L.remaining[lang]} ${formatPrice(Math.max(0, target - spent), lang)}`}
              </p>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label={L.streak[lang]} value={formatPoints(streak, lang)} />
            <Stat label={L.refs[lang]} value={formatPoints(refs, lang)} />
          </div>

          {/* Invite */}
          <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-sm font-extrabold">
              <UserPlus className="size-4 text-primary" />
              {L.invite[lang]}
            </p>
            <p className="text-xs leading-snug text-muted-foreground">{L.inviteHint[lang]}</p>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/60 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-[11px] text-muted-foreground">{L.myCode[lang]}</span>
                <span className="block truncate text-lg font-extrabold tracking-wide" dir="ltr">
                  {myCode || "—"}
                </span>
              </span>
              <Button
                variant="secondary"
                className="h-11 rounded-xl"
                disabled={!myCode}
                onClick={() => copy(myCode)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          {/* Profile completion */}
          {!profileDone && (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
              <p className="flex items-center gap-1.5 text-sm font-extrabold">
                <BadgeCheck className="size-4 text-primary" />
                {L.clinic[lang]}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary" dir="ltr">
                  +{formatPoints(rmap.get("profile_complete") ?? 0, lang)}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12 rounded-xl text-base"
                  disabled={claimProfile.isPending}
                  onClick={() => claimProfile.mutate()}
                >
                  <Gift className="size-4" />
                  {L.claim[lang]}
                </Button>
                <Button asChild variant="secondary" className="h-12 rounded-xl text-base">
                  <Link to="/profile/edit">{L.editProfile[lang]}</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Ways to earn — collapsed by default */}
          <details className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-sm font-extrabold">
              {L.earn[lang]}
              <ChevronDown className="size-4 text-muted-foreground" />
            </summary>
            <div className="divide-y divide-border/50 border-t border-border/50">
              {EARN_KEYS.filter((k) => (rmap.get(k) ?? 0) > 0).map((k) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 text-sm font-bold">{ruleLabel(k, lang)}</span>
                  <span
                    className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary"
                    dir="ltr"
                  >
                    +{formatPoints(rmap.get(k) ?? 0, lang)}
                  </span>
                </div>
              ))}
            </div>
          </details>

          {/* Codes — collapsed by default */}
          <details className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-sm font-extrabold">
              <span className="flex items-center gap-1.5">
                <Ticket className="size-4 text-primary" />
                {L.more[lang]}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </summary>
            <div className="space-y-4 border-t border-border/50 p-4">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground">{L.friendCode[lang]}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                  <Input
                    className="h-12 rounded-xl text-base tracking-wide"
                    dir="ltr"
                    placeholder={L.friendCode[lang]}
                    value={invite}
                    onChange={(e) => setInvite(e.target.value.toUpperCase())}
                  />
                  <Button
                    className="h-12 rounded-xl px-4 text-base"
                    disabled={useInvite.isPending || invite.trim().length < 4}
                    onClick={() => useInvite.mutate()}
                  >
                    {L.useCode[lang]}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground">{L.card[lang]}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                  <Input
                    className="h-12 rounded-xl text-base tracking-wide"
                    dir="ltr"
                    placeholder={L.code[lang]}
                    value={card}
                    onChange={(e) => setCard(e.target.value.toUpperCase())}
                  />
                  <Button
                    className="h-12 rounded-xl px-4 text-base"
                    disabled={redeemCard.isPending || card.trim().length < 6}
                    onClick={() => redeemCard.mutate()}
                  >
                    {L.apply[lang]}
                  </Button>
                </div>
              </div>
            </div>
          </details>

          {/* Activity */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
            <p className="bg-secondary/60 px-4 py-2 text-xs font-extrabold text-muted-foreground">
              {L.latest[lang]}
            </p>
            {latest.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{L.empty[lang]}</p>
            ) : (
              <div className="divide-y divide-border/50">
                {latest.map((t) => (
                  <TxRow key={t.id} tx={t} lang={lang} rate={rate} />
                ))}
              </div>
            )}
            <Link
              to="/profile/wallet/statement"
              className="flex items-center justify-between gap-2 border-t border-border/50 px-4 py-3.5 text-sm font-extrabold text-primary"
            >
              <span className="flex items-center gap-1.5">
                <Receipt className="size-4" />
                {L.statement[lang]}
              </span>
              <ChevronLeft className="size-5" />
            </Link>
          </div>
        </>
      )}
    </SubPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 text-center shadow-card">
      <p className="text-xl font-extrabold leading-tight" dir="ltr">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
