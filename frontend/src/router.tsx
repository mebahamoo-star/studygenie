import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 60 seconds fresh cache: switching pages is instant with zero loading lag
        gcTime: 10 * 60 * 1000, // 10 minutes cache retention in memory
        refetchOnWindowFocus: false, // Prevents background re-fetching delays when switching tabs
        refetchOnMount: false, // Serves cached data immediately without mounting spinner
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent", // Automatically preloads route code and data on hover/touchstart
    defaultPreloadDelay: 30, // 30ms hover threshold (near-instantaneous preload)
    defaultPreloadStaleTime: 60_000, // 1-minute route preload cache
  });

  return router;
};
