import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronLeft, QrCode, Store } from "lucide-react";
import { StoreLayout } from "@/components/StoreLayout";
import { PageBlocks } from "@/components/blocks/PageBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { brandLogo } from "@/lib/brands";
import { tintStyle } from "@/lib/category-icons";
import { pick, useI18n } from "@/lib/i18n";
import { fetchVendors } from "@/lib/vendor-public";

export const Route = createFileRoute("/vendors")({
  head: () => ({
    meta: [
      { title: "الموردون والماركات | دنتال ستور" },
      {
        name: "description",
        content: "تعرّف على موردي مستلزمات طب الأسنان وشاهد عروض ومنتجات كل مورد.",
      },
      { property: "og:title", content: "الموردون والماركات | دنتال ستور" },
      { property: "og:description", content: "صفحات الموردين وعروض كل مورد في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const { t, lang } = useI18n();
  const { data: vendors, isLoading } = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });

  return (
    <StoreLayout>
      <PageBlocks page="vendors" />
      <section className="border-b border-border/60 bg-card px-4 pb-3.5 pt-3">
        <h1 className="text-[17px] font-extrabold leading-tight">{t("vendorsTitle")}</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("vendorsSub")}</p>
        <Link
          to="/scan"
          className="dk-chip mt-2.5 inline-flex"
          data-on="true"
        >
          <QrCode className="size-3.5" strokeWidth={2.6} />
          {t("scanQr")}
        </Link>
      </section>


      <div className="space-y-2 p-3 pb-10">
        {isLoading && <Skeleton className="h-24 rounded-xl" />}
        {(vendors ?? []).map((v) => {
          const logo = brandLogo(v, 160);
          const tagline = pick(v.tagline_ar, v.tagline_ku, lang);
          return (
            <Link
              key={v.id}
              to="/vendor/$slug"
              params={{ slug: v.slug }}
              style={tintStyle(v.hue, v.chroma)}
              className="dk-block flex items-center gap-3 p-3 active:scale-[0.99]"
            >
              <span
                className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg"
                style={{ background: "var(--tint-soft)", color: "var(--tint-strong)" }}
              >
                {logo ? (
                  <img src={logo} alt={v.name} loading="lazy" className="size-10 object-contain" />
                ) : (
                  <Store className="size-6" strokeWidth={2.4} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1 truncate text-[14px] font-extrabold">
                  <span className="truncate">{v.name}</span>
                  {v.is_verified && (
                    <BadgeCheck className="size-4 shrink-0 text-primary" strokeWidth={2.6} />
                  )}
                </p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {tagline || (v.brands ?? []).slice(0, 3).join(" · ") || v.city}
                </p>
                <span className="mt-1 inline-block font-mono text-[10px] font-bold text-primary" dir="ltr">
                  {v.code}
                </span>
              </div>
              <ChevronLeft className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" />
            </Link>
          );
        })}
        {!isLoading && (vendors ?? []).length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noResults")}</p>
        )}
      </div>
      <PageBlocks page="vendors" position="bottom" />
    </StoreLayout>
  );
}
