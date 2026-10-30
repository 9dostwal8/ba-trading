import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { BundleCard } from "@/components/BundleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n, label } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";

const copy = {
  h1: { ar: "الحزم والكِتات الجاهزة", ku: "پاکێج و کیتی ئامادە", en: "Ready Bundles & Kits" },
  sub: {
    ar: "مجموعات مجهزة لعيادتك — سعر واحد أقل من شراء القطع منفردة",
    ku: "کۆمەڵە ئامادەکراو بۆ کلینیکەکەت — یەک نرخی کەمتر لە کڕینی جیاجیا",
    en: "Curated sets for your clinic — one price, less than buying items individually",
  },
  kits: { ar: "حزمة متاحة", ku: "پاکێجی بەردەست", en: "Bundle available" },
  empty: { ar: "لا توجد حزم حالياً", ku: "ئێستا هیچ پاکێجێک نییە", en: "No bundles available at the moment" },
};

export const Route = createFileRoute("/bundles")({
  head: () => ({
    meta: [
      { title: "الحزم والكِتات | وفّر أكثر بشراء المجموعة" },
      {
        name: "description",
        content: "حزم مستلزمات أسنان جاهزة بسعر واحد أقل من شراء القطع منفردة — كِتات لكل تخصص.",
      },
      { property: "og:title", content: "الحزم والكِتات | وفّر أكثر بشراء المجموعة" },
      { property: "og:description", content: "كِتات مجهزة لعيادة الأسنان بسعر حزمة موفّر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BundlesPage,
});

function BundlesPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const products = data?.products ?? [];
  const bundles = (data?.bundles ?? []).filter((b) => b.is_active !== false);

  return (
    <StoreLayout>
      <PageBlocks page="bundles" />
      <div className="bg-secondary px-4 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Boxes className="size-5" strokeWidth={2.6} />
          </span>
          <h1 className="min-w-0 flex-1 font-display text-[20px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-muted-foreground">
          {label(copy.sub, lang)}
        </p>
        <span className="mt-3 inline-block rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
          {bundles.length} {label(copy.kits, lang)}
        </span>
      </div>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] mx-auto">
        <BannerSlot slot="offers_page" />

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </div>
        )}

        {!isLoading && !bundles.length && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-[13px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}

        {!isLoading && bundles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} products={products} />
            ))}
          </div>
        )}
      </div>
      <PageBlocks page="bundles" position="bottom" />
    </StoreLayout>
  );
}
