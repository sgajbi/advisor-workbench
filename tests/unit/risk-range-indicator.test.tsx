import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskRangeIndicator from "../../src/apps/performance/components/risk/risk-range-indicator";

describe("RiskRangeIndicator", () => {
  it("renders current value and visual markers from pre-shaped view-model inputs", () => {
    const { container } = render(
      <RiskRangeIndicator
        current="0.45%"
        currentPositionPct={28}
        typicalPositionPct={41}
      />
    );

    expect(screen.getByLabelText("Current 0.45% within observed range")).toBeInTheDocument();
    expect(container.querySelectorAll(".performance-risk-range-indicator-marker")).toHaveLength(2);
  });
});
