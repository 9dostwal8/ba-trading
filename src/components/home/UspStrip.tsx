import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tintStyle } from "@/lib/category-icons";
import { useI18n } from "@/lib/i18n";
import { uspIcon } from "@/lib/usp-icons";

type UspRow = {
  id: string;
  icon: string;
  title_ar: string;
  title_ku: string;
  hue: number;
  chroma: number;
};

/** Admin-managed service highlight strip: tinted icon tiles with short labels. */
export function UspStrip() {
  const { lang } = useI18n();
  const { data } = useQuery({
    queryKey: ["usp-items"],
    queryFn: async () =>
      ((
        await supabase
          .from("usp_items")
          .select("id, icon, title_ar, title_ku, hue, chroma")
          .eq("is_active", true)
          .order("sort_order")
      ).data ?? []) as UspRow[],
  });

  const items = data ?? [];
  if (!items.length) return null;

  return (
    <div className="px-3 pt-2.5">
      <div className="grid grid-cols-4 gap-2">
        {items.slice(0, 8).map((item) => {
          const Icon = uspIcon(item.icon);
          return (
            <div
              key={item.id}
              style={tintStyle(item.hue, item.chroma)}
              className="dk-block flex flex-col items-center gap-1.5 px-1 py-2.5 text-center"
            >
              <span className="tile-icon size-10" style={{ color: "var(--tint-strong)" }}>
                <Icon className="size-[19px]" strokeWidth={2.3} />
              </span>
              <span className="line-clamp-2 text-[9.5px] font-bold leading-tight text-foreground/80">
                {lang === "ar" ? item.title_ar : item.title_ku}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
