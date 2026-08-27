import { BadgeCheck, Headphones, Truck, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** V4 trust rail: four tiny icon tiles right under the header. */
export function TrustRail() {
  const { t } = useI18n();
  const items = [
    { icon: BadgeCheck, label: t("trustOriginal"), hue: 155 },
    { icon: Truck, label: t("trustDelivery"), hue: 250 },
    { icon: Wallet, label: t("wholesale"), hue: 78 },
    { icon: Headphones, label: t("trustSupport"), hue: 320 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 px-4 pt-3">
      {items.map(({ icon: Icon, label, hue }) => (
        <div
          key={label}
          className="tile-soft flex flex-col items-center gap-1 px-1 py-2 text-center"
        >
          <span
            className="icon-pill size-8"
            style={{
              background: `oklch(0.95 0.05 ${hue})`,
              color: `oklch(0.52 0.14 ${hue})`,
            }}
          >
            <Icon className="size-4" strokeWidth={2.4} />
          </span>
          <span className="line-clamp-2 text-[9.5px] font-bold leading-tight text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
