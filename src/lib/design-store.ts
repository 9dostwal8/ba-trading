import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DESIGN, normalizeDesign, type DesignSettings } from "@/lib/design";

export type DesignRow = {
  id: string;
  draft: DesignSettings;
  published: DesignSettings;
};

/** Single design document (draft + published) used by the Design Studio. */
export async function fetchDesign(): Promise<DesignRow | null> {
  const { data, error } = await supabase
    .from("design_settings")
    .select("id, draft, published")
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    draft: normalizeDesign(data.draft),
    published: normalizeDesign(data.published),
  };
}

/** The live (published) design every storefront component reads. */
export function useDesign(): DesignSettings {
  const { data } = useQuery({ queryKey: ["design"], queryFn: fetchDesign, staleTime: 5 * 60_000 });
  return data?.published ?? DEFAULT_DESIGN;
}
