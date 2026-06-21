"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
          mutations: { retry: false }
        }
      }),
    []
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
