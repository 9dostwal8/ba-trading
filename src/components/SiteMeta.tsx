import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStoreData, type StoreSettings } from "@/lib/store";
import { pick, setCurrencyLabels, useI18n, type Lang } from "@/lib/i18n";

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

/** Robust browser tab favicon updater supporting Chrome/Firefox/Safari caching */
export function setDocumentFavicon(href: string) {
  if (typeof document === "undefined" || !href) return;

  // Remove existing icon tags
  const oldIcons = document.head.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  oldIcons.forEach((el) => el.parentNode?.removeChild(el));

  let type = "image/x-icon";
  if (href.includes(".svg")) type = "image/svg+xml";
  else if (href.includes(".png")) type = "image/png";
  else if (href.includes(".webp")) type = "image/webp";
  else if (href.includes(".jpg") || href.includes(".jpeg")) type = "image/jpeg";

  // Cache-busting URL to ensure immediate visual update in browser tab
  const cacheBustedHref = href.includes("?")
    ? `${href}&_v=${Date.now()}`
    : `${href}?_v=${Date.now()}`;

  // 1. Standard icon
  const link = document.createElement("link");
  link.type = type;
  link.rel = "icon";
  link.href = cacheBustedHref;
  document.head.appendChild(link);

  // 2. Shortcut icon (Chrome / Edge tab header)
  const shortcutLink = document.createElement("link");
  shortcutLink.type = type;
  shortcutLink.rel = "shortcut icon";
  shortcutLink.href = cacheBustedHref;
  document.head.appendChild(shortcutLink);

  // 3. Apple touch icon (iOS bookmarks / PWA)
  const appleLink = document.createElement("link");
  appleLink.rel = "apple-touch-icon";
  appleLink.href = cacheBustedHref;
  document.head.appendChild(appleLink);
}

/** Applies admin-managed app identity (title, meta, favicon) to the document globally. */
export function SiteMeta({
  settings: propSettings,
  lang: propLang,
}: {
  settings?: StoreSettings | null;
  lang?: Lang;
} = {}) {
  const { lang: contextLang } = useI18n();
  const { data: storeData } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
    enabled: !propSettings,
  });

  const settings = propSettings ?? storeData?.settings;
  const lang = propLang ?? contextLang;

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
    if (settings.favicon_url) {
      setDocumentFavicon(settings.favicon_url);
    }
    setCurrencyLabels(settings.currency_ar, settings.currency_ku);
  }, [settings, lang]);

  return null;
}
