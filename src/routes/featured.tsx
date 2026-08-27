import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { pick, useI18n, label } from "@/lib/i18n";
import { effectivePrice, fetchStoreData } from "@/lib/store";

const copy = {
  h1: { ar: "منتجات مختارة", ku: "بەرهەمی هەڵبژێردراو", en: "Featured Products",},
  sub: {
    ar: "الأكثر طلباً من أطباء الأسنان — مختارة من فريقنا",
    ku: "زۆرترین داواکاری لە پزیشکانی ددان — هەڵبژێردراو لەلایەن تیمەکەمان",
    en: "Most requested by dentists — selected by our team",
  },
  count: { ar: "منتج مختار", ku: "بەرهەمی هەڵبژێردراو", en: "Featured Product",},
  empty: { ar: "لا توجد منتجات مختارة", ku: "هیچ بەرهەمی هەڵبژێردراو نییە", en: "No featured products",},
};

export const Route = createFileRoute("/featured")({
  head: () => ({
    meta: [
      { title: "منتجات مختارة | الأكثر طلباً لعيادات الأسنان" },
      {
        name: "description",
        content: "مجموعة مختارة من أكثر مستلزمات طب الأسنان طلباً، بأسعار وخصومات محدثة.",
      },
      { property: "og:title", content: "منتجات مختارة | الأكثر طلباً لعيادات الأسنان" },
      { property: "og:description", content: "أفضل مستلزمات الأسنان المختارة من فريقنا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturedPage,
});

function FeaturedPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
  const items = products.filter((p) => p.is_featured);
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
      <PageBlocks page="featured" />
      <div className="bg-secondary px-4 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" strokeWidth={2.6} />
          </span>
          <h1 className="min-w-0 flex-1 font-display text-[20px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-muted-foreground">
          {label(copy.sub, lang)}
        </p>
        <span className="mt-3 inline-block rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
          {items.length} {label(copy.count, lang)}
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
        ) : items.length ? (
          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}
      </div>
      <PageBlocks page="featured" position="bottom" />
    </StoreLayout>
  );
}
