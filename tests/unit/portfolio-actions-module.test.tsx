import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioActionsModule from "../../src/apps/portfolio/modules/portfolio-actions/portfolio-actions-module";

describe("PortfolioActionsModule", () => {
  it("renders compact workflow copy with one short reason and no target line", () => {
    render(
      <PortfolioActionsModule
        actions={[
          {
            sequence: 1,
            title: "Review performance",
            impact:
              "Review portfolio return, benchmark context, and contribution once the book is valued. This longer follow-up explanation should not render in the rail.",
            target: "Target: Performance workflow for this portfolio",
            href: "/performance",
            cta_label: "Performance",
            recommended: true,
          },
        ]}
      />
    );

    expect(screen.getByText("Review performance")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Next Actions workflow list" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByText(
        "Review portfolio return, benchmark context, and contribution once the book is valued."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText("This longer follow-up explanation should not render in the rail.")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Target: Performance workflow for this portfolio")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute(
      "href",
      "/performance"
    );
  });
});
