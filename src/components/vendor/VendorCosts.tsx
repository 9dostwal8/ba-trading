import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, BadgePercent, Check, FileText, Layers, Printer, Zap, Image } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard } from "@/components/admin/AdminKit";
import { MarketingBreakdown, MarketingRateCard } from "@/components/marketing/MarketingRateCard";
import { PeriodPicker } from "@/components/marketing/PeriodPicker";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { CHARGE_LABEL_KEY, chargeTotals, filterByPeriod, periodLabel, type VendorCharge } from "@/lib/charges";
import { printMarketingInvoice } from "@/lib/invoice";

const ICONS = {
  flash_deal: Zap,
  offer: BadgePercent,
  bundle: Layers,
  badge: BadgeCheck,
  banner: Image,
} as const;

export function VendorCosts({ vendorId }: { vendorId: string }) {
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: rows } = useQuery({
    queryKey: ["vendor-charges", vendorId],
    queryFn: async () =>
      ((
        await supabase
          .from("vendor_charges")
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
      ).data ?? []) as unknown as VendorCharge[],
  });

  const { data: vendor } = useQuery({
    queryKey: ["vendor-name", vendorId],
    queryFn: async () =>
      ((await supabase.from("vendors").select("name").eq("id", vendorId).maybeSingle()).data ?? null) as { name: string } | null,
  });

  const all = rows ?? [];
  const scoped = filterByPeriod(all, period);
  const totals = chargeTotals(scoped);
  const grand = chargeTotals(all);
  const label = period === "all" ? t("allPeriods") : periodLabel(period, lang);

  const invoice = (onlyUnpaid: boolean) => {
    const ok = printMarketingInvoice({
      lang: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar",
      storeName: t("storeName"),
      vendorName: `${vendor?.name ?? "—"} · ${label}`,
      rows: scoped,
      onlyUnpaid,
      labelOf: (k) => t(CHARGE_LABEL_KEY[k] ?? "marketingCosts"),
      money: (n) => formatPrice(n, lang),
      t: (k) => t(k as Parameters<typeof t>[0]),
    });
    if (!ok) toast.error(t("error"));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">{t("marketingCosts")}</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {all.length} {t("invoiceItems")}
        </span>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">{t("marketingCostsHint")}</p>

      <PeriodPicker rows={all} value={period} onChange={setPeriod} />

      <AdminCard>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-extrabold text-primary">{label}</p>
          <div className="text-end">
            <p className="text-[12px] font-extrabold">{formatPrice(totals.total, lang)}</p>
            <p className="text-[9px] text-muted-foreground">{t("periodTotal")}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MiniBox label={t("unpaidTotal")} value={formatPrice(totals.unpaid, lang)} accent />
          <MiniBox label={t("paidTotal")} value={formatPrice(totals.paid, lang)} />
          <MiniBox label={t("chargesCount")} value={String(scoped.length)} />
          <MiniBox label={t("totalCosts")} value={formatPrice(grand.total, lang)} />
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-2 flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="text-xs font-extrabold">{t("invoice")}</h3>
        </div>
        <p className="mb-2 text-[10px] leading-tight text-muted-foreground">{t("invoiceHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-full text-[11px] font-extrabold"
            onClick={() => invoice(true)}
          >
            <FileText className="size-3.5" />
            {t("invoiceUnpaid")}
          </Button>
          <Button
            className="h-9 gap-1.5 rounded-full text-[11px] font-extrabold"
            onClick={() => invoice(false)}
          >
            <Printer className="size-3.5" />
            {t("invoiceAll")}
          </Button>
        </div>
      </AdminCard>

      <MarketingRateCard />
      <MarketingBreakdown
        rows={scoped.map((r) => ({ kind: r.kind, amount: Number(r.amount), status: r.status }))}
      />

      <div className="space-y-1.5">
        {scoped.map((r) => {
          const Icon = ICONS[r.kind as keyof typeof ICONS] ?? BadgeCheck;
          const isPaid = r.status === "paid";
          return (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-card"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold">
                  {t(CHARGE_LABEL_KEY[r.kind] ?? "marketingCosts")}
                  {r.label ? ` · ${r.label}` : ""}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[12px] font-extrabold">{formatPrice(Number(r.amount), lang)}</p>
                <p className={`text-[9px] font-bold ${isPaid ? "text-primary" : "text-destructive"}`}>
                  {isPaid ? t("paid") : t("unpaid")}
                </p>
              </div>
            </div>
          );
        })}
        {scoped.length === 0 && (
          <AdminCard>
            <p className="py-4 text-center text-xs text-muted-foreground">
              {all.length === 0 ? t("noCharges") : t("noChargesPeriod")}
            </p>
          </AdminCard>
        )}
      </div>
    </div>
  );
}

function MiniBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-2 text-center">
      <p className={`text-[12px] font-extrabold ${accent ? "text-destructive" : ""}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
