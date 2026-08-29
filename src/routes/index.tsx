import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StoreLayout } from "@/components/StoreLayout";
import { HomeSections } from "@/components/HomeSections";
import { DesktopHome } from "@/components/desktop/DesktopHome";
import { RewardBar } from "@/components/home/RewardBar";
import { VendorJoinCta } from "@/components/home/VendorJoinCta";
import { StaffHome } from "@/components/staff/StaffHome";
import { useCanOrder } from "@/hooks/useCanOrder";
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
  const { isStaff, isAdmin, ready } = useCanOrder();
  const search = useRouterState({ select: (st) => st.location.searchStr });
  const previewingStore = search.includes("view=store");

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

  if (ready && isStaff && !previewingStore) {
    return (
      <StoreLayout>
        <StaffHome isAdmin={isAdmin} panelTo={isAdmin ? "/admin" : "/brand"} />
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="w-full">
        {isLoading ? (
          <div className="mx-auto max-w-[var(--page-max,1536px)] space-y-4 px-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile template */}
            <div className="lg:hidden mx-auto max-w-xl px-2 py-2">
              <HomeSections
                sections={data?.homeSections ?? []}
                priceOf={priceOf}
                data={{
                  products: data?.products ?? [],
                  categories: data?.categories ?? [],
                  offers,
                  offerProducts,
                  banners: data?.banners ?? [],
                  brandCards: data?.brandCards ?? [],
                  flashDeals,
                  bundles: data?.bundles ?? [],
                  tiers: data?.tiers ?? [],
                  clearanceRules: data?.clearanceRules ?? [],
                }}
              />
            </div>

            {/* Desktop template */}
            <div className="hidden lg:block w-full">
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
            </div>
          </>
        )}
      </div>
    </StoreLayout>
  );
}
