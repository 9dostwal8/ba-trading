import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { CategoryCircles } from "@/components/home/CategoryCircles";
import { Skeleton } from "@/components/ui/skeleton";
import { pick, useI18n, label } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";

const copy = {
  h1: { ar: "كل الأقسام", ku: "هەموو بەشەکان", en: "All Categories",},
  sub: {
    ar: "اختر قسم عيادتك وتصفح مستلزماته مباشرة",
    ku: "بەشی کلینیکەکەت هەڵبژێرە و کەلوپەلەکانی ببینە",
    en: "Choose your clinic's department and browse its supplies directly",
  },
  count: { ar: "قسم", ku: "بەش", en: "Department",},
  empty: { ar: "لا توجد أقسام", ku: "هیچ بەشێک نییە", en: "No categories available",},
};

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "كل الأقسام | مستلزمات الأسنان" },
      {
        name: "description",
        content: "تصفح أقسام مستلزمات طب الأسنان: ترميم، لبّ الأسنان، تخدير، أجهزة وأدوات وأكثر.",
      },
      { property: "og:title", content: "كل الأقسام | مستلزمات الأسنان" },
      { property: "og:description", content: "كل أقسام مستلزمات عيادة الأسنان في صفحة واحدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const categories = (data?.categories ?? []).filter((c) => c.is_active !== false);

  return (
    <StoreLayout>
      <PageBlocks page="categories" />
      <div className="bg-secondary px-4 pb-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LayoutGrid className="size-5" strokeWidth={2.6} />
          </span>
          <h1 className="min-w-0 flex-1 font-display text-[20px] font-black leading-tight">
            {label(copy.h1, lang)}
          </h1>
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-muted-foreground">
          {label(copy.sub, lang)}
        </p>
        <span className="mt-3 inline-block rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold tabular-nums">
          {categories.length} {label(copy.count, lang)}
        </span>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-[14px]" />
            ))}
          </div>
        ) : categories.length ? (
          <CategoryCircles categories={categories} scroll={false} />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}
      </div>
      <PageBlocks page="categories" position="bottom" />
    </StoreLayout>
  );
}
