import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COIN_WORD, coinsToMoney, formatPoints } from "@/lib/rewards";
import { formatPrice } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

interface CartRewardsCardProps {
  lang: Lang;
  t: (key: any) => string;
  payCopy: any;
  coinsFrozen: boolean;
  coinBalance: number;
  allowedPct: number;
  allowedCoins: number;
  coinRate: number;
  gross: number;
  spendableCoins: number;
  useCoins: boolean;
  setUseCoins: React.Dispatch<React.SetStateAction<boolean>>;
  coinDiscount: number;
  maxRedeemPct: number;
  coinsReady: boolean;
}

export function CartRewardsCard({
  lang,
  t,
  payCopy,
  coinsFrozen,
  coinBalance,
  allowedPct,
  allowedCoins,
  coinRate,
  gross,
  spendableCoins,
  useCoins,
  setUseCoins,
  coinDiscount,
  maxRedeemPct,
  coinsReady,
}: CartRewardsCardProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border-2 border-dashed border-info/70 bg-info/[0.06] p-3">
      <div className="pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-info/15 blur-xl" />
      <div className="relative flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info text-info-foreground">
          <Sparkles className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-[13.5px] font-extrabold text-info">{payCopy.coins}</p>
      </div>

      {coinsFrozen ? (
        <p className="relative mt-2 text-[11.5px] font-bold leading-relaxed text-muted-foreground">
          {payCopy.coinsFrozen}
        </p>
      ) : (
        <>
          <div className="relative mt-2.5 grid gap-1.5 rounded-lg bg-card/70 p-2.5 text-[11.5px] font-bold">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{payCopy.coinsBal}</span>
              <span className="text-foreground">
                {formatPoints(coinBalance, lang)} {COIN_WORD[lang]}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {payCopy.coinsCap} ({Math.round(allowedPct)}%)
              </span>
              <span className="text-foreground">
                {formatPoints(allowedCoins, lang)} {COIN_WORD[lang]}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{payCopy.coinsBalValue}</span>
              <span className="text-foreground">
                {formatPrice(coinsToMoney(allowedCoins, coinRate), lang)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{payCopy.coinsOrderTotal}</span>
              <span className="text-foreground">{formatPrice(gross, lang)}</span>
            </div>
            <p className="text-[10.5px] font-bold text-muted-foreground">↳ {payCopy.coinsWhy}</p>
            <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-dashed border-info/40 pt-1.5">
              <span className="text-info">{payCopy.coinsUsable}</span>
              <span className="text-end">
                <span className="block font-extrabold text-info">
                  {formatPoints(spendableCoins, lang)} {COIN_WORD[lang]}
                </span>
                <span className="block text-[11px] text-info">
                  = {formatPrice(coinsToMoney(spendableCoins, coinRate), lang)}
                </span>
              </span>
            </div>
            {useCoins && coinDiscount > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-success">{payCopy.coinsApplied}</span>
                <span className="font-extrabold text-success">
                  − {formatPrice(coinDiscount, lang)}
                </span>
              </div>
            )}
          </div>

          <p className="relative mt-2 text-[10.5px] font-bold leading-relaxed text-muted-foreground">
            {payCopy.coinsRule.replace("{p}", String(Math.round(maxRedeemPct)))}
          </p>

          <Button
            type="button"
            variant={useCoins ? "default" : "secondary"}
            className="relative mt-2.5 h-11 w-full rounded-lg text-[12.5px] font-extrabold"
            disabled={!coinsReady}
            onClick={() => setUseCoins((v) => !v)}
          >
            {useCoins ? t("cancel") : payCopy.coinsDiscount}
          </Button>
        </>
      )}
    </section>
  );
}
