import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StoreLayout } from "@/components/StoreLayout";
import { DesktopHome } from "@/components/desktop/DesktopHome";
import { effectivePrice, fetchStoreData } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({


  head: () => ({
    meta: [
      { title: "BA Trading | بي أي تريدنج - عروض ماركات طب الأسنان" },
      {
        name: "description",
        content:
          "عروض وخصومات على ماركات طب الأسنان العالمية: 3M، GC، Tokuyama، Bisco، Eighteeth وغيرها بأسعار الجملة من BA Trading.",
      },
      { property: "og:title", content: "BA Trading | بي أي تريدنج - عروض ماركات طب الأسنان" },
      {
        property: "og:description",
        content: "خصومات على ماركات طب الأسنان العالمية بأسعار الجملة من BA Trading.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });

  const offers = data?.offers ?? [];
  const offerProducts = data?.offerProducts ?? [];
  const flashDeals = data?.flashDeals ?? [];
  const priceOf = (id: string, price: number, qty = 1) => {
    const product = (data?.products ?? []).find((p) => p.id === id);
    return effectivePrice(
      { ...(product ?? {}), id, price },
      offers,
      offerProducts,
      qty,
      flashDeals,
      data?.clearanceRules ?? [],
    );
  };

  return (
    <StoreLayout>
      <div className="w-full pb-20 lg:pb-8">
        {isLoading ? (
          <div className="mx-auto max-w-[var(--page-max,1600px)] 2xl:max-w-[1720px] space-y-4 px-3 py-4 sm:px-6">
            <Skeleton className="h-44 sm:h-64 lg:h-96 w-full rounded-3xl" />
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-56 w-full rounded-3xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <DesktopHome
            priceOf={priceOf}
            data={{
              products: data?.products ?? [],
              categories: data?.categories ?? [],
              banners: data?.banners ?? [],
              brandCards: data?.brandCards ?? [],
              flashDeals,
              bundles: data?.bundles ?? [],
              homeSections: data?.homeSections ?? [],
            }}
          />
        )}
      </div>
    </StoreLayout>
  );
}
