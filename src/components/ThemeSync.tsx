import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchStoreData } from "@/lib/store";
import { applyTheme } from "@/lib/theme";
import { applyDesign } from "@/lib/design";
import { fetchDesign } from "@/lib/design-store";

/**
 * Applies the admin-selected theme + Design Studio tokens to <html> so the
 * whole system (storefront, admin panel, vendor panel, dialogs, toasts) shares
 * one palette, one card shape and one spacing scale.
 */
export function ThemeSync() {
  const { data } = useQuery({ queryKey: ["store"], queryFn: fetchStoreData });
  const { data: design } = useQuery({ queryKey: ["design"], queryFn: fetchDesign, staleTime: 5 * 60_000 });
  const s = data?.settings;

  useEffect(() => {
    if (!s || typeof document === "undefined") return;
    applyTheme(document.documentElement, {
      primary_hue: s.primary_hue,
      primary_chroma: s.primary_chroma,
      accent_hue: s.accent_hue,
      accent_chroma: s.accent_chroma,
      radius_px: s.radius_px,
    });
  }, [s]);

  // Design tokens are applied after the theme so the chosen page surface wins.
  useEffect(() => {
    if (!design || typeof document === "undefined") return;
    applyDesign(document.documentElement, design.published);
  }, [design, s]);

  return null;
}
