import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Vendor } from "@/lib/vendors";

/** The brand (vendor) the signed-in user manages, if any. */
export function useMyVendor(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-vendor", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_members")
        .select("vendor_id, vendors(*)")
        .eq("user_id", userId!)
        .limit(1)
        .maybeSingle();
      const vendor = (data as { vendors?: unknown } | null)?.vendors;
      return (vendor ?? null) as Vendor | null;
    },
  });
}
