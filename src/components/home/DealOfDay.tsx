import { FlashHero } from "@/components/FlashHero";
import type { FlashDeal, Product } from "@/lib/store";

/**
 * Hero section: renders the active flash deals as a horizontal scroll of
 * ultra-premium dark product cards.
 */
export function DealOfDay({
  deals,
  products,
  priceOf,
}: {
  deals: FlashDeal[];
  products: Product[];
  priceOf: (id: string, price: number, qty?: number) => number;
}) {
  return <FlashHero deals={deals} products={products} priceOf={priceOf} />;
}
