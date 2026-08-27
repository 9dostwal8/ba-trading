import { Award, Boxes, Hourglass, LayoutGrid, Sparkles, Tag } from "lucide-react";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { BrandGrid } from "@/components/home/BrandGrid";
import { BundleRail } from "@/components/home/BundleRail";
import { CategoryCircles } from "@/components/home/CategoryCircles";
import { AmazingRail } from "@/components/home/AmazingRail";
import { HomeBlock, Rail } from "@/components/home/HomeBlock";
import { BannerSlot } from "@/components/BannerSlot";
import { QrScanBar } from "@/components/QrScanBar";
import { TrustRail } from "@/components/TrustRail";
import { ExpiringHero } from "@/components/home/ExpiringHero";
import { OutletGrid } from "@/components/home/OutletGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HelpCta } from "@/components/home/HelpCta";
import { HomeIntro } from "@/components/home/HomeIntro";
import { RewardBar } from "@/components/home/RewardBar";
import { SavingsHero } from "@/components/home/SavingsHero";
import { VendorJoinCta } from "@/components/home/VendorJoinCta";
import { VendorRail } from "@/components/home/VendorRail";
import { PromoStrip } from "@/components/home/PromoStrip";
import { UspStrip } from "@/components/home/UspStrip";
import { ProductCard } from "@/components/ProductCard";
import { CustomBlock } from "@/components/blocks/CustomBlock";
import type { PageBlock } from "@/lib/page-blocks";
import type { PageModule } from "@/lib/page-documents";
import { EditableModule } from "@/components/builder/PageRenderer";

import { brandProducts } from "@/lib/brands";
import { pick, useI18n } from "@/lib/i18n";
import { sectionVars } from "@/lib/theme";
import { gridClass } from "@/lib/design";
import { useDesign } from "@/lib/design-store";
import type { BrandCard } from "@/lib/brands";
import type { ClearanceRule } from "@/lib/clearance";
import type { Bundle, Category, FlashDeal, HomeSection, Offer, Product, ProductTier } from "@/lib/store";

type Data = {
  products: Product[];
  categories: Category[];
  offers: Offer[];
  offerProducts: { offer_id: string; product_id: string }[];
  banners: {
    id: string;
    title_ar: string;
    title_ku: string;
    image_url: string | null;
    link: string | null;
  }[];
  brandCards: BrandCard[];
  flashDeals: FlashDeal[];
  bundles: Bundle[];
  tiers: ProductTier[];
  clearanceRules: ClearanceRule[];
};

/**
 * Doctoreto-style home feed with a fixed top-to-bottom arrangement: blue hero
 * band, service tiles, category medallions, promo banners, deal of the day,
 * offers, bundles, brands, product grids, vendor rail, how-it-works guide and
 * a support / become-a-vendor call to action.
 */
