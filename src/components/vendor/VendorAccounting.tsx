import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminCard } from "@/components/admin/AdminKit";
import { MonthPicker } from "@/components/accounting/MonthPicker";
import { StatementView } from "@/components/accounting/StatementView";
import { supabase } from "@/integrations/supabase/client";
import { periodLabel } from "@/lib/charges";
import { useI18n } from "@/lib/i18n";
import { useVendorStatement } from "@/lib/statement";

/** The vendor sees exactly the statement the admin sees — nothing else. */
export function VendorAccounting({ vendorId }: { vendorId: string }) {
  const { t, lang } = useI18n();
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: vendor } = useQuery({
    queryKey: ["vendor-name", vendorId],
    queryFn: async () =>
      (await supabase.from("vendors").select("name").eq("id", vendorId).maybeSingle()).data,
  });

  const { data: statement, isLoading } = useVendorStatement(vendorId, period);

  return (
    <div className="space-y-3">
      <AdminCard>
        <p className="text-[11.5px] font-extrabold">{t("accMonthlyStatement")}</p>
        <p className="text-[10.5px] leading-snug text-muted-foreground">{t("accStatementHint")}</p>
      </AdminCard>

      <MonthPicker value={period} onChange={setPeriod} />

      {isLoading || !statement ? (
        <AdminCard>
          <p className="py-6 text-center text-xs text-muted-foreground">{t("loading")}</p>
        </AdminCard>
      ) : (
        <StatementView
          statement={statement}
          vendorName={vendor?.name ?? ""}
          periodText={periodLabel(period, lang) || t("allPeriods")}
        />
      )}
    </div>
  );
}
