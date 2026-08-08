import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  PortfolioRecordRouteError,
  PortfolioRecordRouteLoading,
} from "../../src/apps/portfolio/components/portfolio-record-route-state";
import type { PortfolioRecordScreenKind } from "../../src/apps/portfolio/portfolio-record-screen-view-model";

const ROUTES: Array<{ screen: PortfolioRecordScreenKind; title: string }> = [
  { screen: "allocation", title: "Allocation" },
  { screen: "positions", title: "Positions" },
  { screen: "transactions", title: "Transactions" },
  { screen: "cashflow", title: "Cashflow" },
  { screen: "income", title: "Income & Activity" },
];

vi.mock(
  "../../src/apps/portfolio/components/portfolio-page-layout",
  () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }),
);

describe.each(ROUTES)("$title portfolio record route state", ({ screen: route, title }) => {
  it("announces a business loading state without exposing decorative placeholders", () => {
    const { container } = render(<PortfolioRecordRouteLoading screen={route} />);

    expect(screen.getByRole("status")).toHaveTextContent(`Preparing ${title}`);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the selected portfolio and its latest source-backed records.",
    );
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("offers a keyboard-native retry from a business error state", () => {
    const reset = vi.fn();
    render(<PortfolioRecordRouteError screen={route} reset={reset} />);

    expect(screen.getByRole("heading", { name: `We could not open ${title}` })).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Retry portfolio records" });
    fireEvent.click(retry);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
