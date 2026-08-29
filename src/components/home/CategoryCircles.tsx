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
    const hasValidImage = c.image_url && !c.image_url.startsWith("/__l5e");
    return (
      <Link
        key={c.id}
        to="/products"
        search={{ cat: c.id }}
        className="group flex h-full w-full flex-col items-center justify-between gap-2 p-1 active:scale-[0.97]"
      >
        <div
          style={tintStyle(c.hue, c.chroma)}
          className="flex size-15 sm:size-16 items-center justify-center rounded-2xl p-2.5 shadow-sm transition-all group-hover:scale-105 border border-slate-100/60 group-hover:shadow-md"
        >
          {hasValidImage ? (
            <img
              src={c.image_url!}
              alt={pickName(c, lang)}
              loading="lazy"
              width={512}
              height={512}
              className="size-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                }
              }}
            />
          ) : null}
          <div
            className="size-full items-center justify-center"
            style={{ display: hasValidImage ? "none" : "flex" }}
          >
            <Icon
              className="size-7"
              strokeWidth={2}
              style={{ color: "var(--tint-strong)" }}
            />
          </div>
        </div>
        <span className="line-clamp-2 text-center text-[11.5px] font-bold text-slate-700 leading-tight group-hover:text-primary transition-colors">
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


