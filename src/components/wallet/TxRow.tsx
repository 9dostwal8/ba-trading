import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatPrice, type Lang } from "@/lib/i18n";
import { coinsToMoney, formatCoins } from "@/lib/rewards";
import { txLabel } from "@/lib/wallet";

export type WalletTx = {
  id: string;
  kind: string;
  amount: number | string;
  balance_after?: number | string | null;
  note?: string | null;
  created_at: string;
};

const WORDS = {
  in: { ar: "ربح", ku: "بەدەستهێنان", en: "Earned",},
  out: { ar: "استبدال", ku: "گۆڕین", en: "Spent",},
  balance: { ar: "الرصيد بعدها", ku: "خاڵ دواتر", en: "Points after",},
  value: { ar: "القيمة", ku: "بەها", en: "Value",},
};

/** One readable points line: what happened, when, how many coins, and the balance after it. */
export function TxRow({ tx, lang, rate = 0 }: { tx: WalletTx; lang: Lang; rate?: number }) {
  const amount = Number(tx.amount);
  const positive = amount >= 0;
  const when = new Date(tx.created_at);
  const money = rate > 0 ? coinsToMoney(Math.abs(amount), rate) : 0;

  return (
    <div className="px-3 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${
              positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}
          >
            {positive ? (
              <ArrowDownLeft className="size-5" strokeWidth={2.6} />
            ) : (
              <ArrowUpRight className="size-5" strokeWidth={2.6} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-snug">{txLabel(tx.kind, lang)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
              {when.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })}
              {" · "}
              {when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
            {tx.note ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">{tx.note}</p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-end">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
              positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}
          >
            {positive ? WORDS.in[lang] : WORDS.out[lang]}
          </span>
          <p
            className={`mt-1 text-[17px] font-extrabold leading-tight ${
              positive ? "text-primary" : "text-destructive"
            }`}
            dir="ltr"
          >
            {positive ? "+" : "\u2212"}
            {formatCoins(Math.abs(amount), lang)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{WORDS.balance[lang]}</span>
        <span className="text-xs font-bold" dir="ltr">
          {formatCoins(Number(tx.balance_after ?? 0), lang)}
          {rate > 0 ? ` · ${WORDS.value[lang]} ${formatPrice(money, lang)}` : ""}
        </span>
      </div>
    </div>
  );
}
