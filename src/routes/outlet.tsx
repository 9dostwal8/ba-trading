import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageOpen, Sparkles, Tag } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, pick, useI18n, label, offPct } from "@/lib/i18n";
import { effectivePrice, fetchStoreData } from "@/lib/store";
import { sectionVars } from "@/lib/theme";

const copy = {
  h1: { ar: "أوتلت — مخزون فائض", ku: "ئاوتلێت — کۆگای زیادە", en: "Outlet — Excess Stock",},
  sub: {
    ar: "قطع أصلية من مخزون فائض بسعر المصنع، الكمية محدودة",
    ku: "بەرهەمی ئەسڵی لە کۆگای زیادە بە نرخی کارگە، بڕی سنووردار",
    en: "Original items from excess stock at factory price, limited quantity",
  },
  upto: { ar: "خصم حتى", ku: "داشکاندن تا", en: "Up to {n}% off",},
  count: { ar: "قطعة في الأوتلت", ku: "بەرهەم لە ئاوتلێت", en: "{n} item in the Outlet",},
  saveAll: { ar: "مجموع التوفير المتاح", ku: "کۆی پاشەکەوتی بەردەست", en: "Total Savings Available",},
  empty: { ar: "لا توجد منتجات أوتلت حالياً", ku: "ئێستا هیچ بەرهەمی ئاوتلێت نییە", en: "No Outlet products currently available",},
};

export const Route = createFileRoute("/outlet")({
  head: () => ({
    meta: [
      { title: "أوتلت | مخزون فائض بسعر المصنع" },
      {
        name: "description",
        content: "مستلزمات أسنان أصلية من مخزون فائض بأسعار أوتلت — كميات محدودة وخصومات كبيرة.",
      },
      { property: "og:title", content: "أوتلت | مخزون فائض بسعر المصنع" },
      { property: "og:description", content: "خصومات أوتلت على مستلزمات أسنان أصلية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OutletPage,
});

function OutletPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
  const section = data?.homeSections.find((item) => item.kind === "outlet" && item.is_active);
  const colorScope = section ? sectionVars(section.hue, section.chroma) : undefined;
  const priceOf = (id: string, price: number) => {
    const product = products.find((p) => p.id === id);
    return effectivePrice(
      { ...(product ?? {}), id, price },
      data?.offers ?? [],
      data?.offerProducts ?? [],
      1,
      data?.flashDeals ?? [],
      data?.clearanceRules ?? [],
    );
  };

  const items = products
    .filter((p) => p.clearance_kind === "outlet" && Number(p.price) > 0)
    .map((p) => {
      const price = priceOf(p.id, p.price);
      const percent = p.price > price ? Math.round((1 - price / Number(p.price)) * 100) : 0;
      return { p, price, percent, save: Number(p.price) - price };
    })
    .sort((a, b) => b.percent - a.percent);

  const best = items.length ? Math.max(...items.map((x) => x.percent)) : 0;
  const totalSave = items.reduce((s, x) => s + Math.max(0, x.save), 0);

  return (
    <StoreLayout>
      <PageBlocks page="outlet" />
      <div style={colorScope}>
      {/* Page identity: outlet crate band */}
      <div className="dk-crate rounded-none">
        <div className="flex items-center gap-2.5 px-4 pb-4 pt-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[oklch(1_0_0_/_35%)]">
            <PackageOpen className="size-5" strokeWidth={2.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="dk-stencil text-[20px] leading-none">
              {label(copy.h1, lang)}
            </h1>
            <p className="mt-1.5 text-[11.5px] font-extrabold opacity-80">
              {label(copy.sub, lang)}
            </p>
          </div>
          {best > 0 ? (
            <div className="dk-tag shrink-0 -rotate-3 flex-col !items-start gap-0 !px-2 !py-1 leading-none">
              <span className="text-[8.5px] font-extrabold uppercase opacity-80">
                {label(copy.upto, lang)}
              </span>
              <span className="text-[22px] font-black">{offPct(best, lang)}</span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
          <span className="rounded-full bg-[oklch(1_0_0_/_25%)] px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
            {items.length} {label(copy.count, lang)}
          </span>
          {totalSave > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(1_0_0_/_25%)] px-2.5 py-1 text-[10.5px] font-extrabold">
              <Sparkles className="size-3.5" strokeWidth={2.8} />
              {label(copy.saveAll, lang)} {formatPrice(totalSave, lang)}
            </span>
          ) : null}
        </div>
        <div className="dk-zig" />
      </div>

      <div className="space-y-4 p-3">
        <BannerSlot slot="offers_page" />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(({ p, price }) => (
              <ProductCard key={p.id} product={p} price={price} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            <Tag className="mx-auto mb-2 size-6 text-muted-foreground" />
            {label(copy.empty, lang)}
          </div>
        )}
      </div>
      </div>
      <PageBlocks page="outlet" position="bottom" />
    </StoreLayout>
  );
}
