import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalyticsRankedList from "../../src/design-system/components/analytics-ranked-list";

describe("AnalyticsRankedList", () => {
  it("renders an explicit empty message when no ranked rows are available", () => {
    render(
      <AnalyticsRankedList
        title="Lowest"
        label="Contribution"
        rows={[]}
        scale={1}
        emptyMessage="No detractors are present for the selected analytical slice."
      />
    );

    expect(screen.getByText("Lowest")).toBeInTheDocument();
    expect(
      screen.getByText("No detractors are present for the selected analytical slice.")
    ).toBeInTheDocument();
  });
});
