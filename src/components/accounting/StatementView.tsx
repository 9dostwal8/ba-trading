import {
  BadgeCheck,
  BadgePercent,
  CalendarClock,
  Coins,
  FileText,
  Image,
  Layers,
  Megaphone,
  Percent,
  Receipt,
  RefreshCw,
  ShoppingCart,
  Tag,
  Wallet,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AdminCard } from "@/components/admin/AdminKit";
import { Button } from "@/components/ui/button";
import { CHARGE_LABEL_KEY } from "@/lib/charges";
import { formatPrice, useI18n, type Lang } from "@/lib/i18n";
import { printStatement, type StatementRow } from "@/lib/invoice";
import { printPaymentVoucher, printRemainingInvoice } from "@/lib/voucher";
import {
  payStatusKey,
  payStatusTone,
  payoutRemaining,
  type VendorStatement,
} from "@/lib/statement";

const KIND_ICONS = {
  flash_deal: Zap,
  offer: BadgePercent,
  bundle: Layers,
  badge: BadgeCheck,
  banner: Image,
  near_expiry: CalendarClock,
  outlet: Tag,
  reward_points: Coins,
} as const;

const money = (n: number, lang: Lang) => formatPrice(n, lang);
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : "—");

/**
 * The one statement document both admin and vendor read: sales, minus the
 * three store deductions, equals the vendor payout for the month.
 */
