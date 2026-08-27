import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, ChevronLeft } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { brandLogo, brandProducts } from "@/lib/brands";
import { pick, useI18n, label } from "@/lib/i18n";
import { effectivePrice, fetchStoreData } from "@/lib/store";

const copy = {
  h1: { ar: "الماركات المعتمدة", ku: "براندەکانی پەسەندکراو", en: "Approved Brands",},
  sub: {
    ar: "منتجات أصلية من أشهر ماركات طب الأسنان العالمية",
    ku: "بەرهەمی ئەسڵی لە ناودارترین براندەکانی پزیشکی ددان",
    en: "Original products from the world's leading dental brands",
  },
  count: { ar: "ماركة", ku: "براند", en: "Brand",},
  all: { ar: "كل منتجات الماركة", ku: "هەموو بەرهەمی براند", en: "All products by this brand",},
  empty: { ar: "لا توجد ماركات", ku: "هیچ براندێک نییە", en: "No brands available",},
};

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "الماركات | GC, 3M, Tokuyama وأكثر" },
      {
        name: "description",
        content: "تصفح ماركات طب الأسنان الأصلية المتوفرة في المتجر: GC، 3M، Tokuyama وغيرها.",
      },
      { property: "og:title", content: "الماركات | GC, 3M, Tokuyama وأكثر" },
      { property: "og:description", content: "منتجات أصلية من أشهر ماركات طب الأسنان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
  const brands = (data?.brandCards ?? []).filter((b) => b.is_active !== false);
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

  return (
    <StoreLayout>
      <PageBlocks page="brands" />
      <div className="bg-secondary px-4 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Award className="size-5" strokeWidth={2.6} />
          </span>
          <h1 className="min-w-0 flex-1 font-display text-[20px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-muted-foreground">
          {label(copy.sub, lang)}
        </p>
        <span className="mt-3 inline-block rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
          {brands.length} {label(copy.count, lang)}
        </span>
      </div>

      <div className="space-y-3 p-3">
        <BannerSlot slot="offers_page" />

        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}

        {!isLoading && !brands.length && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}

        {brands.map((b) => {
          const items = brandProducts(b, products).slice(0, 8);
          const logo = brandLogo(b, 160);
          return (
            <section
              key={b.id}
              className="overflow-hidden rounded-[calc(var(--radius)+8px)] border border-border bg-card shadow-card"
            >
              <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
                <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                  {logo ? (
                    <img src={logo} alt={b.name} loading="lazy" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-[13px] font-black">{b.mark}</span>
                  )}
                </div>
                <h2 className="min-w-0 flex-1 truncate font-display text-[14px] font-extrabold">
                  {b.name}
                </h2>
                <Link
                  to="/products"
                  search={{ q: b.match_key || b.name }}
                  className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-extrabold text-primary"
                >
                  {label(copy.all, lang)}
                  <ChevronLeft className="size-4 ltr:rotate-180" />
                </Link>
              </div>
              {items.length ? (
                <div className="rail-x p-2.5">
                  {items.map((p) => (
                    <div key={p.id} className="w-[46%] shrink-0 snap-start">
                      <ProductCard product={p} price={priceOf(p.id, p.price)} />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <PageBlocks page="brands" position="bottom" />
    </StoreLayout>
  );
}
