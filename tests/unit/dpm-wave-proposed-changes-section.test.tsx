import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DpmWaveProposedChangesSection from "../../src/features/workbench/components/dpm-wave-proposed-changes-section";
import type { DpmWaveProposedChangeRow } from "../../src/features/workbench/dpm-wave-command-center-panel-helpers";

const proposedRows: DpmWaveProposedChangeRow[] = [
  {
    key: "proposal-aapl",
    security: "AAPL US",
    action: "Trim",
    actionTone: "trim",
    estimatedValue: "7,420.00",
    reason: "Equity overweight",
    mandateImpact: "Improves equity band",
    status: "READY",
  },
  {
    key: "proposal-msft",
    security: "MSFT US",
    action: "Buy",
    actionTone: "buy",
    estimatedValue: "3,840.50",
    reason: "Target allocation",
    mandateImpact: "Improves benchmark alignment",
    status: "READY",
  },
];

describe("DpmWaveProposedChangesSection", () => {
  it("renders source-shaped proposed changes and delegates the load action", () => {
    const onLoadProposedChanges = vi.fn();

    render(
      <DpmWaveProposedChangesSection
        rows={proposedRows}
        selectedWaveId="dwv_001"
        pendingAction={null}
        onLoadProposedChanges={onLoadProposedChanges}
      />
    );

    expect(screen.getByRole("heading", { name: "Proposed Changes" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Proposed rebalance changes" });
    expect(within(table).getByText("AAPL US")).toBeInTheDocument();
    expect(within(table).getByText("Trim")).toHaveClass("rebalance-action-trim");
    expect(within(table).getByText("MSFT US")).toBeInTheDocument();
    expect(within(table).getByText("Buy")).toHaveClass("rebalance-action-buy");
    expect(within(table).getAllByText("Ready")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Load Changes" }));

    expect(onLoadProposedChanges).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
  });

  it("keeps load unavailable until a source wave is selected and renders empty posture", () => {
    const onLoadProposedChanges = vi.fn();

    render(
      <DpmWaveProposedChangesSection
        rows={[]}
        selectedWaveId={null}
        pendingAction={null}
        onLoadProposedChanges={onLoadProposedChanges}
      />
    );

    expect(screen.getByRole("button", { name: "Load Changes" })).toBeDisabled();
    expect(screen.getByText("No proposed changes loaded")).toBeInTheDocument();
    expect(screen.getByText("Load proposed changes after selecting a rebalance proposal.")).toBeInTheDocument();
  });

  it("disables loading while another Gateway-backed wave action is pending", () => {
    render(
      <DpmWaveProposedChangesSection
        rows={proposedRows}
        selectedWaveId="dwv_001"
        pendingAction="Simulate"
        onLoadProposedChanges={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Load Changes" })).toBeDisabled();
  });
});
