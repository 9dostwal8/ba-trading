import { useRef, useState } from "react";
import { AdCard, type AdCardData } from "@/components/banners/AdCard";

/**
 * Hero carousel of editorial ad units with snap scrolling and dot indicators.
 */
export function BannerCarousel({ banners }: { banners: AdCardData[] }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    setActive(Math.round(Math.abs(el.scrollLeft) / w));
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {banners.map((b) => (
          <div key={b.id} className="w-full shrink-0 snap-center">
            <AdCard ad={b} />
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={
                i === active ? "h-1.5 w-5 rounded-full bg-primary" : "size-1.5 rounded-full bg-border"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
