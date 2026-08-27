import { statusIcon, statusLabel, statusStyle } from "@/lib/status";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({
  status,
  lang,
  size = "sm",
}: {
  status: string;
  lang: Lang;
  size?: "sm" | "md";
}) {
  const Icon = statusIcon(status);
  return (
    <span
      style={statusStyle(status)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-extrabold",
        "border-[var(--tint-border)] bg-[var(--tint-soft)] text-[var(--tint-strong)]",
        size === "md" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]",
      )}
    >
      <Icon className={size === "md" ? "size-4" : "size-3.5"} />
      {statusLabel(status, lang)}
    </span>
  );
}
