import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, BadgePercent, Check, FileText, Layers, Undo2, Zap, Image } from "lucide-react";
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
import type { Vendor } from "@/lib/vendors";

const ICONS = {
  flash_deal: Zap,
  offer: BadgePercent,
  bundle: Layers,
  badge: BadgeCheck,
  banner: Image,
} as const;

export function AdminCharges() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors-min"],
    queryFn: async () =>
      ((await supabase.from("vendors").select("*").order("name")).data ?? []) as unknown as Vendor[],
  });

  const { data: rows } = useQuery({
    queryKey: ["admin-charges"],
    queryFn: async () =>
      ((
        await supabase.from("vendor_charges").select("*").order("created_at", { ascending: false })
      ).data ?? []) as unknown as VendorCharge[],
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "unpaid" }) => {
      const { error } = await supabase
        .from("vendor_charges")
        .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["admin-charges"] });
    },
    onError: (e: Error) => toast.error(e.message || t("error")),
  });

  const payAll = useMutation({
    mutationFn: async ({ vendorId, ids }: { vendorId: string; ids: string[] }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("vendor_charges")
        .update({ status: "paid", paid_at: new Date().toISOString() } as never)
        .eq("vendor_id", vendorId)
        .eq("status", "unpaid")
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["admin-charges"] });
    },
    onError: (e: Error) => toast.error(e.message || t("error")),
  });

  const everything = rows ?? [];
  const all = filterByPeriod(everything, period);
  const grand = chargeTotals(all);
  const periodText = period === "all" ? t("allPeriods") : periodLabel(period, lang);
  const totalUnpaid = all.filter((r) => r.status !== "paid").reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">{t("vendorBilling")}</h2>
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
          {t("unpaid")}: {formatPrice(totalUnpaid, lang)}
        </span>
      </div>

      <PeriodPicker rows={everything} value={period} onChange={setPeriod} />

      <AdminCard>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-extrabold text-primary">{periodText}</p>
          <p className="text-[12px] font-extrabold">{formatPrice(grand.total, lang)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniBox label={t("unpaidTotal")} value={formatPrice(grand.unpaid, lang)} accent />
          <MiniBox label={t("paidTotal")} value={formatPrice(grand.paid, lang)} />
          <MiniBox label={t("chargesCount")} value={String(all.length)} />
        </div>
      </AdminCard>

      <MarketingRateCard />
      <MarketingBreakdown rows={all.map((r) => ({ kind: r.kind, amount: Number(r.amount), status: r.status }))} />

      {(vendors ?? []).map((v) => {
        const mine = all.filter((r) => r.vendor_id === v.id);
        if (mine.length === 0) return null;
        const totals = chargeTotals(mine);
        return (
          <AdminCard key={v.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-xs font-extrabold">{v.name}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {t("chargesCount")}: {mine.length} · {t("periodTotal")}: {formatPrice(totals.total, lang)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  title={t("generateInvoice")}
                  onClick={() =>
                    printMarketingInvoice({
                      lang: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar",
                      storeName: t("storeName"),
                      vendorName: `${v.name} · ${periodText}`,
                      rows: mine,
                      labelOf: (k) => t(CHARGE_LABEL_KEY[k] ?? "marketingCosts"),
                      money: (n) => formatPrice(n, lang),
                      t: (k) => t(k as Parameters<typeof t>[0]),
                    })
                  }
                >
                  <FileText className="size-4" />
                </Button>
                {totals.unpaid > 0 ? (
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    title={t("markPaid")}
                    onClick={() =>
                      payAll.mutate({
                        vendorId: v.id,
                        ids: mine.filter((r) => r.status !== "paid").map((r) => r.id),
                      })
                    }
                  >
                    <Check className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-1">
              {mine.map((r) => {
                const Icon = ICONS[r.kind as keyof typeof ICONS] ?? BadgeCheck;
                const isPaid = r.status === "paid";
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold">
                        {t(CHARGE_LABEL_KEY[r.kind] ?? "marketingCosts")}
                        {r.label ? ` · ${r.label}` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-[11px] font-extrabold">{formatPrice(Number(r.amount), lang)}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`size-7 ${isPaid ? "text-muted-foreground" : "text-primary"}`}
                      title={isPaid ? t("markUnpaid") : t("markPaid")}
                      onClick={() => setStatus.mutate({ id: r.id, status: isPaid ? "unpaid" : "paid" })}
                    >
                      {isPaid ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        );
      })}

      {all.length === 0 && (
        <AdminCard>
          <p className="py-6 text-center text-xs text-muted-foreground">
            {everything.length === 0 ? t("noCharges") : t("noChargesPeriod")}
          </p>
        </AdminCard>
      )}
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
