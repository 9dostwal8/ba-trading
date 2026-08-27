import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useMyVendor } from "@/hooks/useVendor";

/**
 * Only dentist / clinic accounts buy on OfferDent.
 * Admins and vendor (brand) members manage the store — they never order
 * and never earn reward points (enforced in the database too).
 */
export function useCanOrder() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { data: vendor, isLoading: vendorLoading } = useMyVendor(user?.id);

  const isStaff = isAdmin === true || !!vendor;
  const ready = !loading && (!user || (isAdmin !== null && !vendorLoading));

  return { isStaff, canOrder: !isStaff, ready, isAdmin: isAdmin === true, vendor };
}
