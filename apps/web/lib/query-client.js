import { QueryClient } from "@tanstack/react-query";

let queryClient = null;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000, // 30 seconds
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClient;
}
