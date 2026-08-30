import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Flame,
  Hourglass,
  PackageOpen,
  Layers,
  Percent,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { gridClass } from "@/lib/design";
import { useDesign } from "@/lib/design-store";
import { ProductCard } from "@/components/ProductCard";
import { CategoryChipRow } from "@/components/CategoryChips";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { dedupeByCatalog } from "@/lib/catalog";
import { monthsLeft } from "@/lib/clearance";
import { effectivePrice, fetchStoreData, type Product } from "@/lib/store";
import { cn } from "@/lib/utils";


type ProductsSearch = {
  cat?: string | undefined;
  q?: string | undefined;
  clearance?: string | undefined;
};

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => ({
    cat: typeof search["cat"] === "string" ? search["cat"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    clearance: typeof search["clearance"] === "string" ? search["clearance"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "المنتجات | دنتال ستور" },
      {
        name: "description",
        content: "تصفح كل أدوات ومواد وأجهزة طب الأسنان مع أسعار محدثة وخصومات فعّالة.",
      },
      { property: "og:title", content: "المنتجات | دنتال ستور" },
      { property: "og:description", content: "كل مستلزمات عيادة الأسنان في مكان واحد." },
    ],
  }),
  component: ProductsPage,
});

type SortKey = "all" | "expiring" | "outlet" | "deals" | "cheapest" | "saving";

function ProductsPage() {
  const { cat, q, clearance } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t } = useI18n();
  const design = useDesign();
  const { data, isLoading } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const [term, setTerm] = useState(q ?? "");
  const [sort, setSort] = useState<SortKey>(
    clearance === "outlet" ? "outlet" : clearance === "near_expiry" ? "expiring" : "all",
  );

  const priceOf = (p: Product) =>
    effectivePrice(
      p,
      data?.offers ?? [],
      data?.offerProducts ?? [],
      1,
      data?.flashDeals ?? [],
      data?.clearanceRules ?? [],
    );

  const rows = data?.products ?? [];
  const filtered = rows.filter((p) => {
    if (cat && p.category_id !== cat) return false;
    if (!term.trim()) return true;
    const s = term.trim().toLowerCase();
    return [p.name_ar, p.name_ku, p.brand, p.sku].some((v) => v?.toLowerCase().includes(s));
  });

  const savingOf = (p: Product) => {
    const price = priceOf(p);
    const ref = Math.max(Number(p.compare_price ?? 0), p.price);
    return ref > price ? (ref - price) / ref : 0;
  };

  const scoped =
    sort === "deals"
      ? filtered.filter((p) => savingOf(p) > 0.001)
      : sort === "expiring"
        ? filtered.filter((p) => p.clearance_kind === "near_expiry" && p.expiry_date)
        : sort === "outlet"
          ? filtered.filter((p) => p.clearance_kind === "outlet")
          : [...filtered];

  const grouped = dedupeByCatalog(scoped, priceOf);
  const offersOf = new Map(grouped.map((g) => [g.product.id, g.offers]));
  const products = grouped.map((g) => g.product).sort((a, b) => {
    if (sort === "cheapest") return priceOf(a) - priceOf(b);
    if (sort === "saving") return savingOf(b) - savingOf(a);
    if (sort === "expiring")
      return (monthsLeft(a.expiry_date) ?? 99) - (monthsLeft(b.expiry_date) ?? 99);
    return 0;
  });

  const dealCount = filtered.filter((p) => savingOf(p) > 0.001).length;

  const chips: { key: SortKey; label: string; icon: typeof Percent }[] = [
    { key: "all", label: t("filterAll"), icon: Layers },
    { key: "expiring", label: t("expiringSoon"), icon: Hourglass },
    { key: "outlet", label: t("outlet"), icon: PackageOpen },
    { key: "deals", label: t("filterDeals"), icon: Percent },
    { key: "cheapest", label: t("filterCheapest"), icon: Wallet },
    { key: "saving", label: t("filterTopSaving"), icon: Flame },
  ];

  return (
    <StoreLayout>
      <PageBlocks page="products" />
      <div className="bg-card px-3 pb-2.5 pt-2.5">
        <h1 className="text-[13px] font-extrabold text-foreground">{t("shopTitle")}</h1>
        {(data?.settings?.show_search ?? true) && (
          <div className="relative mt-2">
            <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("search")}
              className="h-10 rounded-lg border-transparent bg-muted ps-9 text-[13px]"
            />
          </div>
        )}
      </div>

      <div className="dk-sortbar px-3 py-2">
        <div className="rail-x flex gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setSort(c.key)}
              data-on={sort === c.key}
              className="dk-chip active:scale-95"
            >
              <c.icon className="size-3.5" strokeWidth={2.6} />
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <CategoryChipRow
            categories={data?.categories ?? []}
            activeId={cat}
            onSelect={(id) => navigate({ search: id ? { cat: id } : {} })}
          />
        </div>
      </div>

      {!isLoading && (
        <div className="flex items-center gap-2 px-3.5 pt-2.5 text-[11px] font-bold text-muted-foreground">
          <span className="tabular-nums">
            {products.length} {t("productsFound")}
          </span>
          {dealCount > 0 && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Percent className="size-3.5" strokeWidth={2.6} />
              {dealCount} {t("onDeal")}
            </span>
          )}
          <span className="ms-auto inline-flex items-center gap-1 text-success">
            <Wallet className="size-3.5" strokeWidth={2.6} />
            {t("wholesaleNote")}
          </span>
        </div>
      )}

      <div className="px-3 pt-2.5">
        <BannerSlot slot="products_top" />
      </div>

      <div
        className={`${gridClass(design)} items-stretch px-3 py-2.5 pb-24 lg:pb-8`}
        style={{ gap: "var(--grid-gap)" }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))
          : products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                offers={offersOf.get(p.id) ?? 1}
                price={effectivePrice(
                  p,
                  data?.offers ?? [],
                  data?.offerProducts ?? [],
                  1,
                  data?.flashDeals ?? [],
                  data?.clearanceRules ?? [],
                )}
              />
            ))}
      </div>
      {!isLoading && products.length === 0 && (
        <div className="dk-block mx-3 my-6 p-8 text-center">
          <p className="text-sm font-bold text-muted-foreground">{t("noResults")}</p>
        </div>
      )}

      <PageBlocks page="products" position="bottom" />
    </StoreLayout>
  );
}

