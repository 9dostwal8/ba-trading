import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { HomeBlock, Rail } from "@/components/home/HomeBlock";
import { brandLogo } from "@/lib/brands";
import { tintStyle } from "@/lib/category-icons";
import { pick, useI18n } from "@/lib/i18n";
import { fetchVendors } from "@/lib/vendor-public";

/** Horizontal rail of clickable vendor cards leading to each vendor profile. */
export function VendorRail() {
  const { t, lang } = useI18n();
  const { data: vendors } = useQuery({ queryKey: ["vendors"], queryFn: fetchVendors });
  const items = (vendors ?? []).slice(0, 12);
  if (!items.length) return null;

  return (
    <HomeBlock title={t("vendorsTitle")} seeAll="/vendors" icon={Store}>
      <Rail>
        {items.map((v) => {
          const logo = brandLogo(v, 160);
          const tagline = pick(v.tagline_ar, v.tagline_ku, lang);
          return (
            <Link
              key={v.id}
              to="/vendor/$slug"
              params={{ slug: v.slug }}
              style={tintStyle(v.hue, v.chroma)}
              className="w-[38%] shrink-0 snap-start rounded-2xl border bg-card p-2.5 text-center shadow-soft active:scale-[0.98]"
            >
              <span
                className="mx-auto grid size-14 place-items-center overflow-hidden rounded-2xl"
                style={{ background: "var(--tint-soft)", color: "var(--tint-strong)" }}
              >
                {logo ? (
                  <img src={logo} alt={v.name} loading="lazy" className="size-10 object-contain" />
                ) : (
                  <Store className="size-6" strokeWidth={2.4} />
                )}
              </span>
              <p className="mt-1.5 truncate text-[12px] font-extrabold">{v.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{tagline || v.city}</p>
            </Link>
          );
        })}
      </Rail>
    </HomeBlock>
  );
}
