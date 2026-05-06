import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RebalanceStatus from "../../src/features/workbench/components/rebalance-status";

function getPanel(container: HTMLElement): HTMLElement {
  const panel = container.querySelector(".rebalance-status-panel");
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

describe("RebalanceStatus", () => {
  it("renders manage-owned stateful execution supportability", () => {
    const { container } = render(
      <RebalanceStatus
        snapshot={{
          status: "READY",
          last_rebalance_run_id: "rr_100",
          last_run_at_utc: "2026-03-27T12:00:00Z",
          supportability: {
            feature_key: "manage.observability.action_register_supportability",
            state: "healthy",
            reason: "action_register_current",
            freshness_bucket: "fresh",
            run_count: 4,
            operation_count: 12,
            workflow_decision_count: 3,
          },
          recent_runs: [
            {
              rebalance_run_id: "rr_100",
              status: "PENDING_REVIEW",
              created_at_utc: "2026-03-27T12:00:00Z",
              error_code: null,
              workflow_state: "PM_REVIEW_REQUIRED",
            },
            {
              rebalance_run_id: "rr_099",
              status: "FAILED",
              created_at_utc: "2026-03-26T12:00:00Z",
              error_code: "SOURCE_READINESS_BLOCKED",
              workflow_state: null,
            },
          ],
        }}
      />
    );

    const scope = within(getPanel(container));
    expect(scope.getByText("Ready")).toBeInTheDocument();
    expect(scope.getByText("Healthy")).toBeInTheDocument();
    expect(scope.getByText("Fresh")).toBeInTheDocument();
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("4");
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("Runs");
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("12");
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("Operations");
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("3");
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("Decisions");
    expect(scope.getByText("Last run: rr_100 - 2026-03-27T12:00:00Z")).toBeInTheDocument();
    expect(scope.getByText("action_register_current")).toBeInTheDocument();
    const dashboard = scope.getByLabelText("DPM operations dashboard");
    expect(dashboard).toHaveTextContent("2");
    expect(dashboard).toHaveTextContent("Recent runs");
    expect(dashboard).toHaveTextContent("1");
    expect(dashboard).toHaveTextContent("Run issues");
    expect(dashboard).toHaveTextContent("rr_100");
    expect(dashboard).toHaveTextContent("PM Review Required");
    expect(dashboard).toHaveTextContent("rr_099");
    expect(dashboard).toHaveTextContent("Source Readiness Blocked");
  });

  it("surfaces source-incomplete posture without inventing readiness", () => {
    const { container } = render(
      <RebalanceStatus
        snapshot={{
          status: "PENDING_REVIEW",
          last_rebalance_run_id: null,
          last_run_at_utc: null,
          supportability: {
            feature_key: "manage.observability.action_register_supportability",
            state: "action_required",
            reason: "SOURCE_READINESS_INCOMPLETE",
            freshness_bucket: "stale",
            run_count: 0,
            operation_count: 0,
            workflow_decision_count: 0,
          },
        }}
      />
    );

    const scope = within(getPanel(container));
    expect(scope.getByText("Pending Review")).toBeInTheDocument();
    expect(scope.getByText("Action Required")).toBeInTheDocument();
    expect(scope.getByText("Stale")).toBeInTheDocument();
    expect(scope.getByText("Last run: N/A")).toBeInTheDocument();
    expect(scope.getByText("SOURCE_READINESS_INCOMPLETE")).toBeInTheDocument();
    expect(scope.getByLabelText("DPM operations dashboard")).toHaveTextContent(
      "No recent manage rebalance runs were returned by Gateway for this portfolio."
    );
  });

  it("marks missing Gateway supportability as unknown", () => {
    const { container } = render(
      <RebalanceStatus
        snapshot={{
          status: "UNKNOWN",
          last_rebalance_run_id: null,
          last_run_at_utc: null,
        }}
      />
    );

    const scope = within(getPanel(container));
    expect(scope.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
    expect(scope.getByLabelText("Rebalance execution evidence")).toHaveTextContent("N/A");
    expect(scope.getByLabelText("Rebalance execution evidence")).not.toHaveTextContent("0");
    expect(
      scope.getByText("Gateway did not return manage action-register supportability for this portfolio.")
    ).toBeInTheDocument();
  });
});
