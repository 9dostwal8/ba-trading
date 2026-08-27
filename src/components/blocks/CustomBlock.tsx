import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { marketingIcon } from "@/lib/marketing-icons";
import type { BlockConfig, BlockTone, PageBlock } from "@/lib/page-blocks";

type Lang = "ar" | "ku" | "en";

const text = (c: BlockConfig, key: "title" | "body" | "button", lang: Lang) => {
  const v = c[`${key}_${lang}` as keyof BlockConfig] as string | undefined;
  return (v || (c[`${key}_en` as keyof BlockConfig] as string | undefined) || "").trim();
};

const TONE: Record<BlockTone, { text: string; soft: string; ring: string; solid: string; from: string }> = {
  primary: { text: "text-primary", soft: "bg-primary/10", ring: "border-primary/40", solid: "bg-primary text-primary-foreground", from: "from-primary/90 to-primary/60" },
  success: { text: "text-success", soft: "bg-success/10", ring: "border-success/40", solid: "bg-success text-success-foreground", from: "from-success/90 to-success/60" },
  info: { text: "text-info", soft: "bg-info/10", ring: "border-info/40", solid: "bg-info text-info-foreground", from: "from-info/90 to-info/60" },
  warning: { text: "text-warning", soft: "bg-warning/15", ring: "border-warning/40", solid: "bg-warning text-warning-foreground", from: "from-warning/90 to-warning/60" },
  neutral: { text: "text-foreground", soft: "bg-secondary", ring: "border-border", solid: "bg-foreground text-background", from: "from-foreground/85 to-foreground/60" },
};

const RATIO: Record<string, string> = { "16:9": "16 / 9", "4:3": "4 / 3", "1:1": "1 / 1", "21:9": "21 / 9" };
const SIZE = { sm: "text-[12.5px]", md: "text-[14px]", lg: "text-[17px]" } as const;

/** Wrapper that paints the chosen frame style around any custom block. */
function Frame({ block, children }: { block: PageBlock; children: React.ReactNode }) {
  const c = block.config;
  const tone = TONE[c.tone ?? "primary"];
  const frame = c.frame ?? "card";
  const base = "mx-3 overflow-hidden";
  const style = { marginTop: "var(--section-gap)", borderRadius: "var(--card-radius)" } as const;

  if (frame === "none")
    return (
      <section className="mx-3" style={{ marginTop: "var(--section-gap)" }}>
        {children}
      </section>
    );
  if (frame === "dashed")
    return (
      <section className={`${base} border-2 border-dashed ${tone.ring} ${tone.soft} p-3`} style={style}>
        {children}
      </section>
    );
  if (frame === "soft")
    return (
      <section className={`${base} ${tone.soft} p-3`} style={style}>
        {children}
      </section>
    );
  if (frame === "band")
    return (
      <section className={`${base} ${tone.solid} p-3`} style={style}>
        {children}
      </section>
    );
  if (frame === "gradient")
    return (
      <section
        className={`${base} bg-gradient-to-br ${tone.from} p-4 text-primary-foreground`}
        style={style}
      >
        {children}
      </section>
    );
  return (
    <section
      className={`${base} border border-border bg-card p-3`}
      style={{ ...style, boxShadow: "var(--card-shadow)" }}
    >
      {children}
    </section>
  );
}

function BlockLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (href.startsWith("/"))
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

