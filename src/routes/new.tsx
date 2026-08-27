import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { pick, useI18n, label } from "@/lib/i18n";
import { effectivePrice, fetchStoreData } from "@/lib/store";

const copy = {
  h1: { ar: "أحدث الإضافات", ku: "نوێترین زیادکراوەکان", en: "Latest Arrivals",},
  sub: {
    ar: "أحدث ما وصل من الموردين — كن أول من يجرّبه",
    ku: "نوێترین گەیشتووەکان لە فرۆشیارەکان — یەکەم کەس بە بەکارهێنانی",
    en: "The newest from our suppliers — be the first to try it",
  },
  count: { ar: "منتج جديد", ku: "بەرهەمی نوێ", en: "New Product",},
  empty: { ar: "لا توجد منتجات جديدة", ku: "هیچ بەرهەمی نوێ نییە", en: "No new products",},
};

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "أحدث الإضافات | مستلزمات أسنان جديدة" },
      {
        name: "description",
        content: "أحدث مستلزمات طب الأسنان التي أضافها الموردون إلى المتجر — وصلت للتو.",
      },
      { property: "og:title", content: "أحدث الإضافات | مستلزمات أسنان جديدة" },
      { property: "og:description", content: "أحدث ما وصل من مستلزمات طب الأسنان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewPage,
});

function NewPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
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
      <PageBlocks page="new" />
      <div className="bg-secondary px-4 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Rocket className="size-5" strokeWidth={2.6} />
          </span>
          <h1 className="min-w-0 flex-1 font-display text-[20px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-muted-foreground">
          {label(copy.sub, lang)}
        </p>
        <span className="mt-3 inline-block rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
          {products.length} {label(copy.count, lang)}
        </span>
      </div>

      <div className="space-y-4 p-3">
        <BannerSlot slot="offers_page" />
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}
      </div>
      <PageBlocks page="new" position="bottom" />
    </StoreLayout>
  );
}
