import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmWaveReadinessSummaryStrip from "../../src/features/workbench/components/dpm-wave-readiness-summary-strip";
import type {
  DpmWaveMetricRow,
} from "../../src/features/workbench/dpm-wave-command-center-view-model";

const metricRows: DpmWaveMetricRow[] = [
  {
    key: "drift-improvement",
    label: "Drift Improvement",
    value: "72.4%",
  },
];

describe("DpmWaveReadinessSummaryStrip", () => {
  it("renders source-owned rebalance readiness without workflow controls", () => {
    render(
      <DpmWaveReadinessSummaryStrip
        selectedWaveState="SIMULATION_READY"
        approvalBlocked={false}
        selectedWaveItemCount="2"
        metricRows={metricRows}
      />
    );

    const summary = screen.getByLabelText("Rebalance readiness");
    expect(within(summary).getByText("Rebalance Status")).toBeInTheDocument();
    expect(within(summary).getByText("Ready to simulate")).toBeInTheDocument();
    expect(within(summary).getByText("Approval Readiness")).toBeInTheDocument();
    expect(within(summary).getByText("Ready")).toBeInTheDocument();
    expect(within(summary).getByText("Proposed Changes")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();
    expect(within(summary).getByText("Drift Improvement")).toBeInTheDocument();
    expect(within(summary).getByText("72.4%")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/oms/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/order/i)).not.toBeInTheDocument();
  });

  it("fails closed to blocked and pending posture from parent-owned state", () => {
    render(
      <DpmWaveReadinessSummaryStrip
        selectedWaveState="BLOCKED"
        approvalBlocked={true}
        selectedWaveItemCount="0"
        metricRows={[]}
      />
    );

    const summary = screen.getByLabelText("Rebalance readiness");
    expect(within(summary).getAllByText("Blocked").length).toBeGreaterThanOrEqual(1);
    expect(within(summary).getByText("Pending")).toBeInTheDocument();
    expect(within(summary).getByText("0")).toBeInTheDocument();
  });
});
