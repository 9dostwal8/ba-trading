import { TrendingDown } from "lucide-react";
import { formatPrice, useI18n } from "@/lib/i18n";
import type { ProductTier } from "@/lib/store";

/** Buy-more-save-more table shown on the product page. */
export function TierTable({
  tiers,
  basePrice,
  qty,
}: {
  tiers: ProductTier[];
  basePrice: number;
  qty: number;
}) {
  const { lang, t } = useI18n();
  if (!tiers.length) return null;

  const rows = [{ min_qty: 1, price: basePrice }, ...tiers.map((tr) => ({ ...tr }))];
  const activeIndex = rows.reduce((best, r, i) => (qty >= r.min_qty ? i : best), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="mb-2 flex items-center gap-1.5">
        <TrendingDown className="size-4 text-success" />
        <p className="text-[13px] font-extrabold">{t("wholesaleTiers")}</p>
        <span className="ms-auto text-[11px] text-muted-foreground">{t("buyMoreSave")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {rows.map((r, i) => {
          const on = i === activeIndex;
          return (
            <div
              key={r.min_qty}
              className={`rounded-lg border px-2 py-2 text-center ${
                on ? "border-primary bg-primary/10" : "border-border bg-secondary"
              }`}
            >
              <p className="text-[10px] font-bold text-muted-foreground">
                {t("fromQty")} {r.min_qty} {t("pieces")}
              </p>
              <p
                className={`font-display text-[13px] font-extrabold ${
                  on ? "text-primary" : "text-foreground"
                }`}
              >
                {formatPrice(Number(r.price), lang)}
              </p>
              <p className="text-[9px] text-muted-foreground">{t("perPiece")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
