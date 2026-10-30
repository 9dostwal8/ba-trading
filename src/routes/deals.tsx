import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n, label } from "@/lib/i18n";
import { effectivePrice, fetchStoreData, type FlashDeal, type Product } from "@/lib/store";

const copy = {
  h1: { ar: "عروض مذهلة", ku: "پێشنیاری سەرسوڕهێنەر", en: "Amazing Offers" },
  sub: {
    ar: "كل عروض اللحظة في مكان واحد — خصومات كبرى لوقت محدود وكمية محدودة",
    ku: "هەموو ئۆفەرەکانی ئێستا لە یەک شوێن — داشکاندنی گەورە بۆ کاتی سنووردار",
    en: "All current flash offers in one place — limited quantities, limited time",
  },
  count: { ar: "عرض نشط", ku: "ئۆفەری چالاک", en: "active deals" },
  ends: { ar: "ينتهي بعد", ku: "کۆتایی دێت لە", en: "Ends in" },
  ended: { ar: "انتهى", ku: "کۆتایی هات", en: "Ended" },
  empty: { ar: "لا توجد عروض نشطة حالياً", ku: "ئێستا هیچ ئۆفەرێکی چالاک نییە", en: "No active offers currently" },
  more: { ar: "تصفح كل المنتجات", ku: "هەموو بەرهەمەکان ببینە", en: "Browse all products" },
};

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "عروض مذهلة | صفقات اللحظة — BA Trading" },
      {
        name: "description",
        content: "صفقات وتخفيضات سريعة على مستلزمات طب الأسنان — أسعار خاصة لفترة محدودة من BA Trading.",
      },
      { property: "og:title", content: "عروض مذهلة | صفقات اللحظة — BA Trading" },
      { property: "og:description", content: "خصومات لوقت محدود على مستلزمات طب الأسنان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealsPage,
});

/** Live HH:MM:SS countdown box row. */
function Countdown({ to }: { to: string | null }) {
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
  if (left <= 0) {
    return (
      <span className="text-[11px] font-extrabold text-rose-200">
        {label(copy.ended, lang)}
      </span>
    );
  }

  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];

  return (
    <div className="flex items-center gap-1 font-mono" dir="ltr">
      {parts.map((p, i) => (
        <span
          key={i}
          className="min-w-[24px] rounded-md bg-white/25 px-1.5 py-0.5 text-center text-[12px] font-black tabular-nums text-white backdrop-blur-sm"
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

  const isRtl = lang === "ar" || lang === "ku";
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <StoreLayout>
      <PageBlocks page="deals" />

      <div className="mx-auto w-full max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        
        {/* 1. Flash Deals Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#007979] via-[#008f8f] to-[#006666] p-5 sm:p-7 text-white shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="grid size-11 place-items-center rounded-2xl bg-white/20 backdrop-blur-md shadow-sm">
                  <Zap className="size-6 text-amber-300 fill-amber-300 animate-pulse" />
                </span>
                <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-black text-amber-300">
                  {lang === "ar" ? "عروض سريعة ومميزة" : lang === "ku" ? "ئۆفەری خێرا و تایبەت" : "Flash Deals Hub"}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
                {label(copy.h1, lang)}
              </h1>

              <p className="text-xs sm:text-sm font-medium text-teal-100 max-w-xl leading-relaxed">
                {label(copy.sub, lang)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <span className="rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1.5 text-xs font-extrabold tabular-nums text-white">
                {rows.length} {label(copy.count, lang)}
              </span>

              {soonest && (
                <div className="flex items-center gap-2 rounded-2xl bg-black/20 backdrop-blur-md px-3.5 py-2 text-xs font-extrabold text-white border border-white/10">
                  <span className="text-amber-200">{label(copy.ends, lang)}:</span>
                  <Countdown to={soonest} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. Contained Promotional Banners Directly Below Header */}
        <div className="overflow-hidden rounded-2xl">
          <BannerSlot slot="offers_page" />
        </div>

        {/* 3. Loading Skeleton Grid */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        )}

        {/* 4. Empty State */}
        {!isLoading && !rows.length && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-xs">
            <Zap className="mx-auto size-12 text-slate-400 stroke-[1.5]" />
            <p className="mt-3 text-sm font-bold text-slate-600">
              {label(copy.empty, lang)}
            </p>
          </div>
        )}

        {/* 5. Standard Catalog Product Grid */}
        {!isLoading && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {rows.map(({ deal, product }) => (
              <ProductCard
                key={deal.id}
                product={product}
                price={priceOf(product.id, product.price)}
              />
            ))}
          </div>
        )}

        {/* 6. Bottom Navigation to Full Catalog */}
        <div className="pt-2">
          <Link
            to="/products"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs sm:text-sm font-extrabold text-slate-700 shadow-xs hover:border-primary/40 hover:text-primary transition-all active:scale-[0.99]"
          >
            <span>{label(copy.more, lang)}</span>
            <ArrowIcon className="size-4" />
          </Link>
        </div>

      </div>

      <PageBlocks page="deals" position="bottom" />
    </StoreLayout>
  );
}
