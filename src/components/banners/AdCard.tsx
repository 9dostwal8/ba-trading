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
    <article className={`dk-ad group h-full w-full ${className}`}>
      <div className="relative h-full w-full overflow-hidden">
        <span className="dk-glass-ad">{t("sponsored")}</span>
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={alt}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
              }
            }}
            className="h-full w-full object-cover"
          />
        ) : null}
        <div
          className="h-full w-full items-center justify-center p-4 text-center font-bold text-white"
          style={{
            display: ad.image_url ? "none" : "flex",
            background: ad.bg_color ?? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
          }}
        >
          <span className="text-sm font-extrabold">{alt || t("storeName")}</span>
        </div>
      </div>
    </article>
  );

  return ad.link ? (
    <Link to={ad.link as string} className="block h-full w-full active:scale-[0.985]">
      {body}
    </Link>
  ) : (
    body
  );
}