export function HomeSections({
  sections,
  data,
  priceOf,
  blocks,
  modules,
}: {
  sections: HomeSection[];
  data: Data;
  priceOf: (id: string, price: number, qty?: number) => number;
  blocks?: PageBlock[];
  modules?: PageModule[];
}) {
  const live = (sections ?? []).filter((s) => s.is_active);
  const byKind = (kind: string) => live.find((s) => s.kind === kind);

  const renderSection = (section: HomeSection, key?: string) => (
    <div key={key ?? section.id} style={sectionVars(section.hue, section.chroma) as import("react").CSSProperties}>
      <SectionBlock section={section} data={data} priceOf={priceOf} />
    </div>
  );

  const moduleSectionKey = (id: string) => ({
    "flash-deals": "hero",
    "near-expiry": "expiring",
  } as Record<string, string>)[id] ?? id;

  if (modules?.length) {
    return (
      <div className="flex flex-col pb-10">
        {modules.map((module) => {
          const key = moduleSectionKey(module.id);
          const configured = byKind(key);
          let content: React.ReactNode = null;
          if (configured) {
            const title = module.content.title;
            const section = title
              ? {
                  ...configured,
                  title_ar: title.ar ?? configured.title_ar,
                  title_ku: title.ku ?? configured.title_ku,
                }
              : configured;
            content = renderSection(section, module.id);
          } else {
            const staticKey = ({
              "trust-strip": "usp",
              suppliers: "vendor_rail",
              "how-it-works": "how_it_works",
              "help-cta": "help_cta",
              "reward-bar": "reward_bar",
            } as Record<string, string>)[module.id];
            if (staticKey) content = <StaticSection sectionKey={staticKey} />;
          }
          if (!content) return null;
          return <EditableModule key={module.id} module={module}>{content}</EditableModule>;
        })}
      </div>
    );
  }

  // Builder-driven feed: the admin's drag & drop order wins.
  const composed = (blocks ?? []).filter((b) => b.is_active);
  if (composed.length) {
    return (
      <div className="flex flex-col pb-10">
        {composed.map((b) => {
          if (b.kind !== "section") return <CustomBlock key={b.id} block={b} />;
          const key = b.config.section ?? "";
          const section = byKind(key);
          if (section) return renderSection(section, b.id);
          return <StaticSection key={b.id} sectionKey={key} slot={b.config.slot} />;
        })}

      </div>
    );
  }

  // Legacy fallback: fixed Digikala reading order.
  const order = [
    "banners",
    "categories",
    "hero",
    "expiring",
    "outlet",
    "offers",
    "bundles",
    "brands",
    "featured",
    "newest",
  ];
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  const sorted = [...live].sort((a, b) => rank(a.kind) - rank(b.kind));
  const group = (kinds: string[]) => sorted.filter((s) => kinds.includes(s.kind));
  const render = (list: HomeSection[]) => list.map((s) => renderSection(s));

  return (
    <div className="flex flex-col pb-10">
      {render(group(["banners"]))}
      {render(group(["categories"]))}
      {render(group(["hero"]))}
      <UspStrip />
      <div className="px-3 pt-2.5">
        <BannerSlot slot="home_below_hero" />
      </div>
      {render(group(["expiring", "outlet"]))}
      {render(group(["offers"]))}
      <div className="px-3 pt-2.5">
        <BannerSlot slot="home_mid" />
      </div>
      {render(group(["bundles", "brands"]))}
      {render(group(["featured", "newest"]))}
      {render(sorted.filter((s) => rank(s.kind) === order.length))}
      <VendorRail />
      <HowItWorks />
      <HelpCta />
      <div className="px-3 pt-2.5">
        <BannerSlot slot="home_footer" />
      </div>
    </div>
  );
}

/**
 * Data-free app modules (trust strips, reward bar, CTAs, ad slots, QR bar) that
 * the page builder can place on any page.
 */
export function StaticSection({ sectionKey, slot }: { sectionKey: string; slot?: string | undefined }) {
  switch (sectionKey) {
    case "usp":
      return <UspStrip />;
    case "vendor_rail":
      return <VendorRail />;
    case "how_it_works":
      return <HowItWorks />;
    case "help_cta":
      return <HelpCta />;
    case "home_intro":
      return <HomeIntro />;
    case "trust_rail":
      return (
        <div className="px-3 pt-2.5">
          <TrustRail />
        </div>
      );
    case "savings_hero":
      return (
        <div className="px-3 pt-2.5">
          <SavingsHero />
        </div>
      );
    case "qr_scan":
      return (
        <div className="px-3 pt-2.5">
          <QrScanBar />
        </div>
      );
    case "reward_bar":
      return (
        <div className="px-3 pt-2.5">
          <RewardBar />
        </div>
      );
    case "vendor_join_cta":
      return (
        <div className="px-3 pt-2.5">
          <VendorJoinCta />
        </div>
      );
    case "banner_slot":
      return (
        <div className="px-3 pt-2.5">
          <BannerSlot slot={(slot ?? "home_mid") as import("@/lib/banners").SlotKey} />
        </div>
      );
    default:
      return null;
  }
}


