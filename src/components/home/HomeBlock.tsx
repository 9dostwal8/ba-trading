import { Link } from "@tanstack/react-router";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useDesign } from "@/lib/design-store";

/**
 * Digikala-style home module: a plain white block on the neutral page wash with
 * a bold title row (small red icon + title + "see all" link on the end) and a
 * hairline under the header. Blocks are separated by the gray page background.
 */
export function HomeBlock({
  title,
  seeAll,
  children,
  flush,
  icon: Icon = Sparkles,
  bare,
}: {
  title?: string | null;
  seeAll?: string | null;
  children: ReactNode;
  flush?: boolean;
  icon?: LucideIcon;
  bare?: boolean;
}) {
  const { t } = useI18n();
  const design = useDesign();
  const head = design.section_header;
  const gap = { marginTop: "var(--section-gap)" } as const;

  if (bare)
    return (
      <section className="px-3" style={gap}>
        {children}
      </section>
    );

  return (
    <section className="dk-block mx-3" style={gap}>
      {title ? (
        <div
          className={`dk-head ${head === "plain" ? "" : "border-b border-border/60"} ${
            head === "band" ? "bg-primary text-primary-foreground" : ""
          }`}
        >
          <Icon
            className={`size-[18px] shrink-0 ${head === "band" ? "text-primary-foreground" : "text-primary"}`}
            strokeWidth={2.4}
          />
          <h2
            className={`min-w-0 flex-1 truncate font-display text-[14px] tracking-tight ${
              head === "pill" ? "" : head === "underline" ? "border-b-2 border-primary pb-0.5" : ""
            }`}
            style={{ fontWeight: "var(--heading-weight)" as unknown as number }}
          >
            {head === "pill" ? (
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{title}</span>
            ) : (
              title
            )}
          </h2>
          {seeAll ? (
            <Link
              to={seeAll}
              className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-extrabold active:opacity-70 ${
                head === "band" ? "text-primary-foreground" : "text-primary"
              }`}
            >
              {t("viewAll")}
              <ChevronLeft className="size-4 ltr:rotate-180" />
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}

/** Horizontal rail with edge-to-edge scrolling inside a block. */
export function Rail({ children }: { children: ReactNode }) {
  return <div className="rail-x">{children}</div>;
}
