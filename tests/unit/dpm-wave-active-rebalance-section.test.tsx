import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmWaveActiveRebalanceSection from "../../src/features/workbench/components/dpm-wave-active-rebalance-section";
import type { DpmWaveMetricTile } from "../../src/features/workbench/dpm-wave-command-center-panel-helpers";

const metricTiles: DpmWaveMetricTile[] = [
  { label: "Turnover", value: "4.8%" },
  { label: "Cash After", value: "2.1%" },
  { label: "Est. Trades", value: "2" },
  { label: "Issues", value: "0", tone: "success" },
];

describe("DpmWaveActiveRebalanceSection", () => {
  it("renders active rebalance posture and delegates workflow actions", () => {
    const onPreview = vi.fn();
    const onCreate = vi.fn();

    render(
      <DpmWaveActiveRebalanceSection
        selectedWaveId="dwv_001"
        selectedWaveState="SIMULATION_READY"
        lifecycleIndex={2}
        approvalBlocked={false}
        stagingBlocked={false}
        handoffBlocked={false}
        metricTiles={metricTiles}
        pendingAction={null}
        actionMessage="Simulate completed."
        onPreview={onPreview}
        onCreate={onCreate}
        onReviewData={vi.fn()}
        onSimulate={vi.fn()}
        onRequestApproval={vi.fn()}
        onStage={vi.fn()}
        onPrepareHandoff={vi.fn()}
        onOpenEvidencePack={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Rebalance lifecycle")).toHaveTextContent("Simulation");
    expect(screen.getByText("Approval can proceed after advisor review.")).toBeInTheDocument();
    expect(screen.getByLabelText("Rebalance metrics")).toHaveTextContent("4.8%");
    expect(screen.getByText("Simulate completed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Rebalance" }));

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
  });

  it("disables approval and downstream workflow controls from source-owned blocking posture", () => {
    render(
      <DpmWaveActiveRebalanceSection
        selectedWaveId="dwv_001"
        selectedWaveState="BLOCKED"
        lifecycleIndex={1}
        approvalBlocked={true}
        stagingBlocked={true}
        handoffBlocked={true}
        metricTiles={[{ label: "Issues", value: "2", tone: "danger" }]}
        pendingAction={null}
        actionMessage={null}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
        onReviewData={vi.fn()}
        onSimulate={vi.fn()}
        onRequestApproval={vi.fn()}
        onStage={vi.fn()}
        onPrepareHandoff={vi.fn()}
        onOpenEvidencePack={vi.fn()}
      />
    );

    const actions = screen.getByLabelText("Rebalance workflow actions");
    expect(within(actions).getByRole("button", { name: "Request Approval" })).toBeDisabled();
    expect(within(actions).getByRole("button", { name: "Stage" })).toBeDisabled();
    expect(within(actions).getByRole("button", { name: "Prepare Handoff" })).toBeDisabled();
    expect(screen.getByText("Resolve mandate attention items before approval.")).toBeInTheDocument();
  });

  it("keeps wave-specific actions disabled until a source wave is selected", () => {
    render(
      <DpmWaveActiveRebalanceSection
        selectedWaveId={null}
        selectedWaveState="PENDING"
        lifecycleIndex={0}
        approvalBlocked={false}
        stagingBlocked={false}
        handoffBlocked={false}
        metricTiles={[]}
        pendingAction={null}
        actionMessage={null}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
        onReviewData={vi.fn()}
        onSimulate={vi.fn()}
        onRequestApproval={vi.fn()}
        onStage={vi.fn()}
        onPrepareHandoff={vi.fn()}
        onOpenEvidencePack={vi.fn()}
      />
    );

    const actions = screen.getByLabelText("Rebalance workflow actions");
    expect(within(actions).getByRole("button", { name: "Preview" })).toBeEnabled();
    expect(within(actions).getByRole("button", { name: "Create Rebalance" })).toBeEnabled();
    expect(within(actions).getByRole("button", { name: "Review Data" })).toBeDisabled();
    expect(within(actions).getByRole("button", { name: "Simulate" })).toBeDisabled();
    expect(within(actions).getByRole("button", { name: "Open Evidence Pack" })).toBeDisabled();
  });
});
