import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bannerIsLive, type BannerRow, type SlotKey } from "@/lib/banners";
import { AdCard } from "@/components/banners/AdCard";

/**
 * Renders the live banners of one paid placement as editorial ad units.
 * Drop it anywhere in the storefront: `<BannerSlot slot="cart" />`.
 */
export function BannerSlot({ slot, className = "" }: { slot: SlotKey; className?: string }) {
  const { data } = useQuery({
    queryKey: ["banner-slot", slot],
    staleTime: 60_000,
    queryFn: async () =>
      ((
        await supabase
          .from("banners")
          .select("*")
          .eq("slot_key", slot)
          .eq("is_active", true)
          .order("sort_order")
      ).data ?? []) as unknown as BannerRow[],
  });

  const items = (data ?? []).filter((b) => bannerIsLive(b));
  if (!items.length) return null;

  return (
    <div
      className={`no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 ${className}`}
    >
      {items.map((b) => (
        <div key={b.id} className="w-[min(100%,340px)] shrink-0 snap-center">
          <AdCard ad={b as unknown as Parameters<typeof AdCard>[0]["ad"]} />
        </div>
      ))}
    </div>
  );
}
