import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createQueryClientWrapper(queryClient = createTestQueryClient()) {
  return function QueryClientTestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderWithQueryClient(
  ui: ReactElement,
  queryClient = createTestQueryClient(),
): RenderResult & { queryClient: QueryClient } {
  const renderWithProvider = (child: ReactNode) => (
    <QueryClientProvider client={queryClient}>{child}</QueryClientProvider>
  );
  const rendered = render(renderWithProvider(ui));
  return {
    ...rendered,
    queryClient,
    rerender: (nextUi: ReactNode) => rendered.rerender(renderWithProvider(nextUi)),
  };
}
