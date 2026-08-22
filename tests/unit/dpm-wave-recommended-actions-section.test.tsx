import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmWaveRecommendedActionsSection from "../../src/features/workbench/components/dpm-wave-recommended-actions-section";

describe("DpmWaveRecommendedActionsSection", () => {
  it("renders advisor next steps for ready rebalance posture", () => {
    const { container } = render(<DpmWaveRecommendedActionsSection approvalBlocked={false} />);

    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();
    expect(screen.getByText("Review rebalance simulation")).toBeInTheDocument();
    expect(screen.getByText("No blocking attention items remain.")).toBeInTheDocument();
    expect(screen.getByText("Open evidence pack")).toBeInTheDocument();
    expect(screen.queryByText("chevron_right")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
  });

  it("renders blocked approval guidance from source-owned posture", () => {
    render(<DpmWaveRecommendedActionsSection approvalBlocked={true} />);

    expect(screen.getByText("Clear the open mandate items before approval.")).toBeInTheDocument();
  });
});
