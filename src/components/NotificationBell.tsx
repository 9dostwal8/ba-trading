import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";

/** Header bell with an unread count badge; links to the notifications page. */
export function NotificationBell() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const { unread } = useNotifications();
  if (!user) return null;

  const label = lang === "ku" ? "ئاگادارییەکان" : lang === "en" ? "Notifications" : "الإشعارات";

  return (
    <Link
      to="/notifications"
      aria-label={label}
      className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-secondary-foreground transition active:scale-95"
    >
      <Bell className="size-[18px]" strokeWidth={2.3} />
      {unread > 0 ? (
        <span className="absolute -top-1 -end-1 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
