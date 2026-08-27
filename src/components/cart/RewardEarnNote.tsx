import { useQuery } from "@tanstack/react-query";
import { Coins, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/cart";
import { formatPrice, useI18n } from "@/lib/i18n";
import {
  COIN_WORD,
  coinsToMoney,
  formatPoints,
  ruleMap,
  useRewardRules,
  useRewardSettings,
} from "@/lib/rewards";

const L = {
  title: { ar: "نقاط هذا الطلب", ku: "خاڵی ئەم داواکاری", en: "Points from this order" },
  youEarn: { ar: "ستحصل على", ku: "دەستت دەکەوێت", en: "You will earn" },
  worth: { ar: "قيمتها", ku: "بەهای", en: "worth" },
  after: {
    ar: "تُضاف نقاطك بعد تأكيد الطلب، واستخدمها كخصم في طلبك القادم.",
    ku: "خاڵەکانت دوای پەسەندکردنی داواکاری زیاد دەکرێن، لە داواکاری داهاتوو وەک داشکاندن بەکاریان بهێنە.",
    en: "Points are added once your order is confirmed — spend them as a discount next time.",
  },
  boost: { ar: "نقاط إضافية من الموردين", ku: "خاڵی زیادە لە فرۆشیارەکان", en: "Extra vendor points" },
  rate: { ar: "سعر التحويل", ku: "نرخی گۆڕین", en: "Conversion" },
  orderValue: { ar: "قيمة الطلب", ku: "بەهای داواکاری", en: "Order value" },
};

/**
 * Live estimate of the reward points a dentist earns for the current cart.
 * Mirrors reward_award_order: base on the order total + per-product vendor boosts.
 */
export function RewardEarnNote({
  items,
  orderTotal,
}: {
  items: CartItem[];
  orderTotal: number;
}) {
  const { lang } = useI18n();
  const { data: settings } = useRewardSettings();
  const { data: rules } = useRewardRules();

  const productIds = [...new Set(items.map((i) => i.id))].sort();

  const { data: boosts } = useQuery({
    queryKey: ["cart-reward-boosts", productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, reward_multiplier, reward_bonus_points")
        .in("id", productIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rate = Number(settings?.points_per_1000_iqd ?? 0);
  const perThousand = Number(ruleMap(rules).get("purchase_per_1000_iqd") ?? 0);
  if (settings?.rewards_enabled !== true || rate <= 0 || perThousand <= 0) return null;

  const base = Math.floor((Math.max(orderTotal, 0) / 1000) * perThousand);

  const byId = new Map(
    (boosts ?? []).map((p) => [
      p.id,
      {
        mult: Number(p.reward_multiplier ?? 1),
        bonus: Number(p.reward_bonus_points ?? 0),
      },
    ]),
  );
  const boost = items.reduce((sum, i) => {
    const b = byId.get(i.id);
    if (!b) return sum;
    const lineBase = Math.floor((Number(i.price) * i.quantity / 1000) * perThousand);
    return sum + Math.floor(lineBase * Math.max(b.mult - 1, 0) + b.bonus * i.quantity);
  }, 0);

  const points = base + boost;
  if (points <= 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-success/70 bg-success/[0.07] p-3">
      <div className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-success/15 blur-xl" />
      <div className="relative flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
          <Gift className="size-4" strokeWidth={2.4} />
        </span>
        <p className="min-w-0 flex-1 text-[13.5px] font-extrabold text-success">{L.title[lang]}</p>
      </div>

      <div className="relative mt-2.5 grid gap-1.5 rounded-lg bg-card/70 p-2.5 text-[11.5px] font-bold">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{L.orderValue[lang]}</span>
          <span className="text-foreground">{formatPrice(Math.max(orderTotal, 0), lang)}</span>
        </div>
        <div className="flex items-center justify-between gap-2" dir="ltr">
          <span className="text-muted-foreground">{L.rate[lang]}</span>
          <span className="text-foreground">
            {formatPrice(1000, lang)} = {formatPoints(perThousand, lang)} {COIN_WORD[lang]}
          </span>
        </div>
        {boost > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{L.boost[lang]}</span>
            <span className="text-success">
              +{formatPoints(boost, lang)} {COIN_WORD[lang]}
            </span>
          </div>
        )}
        <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-dashed border-success/40 pt-1.5">
          <span className="text-success">{L.youEarn[lang]}</span>
          <span className="text-end">
            <span className="flex items-center justify-end gap-1 font-extrabold text-success">
              <Coins className="size-3.5" />
              {formatPoints(points, lang)} {COIN_WORD[lang]}
            </span>
            <span className="block text-[11px] text-success">
              = {formatPrice(coinsToMoney(points, rate), lang)}
            </span>
          </span>
        </div>
      </div>

      <p className="relative mt-2 text-[10.5px] font-bold leading-relaxed text-muted-foreground">
        {L.after[lang]}
      </p>
    </div>
  );
}