export function StatementView({
  statement,
  vendorName,
  periodText,
  actions,
}: {
  statement: VendorStatement;
  vendorName: string;
  periodText: string;
  actions?: ReactNode;
}) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState<"sales" | "marketing" | null>(null);
  const [detailed, setDetailed] = useState(false);
  const s = statement;
  const remaining = payoutRemaining(s.payout, s.paid_amount);
  const m = (n: number) => money(n, lang);
  const marketingCharges = s.charges.filter((c) => c.kind !== "reward_points");
  const rewardCharges = s.charges.filter((c) => c.kind === "reward_points");

  const print = () => {
    const summaryRows: StatementRow[] = [
      { label: t("accSales"), detail: `${t("accUnits")}: ${s.units}`, amount: s.sales },
      { label: t("accCommission"), amount: -s.commission },
      { label: t("marketingCosts"), amount: -s.marketing },
      { label: t("accRewardsSponsored"), amount: -s.rewards },
    ];
    const detailRows: StatementRow[] = [
      ...s.orders.map((o) => ({
        label: `#${o.order_no} · ${o.customer}`,
        detail: `${t("accUnits")}: ${Number(o.units)} · ${t("accCommission")} ${m(Number(o.commission))}`,
        date: day(o.date),
        amount: Number(o.sales),
      })),
      { label: t("accCommission"), amount: -s.commission },
      ...[...marketingCharges, ...rewardCharges].map((c) => ({
        label: t(CHARGE_LABEL_KEY[c.kind] ?? "marketingCosts") + (c.label ? ` · ${c.label}` : ""),
        date: day(c.created_at),
        status: (c.status === "paid" ? "paid" : "unpaid") as "paid" | "unpaid",
        amount: -Number(c.amount ?? 0),
      })),
    ];
    printStatement({
      lang: lang === "ku" ? "ku" : lang === "en" ? "en" : "ar",
      storeName: t("storeName"),
      party: `${vendorName} · ${periodText}`,
      caption: `${t("accMonthlyStatement")} · ${t(detailed ? "accDetailed" : "accSummary")}`,
      no: `ST-${s.period.replace("-", "")}-${vendorName.slice(0, 3).toUpperCase()}`,
      rows: detailed ? detailRows : summaryRows,
      summary: [
        { label: t("accPaidToVendor"), value: m(s.paid_amount) },
        { label: t("accRemaining"), value: m(remaining) },
      ],
      totalLabel: t("accPayout"),
      money: (n) => m(n),
      t: (k) => t(k as Parameters<typeof t>[0]),
      footer: t("accStatementHint"),
    });
  };

  const docInput = {
    statement: s,
    vendorName,
    periodText,
    lang: (lang === "ku" ? "ku" : lang === "en" ? "en" : "ar") as Lang,
    storeName: t("storeName"),
    money: m,
    t: (k: string) => t(k as Parameters<typeof t>[0]),
    detailed,
  };

  const recalc = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["statement"] }),
      qc.invalidateQueries({ queryKey: ["statements"] }),
    ]);
    toast.success(t("accRecalcDone"));
  };


  return (
    <div className="space-y-3">
      {/* payout headline */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-muted-foreground">
              {vendorName} · {periodText}
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-primary">{m(s.payout)}</p>
            <p className="text-[10.5px] text-muted-foreground">{t("accPayout")}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${payStatusTone(s.status)}`}
          >
            {t(payStatusKey(s.status) as Parameters<typeof t>[0])}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-[10.5px]">
          <p>
            <span className="text-muted-foreground">{t("accPaidToVendor")}: </span>
            <b className="text-emerald-600">{m(s.paid_amount)}</b>
          </p>
          <p>
            <span className="text-muted-foreground">{t("accRemaining")}: </span>
            <b className={remaining > 0 ? "text-destructive" : "text-emerald-600"}>{m(remaining)}</b>
          </p>
        </div>
      </div>

      {/* the three lines */}
      <AdminCard>
        <p className="mb-1.5 text-[11.5px] font-extrabold">{t("accMonthlyStatement")}</p>

        <StatementLine
          icon={ShoppingCart}
          label={t("accSales")}
          hint={`${t("accOrdersCount")}: ${s.orders.length} · ${t("accUnits")}: ${s.units}`}
          value={m(s.sales)}
          onToggle={() => setOpen(open === "sales" ? null : "sales")}
          expanded={open === "sales"}
        >
          {s.orders.length === 0 ? (
            <Empty text={t("noChargesPeriod")} />
          ) : (
            s.orders.map((o) => (
              <div key={o.order_id} className="flex items-center gap-2 py-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] font-bold">
                    #{o.order_no} · {o.customer}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {day(o.date)} · {t("accUnits")}: {Number(o.units)} · {t("accCommission")}{" "}
                    {m(Number(o.commission))}
                  </p>
                </div>
                <p className="shrink-0 text-[11px] font-extrabold">{m(Number(o.sales))}</p>
              </div>
            ))
          )}
        </StatementLine>

        <StatementLine
          icon={Percent}
          label={t("accCommission")}
          hint={t("accCommissionHint")}
          value={`− ${m(s.commission)}`}
          tone="due"
        />

        <StatementLine
          icon={Megaphone}
          label={t("marketingCosts")}
          hint={`${t("accRewardsSponsored")}: ${m(s.rewards)}`}
          value={`− ${m(s.marketing + s.rewards)}`}
          tone="due"
          onToggle={() => setOpen(open === "marketing" ? null : "marketing")}
          expanded={open === "marketing"}
        >
          {s.charges.length === 0 ? (
            <Empty text={t("noChargesPeriod")} />
          ) : (
            [...marketingCharges, ...rewardCharges].map((c) => {
              const Icon = KIND_ICONS[c.kind as keyof typeof KIND_ICONS] ?? BadgeCheck;
              return (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-bold">
                      {t(CHARGE_LABEL_KEY[c.kind] ?? "marketingCosts")}
                      {c.label ? ` · ${c.label}` : ""}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{day(c.created_at)}</p>
                  </div>
                  <p className="shrink-0 text-[11px] font-extrabold">{m(Number(c.amount))}</p>
                </div>
              );
            })
          )}
        </StatementLine>

        <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-[13px] font-extrabold">
          <span className="flex items-center gap-1.5">
            <Receipt className="size-4 text-primary" />
            {t("accPayout")}
          </span>
          <span className="text-primary">{m(s.payout)}</span>
        </div>

      </AdminCard>

      {/* documents */}
      <AdminCard>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold">
            <FileText className="size-4 text-primary" />
            {t("accDocuments")}
          </p>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={recalc}>
            <RefreshCw className="size-3.5" />
            <span className="text-[10.5px] font-bold">{t("accRecalc")}</span>
          </Button>
        </div>

        <div className="mb-2 rounded-xl border border-border/60 bg-secondary/30 p-1.5">
          <p className="mb-1 px-0.5 text-[9.5px] font-bold text-muted-foreground">
            {t("accDetailLevel")}
          </p>
          <div className="flex gap-1">
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setDetailed(v)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[10.5px] font-extrabold transition-colors ${
                  detailed === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {t(v ? "accDetailed" : "accSummary")}
              </button>
            ))}
          </div>
          <p className="mt-1 px-0.5 text-[9px] leading-snug text-muted-foreground">
            {t("accDetailLevelHint")}
          </p>
        </div>

        <div className="grid gap-2">
          <DocRow
            icon={FileText}
            title={t("accDownloadStatement")}
            hint={`${t("accPayout")}: ${m(s.payout)}`}
            onClick={print}
          />
          <DocRow
            icon={Receipt}
            title={t("accVoucherPaid")}
            hint={s.paid_amount > 0 ? `${m(s.paid_amount)} · ${day(s.paid_at)}` : t("accNothingPaid")}
            tone="ok"
            disabled={s.paid_amount <= 0}
            onClick={() => printPaymentVoucher(docInput)}
          />
          <DocRow
            icon={Wallet}
            title={t("accVoucherDue")}
            hint={remaining > 0 ? m(remaining) : t("accNothingDue")}
            tone="due"
            disabled={remaining <= 0}
            onClick={() => printRemainingInvoice(docInput)}
          />
        </div>
        <p className="mt-2 text-[9.5px] leading-snug text-muted-foreground">
          {t("accStatementHint")}
        </p>
      </AdminCard>

      {actions}
    </div>
  );
}

function StatementLine({
  icon: Icon,
  label,
  hint,
  value,
  tone,
  onToggle,
  expanded,
  children,
}: {
  icon: typeof Percent;
  label: string;
  hint?: string;
  value: string;
  tone?: "due";
  onToggle?: () => void;
  expanded?: boolean;
  children?: ReactNode;
}) {
  const head = (
    <div className="flex w-full items-center gap-2 py-2 text-start">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-extrabold">{label}</p>
        {hint && <p className="truncate text-[9.5px] text-muted-foreground">{hint}</p>}
      </div>
      <p
        className={`shrink-0 text-[12.5px] font-extrabold ${tone === "due" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
    </div>
  );
  return (
    <div className="border-b border-border/60 last:border-0">
      {onToggle ? (
        <button type="button" className="w-full" onClick={onToggle}>
          {head}
        </button>
      ) : (
        head
      )}
      {expanded && children && (
        <div className="mb-2 rounded-xl border border-border/60 bg-secondary/30 px-2 py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-3 text-center text-[10.5px] text-muted-foreground">{text}</p>;
}

function DocRow({
  icon: Icon,
  title,
  hint,
  tone,
  disabled,
  onClick,
}: {
  icon: typeof Percent;
  title: string;
  hint: string;
  tone?: "ok" | "due";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneCls =
    tone === "ok"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "due"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl border border-border bg-secondary/30 px-2 py-2 text-start disabled:opacity-50"
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${toneCls}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-extrabold">{title}</p>
        <p className="truncate text-[9.5px] text-muted-foreground">{hint}</p>
      </div>
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
