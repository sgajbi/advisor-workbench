import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TopNav from "../../src/app/top-nav";

describe("TopNav", () => {
  it("disables routes based on normalized navigation capabilities", () => {
    render(<TopNav />);

    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.queryByText("Recommendations")).not.toBeInTheDocument();

    const clientsDisabled = screen.getByText("Relationship Book");
    const analyticsDisabled = screen.getByText("Performance");
    const reportingDisabled = screen.getByText("Reporting");

    expect(clientsDisabled.tagName).toBe("SPAN");
    expect(clientsDisabled).toHaveAttribute("aria-disabled", "true");
    expect(analyticsDisabled.tagName).toBe("A");
    expect(analyticsDisabled).toHaveAttribute("href", "/performance");
    expect(screen.queryByText("Suitability")).not.toBeInTheDocument();
    expect(reportingDisabled.tagName).toBe("SPAN");
    expect(reportingDisabled).toHaveAttribute("aria-disabled", "true");
  });
});
