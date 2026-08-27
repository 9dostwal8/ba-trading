import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Receipt, Store, Undo2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminCard } from "@/components/admin/AdminKit";
import { MonthPicker } from "@/components/accounting/MonthPicker";
import { StatementView } from "@/components/accounting/StatementView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { periodLabel } from "@/lib/charges";
import { formatPrice, useI18n } from "@/lib/i18n";
import { customerLedgers, inPeriod, type AccOrder } from "@/lib/accounting";
import { printStatement } from "@/lib/invoice";
import {
  payStatusKey,
  payStatusTone,
  payoutRemaining,
  useVendorStatement,
  useVendorStatements,
  type StatementListRow,
} from "@/lib/statement";

type View = "vendors" | "customers";

/** One monthly statement per vendor, plus dentist purchase statements. */
export function AdminAccounting() {
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [view, setView] = useState<View>("vendors");
  const [open, setOpen] = useState<string | null>(null);

  const { data: rows, isLoading } = useVendorStatements(period);
  const { data: orders } = useQuery({
    queryKey: ["acc-orders"],
    queryFn: async () =>
      ((await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ??
        []) as unknown as AccOrder[],
  });

  const list = rows ?? [];
  const totals = list.reduce(
    (a, r) => ({
      sales: a.sales + r.sales,
      income: a.income + r.store_income,
      payout: a.payout + r.payout,
      due: a.due + payoutRemaining(r.payout, r.paid_amount),
    }),
    { sales: 0, income: 0, payout: 0, due: 0 },
  );

  const periodOrders = (orders ?? []).filter((o) => inPeriod(o.created_at, period));
  const customers = customerLedgers(periodOrders);
  const label = periodLabel(period, lang) || t("allPeriods");

  return (
    <div className="space-y-3">
      <AdminCard>
        <p className="text-[11.5px] font-extrabold">{t("accMonthlyStatement")}</p>
        <p className="text-[10.5px] leading-snug text-muted-foreground">{t("accStatementHint")}</p>
      </AdminCard>

      <MonthPicker value={period} onChange={setPeriod} />

      <div className="grid grid-cols-2 gap-2">
        <Kpi label={t("accSales")} value={formatPrice(totals.sales, lang)} />
        <Kpi label={t("accStoreIncome")} value={formatPrice(totals.income, lang)} tone="ok" />
        <Kpi label={t("accPayout")} value={formatPrice(totals.payout, lang)} tone="primary" />
        <Kpi label={t("accRemaining")} value={formatPrice(totals.due, lang)} tone="due" />
      </div>

      <div className="flex gap-1.5">
        <Tab active={view === "vendors"} onClick={() => setView("vendors")} icon={Store}>
          {t("accVendorStatements")}
        </Tab>
        <Tab active={view === "customers"} onClick={() => setView("customers")} icon={Users}>
          {t("accCustomers")}
        </Tab>
      </div>

      {view === "vendors" &&
        (isLoading ? (
          <AdminCard>
            <p className="py-6 text-center text-xs text-muted-foreground">{t("loading")}</p>
          </AdminCard>
        ) : list.length === 0 ? (
          <AdminCard>
            <p className="py-6 text-center text-xs text-muted-foreground">{t("noChargesPeriod")}</p>
          </AdminCard>
        ) : (
          <div className="space-y-2">
            {list.map((r) => (
              <VendorRow
                key={r.vendor_id}
                row={r}
                period={period}
                periodText={label}
                open={open === r.vendor_id}
                onToggle={() => setOpen(open === r.vendor_id ? null : r.vendor_id)}
              />
            ))}
          </div>
        ))}

      {view === "customers" && (
        <div className="space-y-2">
          {customers.length === 0 ? (
            <AdminCard>
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("noChargesPeriod")}
              </p>
            </AdminCard>
          ) : (
            customers.map((c) => (
              <AdminCard key={c.userId}>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-extrabold">{c.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {c.phone} · {c.city} · {c.orders.length} {t("orders")}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-[12px] font-extrabold">{formatPrice(c.spent, lang)}</p>
                    {c.unpaid > 0 && (
                      <p className="text-[10px] font-extrabold text-destructive">
                        {formatPrice(c.unpaid, lang)}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() =>
                    printStatement({
                      lang: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar",
                      storeName: t("storeName"),
                      party: c.name,
                      caption: `${t("accCustomerStatement")} · ${label}`,
                      no: `CS-${period.replace("-", "")}`,
                      rows: c.orders.map((o) => ({
                        label: `#${o.order_no}`,
                        detail: o.city,
                        date: new Date(o.created_at).toLocaleDateString(),
                        status: o.payment_status === "paid" ? "paid" : "unpaid",
                        amount: Number(o.total),
                      })),
                      summary: [{ label: t("accCollected"), value: formatPrice(c.paid, lang) }],
                      totalLabel: t("accSpent"),
                      money: (n) => formatPrice(n, lang),
                      t: (k) => t(k as Parameters<typeof t>[0]),
                    })
                  }
                >
                  <Receipt className="size-4" />
                  {t("accCustomerStatement")}
                </Button>
              </AdminCard>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Collapsed vendor line; expands into the shared statement with payout actions. */
function VendorRow({
  row,
  period,
  periodText,
  open,
  onToggle,
}: {
  row: StatementListRow;
  period: string;
  periodText: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const { data: statement } = useVendorStatement(open ? row.vendor_id : undefined, period);
  const remaining = payoutRemaining(row.payout, row.paid_amount);
  const due = Math.abs(row.payout);

  const save = useMutation({
    mutationFn: async (paidAmount: number) => {
      const status = paidAmount <= 0 ? "unpaid" : paidAmount >= due ? "paid" : "partly_paid";
      const payload = {
        vendor_id: row.vendor_id,
        period,
        sales_total: row.sales,
        commission_total: row.commission,
        marketing_total: row.marketing,
        rewards_total: row.rewards,
        amount: row.payout,
        paid_amount: paidAmount,
        status,
        paid_at: paidAmount > 0 ? new Date().toISOString() : null,
        closed_at: status === "paid" ? new Date().toISOString() : null,
      };
      const existing = await supabase
        .from("vendor_settlements")
        .select("id")
        .eq("vendor_id", row.vendor_id)
        .eq("period", period)
        .maybeSingle();
      const res = existing.data?.id
        ? await supabase
            .from("vendor_settlements")
            .update(payload as never)
            .eq("id", existing.data.id)
        : await supabase.from("vendor_settlements").insert(payload as never);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setAmount("");
      qc.invalidateQueries({ queryKey: ["statements"] });
      qc.invalidateQueries({ queryKey: ["statement"] });
    },
    onError: (e: Error) => toast.error(e.message || t("error")),
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <button type="button" className="flex w-full items-center gap-2 p-3 text-start" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-extrabold">{row.vendor_name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {t("accSales")} {formatPrice(row.sales, lang)} · {t("accStoreIncome")}{" "}
            {formatPrice(row.store_income, lang)}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[12px] font-extrabold text-primary">{formatPrice(row.payout, lang)}</p>
          <span
            className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${payStatusTone(row.status)}`}
          >
            {t(payStatusKey(row.status) as Parameters<typeof t>[0])}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60 p-3">
          {statement ? (
            <StatementView
              statement={statement}
              vendorName={row.vendor_name}
              periodText={periodText}
              actions={
                <AdminCard>
                  <p className="text-[11.5px] font-extrabold">{t("accMarkPaid")}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {t("accRemaining")}: {formatPrice(remaining, lang)}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={t("accPayAmount")}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-9 text-[12px]"
                    />
                    <Button
                      size="sm"
                      className="shrink-0"
                      disabled={save.isPending || !amount}
                      onClick={() => save.mutate(row.paid_amount + (Number(amount) || 0))}
                    >
                      <Check className="size-4" />
                      {t("save")}
                    </Button>
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={save.isPending || remaining <= 0}
                      onClick={() => save.mutate(due)}
                    >
                      {t("accPayFull")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={save.isPending || row.paid_amount <= 0}
                      onClick={() => save.mutate(0)}
                    >
                      <Undo2 className="size-4" />
                      {t("accReopen")}
                    </Button>
                  </div>
                </AdminCard>
              }
            />
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">{t("loading")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-extrabold transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "ok" | "due";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "due"
        ? "text-destructive"
        : tone === "primary"
          ? "text-primary"
          : "";
  return (
    <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-card">
      <p className={`text-[13px] font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
