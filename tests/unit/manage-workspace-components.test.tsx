import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ManageContextRail from "../../src/features/workbench/components/manage-context-rail";
import DpmCopilotWorkspace from "../../src/features/workbench/components/dpm-copilot-workspace";
import ManageMandateHealth from "../../src/features/workbench/components/manage-mandate-health";
import ManageOverview from "../../src/features/workbench/components/manage-overview";
import { getDpmCommandCenterExceptions } from "../../src/features/workbench/dpm-command-center-api";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

vi.mock("@/features/workbench/dpm-command-center-api", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/workbench/dpm-command-center-api")
  >();
  return {
    ...actual,
    getDpmCommandCenterExceptions: vi.fn(),
  };
});

afterEach(() => {
  vi.mocked(getDpmCommandCenterExceptions).mockReset();
});

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
    expect(within(detail).getByText("run_prior_001")).toBeInTheDocument();
    expect(within(detail).getByText("source_prior_001")).toBeInTheDocument();
    expect(within(detail).getByText("corr_exception_001")).toBeInTheDocument();
    expect(within(detail).queryByText("run_001")).not.toBeInTheDocument();
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
    expect(within(detail).queryByText("run_001")).not.toBeInTheDocument();
    expect(within(detail).getAllByText("Not available").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Advisor review recommended before rebalance approval.")).not.toBeInTheDocument();
  });

  it("excludes book-level exceptions that belong to another mandate", () => {
    const data = buildManageWorkspaceData();
    if (!data.commandCenterExceptions) {
      throw new Error("Fixture command-center exceptions are required");
    }
    const items = Array.isArray(data.commandCenterExceptions.data.items)
      ? data.commandCenterExceptions.data.items
      : [];
    data.commandCenterExceptions = {
      ...data.commandCenterExceptions,
      data: {
        ...data.commandCenterExceptions.data,
        items: [
          ...items,
          {
            exception_id: "exc_other_mandate",
            mandate_id: "mandate_002",
            severity: "HIGH",
            title: "Foreign mandate exception",
            state: "ACTIVE",
          },
        ],
      },
    };

    render(<ManageMandateHealth data={data} />);

    expect(
      screen.queryByRole("button", { name: "Foreign mandate exception" })
    ).not.toBeInTheDocument();
    const detail = screen.getByLabelText("Selected mandate review item");
    expect(within(detail).getByText("mandate_001")).toBeInTheDocument();
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

  it("marks missing mandate-health evidence as partial even when command-center data is complete", () => {
    const data = buildManageWorkspaceData({ mandateHealth: null, mandateHealthError: null });
    if (!data.commandCenter) {
      throw new Error("Fixture command center is required");
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

    render(<ManageMandateHealth data={data} />);

    expect(screen.getByText("Mandate monitoring requires attention")).toBeInTheDocument();
    const summary = screen.getByLabelText("Mandate health summary");
    expect(within(summary).getAllByText("Not available").length).toBeGreaterThan(0);
  });

  it("renders unavailable exception evidence without claiming zero attention items", () => {
    const data = buildManageWorkspaceData({
      commandCenterExceptions: null,
      commandCenterExceptionsError: "Gateway timeout",
    });

    const { rerender } = render(<ManageMandateHealth data={data} />);

    expect(screen.getByText("Attention items are temporarily unavailable")).toBeInTheDocument();
    expect(screen.getByText("Evidence unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No open items")).not.toBeInTheDocument();

    rerender(
      <ManageOverview data={data} reviewContext={{ portfolioId: "PF_1001" }} />,
    );
    expect(screen.getAllByText("Evidence unavailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    expect(screen.queryByText("No active attention items.")).not.toBeInTheDocument();

    rerender(
      <ManageContextRail
        data={data}
        activeMode="reviews"
        reviewContext={{ portfolioId: "PF_1001" }}
      />,
    );
    const posture = screen.getByLabelText("Manage review posture");
    expect(within(posture).getByText("Not available")).toBeInTheDocument();
    expect(within(posture).queryByText("0 open")).not.toBeInTheDocument();
  });

  it("keeps a valid partial exception window reviewable without claiming a whole queue", () => {
    const data = buildManageWorkspaceData();
    data.commandCenterExceptions = {
      ...data.commandCenterExceptions!,
      data: {
        ...data.commandCenterExceptions!.data,
        next_cursor: "attention-window-2",
      },
    };

    const { rerender } = render(<ManageMandateHealth data={data} />);

    expect(screen.getByText("More attention items are available")).toBeInTheDocument();
    expect(screen.getByText("2 in this view")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Benchmark mapping requires review" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Evidence unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("No open items")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next attention items" })).toBeEnabled();
    expect(screen.getByText("Attention-item source view 1")).toBeInTheDocument();

    rerender(
      <ManageOverview data={data} reviewContext={{ portfolioId: "PF_1001" }} />,
    );
    expect(screen.getByText("2 shown; more available")).toBeInTheDocument();
    expect(screen.getByText("2 shown")).toBeInTheDocument();

    rerender(
      <ManageContextRail
        data={data}
        activeMode="mandate"
        reviewContext={{ portfolioId: "PF_1001" }}
      />,
    );
    const posture = screen.getByLabelText("Manage review posture");
    expect(within(posture).getByText("2 shown; more available")).toBeInTheDocument();
  });

  it("loads the next exception window through the BFF and confirms its source identity", async () => {
    const data = buildManageWorkspaceData();
    data.commandCenterExceptions = {
      ...data.commandCenterExceptions!,
      data: {
        ...data.commandCenterExceptions!.data,
        next_cursor: "attention-window-2",
      },
    };
    vi.mocked(getDpmCommandCenterExceptions).mockResolvedValue({
      ...data.commandCenterExceptions,
      correlation_id: "corr_attention_window_2",
      data: {
        next_cursor: null,
        items: [
          {
            exception_id: "exc_window_2",
            mandate_id: "mandate_001",
            severity: "HIGH",
            title: "Concentration threshold requires review",
            state: "ACTIVE",
          },
        ],
      },
    });

    render(<ManageMandateHealth data={data} />);
    const nextAction = screen.getByRole("button", { name: "Next attention items" });
    nextAction.focus();
    fireEvent.click(nextAction);

    expect(
      await screen.findByRole("button", {
        name: "Concentration threshold requires review",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Attention-item source view 2")).toBeInTheDocument();
    const queue = screen.getByLabelText("Mandate attention items").closest("section");
    expect(queue).toHaveAttribute("data-source-window", "2");
    expect(queue).toHaveAttribute("data-source-posture", "complete");
    expect(queue).toHaveAttribute(
      "data-source-correlation-id",
      "corr_attention_window_2"
    );
    expect(getDpmCommandCenterExceptions).toHaveBeenCalledWith(
      {
        portfolioId: "PF_1001",
        state: "ACTIVE",
        limit: 25,
        cursor: "attention-window-2",
      },
      "client"
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Previous attention items" })
      )
    );
  });

  it("retains the last confirmed exception window when continuation loading fails", async () => {
    const data = buildManageWorkspaceData();
    data.commandCenterExceptions = {
      ...data.commandCenterExceptions!,
      data: {
        ...data.commandCenterExceptions!.data,
        next_cursor: "attention-window-2",
      },
    };
    vi.mocked(getDpmCommandCenterExceptions).mockRejectedValue(
      new Error("Gateway unavailable")
    );

    render(<ManageMandateHealth data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Next attention items" }));

    expect(
      await screen.findByText("The next attention-item view could not be loaded")
    ).toBeInTheDocument();
    expect(screen.getByText("Attention-item source view 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Benchmark mapping requires review" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry source view" })).toBeEnabled();
    expect(screen.queryByText("More attention items are available")).not.toBeInTheDocument();
    expect(screen.queryByText("No open items")).not.toBeInTheDocument();
  });

  it("shows rejected source records explicitly instead of inferring an empty queue", () => {
    const data = buildManageWorkspaceData();
    data.commandCenterExceptions = {
      ...data.commandCenterExceptions!,
      data: {
        items: [{ mandate_id: "mandate_001", title: "Missing source identity" }],
        next_cursor: null,
      },
    };

    render(<ManageMandateHealth data={data} />);

    expect(screen.getByText("1 source record could not be identified")).toBeInTheDocument();
    expect(screen.getByText("0 in this view")).toBeInTheDocument();
    expect(screen.queryByText("No open attention items")).not.toBeInTheDocument();
    expect(screen.queryByText("No open items")).not.toBeInTheDocument();
  });

  it("ignores a late exception window after portfolio and mandate scope changes", async () => {
    const firstScope = buildManageWorkspaceData();
    firstScope.commandCenterExceptions = {
      ...firstScope.commandCenterExceptions!,
      data: {
        ...firstScope.commandCenterExceptions!.data,
        next_cursor: "attention-window-2",
      },
    };
    let resolveLateWindow: (
      value: NonNullable<typeof firstScope.commandCenterExceptions>
    ) => void = () => undefined;
    vi.mocked(getDpmCommandCenterExceptions).mockReturnValue(
      new Promise((resolve) => {
        resolveLateWindow = resolve;
      })
    );

    const { rerender } = render(<ManageMandateHealth data={firstScope} />);
    fireEvent.click(screen.getByRole("button", { name: "Next attention items" }));

    const nextScope = buildManageWorkspaceData();
    nextScope.portfolio = {
      ...nextScope.portfolio,
      portfolio: {
        ...nextScope.portfolio.portfolio,
        portfolio_id: "PF_2002",
      },
    };
    nextScope.mandate = {
      ...nextScope.mandate!,
      data: {
        ...nextScope.mandate!.data,
        mandate_id: "mandate_002",
      },
    };
    nextScope.mandateHealth = {
      ...nextScope.mandateHealth!,
      data: {
        ...nextScope.mandateHealth!.data,
        mandate_id: "mandate_002",
      },
    };
    nextScope.commandCenterExceptions = {
      ...nextScope.commandCenterExceptions!,
      correlation_id: "corr_new_scope",
      data: {
        next_cursor: null,
        items: [
          {
            exception_id: "exc_new_scope",
            mandate_id: "mandate_002",
            severity: "MEDIUM",
            title: "New scope exception",
            state: "ACTIVE",
          },
        ],
      },
    };
    rerender(<ManageMandateHealth data={nextScope} />);

    await act(async () => {
      resolveLateWindow({
        ...firstScope.commandCenterExceptions!,
        correlation_id: "corr_stale_scope",
        data: {
          next_cursor: null,
          items: [
            {
              exception_id: "exc_stale_scope",
              mandate_id: "mandate_001",
              severity: "HIGH",
              title: "Stale scope exception",
              state: "ACTIVE",
            },
          ],
        },
      });
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: "New scope exception" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Stale scope exception")).not.toBeInTheDocument();
    const queue = screen.getByLabelText("Mandate attention items").closest("section");
    expect(queue).toHaveAttribute("data-source-window", "1");
    expect(queue).toHaveAttribute("data-source-correlation-id", "corr_new_scope");
  });

  it("renders overview operating posture from Gateway-backed manage data", () => {
    render(
      <ManageOverview
        data={buildManageWorkspaceData()}
        reviewContext={{ portfolioId: "PF_1001" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mandate Operating Posture" })).toBeInTheDocument();
    const posture = screen.getByLabelText("Operating posture");
    expect(within(posture).getByText("Mandate Health")).toBeInTheDocument();
    expect(within(posture).getByText("Active Attention Items")).toBeInTheDocument();
    expect(within(posture).getAllByText("Needs attention")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Attention Required" })).toBeInTheDocument();
    expect(screen.getByText("Benchmark mapping requires review")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Rebalance" })).toBeInTheDocument();
    const taskDirectory = screen.getByRole("navigation", { name: "Manage work areas" });
    expect(within(taskDirectory).getByRole("link", { name: /Mandate Health/i })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?portfolioId=PF_1001&mode=mandate"
    );
    expect(within(taskDirectory).getByText("Generated on request")).toBeInTheDocument();
    expect(screen.queryByText("Alternatives available")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mandate attention worklist" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent Operating Activity" })).toBeInTheDocument();
    expect(screen.queryByText("Execute Trade")).not.toBeInTheDocument();
  });

  it("renders missing mandate risk profile as incomplete evidence", () => {
    const data = buildManageWorkspaceData();
    data.mandate = {
      ...data.mandate!,
      data: {
        ...data.mandate!.data,
        risk_profile: null,
      },
    };

    render(
      <ManageOverview
        data={data}
        reviewContext={{ portfolioId: "PF_1001" }}
      />,
    );

    expect(screen.getByText("Not reported")).toBeInTheDocument();
    expect(screen.getByText("Evidence incomplete")).toBeInTheDocument();
    expect(screen.getByText(/Mandate risk profile/)).toBeInTheDocument();
    expect(screen.queryByText("Ready for review")).not.toBeInTheDocument();
  });

  it("renders decision posture and actions without repeating shell-owned identity", () => {
    render(
      <ManageContextRail
        data={buildManageWorkspaceData()}
        activeMode="reviews"
        reviewContext={{
          portfolioId: "PF_1001",
          asOfDate: "2026-04-10",
          period: "YTD",
          reportingCurrency: "SGD",
        }}
      />,
    );

    expect(screen.queryByText("Decision Support")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Manage portfolio context")).not.toBeInTheDocument();

    const posture = screen.getByLabelText("Manage review posture");
    expect(within(posture).getByText("Attention Items")).toBeInTheDocument();
    expect(within(posture).getByText("2 open")).toBeInTheDocument();
    expect(within(posture).getByText("Evidence")).toBeInTheDocument();
    expect(within(posture).getAllByText("Available").length).toBeGreaterThan(0);

    expect(screen.getByRole("link", { name: "Open PM Quality" })).toHaveAttribute(
      "href",
      "/workbench/PF_1001?portfolioId=PF_1001&asOfDate=2026-04-10&period=YTD&reportingCurrency=SGD&mode=quality"
    );
    expect(screen.getByRole("link", { name: "Return to Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio?portfolioId=PF_1001&asOfDate=2026-04-10&period=YTD&reportingCurrency=SGD"
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