export function SectionBlock({
  section,
  data,
  priceOf,
}: {
  section: HomeSection;
  data: Data;
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  const { lang, t } = useI18n();
  const design = useDesign();
  const limit = Math.max(1, Number(section.item_limit) || 8);
  const title = section.show_title ? pick(section.title_ar, section.title_ku, lang) : null;

  switch (section.kind) {
    case "banners": {
      const items = (data.banners ?? []).slice(0, limit);
      if (!items.length) return null;
      return (
        <HomeBlock bare>
          <BannerCarousel banners={items} />
        </HomeBlock>
      );
    }
    case "expiring": {
      const items = (data.products ?? []).filter(
        (p) => p.clearance_kind === "near_expiry" && p.expiry_date,
      );
      if (!items.length) return null;
      return (
        <HomeBlock bare>
          <ExpiringHero
            products={items.slice(0, limit)}
            rules={data.clearanceRules ?? []}
            priceOf={priceOf}
          />
        </HomeBlock>
      );
    }

    case "outlet": {
      const items = (data.products ?? []).filter((p) => p.clearance_kind === "outlet");
      if (!items.length) return null;
      return (
        <HomeBlock bare>
          <OutletGrid products={items.slice(0, limit)} priceOf={priceOf} />
        </HomeBlock>
      );
    }
    case "categories": {
      const items = (data.categories ?? []).slice(0, Math.max(limit, 20));
      if (!items.length) return null;
      return (
        <HomeBlock title={title} seeAll="/categories" icon={LayoutGrid}>
          <CategoryCircles categories={items} />

        </HomeBlock>
      );
    }
    case "hero": {
      const items = (data.flashDeals ?? []).slice(0, Math.max(limit, 8));
      if (!items.length) return null;
      return (
        <HomeBlock bare>
          <AmazingRail deals={items} products={data.products ?? []} priceOf={priceOf} />
        </HomeBlock>
      );
    }


    case "offers": {
      const items = (data.offers ?? []).slice(0, limit);
      if (!items.length) return null;
      return (
        <HomeBlock title={title} seeAll="/offers" icon={Tag}>
          <PromoStrip
            offers={items}
            productsFor={(o) => {
              const ids = (data.offerProducts ?? [])
                .filter((op) => op.offer_id === o.id)
                .map((op) => op.product_id);
              return (data.products ?? []).filter((p) => ids.includes(p.id));
            }}
          />
        </HomeBlock>
      );
    }
    case "bundles": {
      const items = (data.bundles ?? []).slice(0, limit);
      if (!items.length) return null;
      return (
        <HomeBlock title={title} seeAll="/bundles" icon={Boxes}>
          <BundleRail bundles={items} products={data.products ?? []} />
        </HomeBlock>
      );
    }
    case "brands": {
      const brands = (data.brandCards ?? []).slice(0, limit);
      if (!brands.length) return null;
      return (
        <>
          <HomeBlock title={title} seeAll="/brands" icon={Award}>
            <BrandGrid brands={brands} />
          </HomeBlock>
          {brands.slice(0, 4).map((b) => {
            const items = brandProducts(b, data.products ?? []).slice(0, 8);
            if (!items.length) return null;
            return (
              <HomeBlock key={b.id} title={b.name} seeAll="/brands" icon={Award}>
                <Rail>
                  {items.map((p) => (
                    <div key={p.id} className="w-[46%] shrink-0 snap-start">
                      <ProductCard product={p} price={priceOf(p.id, p.price)} />
                    </div>
                  ))}
                </Rail>
              </HomeBlock>
            );
          })}
        </>
      );
    }
    case "featured":
    case "newest": {
      const pool = data.products ?? [];
      const items = (section.kind === "featured" ? pool.filter((p) => p.is_featured) : pool).slice(
        0,
        limit,
      );
      if (!items.length) return null;
      return (
        <HomeBlock
          title={title}
          seeAll={section.kind === "featured" ? "/featured" : "/new"}
          icon={Sparkles}
        >
          <div className={`${gridClass(design)} items-stretch`} style={{ gap: "var(--grid-gap)" }}>
            {items.map((p) => (
              <ProductCard key={p.id} product={p} price={priceOf(p.id, p.price)} />
            ))}
          </div>
        </HomeBlock>
      );
    }
    default:
      return null;
  }
}
