import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SubPage } from "@/components/profile/SubPage";
import { TxRow } from "@/components/wallet/TxRow";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { formatCoins, useRewardSettings } from "@/lib/rewards";
import { groupByDay, useMyWalletLedger } from "@/lib/wallet";

export const Route = createFileRoute("/_authenticated/profile_/wallet_/statement")({
  head: () => ({
    meta: [
      { title: "كشف نقاط المكافأة | أوفر دنت" },
      { name: "description", content: "كل حركات نقاط المكافأة مجمّعة بالتواريخ مع الرصيد بعد كل حركة." },
      { property: "og:title", content: "كشف نقاط المكافأة | أوفر دنت" },
      { property: "og:description", content: "تفاصيل النقاط المكتسبة والمستبدلة بالتواريخ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatementPage,
});

const L = {
  title: { ar: "كشف النقاط", ku: "لیستەی خاڵ", en: "Points Statement",},
  sub: { ar: "كل الحركات بالتواريخ", ku: "هەموو جوڵەکان بە بەروار", en: "All Transactions by Date",},
  credited: { ar: "مجموع النقاط المكتسبة", ku: "کۆی خاڵی بەدەستهێنراو", en: "Points earned",},
  spent: { ar: "مجموع النقاط المستبدلة", ku: "کۆی خاڵی گۆڕاو", en: "Points spent",},
  more: { ar: "عرض حركات أقدم", ku: "جوڵەی کۆنتر پیشان بدە", en: "View Older Transactions",},
  empty: { ar: "لا حركات بعد", ku: "هێشتا جوڵە نییە", en: "No Transactions Yet",},
  today: { ar: "اليوم", ku: "ئەمڕۆ", en: "Today",},
  yesterday: { ar: "أمس", ku: "دوێنێ", en: "Yesterday",},
};

function StatementPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { data: settings } = useRewardSettings();
  const enabled = settings?.rewards_enabled === true;
  const rate = Number(settings?.points_per_1000_iqd ?? 0);
  const { data: ledger } = useMyWalletLedger(user?.id, enabled);
  const [limit, setLimit] = useState(30);

  const rows = (ledger?.rows ?? []).slice(0, limit);
  const days = groupByDay(rows);
  const todayKey = new Date().toLocaleDateString();
  const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString();
  const dayTitle = (d: string) =>
    d === todayKey ? L.today[lang] : d === yesterdayKey ? L.yesterday[lang] : d;

  return (
    <SubPage title={L.title[lang]} subtitle={L.sub[lang]} backTo="/profile/wallet">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center shadow-card">
          <p className="text-base font-extrabold text-primary" dir="ltr">
            +{formatCoins(ledger?.credited ?? 0, lang)}
          </p>
          <p className="text-xs text-muted-foreground">{L.credited[lang]}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 text-center shadow-card">
          <p className="text-base font-extrabold text-destructive" dir="ltr">
            {"\u2212"}
            {formatCoins(ledger?.spent ?? 0, lang)}
          </p>
          <p className="text-xs text-muted-foreground">{L.spent[lang]}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 bg-card p-5 text-center text-base text-muted-foreground">
          {L.empty[lang]}
        </p>
      ) : (
        <div className="space-y-1.5">
          {days.map(([day, items]) => (
            <div
              key={day}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card"
            >
              <p className="bg-secondary/60 px-4 py-1.5 text-xs font-extrabold text-muted-foreground">
                {dayTitle(day)}
              </p>
              <div className="divide-y divide-border/50">
                {items.map((tx) => (
                  <TxRow key={tx.id} tx={tx} lang={lang} rate={rate} />
                ))}
              </div>
            </div>
          ))}
          {rows.length < (ledger?.rows.length ?? 0) && (
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl text-base"
              onClick={() => setLimit((n) => n + 30)}
            >
              {L.more[lang]}
              <ChevronDown className="size-4" />
            </Button>
          )}
        </div>
      )}
    </SubPage>
  );
}
