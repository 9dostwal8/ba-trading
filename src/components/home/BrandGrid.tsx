import { Link } from "@tanstack/react-router";
import { brandLogo, type BrandCard } from "@/lib/brands";

/** Top-brands logo grid: soft tiles with the transparent brand logo centred. */
export function BrandGrid({ brands }: { brands: BrandCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {brands.map((b) => {
        const logo = brandLogo(b, 160);
        return (
          <Link
            key={b.id}
            to="/products"
            search={{ q: b.match_key || b.name }}
            className="grid h-[64px] place-items-center rounded-2xl border border-border/70 bg-gradient-to-b from-secondary/50 to-card px-2 shadow-soft active:scale-[0.97]"
          >
            {logo ? (
              <img
                src={logo}
                alt={b.name}
                loading="lazy"
                className="max-h-9 w-full object-contain"
              />
            ) : (
              <span className="font-display text-[12px] font-extrabold">{b.mark || b.name}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
