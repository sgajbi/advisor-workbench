import React from "react";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { describe, expect, it, vi } from "vitest";

import RootLayout from "@/app/layout";
import Providers from "@/app/providers";

vi.mock("next/font/local", () => ({
  default: ({ variable }: { variable: string }) => ({
    variable: variable.replace(/^--/, ""),
  }),
}));

vi.mock("@/shell/app-shell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

function QueryClientProbe() {
  const queryClient = useQueryClient();
  const defaultOptions = queryClient.getDefaultOptions();

  return (
    <div>
      <span data-testid="query-retry">{String(defaultOptions.queries?.retry)}</span>
      <span data-testid="query-refocus">{String(defaultOptions.queries?.refetchOnWindowFocus)}</span>
    </div>
  );
}

describe("Providers", () => {
  it("supplies the shared query client defaults to children", () => {
    render(
      <Providers>
        <QueryClientProbe />
      </Providers>
    );

    expect(screen.getByTestId("query-retry")).toHaveTextContent("1");
    expect(screen.getByTestId("query-refocus")).toHaveTextContent("false");
  });
});

describe("RootLayout", () => {
  it("wraps the body in Providers and the shared app shell", () => {
    const tree = RootLayout({ children: <div data-testid="layout-child">Layout child</div> });

    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("en");
    expect(tree.props.className).toContain("font-lotus-ui-face");
    expect(tree.props.className).toContain("font-lotus-display-face");
    expect(tree.props.className).toContain("font-lotus-mono-face");
    expect(tree.props.className.trim().split(/\s+/)).toHaveLength(3);
    expect(tree.props["data-font-delivery"]).toBe("self-hosted");

    const body = tree.props.children;
    expect(body.type).toBe("body");
    expect(body.props.suppressHydrationWarning).toBeUndefined();
    expect(body.props.children.type).toBe(AppRouterCacheProvider);
    expect(body.props.children.props.children.type).toBe(Providers);

    render(body.props.children);

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Layout child")).toBeInTheDocument();
  });
});
