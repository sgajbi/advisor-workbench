import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReviewContextPageRecovery from "@/shell/review-context-page-recovery";

describe("ReviewContextPageRecovery", () => {
  it("retains page identity and one explicit unavailable context state", () => {
    render(
      <ReviewContextPageRecovery
        pageKey="performance"
        pageTitle="Performance"
        pageSubtitle="Review portfolio outcomes and evidence."
        body="Select a portfolio before opening Performance."
        href="/book"
        actionLabel="Open My book"
      />,
    );

    expect(screen.getByRole("heading", { name: "Performance", level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Portfolio not confirmed",
    );
    expect(screen.getByRole("heading", { name: "Review context needs attention" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open My book" })).toHaveAttribute(
      "href",
      "/book",
    );
  });
});
