import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Flame, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, pick, pickName, useI18n, label, offPct } from "@/lib/i18n";
import { effectivePrice, fetchStoreData } from "@/lib/store";
import type { FlashDeal, Product } from "@/lib/store";

const copy = {
  h1: { ar: "عروض مذهلة", ku: "پێشنیاری سەرسوڕهێنەر", en: "Amazing Offers",},
  sub: {
    ar: "كل عروض اللحظة في مكان واحد — كمية محدودة ووقت محدود",
    ku: "هەموو ئۆفەرەکانی ئێستا لە یەک شوێن — ژمارە و کاتی سنووردار",
    en: "All current offers in one place — limited quantity, limited time",
  },
  count: { ar: "عرض نشط", ku: "ئۆفەری چالاک", en: "Active Offer",},
  ends: { ar: "ينتهي بعد", ku: "کۆتایی دێت لە", en: "Ends in",},
  ended: { ar: "انتهى", ku: "کۆتایی هات", en: "Ended",},
  save: { ar: "توفّر", ku: "پاشەکەوت", en: "Availability",},
  buy: { ar: "اشترِ الآن", ku: "ئێستا بکڕە", en: "Shop Now",},
  empty: { ar: "لا توجد عروض نشطة حالياً", ku: "ئێستا هیچ ئۆفەرێکی چالاک نییە", en: "No active offers currently",},
  more: { ar: "تصفح كل المنتجات", ku: "هەموو بەرهەمەکان ببینە", en: "Browse all products",},
};

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "عروض مذهلة | كل عروض اللحظة" },
      {
        name: "description",
        content: "كل العروض المذهلة على مستلزمات طب الأسنان — خصومات لوقت محدود وكمية محدودة.",
      },
      { property: "og:title", content: "عروض مذهلة | كل عروض اللحظة" },
      { property: "og:description", content: "خصومات لوقت محدود على مستلزمات طب الأسنان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealsPage,
});

/** Live HH:MM:SS countdown box row. */
function Countdown({ to, tone = "light" }: { to: string | null; tone?: "light" | "dark" }) {
  const { lang } = useI18n();
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!to) return;
    const tick = () => setLeft(Math.max(0, new Date(to).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  if (!to) return null;
  if (left <= 0)
    return (
      <span className="text-[10px] font-extrabold text-muted-foreground">
        {label(copy.ended, lang)}
      </span>
    );
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            tone === "dark"
              ? "min-w-[24px] rounded-md bg-secondary px-1 py-0.5 text-center text-[10.5px] font-black tabular-nums text-foreground"
              : "dk-count"
          }
        >
          {String(p).padStart(2, "0")}
        </span>
      ))}
    </div>
  );
}

function DealsPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
  const priceOf = (id: string, price: number, qty = 1) => {
    const product = products.find((p) => p.id === id);
    return effectivePrice(
      { ...(product ?? {}), id, price },
      data?.offers ?? [],
      data?.offerProducts ?? [],
      qty,
      data?.flashDeals ?? [],
      data?.clearanceRules ?? [],
    );
  };

  const rows = (data?.flashDeals ?? [])
    .map((deal) => ({ deal, product: products.find((p) => p.id === deal.product_id) }))
    .filter((r): r is { deal: FlashDeal; product: Product } => Boolean(r.product));

  const soonest =
    rows
      .map((r) => r.deal.ends_at)
      .filter((v): v is string => Boolean(v))
      .sort()[0] ?? null;

  return (
    <StoreLayout>
      <PageBlocks page="deals" />
      {/* Page identity: saturated flash band */}
      <div className="dk-amazing px-4 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <Zap className="size-6 shrink-0 fill-current" strokeWidth={0} />
          <h1 className="min-w-0 flex-1 font-display text-[21px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold opacity-90">
          {label(copy.sub, lang)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
            {rows.length} {label(copy.count, lang)}
          </span>
          {soonest && (
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold">
              {label(copy.ends, lang)}
              <Countdown to={soonest} />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3">
        <BannerSlot slot="offers_page" />

        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}

        {!isLoading && !rows.length && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}

        {rows.map(({ deal, product }, i) => {
          const price = priceOf(product.id, product.price);
          const old = price < product.price ? product.price : Number(product.compare_price ?? 0);
          const percent = old > price ? Math.round((1 - price / old) * 100) : 0;
          const save = old > price ? old - price : 0;
          return (
            <Link
              key={deal.id}
              to="/product/$id"
              params={{ id: product.id }}
              className="flex gap-3 overflow-hidden rounded-[calc(var(--radius)+10px)] border border-border bg-card p-2.5 shadow-card active:scale-[0.99]"
            >
              <div className="relative grid size-[104px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={pickName(product, lang)}
                    loading="lazy"
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <span className="text-3xl">🦷</span>
                )}
                {percent > 0 && (
                  <span className="absolute start-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                    {offPct(percent, lang)}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9.5px] font-extrabold text-primary">
                    <Flame className="size-2.5" strokeWidth={3} />#{i + 1}
                  </span>
                  <span className="truncate text-[9.5px] font-bold text-muted-foreground">
                    {pick(deal.badge_ar, deal.badge_ku, lang) ||
                      pick(deal.title_ar, deal.title_ku, lang)}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-[12.5px] font-extrabold leading-tight text-foreground">
                  {pickName(product, lang)}
                </p>

                {deal.ends_at && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold text-muted-foreground">
                      {label(copy.ends, lang)}
                    </span>
                    <Countdown to={deal.ends_at} tone="dark" />
                  </div>
                )}

                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div className="min-w-0">
                    {old > price && (
                      <div className="text-[10px] font-bold tabular-nums text-muted-foreground line-through">
                        {formatPrice(old, lang)}
                      </div>
                    )}
                    <div className="price-lg text-[14px] text-foreground">
                      {formatPrice(price, lang)}
                    </div>
                    {save > 0 && (
                      <div className="text-[9.5px] font-extrabold text-success">
                        {label(copy.save, lang)} {formatPrice(save, lang)}
                      </div>
                    )}
                  </div>
                  <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-xl bg-primary px-2.5 text-[11px] font-extrabold text-primary-foreground">
                    {label(copy.buy, lang)}
                    <ChevronLeft className="size-3.5 rtl:rotate-180" strokeWidth={3} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        <Link
          to="/products"
          className="flex items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 text-[12px] font-extrabold text-primary active:bg-muted/50"
        >
          {label(copy.more, lang)}
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      <PageBlocks page="deals" position="bottom" />
    </StoreLayout>
  );
}
