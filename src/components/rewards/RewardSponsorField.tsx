import { useQuery } from "@tanstack/react-query";
import { Coins, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n, type TKey } from "@/lib/i18n";

/** Vendor-sponsorship settings: caps + the IQD cost the vendor pays per point. */
export type RewardSponsorSettings = {
  reward_vendor_enabled: boolean;
  reward_vendor_max_multiplier: number;
  reward_vendor_max_bonus: number;
  reward_vendor_cost_factor: number;
  points_per_1000_iqd: number;
  rewards_enabled: boolean;
};

export function useRewardSponsorSettings() {
  return useQuery({
    queryKey: ["reward-sponsor-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select(
          "rewards_enabled, reward_vendor_enabled, reward_vendor_max_multiplier, reward_vendor_max_bonus, reward_vendor_cost_factor, points_per_1000_iqd",
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as RewardSponsorSettings | null;
    },
  });
}

/** IQD the vendor is billed for sponsoring `points` reward points. */
export function sponsorCost(points: number, s: RewardSponsorSettings | null | undefined) {
  const rate = Math.max(Number(s?.points_per_1000_iqd ?? 100), 1);
  const factor = Number(s?.reward_vendor_cost_factor ?? 1);
  return Math.round(((Number(points) || 0) / rate) * 1000 * factor);
}

/**
 * Reusable editor for vendor-funded reward points on a product or an offer.
 * Values are also clamped server-side to the admin caps.
 */
export function RewardSponsorField({
  multiplier,
  bonus,
  onChange,
}: {
  multiplier: string;
  bonus: string;
  onChange: (patch: { multiplier?: string; bonus?: string }) => void;
}) {
  const { t, lang } = useI18n();
  const { data: s } = useRewardSponsorSettings();

  const fill = (key: TKey, vars: Record<string, string | number>) => {
    let str = t(key);
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
    return str;
  };

  if (s && (!s.rewards_enabled || !s.reward_vendor_enabled)) {
    return (
      <p className="rounded-xl bg-muted px-2.5 py-2 text-[11px] font-bold text-muted-foreground">
        {t("rewardSponsorOff")}
      </p>
    );
  }

  const unitBonus = Math.max(0, Number(bonus) || 0);
  const mult = Math.max(1, Number(multiplier) || 1);
  const rate = Math.max(Number(s?.points_per_1000_iqd ?? 100), 1);
  const costPerBonus = sponsorCost(unitBonus, s);
  const costPerRate = sponsorCost(rate, s);

  return (
    <div className="space-y-2 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-2.5">
      <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-emerald-700">
        <Coins className="size-4" />
        {t("rewardSponsorTitle")}
      </div>

      <p className="text-[10.5px] leading-snug text-emerald-800/80">
        {t("rewardSponsorHint")}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10.5px] text-muted-foreground">
            {t("rewardSponsorMultiplier")} · {t("rewardSponsorMax")} {s?.reward_vendor_max_multiplier ?? 5}
          </Label>
          <Input
            className="h-9"
            type="number"
            min={1}
            step="0.1"
            inputMode="decimal"
            value={multiplier}
            onChange={(e) => onChange({ multiplier: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10.5px] text-muted-foreground">
            {t("rewardSponsorBonus")} · {t("rewardSponsorMax")} {s?.reward_vendor_max_bonus ?? 2000}
          </Label>
          <Input
            className="h-9"
            type="number"
            min={0}
            inputMode="numeric"
            value={bonus}
            onChange={(e) => onChange({ bonus: e.target.value })}
          />
        </div>
      </div>

      {/* Green dotted framed explanation box */}
      <div className="space-y-1.5 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-50/60 p-2.5">
        <p className="text-[11px] font-extrabold text-emerald-800">
          {t("rewardSponsorTotalPoints")}
        </p>
        <p className="text-[10.5px] leading-snug text-emerald-800/80">
          {fill("rewardSponsorExample", { mult, bonus: unitBonus })}
        </p>
        <p className="text-[10px] leading-snug text-emerald-700/80">
          {fill("rewardSponsorCostExplain", { p: formatPrice(costPerRate, lang), n: rate })}
        </p>
        {unitBonus > 0 && (
          <p className="text-[10.5px] font-extrabold text-emerald-700">
            {t("rewardSponsorCost")}: {formatPrice(costPerBonus, lang)}
          </p>
        )}
      </div>

      <p className="flex gap-1 text-[10px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" />
        {t("rewardSponsorPerUnit")}
      </p>
    </div>
  );
}
