import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ChevronLeft, Timer } from "lucide-react";
import { useI18n, pick, pickName } from "@/lib/i18n";
import type { Offer, Product } from "@/lib/store";
import { offerHeadline, offerRuleChips } from "@/lib/offer-text";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
  };
}

/**
 * V3 offer card: clean white surface, thin colored accent rail, compact photo
 * strip and a single tidy price/countdown footer. Built for small screens —
 * no tall gradient blocks, no wasted vertical space.
 */
export function OfferCard({
  offer,
  products,
  linkTo,
  categoryName,
}: {
  offer: Offer;
  products: Product[];
  linkTo?: string;
  categoryName?: string | null;
}) {
  const { lang, t } = useI18n();
  const title = pick(offer.title_ar, offer.title_ku, lang);
  const subtitle = pick(offer.subtitle_ar, offer.subtitle_ku, lang);

  const discountText = offerHeadline(offer, lang, t);
  const chips = offerRuleChips(offer, lang, t, { category: categoryName, brand: offer.brand });

  const hue = Number(offer.hue ?? 250);
  const chroma = Number(offer.chroma ?? 0.14);
  const style = {
    "--h": `oklch(0.52 ${chroma} ${hue})`,
    "--h2": `oklch(0.64 ${chroma} ${hue + 14})`,
    "--tint": `oklch(0.95 ${chroma * 0.3} ${hue})`,
    "--soft": `oklch(0.97 ${chroma * 0.18} ${hue})`,
  } as React.CSSProperties;
  const shots = products.filter((p) => p.image_url).slice(0, 3);

  return (
    <article style={style} className="tile-soft relative overflow-hidden">
      {/* accent rail */}
      <span
        className="absolute inset-y-0 start-0 w-1"
        style={{ backgroundImage: "linear-gradient(180deg, var(--h), var(--h2))" }}
      />

      <div className="flex items-start gap-2.5 p-3 ps-4">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{ background: "var(--soft)", color: "var(--h)" }}
        >
          <Sparkles className="size-[18px]" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-display text-[14.5px] font-extrabold leading-6">
            {title}
          </h3>
          {subtitle && (
            <p className="line-clamp-1 text-[11.5px] leading-5 text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-display text-[12.5px] font-extrabold leading-5 text-primary-foreground"
          style={{ backgroundImage: "linear-gradient(120deg, var(--h), var(--h2))" }}
        >
          {discountText}
        </span>
      </div>

      {shots.length > 0 && (
        <div className="flex gap-1.5 px-3 ps-4">
          {shots.map((p) => (
            <div
              key={p.id}
              className="h-[76px] flex-1 overflow-hidden rounded-xl"
              style={{ background: "var(--tint)" }}
            >
              <img
                src={p.image_url ?? ""}
                alt={pickName(p, lang)}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 p-3 ps-4">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold leading-5"
            style={{ background: "var(--soft)", color: "var(--h)" }}
          >
            {c}
          </span>
        ))}
        {offer.ends_at && <CompactCountdown endsAt={offer.ends_at} />}
        {linkTo ? (
          <Link
            to={linkTo}
            className="ms-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold leading-5 text-primary-foreground active:scale-95"
            style={{ backgroundImage: "linear-gradient(120deg, var(--h), var(--h2))" }}
          >
            {t("viewAll")}
            <ChevronLeft className="size-3.5 rtl:rotate-180" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function CompactCountdown({ endsAt }: { endsAt: string }) {
  const { t } = useI18n();
  const [left, setLeft] = useState(() => new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setLeft(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (left <= 0) return null;
  const { d, h, m } = parts(left);
  const pad = (v: number) => String(v).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-extrabold leading-5 text-foreground">
      <Timer className="size-3.5 text-muted-foreground" />
      <span className="tabular-nums">
        {d > 0 ? `${d} ${t("days")} · ` : ""}
        {pad(h)}:{pad(m)}
      </span>
    </span>
  );
}
