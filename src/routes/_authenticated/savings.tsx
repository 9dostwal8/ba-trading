import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgePercent,
  ChevronDown,
  ChevronUp,
  Coins,
  PiggyBank,
  Sparkles,
  Tag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, useI18n, type Lang } from "@/lib/i18n";
import { coinsToMoney, useRewardSettings, useRewardSummary } from "@/lib/rewards";
import { useSavingsLedger, useTotalSavings, type SavingsLine } from "@/lib/savings";

const L = {
  title: { ar: "توفيرك بالتفصيل", ku: "پاشەکەوتت بە وردی", en: "Your savings in detail" },
  sub: {
    ar: "كل طلب وكل مادة، سطر بسطر من البداية",
    ku: "هەموو داواکاری و هەموو کاڵا، دێر بە دێر لە سەرەتاوە",
    en: "Every order and item, line by line since day one",
  },
  total: { ar: "مجموع التوفير", ku: "کۆی پاشەکەوت", en: "Total savings" },
  offers: { ar: "خصومات العروض", ku: "داشکاندنی پێشکەشکراو", en: "Offer discounts" },
  compare: { ar: "فرق السعر الطبيعي", ku: "جیاوازی نرخی ئاسایی", en: "Price gap" },
  used: { ar: "نقاط مستخدمة", ku: "خاڵی بەکارهاتوو", en: "Points used" },
  balance: { ar: "قيمة نقاطك الحالية", ku: "بەهای خاڵەکانی ئێستا", en: "Current points value" },
  orders: { ar: "الطلبات", ku: "داواکاریەکان", en: "Orders" },
  order: { ar: "طلب رقم", ku: "داواکاری ژمارە", en: "Order" },
  paid: { ar: "المدفوع", ku: "پارەی دراو", en: "Paid" },
  saved: { ar: "التوفير", ku: "پاشەکەوت", en: "Saved" },
  qty: { ar: "الكمية", ku: "بڕ", en: "Qty" },
  normal: { ar: "السعر الطبيعي", ku: "نرخی ئاسایی", en: "Normal price" },
  yours: { ar: "سعرك", ku: "نرخی تۆ", en: "Your price" },
  empty: {
    ar: "لا توجد طلبات بعد — ابدأ أول طلب لتبدأ التوفير",
    ku: "هێشتا داواکاری نییە — یەکەم داواکاری بکە بۆ پاشەکەوت",
    en: "No orders yet — place your first order to start saving",
  },
  more: { ar: "اربح نقاط أكثر", ku: "خاڵی زیاتر بەدەست بهێنە", en: "Earn more points" },
  items: { ar: "مواد", ku: "کاڵا", en: "items" },
  viewOrder: { ar: "عرض الطلب", ku: "بینینی داواکاری", en: "View order" },
};

export const Route = createFileRoute("/_authenticated/savings")({
  head: () => ({
    meta: [
      { title: "توفيرك بالتفصيل | أوفردنت" },
      {
        name: "description",
        content: "تقرير مفصل لكل ما وفّرته من خصومات العروض وفرق الأسعار ونقاط المكافآت.",
      },
      { property: "og:title", content: "توفيرك بالتفصيل | أوفردنت" },
      {
        property: "og:description",
        content: "كل طلب وكل مادة، سطر بسطر: خصومات، فرق سعر، ونقاط مكافآت.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavingsPage,
});

function SavingsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { data: settings } = useRewardSettings();
  const { data: summary } = useRewardSummary(user?.id);
  const rate = Number(summary?.points_per_1000_iqd || settings?.points_per_1000_iqd || 0);
  const balanceValue = coinsToMoney(Number(summary?.balance || 0), rate);
  const { breakdown } = useTotalSavings(user?.id, balanceValue);
  const { data: lines, isLoading } = useSavingsLedger(user?.id);

  const tiles = [
    { icon: Tag, label: L.offers[lang], value: breakdown.offers },
    { icon: BadgePercent, label: L.compare[lang], value: breakdown.comparePrice },
    { icon: Coins, label: L.used[lang], value: breakdown.pointsUsed },
    { icon: Sparkles, label: L.balance[lang], value: breakdown.pointsBalanceValue },
  ];

  return (
    <StoreLayout>
      <PageBlocks page="savings" />
      <div className="min-h-[70vh] bg-secondary/40 pb-12">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3 sm:px-5">
            <Link
              to="/"
              aria-label={L.title[lang]}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary/60"
            >
              <ArrowRight className="size-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold leading-tight sm:text-2xl">
                {L.title[lang]}
              </h1>
              <p className="truncate text-xs text-muted-foreground">{L.sub[lang]}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-3 p-3 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary-deep,var(--primary))] to-[var(--primary)] p-4 text-[var(--primary-foreground)] shadow-md">
            <PiggyBank className="pointer-events-none absolute -bottom-4 -end-3 size-24 opacity-10" />
            <p className="text-[12px] font-bold opacity-90">{L.total[lang]}</p>
            <p className="font-display text-[30px] font-extrabold leading-none">
              {formatPrice(breakdown.total, lang)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {tiles.map((t) => (
                <div
                  key={t.label}
                  className="rounded-xl bg-[var(--primary-foreground)]/15 px-2.5 py-2"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-90">
                    <t.icon className="size-3.5" />
                    <span className="truncate">{t.label}</span>
                  </div>
                  <p className="mt-0.5 text-[14px] font-extrabold">{formatPrice(t.value, lang)}</p>
                </div>
              ))}
            </div>
            <Link
              to="/rewards"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-foreground)] px-3 py-1.5 text-[12px] font-extrabold text-[var(--primary)] active:scale-95"
            >
              <Sparkles className="size-3.5" />
              {L.more[lang]}
            </Link>
          </div>

          <h2 className="px-1 pt-1 text-sm font-extrabold">{L.orders[lang]}</h2>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : !lines?.length ? (
            <p className="rounded-2xl bg-card p-4 text-center text-sm font-bold text-muted-foreground">
              {L.empty[lang]}
            </p>
          ) : (
            <GroupedOrders lines={lines} lang={lang} />
          )}
        </div>
      </div>
      <PageBlocks page="savings" position="bottom" />
    </StoreLayout>
  );
}

