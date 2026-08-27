import { Link } from "@tanstack/react-router";
import { categoryIcon, tintStyle } from "@/lib/category-icons";
import { pickName, useI18n } from "@/lib/i18n";
import type { Category } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Colourful category icon tile — used on the home page grid. */
export function CategoryTile({ category }: { category: Category }) {
  const { lang } = useI18n();
  const Icon = categoryIcon(category.icon);
  return (
    <Link
      to="/products"
      search={{ cat: category.id }}
      style={{ ...tintStyle(category.hue, category.chroma), borderColor: "var(--tint-border)" }}
      className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-2.5 text-center shadow-card active:scale-[0.97]"
    >
      <span
        className="grid size-11 place-items-center rounded-xl"
        style={{ background: "var(--tint-soft)", color: "var(--tint-strong)" }}
      >
        <Icon className="size-6" strokeWidth={2.2} />
      </span>
      <span className="line-clamp-2 text-[11px] font-bold leading-tight">
        {pickName(category, lang)}
      </span>
    </Link>
  );
}

/** Horizontal scrollable filter chips with colourful icons. */
export function CategoryChipRow({
  categories,
  activeId,
  onSelect,
}: {
  categories: Category[];
  activeId?: string | undefined;
  onSelect: (id?: string) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      <button
        onClick={() => onSelect(undefined)}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold",
          !activeId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
        )}
      >
        {t("all")}
      </button>
      {categories.map((c) => {
        const Icon = categoryIcon(c.icon);
        const active = activeId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              ...tintStyle(c.hue, c.chroma),
              ...(active
                ? { background: "var(--tint-soft)", borderColor: "var(--tint-strong)" }
                : { borderColor: "var(--tint-border)" }),
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold"
          >
            <Icon
              className="size-4"
              strokeWidth={2.3}
              style={{ color: "var(--tint-strong)" }}
            />
            {pickName(c, lang)}
          </button>
        );
      })}
    </div>
  );
}
