import { useEffect } from "react";
import type { StoreSettings } from "@/lib/store";
import { pick, setCurrencyLabels, type Lang } from "@/lib/i18n";

function setMeta(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setIcon(href: string) {
  if (!href) return;
  document.head.querySelectorAll("link[rel~='icon']").forEach((n) => n.remove());
  const el = document.createElement("link");
  el.setAttribute("rel", "icon");
  el.setAttribute("href", href);
  document.head.appendChild(el);
}

/** Applies admin-managed app identity (title, meta, favicon) to the document. */
export function SiteMeta({ settings, lang }: { settings: StoreSettings | null | undefined; lang: Lang }) {
  useEffect(() => {
    if (!settings) return;
    const name = pick(settings.site_name_ar, settings.site_name_ku, lang);
    const metaTitle = pick(settings.meta_title_ar, settings.meta_title_ku, lang) || name;
    const desc =
      pick(settings.meta_description_ar, settings.meta_description_ku, lang) ||
      pick(settings.tagline_ar, settings.tagline_ku, lang);

    if (metaTitle) document.title = metaTitle;
    setMeta("name", "description", desc);
    setMeta("property", "og:site_name", name);
    setMeta("property", "og:title", metaTitle);
    setMeta("property", "og:description", desc);
    setMeta("name", "twitter:title", metaTitle);
    setMeta("name", "twitter:description", desc);
    if (settings.og_image_url) {
      setMeta("property", "og:image", settings.og_image_url);
      setMeta("name", "twitter:image", settings.og_image_url);
    }
    setIcon(settings.favicon_url ?? "");
    setCurrencyLabels(settings.currency_ar, settings.currency_ku);
  }, [settings, lang]);

  return null;
}