function formatDateGroup(dateStr: string, lang: Lang) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return lang === "ku" ? "ئەمڕۆ" : lang === "en" ? "Today" : "اليوم";
  if (isYesterday) return lang === "ku" ? "دوێنێ" : lang === "en" ? "Yesterday" : "أمس";

  return d.toLocaleDateString(lang === "en" ? "en-GB" : "ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function GroupedOrders({ lines, lang }: { lines: SavingsLine[]; lang: Lang }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, SavingsLine[]>();
    for (const line of lines) {
      const key = new Date(line.createdAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(line);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, orders]) => ({
      key,
      dateLabel: formatDateGroup(orders[0]!.createdAt, lang),
      orders,
    }));
  }, [lines, lang]);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <div className="sticky top-[60px] z-10 -mx-1 bg-secondary/40 px-1 py-1 backdrop-blur">
            <h3 className="text-[12px] font-extrabold text-muted-foreground">{g.dateLabel}</h3>
          </div>
          {g.orders.map((o) => (
            <OrderRow key={o.orderId} order={o} lang={lang} open={open.has(o.orderId)} toggle={toggle} />
          ))}
        </section>
      ))}
    </div>
  );
}

function OrderRow({
  order,
  lang,
  open,
  toggle,
}: {
  order: SavingsLine;
  lang: Lang;
  open: boolean;
  toggle: (id: string) => void;
}) {
  const savedTotal = order.offers + order.pointsUsed + order.comparePrice;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => toggle(order.orderId)}
        className="flex w-full items-center gap-3 p-3 text-start active:bg-secondary/40"
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary font-display text-[13px] font-extrabold">
          #{order.orderNo}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold">
            {L.order[lang]} #{order.orderNo}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {order.items.length} {L.items[lang]} · {L.paid[lang]} {formatPrice(order.total, lang)}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-[13px] font-extrabold text-emerald-600">+{formatPrice(savedTotal, lang)}</p>
          <p className="text-[10px] font-bold text-muted-foreground">{L.saved[lang]}</p>
        </div>
        <div className="shrink-0">
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60 bg-secondary/20 px-3 pb-3 pt-2">
          <div className="space-y-2">
            {order.items.map((it, idx) => (
              <div key={idx} className="rounded-xl bg-card p-2.5 text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {lang === "ku" ? it.name_ku : it.name_ar}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {L.qty[lang]} {it.quantity}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                  {it.compare_price > it.unit_price ? (
                    <span className="line-through">
                      {L.normal[lang]}: {formatPrice(it.compare_price, lang)}
                    </span>
                  ) : null}
                  <span>
                    {L.yours[lang]}: {formatPrice(it.unit_price, lang)}
                  </span>
                  {it.saved > 0 ? (
                    <span className="font-extrabold text-emerald-600">
                      +{formatPrice(it.saved, lang)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 space-y-1 rounded-xl bg-card p-2.5 text-[11.5px] font-bold">
            <Row label={L.compare[lang]} value={formatPrice(order.comparePrice, lang)} />
            <Row label={L.offers[lang]} value={formatPrice(order.offers, lang)} />
            <Row label={L.used[lang]} value={formatPrice(order.pointsUsed, lang)} />
            <Row label={L.paid[lang]} value={formatPrice(order.total, lang)} />
            <div className="flex items-center gap-2 border-t border-border/60 pt-1.5 text-emerald-600">
              <span className="min-w-0 flex-1 truncate font-extrabold">{L.saved[lang]}</span>
              <span className="font-extrabold">{formatPrice(savedTotal, lang)}</span>
            </div>
          </div>

          <Link
            to="/orders/$id"
            params={{ id: order.orderId }}
            className="mt-2 block rounded-xl bg-[var(--primary)] px-3 py-2 text-center text-[12px] font-extrabold text-[var(--primary-foreground)] active:scale-[0.98]"
          >
            {L.viewOrder[lang]}
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
