import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeckScreen } from "../../features/deck/components/DeckScreen";

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function DeckIndexScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeckScreen />
    </QueryClientProvider>
  );
}
