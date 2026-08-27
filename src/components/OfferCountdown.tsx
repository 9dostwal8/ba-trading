import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
  };
}

export function OfferCountdown({ endsAt }: { endsAt: string }) {
  const { t } = useI18n();
  const [left, setLeft] = useState(() => new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(endsAt).getTime() - Date.now()), 30000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (left <= 0) return null;
  const { d, h, m } = parts(left);

  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold">
      <span className="text-muted-foreground">{t("endsIn")}</span>
      {[
        { v: d, l: t("days") },
        { v: h, l: t("hours") },
        { v: m, l: t("minutes") },
      ].map((p, i) => (
        <span key={i} className="rounded-md bg-deal/25 px-1.5 py-0.5 text-deal-foreground">
          {p.v} {p.l}
        </span>
      ))}
    </div>
  );
}
