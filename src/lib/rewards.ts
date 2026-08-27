import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, type Lang } from "@/lib/i18n";

/** Reward points = the loyalty currency of OfferDent. */
export const COIN_WORD: Record<Lang, string> = {
  ar: "نقاط المكافأة",
  ku: "خاڵی خەڵات",
  en: "Reward Points",
};

export const REWARD_TITLE: Record<Lang, string> = {
  ar: "نقاط المكافأة",
  ku: "خاڵی خەڵات",
  en: "Reward Points",
};

const NUM: Record<Lang, string> = { ar: "ar-EG", ku: "ar-EG", en: "en-US" };

export function formatCoins(points: number, lang: Lang) {
  const n = Math.round(Number(points) || 0);
  return `${n.toLocaleString(NUM[lang])} ${COIN_WORD[lang]}`;
}

export function formatPoints(points: number, lang: Lang) {
  return Math.round(Number(points) || 0).toLocaleString(NUM[lang]);
}

/** Money value of coins: `points_per_1000_iqd` coins buy 1,000 IQD of value. */
export function coinsToMoney(points: number, rate: number) {
  if (!rate || rate <= 0) return 0;
  return Math.round((Number(points) || 0) / rate * 1000);
}

export function moneyToCoins(amount: number, rate: number) {
  if (!rate || rate <= 0) return 0;
  return Math.floor(((Number(amount) || 0) * rate) / 1000);
}

export function coinsValueLabel(points: number, rate: number, lang: Lang) {
  return formatPrice(coinsToMoney(points, rate), lang);
}

export type RewardSettings = {
  id: string;
  rewards_enabled: boolean;
  points_per_1000_iqd: number;
  rewards_max_redeem_percent: number;
  rewards_note_ar: string;
  rewards_note_ku: string;
  rewards_note_en: string;
};

export function useRewardSettings() {
  return useQuery({
    queryKey: ["reward-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select(
          "id, rewards_enabled, points_per_1000_iqd, rewards_max_redeem_percent, rewards_note_ar, rewards_note_ku, rewards_note_en",
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as RewardSettings | null;
    },
  });
}

export function rewardNote(s: RewardSettings | null | undefined, lang: Lang) {
  if (!s) return "";
  return lang === "ar" ? s.rewards_note_ar : lang === "ku" ? s.rewards_note_ku : s.rewards_note_en;
}

export type RewardRule = { id: string; key: string; points: number; is_active: boolean };

export function useRewardRules() {
  return useQuery({
    queryKey: ["reward-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_rules")
        .select("id, key, points, is_active")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as RewardRule[];
    },
  });
}

export const ruleMap = (rules: RewardRule[] | undefined) =>
  new Map((rules ?? []).map((r) => [r.key, r.is_active ? Number(r.points) : 0]));

export type RewardSummary = {
  balance: number;
  month_spend: number;
  challenge_target: number;
  challenge_bonus: number;
  streak_months: number;
  points_per_1000_iqd: number;
  referral_code: string;
  referrals_done: number;
};

export function useRewardSummary(userId?: string, enabled = true) {
  return useQuery({
    queryKey: ["reward-summary", userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reward_my_summary");
      if (error) throw error;
      return data as unknown as RewardSummary;
    },
  });
}

/** Admin-facing + customer-facing wording for every earn rule. */
export const RULE_LABELS: Record<string, { ar: string; ku: string; en: string }> = {
  purchase_per_1000_iqd: {
    ar: "نقاط لكل 1000 دينار شراء",
    ku: "خاڵ بۆ هەموو ١٠٠٠ دیناری کڕین",
    en: "Points per 1,000 IQD spent",
  },
  first_order: { ar: "مكافأة أول طلب", ku: "خەڵاتی یەکەم داواکاری", en: "First order bonus" },
  review: { ar: "تقييم منتج", ku: "هەڵسەنگاندنی بەرهەم", en: "Product review" },
  review_photo: { ar: "تقييم مع صورة", ku: "هەڵسەنگاندن بە وێنە", en: "Review with photo" },
  referral_inviter: { ar: "دعوة زميل (لك)", ku: "بانگهێشتی هاوکار (بۆ تۆ)", en: "Referral (inviter)" },
  referral_invitee: { ar: "دعوة زميل (للمدعو)", ku: "بانگهێشتی هاوکار (بۆ بانگهێشتکراو)", en: "Referral (invited)" },
  streak_3: { ar: "استمرارية 3 أشهر", ku: "بەردەوامی ٣ مانگ", en: "3-month streak" },
  streak_6: { ar: "استمرارية 6 أشهر", ku: "بەردەوامی ٦ مانگ", en: "6-month streak" },
  streak_12: { ar: "استمرارية 12 شهر", ku: "بەردەوامی ١٢ مانگ", en: "12-month streak" },
  challenge_target_iqd: {
    ar: "هدف تحدي الشهر (دينار)",
    ku: "ئامانجی مانگانە (دینار)",
    en: "Monthly challenge target (IQD)",
  },
  challenge_bonus: { ar: "مكافأة تحدي الشهر", ku: "خەڵاتی ئامانجی مانگانە", en: "Monthly challenge bonus" },
  profile_clinic_name: { ar: "إضافة اسم العيادة", ku: "ناوی کلینیک", en: "Clinic name" },
  profile_specialty: { ar: "إضافة التخصص", ku: "پسپۆری", en: "Specialty" },
  profile_city: { ar: "إضافة المدينة", ku: "شار", en: "City" },
  profile_categories: { ar: "الأقسام المفضلة", ku: "بەشەکانی دڵخواز", en: "Preferred categories" },
  profile_complete: { ar: "إكمال ملف العيادة", ku: "تەواوکردنی پرۆفایلی کلینیک", en: "Complete clinic profile" },
};

export const ruleLabel = (key: string, lang: Lang) =>
  (RULE_LABELS[key] ?? { ar: key, ku: key, en: key })[lang];

export const isMoneyRule = (key: string) => key === "challenge_target_iqd";
