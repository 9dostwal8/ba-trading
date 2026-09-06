import { useAuth } from "@/hooks/useAuth";

/**
 * Main Storefront: Every visitor browses and orders as a regular user/customer.
 * The Admin Panel is completely isolated from the main website.
 */
export function useCanOrder() {
  const { user, loading } = useAuth();

  return {
    isStaff: false,
    canOrder: true,
    ready: !loading,
    isAdmin: false,
    vendor: null,
  };
}
