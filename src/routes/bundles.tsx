import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { BannerSlot } from "@/components/BannerSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, pick, pickName, useI18n, label } from "@/lib/i18n";
import { fetchStoreData } from "@/lib/store";
import type { Product } from "@/lib/store";

const copy = {
  h1: { ar: "الحزم والكِتات الجاهزة", ku: "پاکێج و کیتی ئامادە", en: "Ready Bundles & Kits",},
  sub: {
    ar: "مجموعات مجهزة لعيادتك — سعر واحد أقل من شراء القطع منفردة",
    ku: "کۆمەڵە ئامادەکراو بۆ کلینیکەکەت — یەک نرخی کەمتر لە کڕینی جیاجیا",
    en: "Curated sets for your clinic — one price, less than buying items individually",
  },
  kits: { ar: "حزمة متاحة", ku: "پاکێجی بەردەست", en: "Bundle available",},

  pieces: { ar: "قطعة", ku: "دانە", en: "item",},
  kit: { ar: "سعر الحزمة", ku: "نرخی پاکێج", en: "Package Price",},
  view: { ar: "احصل على الحزمة", ku: "پاکێجەکە وەرگرە", en: "Get the bundle",},
  empty: { ar: "لا توجد حزم حالياً", ku: "ئێستا هیچ پاکێجێک نییە", en: "No bundles available at the moment",},
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

      <div className="space-y-3 p-3">
        <BannerSlot slot="offers_page" />

        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}

        {!isLoading && !bundles.length && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-[12.5px] font-bold text-muted-foreground">
            {label(copy.empty, lang)}
          </div>
        )}

        {bundles.map((b) => {
          const items = (b.product_ids ?? [])
            .map((id) => products.find((p) => p.id === id))
            .filter(Boolean) as Product[];
          const compare = Number(b.compare_price ?? 0);
          const price = Number(b.price);
          const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
          const tiles = items.slice(0, 4);
          const extra = items.length - tiles.length;

          return (
            <Link
              key={b.id}
              to="/bundle/$id"
              params={{ id: b.id }}
              className="block overflow-hidden rounded-[calc(var(--radius)+12px)] border border-border bg-card shadow-card active:scale-[0.99]"
            >
              <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
                <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-tight text-accent-foreground">
                  {label(copy.kit, lang)}
                </span>
                {off > 0 ? (
                  <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                    -{off}%
                  </span>
                ) : null}
              </div>

              <div className="px-3.5">
                <div className="relative grid grid-cols-4 gap-2 rounded-[calc(var(--radius)+8px)] border border-border/60 bg-secondary/40 p-2">
                  {(tiles.length ? tiles : [{ id: "x", image_url: b.image_url } as unknown as Product]).map(
                    (p, i) => (
                      <div
                        key={`${p.id}-${i}`}
                        className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-card"
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={pickName(p, lang) || ""}
                            loading="lazy"
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-2xl">🦷</span>
                        )}
                        {i === 3 && extra > 0 ? (
                          <span className="absolute inset-0 grid place-items-center bg-foreground/60 text-[13px] font-black text-background">
                            +{extra}
                          </span>
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="px-3.5 pt-2.5">
                <p className="line-clamp-2 text-[13px] font-extrabold leading-tight text-foreground">
                  {pick(b.title_ar, b.title_ku, lang)}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground">
                  <Plus className="size-3" strokeWidth={3} />
                  {items.length} {label(copy.pieces, lang)}
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-border px-3.5 py-2.5">
                <div className="min-w-0">
                  {compare > price ? (
                    <span className="block text-[10.5px] font-bold tabular-nums text-muted-foreground line-through">
                      {formatPrice(compare, lang)}
                    </span>
                  ) : null}
                  <span className="price-lg block text-[15px] text-foreground">
                    {formatPrice(price, lang)}
                  </span>
                </div>
                <span className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-[11.5px] font-extrabold text-primary-foreground">
                  {label(copy.view, lang)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <PageBlocks page="bundles" position="bottom" />
    </StoreLayout>
  );
}
