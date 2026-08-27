import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, BadgePercent, Info, Layers, Receipt, Zap } from "lucide-react";
import { AdminCard } from "@/components/admin/AdminKit";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";

export type Prices = {
  price_flash_deal: number;
  price_offer: number;
  price_bundle: number;
  price_badge: number;
};

const ROWS = [
  { kind: "flash_deal", icon: Zap, col: "price_flash_deal", label: "chargeFlashDeal", desc: "descFlashDeal" },
  { kind: "offer", icon: BadgePercent, col: "price_offer", label: "chargeOffer", desc: "descOffer" },
  { kind: "bundle", icon: Layers, col: "price_bundle", label: "chargeBundle", desc: "descBundle" },
  { kind: "badge", icon: BadgeCheck, col: "price_badge", label: "chargeBadge", desc: "descBadge" },
] as const;

export function useMarketingPrices() {
  return useQuery({
    queryKey: ["marketing-prices"],
    queryFn: async () =>
      ((
        await supabase
          .from("store_settings")
          .select("price_flash_deal, price_offer, price_bundle, price_badge")
          .limit(1)
          .maybeSingle()
      ).data ?? null) as unknown as Prices | null,
  });
}

/** admin-defined fee + duration per promo kind (applies to all vendors) */
export function useMarketingPlans() {
  return useQuery({
    queryKey: ["marketing-rate-card"],
    queryFn: async () => (await supabase.from("marketing_plans").select("*")).data ?? [],
  });
}

/** Compact pricing reference used in marketing panels. */
export function MarketingRateCard() {
  const { t, lang } = useI18n();
  const { data: prices } = useMarketingPrices();
  const { data: plans } = useMarketingPlans();

  return (
    <AdminCard>
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-primary" />
        <h3 className="text-xs font-extrabold">{t("marketingPricing")}</h3>
      </div>

      <div className="grid gap-2">
        {ROWS.map((r) => {
          const Icon = r.icon;
          const plan = (plans ?? []).find((p: any) => p.kind === r.kind) as any;
          const amount = plan ? Number(plan.price ?? 0) : Number(prices?.[r.col] ?? 0);
          const days = Math.max(1, Number(plan?.duration_days) || 30);
          return (
            <div
              key={r.kind}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-2"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold leading-tight">{t(r.label)}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">{t(r.desc)}</p>
              </div>
              <div className="text-end">
                <p className="text-[12px] font-extrabold text-primary">{formatPrice(amount, lang)}</p>
                <p className="text-[9px] text-muted-foreground">
                  {days} {lang === "ku" ? "ڕۆژ" : "يوم"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-primary">
          <Info className="size-3.5" />
          {t("billingRules")}
        </div>
        <ul className="space-y-1">
          {(["billingRule1", "billingRule2", "billingRule3", "billingRule4"] as const).map((k) => (
            <li key={k} className="flex gap-1.5 text-[10px] leading-tight text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </div>
    </AdminCard>
  );
}

/** Compact marketing cost breakdown by feature type. */
export function MarketingBreakdown({
  rows,
}: {
  rows: { kind: string; amount: number; status: string }[];
}) {
  const { t, lang } = useI18n();
  const total = rows.reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const unpaid = rows
    .filter((x) => x.status !== "paid")
    .reduce((s, x) => s + Number(x.amount ?? 0), 0);

  return (
    <AdminCard>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-primary" />
          <h3 className="text-xs font-extrabold">{t("costBreakdown")}</h3>
        </div>
        <div className="text-end">
          <p className="text-[11px] font-bold text-destructive">{unpaid > 0 ? formatPrice(unpaid, lang) : "—"}</p>
          <p className="text-[9px] text-muted-foreground">{t("unpaidTotal")}</p>
        </div>
      </div>

      <div className="space-y-1">
        {ROWS.map((r) => {
          const mine = rows.filter((x) => x.kind === r.kind);
          const typeTotal = mine.reduce((s, x) => s + Number(x.amount ?? 0), 0);
          const typeUnpaid = mine
            .filter((x) => x.status !== "paid")
            .reduce((s, x) => s + Number(x.amount ?? 0), 0);
          const Icon = r.icon;
          return (
            <div key={r.kind} className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2 text-[11px]">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-3" />
              </span>
              <span className="flex-1 truncate font-bold">{t(r.label)}</span>
              <span className="text-muted-foreground">×{mine.length}</span>
              <span className="w-16 text-end font-extrabold">{formatPrice(typeTotal, lang)}</span>
              <span className="w-16 text-end text-[10px] font-bold text-destructive">
                {typeUnpaid > 0 ? formatPrice(typeUnpaid, lang) : "—"}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 border-t border-border pt-1.5 text-[10px] text-muted-foreground">
          <span className="flex-1" />
          <span className="w-16 text-end">{t("totalCosts")}</span>
          <span className="w-16 text-end font-extrabold text-foreground">{formatPrice(total, lang)}</span>
        </div>
      </div>
    </AdminCard>
  );
}
