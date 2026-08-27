import { Link } from "@tanstack/react-router";
import { pick, useI18n } from "@/lib/i18n";

export type AdCardData = {
  id: string;
  title_ar: string;
  title_ku: string;
  subtitle_ar?: string | null;
  subtitle_ku?: string | null;
  cta_ar?: string | null;
  cta_ku?: string | null;
  image_url?: string | null;
  bg_color?: string | null;
  link?: string | null;
};

/**
 * Glass ad unit: pure artwork, no copy. The image sits under a frosted glass
 * film with a slow travelling sheen and a gentle breathing zoom.
 */
export function AdCard({ ad, className = "" }: { ad: AdCardData; className?: string }) {
  const { lang, t } = useI18n();
  const alt = pick(ad.title_ar, ad.title_ku, lang);

  const body = (
    <article className={`dk-ad dk-glass dk-glass-sweep group ${className}`}>
      <div className="relative h-[186px] w-full overflow-hidden">
        <span className="dk-glass-ad">{t("sponsored")}</span>
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: ad.bg_color ?? "linear-gradient(120deg,#0b4f9c,#22a7f0)" }}
          />
        )}
      </div>
    </article>
  );

  return ad.link ? (
    <Link to={ad.link as string} className="block active:scale-[0.985]">
      {body}
    </Link>
  ) : (
    body
  );
}
