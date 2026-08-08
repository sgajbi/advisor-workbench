import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ManageContextRail from "../../src/features/workbench/components/manage-context-rail";
import DpmCopilotWorkspace from "../../src/features/workbench/components/dpm-copilot-workspace";
import ManageMandateHealth from "../../src/features/workbench/components/manage-mandate-health";
import ManageOverview from "../../src/features/workbench/components/manage-overview";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

describe("manage workspace split components", () => {
  it("binds the selected attention item to its source-owned owner, action, and evidence", () => {
    render(<ManageMandateHealth data={buildManageWorkspaceData()} />);

    expect(screen.getByText("Mandate monitoring requires attention")).toBeInTheDocument();
    const detail = screen.getByLabelText("Selected mandate review item");
    expect(within(detail).getByRole("heading", { name: "Benchmark mapping requires review" })).toBeInTheDocument();
    expect(within(detail).getByText("Portfolio Manager")).toBeInTheDocument();
    expect(within(detail).getByText("Review Benchmark Mapping")).toBeInTheDocument();
    expect(within(detail).getByText("Accountable owner")).toBeInTheDocument();
    expect(within(detail).getByText("Open for")).toBeInTheDocument();
    const attentionQueue = screen.getByLabelText("Mandate attention items");
    expect(within(attentionQueue).getByRole("columnheader", { name: "Observation" })).toBeInTheDocument();
    expect(within(attentionQueue).getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(within(attentionQueue).queryByRole("columnheader", { name: "Owner" })).not.toBeInTheDocument();
    expect(within(attentionQueue).queryByRole("columnheader", { name: "Age" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Stale price requires review" }),
    );

    expect(within(detail).getByRole("heading", { name: "Stale price requires review" })).toBeInTheDocument();
    expect(within(detail).getByText("Data Operations")).toBeInTheDocument();
    expect(within(detail).getByText("Request data refresh")).toBeInTheDocument();
    expect(within(detail).getByText("exc_002")).toBeInTheDocument();
    expect(screen.queryByText("Advisor review recommended before rebalance approval.")).not.toBeInTheDocument();
  });

  it.each([
    ["EMPTY", "No mandate monitoring records"],
    ["BLOCKED", "Mandate monitoring is not available for this access context"],
    ["UNSUPPORTED", "Mandate monitoring is not supported"],
    ["DEGRADED", "Mandate monitoring requires attention"],
  ])("presents %s command-center posture in business language", (state, title) => {
    const data = buildManageWorkspaceData();
    if (!data.commandCenter) {
      throw new Error("Fixture command center is required");
    }
    data.commandCenter = {
      ...data.commandCenter,
      supportability: {
        ...data.commandCenter.supportability,
        state,
      },
    };

    render(<ManageMandateHealth data={data} />);

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("presents unavailable Gateway posture without inventing mandate-monitoring truth", () => {
    render(
      <ManageMandateHealth
        data={buildManageWorkspaceData({
          commandCenter: null,
          commandCenterExceptions: null,
          mandateHealth: null,
        })}
      />,
    );

    expect(screen.getByText("Mandate monitoring is unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("Score not available").length).toBeGreaterThan(0);
    expect(screen.queryByText("Evidence Available")).not.toBeInTheDocument();
  });

  it("presents complete source posture without a degraded-state notice", () => {
    const data = buildManageWorkspaceData();
    if (!data.commandCenter || !data.mandateHealth) {
      throw new Error("Fixture command-center and mandate-health data are required");
    }
    data.commandCenter = {
      ...data.commandCenter,
      data: {
        ...data.commandCenter.data,
        summary: {
          active_exception_count: 2,
          data_completeness_state: "COMPLETE",
        },
      },
    };
    data.mandateHealth = {
      ...data.mandateHealth,
      data: { ...data.mandateHealth.data, health_state: "READY" },
    };

    render(<ManageMandateHealth data={data} />);

    expect(screen.queryByText("Mandate monitoring requires attention")).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Mandate health summary")).getAllByText("Ready").length,
    ).toBeGreaterThan(0);
  });

  it("renders overview operating posture from Gateway-backed manage data", () => {
    render(<ManageOverview data={buildManageWorkspaceData()} />);

    expect(screen.getByRole("heading", { name: "Mandate Operating Posture" })).toBeInTheDocument();
    const posture = screen.getByLabelText("Operating posture");
    expect(within(posture).getByText("Mandate Health")).toBeInTheDocument();
    expect(within(posture).getByText("Active Attention Items")).toBeInTheDocument();
    expect(within(posture).getAllByText("Needs attention")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Attention Required" })).toBeInTheDocument();
    expect(screen.getByText("Benchmark mapping requires review")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Manage work areas")).toBeInTheDocument();
    expect(screen.queryByText("Execute Trade")).not.toBeInTheDocument();
  });

  it("renders the context rail without exposing client communication actions", () => {
    render(<ManageContextRail data={buildManageWorkspaceData()} activeMode="reviews" />);

    expect(screen.getByText("Decision Support")).toBeInTheDocument();
    expect(screen.getByText("Outcome Reviews")).toBeInTheDocument();

    const posture = screen.getByLabelText("Manage review posture");
    expect(within(posture).getByText("Attention Items")).toBeInTheDocument();
    expect(within(posture).getByText("2 open")).toBeInTheDocument();
    expect(within(posture).getByText("Evidence")).toBeInTheDocument();
    expect(within(posture).getAllByText("Available").length).toBeGreaterThan(0);

    expect(screen.getByRole("link", { name: "Open PM Quality" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?mode=quality"
    );
    expect(screen.getByRole("link", { name: "Return to Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PF_1001"
    );
    expect(screen.queryByRole("button", { name: /client/i })).not.toBeInTheDocument();
  });

  it("renders the governed PM copilot workspace without execution or client-contact claims", () => {
    render(<DpmCopilotWorkspace data={buildManageWorkspaceData()} mandateId="mandate_001" />);

    expect(screen.getByRole("heading", { name: "PM Copilot Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Proof-Pack PM Memo")).toBeInTheDocument();
    expect(screen.getByText("Wave PM Memo")).toBeInTheDocument();
    expect(screen.getByText("Operations Handoff Summary")).toBeInTheDocument();
    expect(screen.getByText("Exception Summary")).toBeInTheDocument();
    expect(screen.getByText("Outcome Narrative")).toBeInTheDocument();
    expect(screen.getByText("PM Quality Support Summary")).toBeInTheDocument();
    expect(screen.getByText("Human review governed")).toBeInTheDocument();
    expect(screen.getByLabelText("Status Internal decision support")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: /^Prepare / })).toHaveLength(5);
    expect(
      screen.getByRole("button", {
        name: "Proof-Pack PM Memo unavailable: Current evidence pack unavailable",
      }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: /client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /order/i })).not.toBeInTheDocument();
  });
});
