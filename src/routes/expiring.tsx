import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Hourglass, ShieldCheck, TriangleAlert } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { clearancePercent, monthsChip, monthsLeft, ruleFor, ruleLabel } from "@/lib/clearance";
import { formatPrice, pick, pickName, useI18n, label, offPct } from "@/lib/i18n";
import { effectivePrice, fetchStoreData } from "@/lib/store";
import { sectionVars } from "@/lib/theme";
import type { Product } from "@/lib/store";

const copy = {
  h1: { ar: "منتجات قاربت على الانتهاء", ku: "بەرهەمی نزیک لە بەسەرچوون", en: "Expiring Soon Products",},
  sub: {
    ar: "صالحة للاستخدام بالكامل — أسعار تصفية. اسرع قبل انتهاء الصلاحية",
    ku: "بە تەواوی بەکارهێنان دروستە — نرخی ڕاماڵین. پەلە بکە پێش بەسەرچوون",
    en: "Fully usable — clearance prices. Hurry before expiry!",
  },
  count: { ar: "قطعة بسعر التصفية", ku: "بەرهەم بە نرخی ڕاماڵین", en: "item at clearance price",},
  safe: {
    ar: "كل الأدوات أصلية ومخزّنة بشكل صحيح",
    ku: "هەموو کەلوپەلەکان ئەسڵین و بە دروستی هەڵگیراون",
    en: "All tools are original and stored correctly",
  },
  hurry: { ar: "الأكثر إلحاحاً", ku: "پەلەدارترین", en: "Most Urgent",},
  soon: { ar: "٣ أشهر أو أقل", ku: "٣ مانگ یان کەمتر", en: "3 months or less",},
  mid: { ar: "٤ – ٦ أشهر", ku: "٤ – ٦ مانگ", en: "4 – 6 months",},
  later: { ar: "٧ أشهر وأكثر", ku: "٧ مانگ و زیاتر", en: "7 months and more",},
  shelf: { ar: "العمر المتبقي", ku: "تەمەنی ماوە", en: "Remaining Shelf Life",},
  empty: { ar: "لا توجد منتجات تصفية حالياً", ku: "ئێستا هیچ بەرهەمی ڕاماڵین نییە", en: "No clearance products currently",},
  more: { ar: "تصفح كل المنتجات", ku: "هەموو بەرهەمەکان ببینە", en: "Browse all products",},
};

