import { useQuery } from "@tanstack/react-query";
import { SectionBlock, StaticSection } from "@/components/HomeSections";
import { effectivePrice, fetchStoreData, type HomeSection, type HomeSectionKind } from "@/lib/store";
import { sectionVars } from "@/lib/theme";

/** Section keys that need no store data — rendered straight from StaticSection. */
const STATIC_KEYS = [
  "usp",
  "vendor_rail",
  "how_it_works",
  "help_cta",
  "home_intro",
  "trust_rail",
  "savings_hero",
  "qr_scan",
  "reward_bar",
  "vendor_join_cta",
  "banner_slot",
];

/**
 * Renders one built-in marketplace module (near-expiry rail, outlet grid,
 * bundles, brands, banners, trust strip, reward bar, …) anywhere in the app, so
 * the page builder can drop real store sections into any page.
 */
export function NativeSection({ sectionKey, slot }: { sectionKey: string; slot?: string | undefined }) {
  const { data: store } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
    staleTime: 5 * 60_000,
  });

  if (STATIC_KEYS.includes(sectionKey)) return <StaticSection sectionKey={sectionKey} slot={slot} />;

  if (!store) return null;

  const configured = (store.homeSections ?? []).find((s) => s.kind === sectionKey);
  const section: HomeSection =
    configured ??
    ({
      id: `native-${sectionKey}`,
      kind: sectionKey as HomeSectionKind,
      title_ar: "",
      title_ku: "",
      layout: "rail",
      item_limit: 8,
      hue: 250,
      chroma: 0.12,
      show_title: true,
      sort_order: 0,
      is_active: true,
    } satisfies HomeSection);

  const priceOf = (id: string, price: number, qty = 1) => {
    const product = (store.products ?? []).find((p) => p.id === id);
    return effectivePrice(
      { ...(product ?? {}), id, price },
      store.offers ?? [],
      store.offerProducts ?? [],
      qty,
      store.flashDeals ?? [],
      store.clearanceRules ?? [],
    );
  };

  return (
    <div style={sectionVars(section.hue, section.chroma) as import("react").CSSProperties}>
      <SectionBlock section={section} data={store as never} priceOf={priceOf} />
    </div>
  );
}
