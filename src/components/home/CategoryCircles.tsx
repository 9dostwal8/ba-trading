import { Link } from "@tanstack/react-router";
import { categoryIcon, tintStyle } from "@/lib/category-icons";
import { pickName, useI18n } from "@/lib/i18n";
import type { Category } from "@/lib/store";

/**
 * Category entry point, Digikala style: identical plain white cards with a
 * rounded corner, the illustration on top and the label inside the card.
 * Horizontal rail by default.
 */
export function CategoryCircles({
  categories,
  scroll = true,
}: {
  categories: Category[];
  scroll?: boolean;
}) {
  const { lang } = useI18n();
  const item = (c: Category) => {
    const Icon = categoryIcon(c.icon);
    return (
      <Link
        key={c.id}
        to="/products"
        search={{ cat: c.id }}
        style={tintStyle(c.hue, c.chroma)}
        className="flex h-full w-full flex-col items-center justify-between gap-2 rounded-[14px] border border-border bg-card px-2 pb-2.5 pt-3 active:scale-[0.97]"
      >
        {c.image_url ? (
          <img
            src={c.image_url}
            alt={pickName(c, lang)}
            loading="lazy"
            width={512}
            height={512}
            className="size-[46px] object-contain"
          />
        ) : (
          <Icon
            className="size-[38px]"
            strokeWidth={1.8}
            style={{ color: "var(--tint-strong)" }}
          />
        )}
        <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight">
          {pickName(c, lang)}
        </span>
      </Link>
    );
  };

  if (scroll) {
    return (
      <div className="rail-x">
        {categories.map((c) => (
          <div key={c.id} className="h-[104px] w-[84px] shrink-0 scroll-ms-3">
            {item(c)}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((c) => (
        <div key={c.id} className="h-[104px]">
          {item(c)}
        </div>
      ))}
    </div>
  );
}


