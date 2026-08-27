import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

/** Surface every failed read/write instead of failing silently. */
const message = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "حدث خطأ / هەڵەیەک ڕوویدا";

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Catalog/settings data changes rarely, so keep it fresh in memory for a
    // few minutes instead of re-querying the backend on every navigation.
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window !== "undefined") toast.error(message(error));
      },
    }),
  });


  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
