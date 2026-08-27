import { useQuery } from "@tanstack/react-query";
import { BadgePercent, Coins, Package } from "lucide-react";
import { AdminCard, SectionHeader } from "@/components/admin/AdminKit";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, useI18n } from "@/lib/i18n";
import { formatPoints } from "@/lib/rewards";

type Row = {
  id: string;
  source: string;
  points: number;
  cost: number;
  created_at: string;
  products: { name_ar: string; name_ku: string } | null;
  offers: { title_ar: string; title_ku: string } | null;
};

/** Vendor-facing ledger of the reward points they sponsored on sold items. */
export function VendorRewardPoints({ vendorId }: { vendorId: string }) {
  const { t, lang } = useI18n();

  const { data: rows } = useQuery({
    queryKey: ["vendor-reward-points", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_reward_points")
        .select("id, source, points, cost, created_at, products(name_ar, name_ku), offers(title_ar, title_ku)")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const all = rows ?? [];
  const points = all.reduce((s, r) => s + Number(r.points ?? 0), 0);
  const cost = all.reduce((s, r) => s + Number(r.cost ?? 0), 0);

  return (
    <div className="space-y-3">
      <SectionHeader title={t("sponsoredPoints")} />
      <p className="text-[11px] leading-snug text-muted-foreground">{t("sponsoredPointsHint")}</p>

      <AdminCard>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-center">
            <p className="text-[15px] font-extrabold text-primary">{formatPoints(points, lang)}</p>
            <p className="text-[10px] text-muted-foreground">{t("sponsoredPointsTotal")}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-center">
            <p className="text-[15px] font-extrabold">{formatPrice(cost, lang)}</p>
            <p className="text-[10px] text-muted-foreground">{t("sponsoredCostTotal")}</p>
          </div>
        </div>
      </AdminCard>

      <div className="space-y-1.5">
        {all.map((r) => {
          const Icon = r.source === "offer" ? BadgePercent : Package;
          const name =
            r.source === "offer"
              ? lang === "ku"
                ? r.offers?.title_ku
                : r.offers?.title_ar
              : lang === "ku"
                ? r.products?.name_ku
                : r.products?.name_ar;
          return (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-bold">{name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-end">
                <p className="flex items-center justify-end gap-1 text-[12px] font-extrabold text-primary">
                  <Coins className="size-3" />
                  {formatPoints(Number(r.points), lang)}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {formatPrice(Number(r.cost), lang)}
                </p>
              </div>
            </div>
          );
        })}
        {!all.length && (
          <AdminCard>
            <p className="py-4 text-center text-xs text-muted-foreground">{t("noCharges")}</p>
          </AdminCard>
        )}
      </div>
    </div>
  );
}
