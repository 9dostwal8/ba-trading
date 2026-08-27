import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CheckCheck,
  Coins,
  PackageCheck,
  ShoppingBag,
  Star,
  Store,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { PushToggle } from "@/components/PushToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import {
  notifBody,
  notifTitle,
  timeAgo,
  useMarkNotificationsRead,
  useNotifications,
  type Notification,
} from "@/lib/notifications";
import { resolveNotifLink } from "@/lib/notifLink";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات | متابعة الطلبات ونقاط المكافأة" },
      {
        name: "description",
        content:
          "تابع إشعارات طلباتك، تأكيد الطلب، نقاط المكافأة، وتحديثات المتجر للبائعين في مكان واحد.",
      },
      { property: "og:title", content: "الإشعارات | متابعة الطلبات ونقاط المكافأة" },
      {
        property: "og:description",
        content: "إشعارات الطلبات، نقاط المكافأة، وتحديثات البائعين.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<string, LucideIcon> = {
  order_placed: ShoppingBag,
  order_new: ShoppingBag,
  order_item_new: PackageCheck,
  order_status: PackageCheck,
  order_confirmed: PackageCheck,
  order_cancelled: XCircle,
  order_paid: Wallet,
  reward_earned: Coins,
  reward_spent: Coins,
  vendor_reward_sponsored: Coins,
  vendor_charge: Wallet,
  vendor_application_new: Store,
  vendor_approved: Store,
  vendor_rejected: XCircle,
  product_review: Star,
};

function NotificationsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { items, isLoading, unread } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const tx = (ar: string, ku: string, en: string) =>
    lang === "ku" ? ku : lang === "en" ? en : ar;

  if (!user) {
    return (
      <StoreLayout>
        <div className="px-4 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <BellOff className="size-7" />
          </span>
          <h1 className="mt-3 font-display text-[18px] font-extrabold">
            {tx("سجّل الدخول لعرض الإشعارات", "بچۆ ژوورەوە بۆ بینینی ئاگادارییەکان", "Sign in to see notifications")}
          </h1>
          <Link to="/auth" className="mt-4 inline-flex">
            <Button className="h-11 rounded-xl px-6 font-extrabold">
              {tx("تسجيل الدخول", "چوونەژوورەوە", "Sign in")}
            </Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <PageBlocks page="notifications" />
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bell className="size-[18px]" strokeWidth={2.4} />
        </span>
        <h1 className="min-w-0 flex-1 font-display text-[17px] font-extrabold">
          {tx("الإشعارات", "ئاگادارییەکان", "Notifications")}
        </h1>
        {unread > 0 ? (
          <button
            onClick={() => void markRead()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-[12px] font-extrabold text-secondary-foreground active:scale-95"
          >
            <CheckCheck className="size-4" />
            {tx("تعليم الكل كمقروء", "هەموو خوێندراو", "Mark all read")}
          </button>
        ) : null}
      </div>

      <PushToggle className="mx-3 mb-3" />

      {isLoading ? (
        <div className="space-y-2 px-3 pb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <BellOff className="size-7" />
          </span>
          <p className="mt-3 text-[13px] font-bold text-muted-foreground">
            {tx("لا توجد إشعارات بعد", "هێشتا ئاگاداری نییە", "No notifications yet")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2 px-3 pb-10">
          {items.map((n) => (
            <li key={n.id}>
              <Row n={n} lang={lang} onOpen={() => void markRead([n.id])} />
            </li>
          ))}
        </ul>
      )}
      <PageBlocks page="notifications" position="bottom" />
    </StoreLayout>
  );
}

function Row({
  n,
  lang,
  onOpen,
}: {
  n: Notification;
  lang: ReturnType<typeof useI18n>["lang"];
  onOpen: () => void;
}) {
  const Icon = ICONS[n.kind] ?? Bell;
  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border/60 p-3 transition-colors",
        n.is_read ? "bg-card" : "bg-primary/[0.06] border-primary/25",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold leading-snug">{notifTitle(n, lang)}</p>
        {notifBody(n, lang) ? (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">
            {notifBody(n, lang)}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">
          {timeAgo(n.created_at, lang)}
        </p>
      </div>
      {!n.is_read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /> : null}
    </div>
  );

  const target = resolveNotifLink(n.link);
  if (target) {
    return (
      <Link
        to={target.to as never}
        search={(target.search ?? {}) as never}
        onClick={onOpen}
        className="block active:scale-[0.99]"
      >
        {body}
      </Link>
    );
  }
  return (
    <button onClick={onOpen} className="block w-full text-start active:scale-[0.99]">
      {body}
    </button>
  );
}