export const Route = createFileRoute("/expiring")({
  head: () => ({
    meta: [
      { title: "منتجات قاربت على الانتهاء | أسعار تصفية" },
      {
        name: "description",
        content:
          "مستلزمات أسنان أصلية قاربت على انتهاء الصلاحية بأسعار تصفية — كلما قلّت الأشهر زاد الخصم.",
      },
      { property: "og:title", content: "منتجات قاربت على الانتهاء | أسعار تصفية" },
      {
        property: "og:description",
        content: "خصومات تصفية على مستلزمات أسنان أصلية قبل انتهاء الصلاحية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpiringPage,
});

function ExpiringPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const rules = data?.clearanceRules ?? [];
  const products = data?.products ?? [];
  const section = data?.homeSections.find((item) => item.kind === "expiring" && item.is_active);
  const colorScope = section ? sectionVars(section.hue, section.chroma) : undefined;
  const priceOf = (id: string, price: number, qty = 1) => {
    const product = products.find((p) => p.id === id);
    return effectivePrice(
      { ...(product ?? {}), id, price },
      data?.offers ?? [],
      data?.offerProducts ?? [],
      qty,
      data?.flashDeals ?? [],
      rules,
    );
  };

  const items = products
    .filter((p) => p.clearance_kind === "near_expiry" && p.expiry_date)
    .sort((a, b) => (monthsLeft(a.expiry_date) ?? 99) - (monthsLeft(b.expiry_date) ?? 99));

  const buckets: { key: string; label: string; list: Product[] }[] = [
    {
      key: "soon",
      label: label(copy.soon, lang),
      list: items.filter((p) => (monthsLeft(p.expiry_date) ?? 99) <= 3),
    },
    {
      key: "mid",
      label: label(copy.mid, lang),
      list: items.filter((p) => {
        const m = monthsLeft(p.expiry_date) ?? 99;
        return m > 3 && m <= 6;
      }),
    },
    {
      key: "later",
      label: label(copy.later, lang),
      list: items.filter((p) => (monthsLeft(p.expiry_date) ?? 99) > 6),
    },
  ].filter((b) => b.list.length > 0);

  return (
    <StoreLayout>
      <PageBlocks page="expiring" />
      <div style={colorScope}>
      {/* Page identity: clearance tape band */}
      <div className="relative overflow-hidden bg-clearance px-4 pb-5 pt-4 text-clearance-foreground">
        <span aria-hidden className="dk-tape absolute inset-x-0 top-0 h-2" />
        <div className="flex items-center gap-2 pt-1.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-clearance-foreground/15">
            <Hourglass className="size-5" strokeWidth={2.6} />
          </span>
          <h1 className="min-w-0 flex-1 font-display text-[20px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold opacity-90">
          {label(copy.sub, lang)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-clearance-foreground/15 px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
            {items.length} {label(copy.count, lang)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-clearance-foreground/15 px-2.5 py-1 text-[10.5px] font-extrabold">
            <ShieldCheck className="size-3.5" strokeWidth={2.8} />
            {label(copy.safe, lang)}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-3">
        <BannerSlot slot="offers_page" />

        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}

        {!isLoading && !items.length && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}

        {buckets.map((bucket, bi) => (
          <section key={bucket.key} className="dk-ticket">
            <span aria-hidden className="dk-tape absolute inset-y-0 start-0 w-2" />
            <div className="ps-4">
              <div className="flex items-center gap-2 px-2.5 pt-2.5">
                <h2 className="min-w-0 flex-1 truncate font-display text-[14px] font-extrabold text-foreground">
                  {bucket.label}
                </h2>
                {bi === 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-clearance px-2 py-0.5 text-[9.5px] font-extrabold text-clearance-foreground">
                    <TriangleAlert className="size-2.5" strokeWidth={3} />
                    {label(copy.hurry, lang)}
                  </span>
                )}
                <span className="shrink-0 rounded-full border border-dashed border-clearance px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-clearance">
                  {bucket.list.length}
                </span>
              </div>

              <ul className="mt-2 divide-y divide-dashed divide-border">
                {bucket.list.map((p) => {
                  const months = monthsLeft(p.expiry_date);
                  const rule = ruleFor(months, rules);
                  const price = priceOf(p.id, p.price, 1);
                  const percent =
                    p.price > price
                      ? Math.round((1 - price / Number(p.price)) * 100)
                      : clearancePercent(p, rules);
                  const life = Math.max(6, Math.min(100, Math.round(((months ?? 12) / 12) * 100)));
                  const critical = (months ?? 12) <= 3;
                  return (
                    <li key={p.id}>
                      <Link
                        to="/product/$id"
                        params={{ id: p.id }}
                        className="flex items-center gap-2.5 px-2.5 py-2 active:bg-muted/50"
                      >
                        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted/60">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={pickName(p, lang)}
                              loading="lazy"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-2xl">🦷</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[11.5px] font-bold text-foreground">
                            {pickName(p, lang)}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold ${
                                critical ? "text-clearance" : "text-muted-foreground"
                              }`}
                            >
                              {critical ? (
                                <TriangleAlert className="size-2.5" strokeWidth={3} />
                              ) : null}
                              {monthsChip(months, lang)}
                            </span>
                            {rule ? (
                              <span className="truncate text-[9px] font-bold text-muted-foreground">
                                · {ruleLabel(rule, lang)}
                              </span>
                            ) : null}
                          </div>
                          <div className="dk-life mt-1.5">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${life}%`,
                                backgroundColor: critical
                                  ? "var(--clearance)"
                                  : "var(--expiry-soft)",
                              }}
                            />
                          </div>
                        </div>

                        <div className="shrink-0 text-end">
                          {percent > 0 ? <span className="dk-off">{offPct(percent, lang)}</span> : null}
                          {price < p.price && (
                            <div className="mt-0.5 text-[9.5px] font-bold tabular-nums text-muted-foreground line-through">
                              {formatPrice(Number(p.price), lang)}
                            </div>
                          )}
                          <div className="price-lg text-[12px] text-foreground">
                            {formatPrice(price, lang)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ))}

        <Link
          to="/products"
          className="flex items-center justify-center gap-1 rounded-2xl border border-border bg-card py-3 text-[12px] font-extrabold text-clearance active:bg-muted/50"
        >
          {label(copy.more, lang)}
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      </div>
      <PageBlocks page="expiring" position="bottom" />
    </StoreLayout>
  );
}