/** Renders one admin-composed block (text, icon row, image/banner or CTA). */
export function CustomBlock({ block }: { block: PageBlock }) {
  const { lang } = useI18n();
  const c = block.config;
  const tone = TONE[c.tone ?? "primary"];
  const align = (c.align ?? "center") === "center" ? "text-center items-center" : "text-start items-start";
  const inverted = (c.frame ?? "card") === "band" || (c.frame ?? "card") === "gradient";
  const Icon = marketingIcon(c.icon);
  const title = text(c, "title", lang as Lang);
  const body = text(c, "body", lang as Lang);

  if (block.kind === "text")
    return (
      <Frame block={block}>
        <div className={`flex flex-col gap-1.5 ${align}`}>
          {c.icon ? (
            <span
              className={`grid size-9 place-items-center rounded-full ${inverted ? "bg-background/20" : tone.soft} ${inverted ? "" : tone.text}`}
            >
              <Icon className="size-[18px]" strokeWidth={2.6} />
            </span>
          ) : null}
          {title ? (
            <h3
              className={`font-display leading-snug ${SIZE[c.size ?? "md"]} ${inverted ? "" : tone.text}`}
              style={{ fontWeight: "var(--heading-weight)" as unknown as number }}
            >
              {title}
            </h3>
          ) : null}
          {body ? (
            <p className={`text-[12px] font-bold leading-relaxed ${inverted ? "opacity-90" : "text-muted-foreground"}`}>
              {body}
            </p>
          ) : null}
        </div>
      </Frame>
    );

  if (block.kind === "icons") {
    const items = c.items ?? [];
    if (!items.length) return null;
    const cols = Math.min(Math.max(c.cols ?? 3, 2), 6);
    return (
      <Frame block={block}>
        {title ? (
          <h3
            className={`mb-2.5 text-center font-display text-[13.5px] ${inverted ? "" : tone.text}`}
            style={{ fontWeight: "var(--heading-weight)" as unknown as number }}
          >
            {title}
          </h3>
        ) : null}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((it, i) => {
            const ItemIcon = marketingIcon(it.icon);
            const label = (lang === "ar" ? it.ar : lang === "ku" ? it.ku : it.en) || it.en || it.ar;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={`grid size-10 place-items-center rounded-2xl ${inverted ? "bg-background/20" : tone.soft} ${inverted ? "" : tone.text}`}
                >
                  <ItemIcon className="size-[19px]" strokeWidth={2.5} />
                </span>
                <span className="text-[10.5px] font-extrabold leading-tight">{label}</span>
              </div>
            );
          })}
        </div>
      </Frame>
    );
  }

  if (block.kind === "image") {
    if (!c.image_url) return null;
    const img = (
      <div className="overflow-hidden" style={{ borderRadius: "var(--card-radius)" }}>
        <img
          src={c.image_url}
          alt={title || "banner"}
          loading="lazy"
          className="w-full object-cover"
          style={{ aspectRatio: RATIO[c.ratio ?? "16:9"] }}
        />
      </div>
    );
    return (
      <Frame block={block}>
        {c.href ? <BlockLink href={c.href}>{img}</BlockLink> : img}
        {title ? <p className="pt-2 text-center text-[12px] font-extrabold">{title}</p> : null}
      </Frame>
    );
  }

  // CTA
  const label = text(c, "button", lang as Lang);
  return (
    <Frame block={block}>
      <div className={`flex flex-col gap-2 ${align}`}>
        <span
          className={`grid size-10 place-items-center rounded-2xl ${inverted ? "bg-background/20" : tone.soft} ${inverted ? "" : tone.text}`}
        >
          <Icon className="size-5" strokeWidth={2.6} />
        </span>
        {title ? (
          <h3
            className="font-display text-[15px] leading-snug"
            style={{ fontWeight: "var(--heading-weight)" as unknown as number }}
          >
            {title}
          </h3>
        ) : null}
        {body ? (
          <p className={`text-[12px] font-bold leading-relaxed ${inverted ? "opacity-90" : "text-muted-foreground"}`}>
            {body}
          </p>
        ) : null}
        {label ? (
          <BlockLink
            href={c.href || "/"}
            className={`mt-1 inline-flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-black ${
              inverted ? "bg-background text-foreground" : tone.solid
            }`}
          >
            {label}
            <ArrowLeft className="size-4 ltr:rotate-180" strokeWidth={2.8} />
          </BlockLink>
        ) : null}
      </div>
    </Frame>
  );
}
