import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RebalanceStatus from "../../src/features/workbench/components/rebalance-status";

function getPanel(container: HTMLElement): HTMLElement {
  const panel = container.querySelector(".rebalance-status-panel");
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

describe("RebalanceStatus", () => {
  it("renders stateful rebalance review supportability", () => {
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
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("4");
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("Runs");
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("12");
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("Operations");
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("3");
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("Decisions");
    expect(scope.getByText("Latest assessment: 27 Mar 2026, 12:00 UTC")).toBeInTheDocument();
    expect(scope.getByText("Action register current")).toBeInTheDocument();
    const dashboard = scope.getByLabelText("Rebalance review activity");
    expect(dashboard).toHaveTextContent("2");
    expect(dashboard).toHaveTextContent("Recent runs");
    expect(dashboard).toHaveTextContent("1");
    expect(dashboard).toHaveTextContent("Run issues");
    expect(dashboard).toHaveTextContent("Review 1");
    expect(dashboard).toHaveTextContent("27 Mar 2026, 12:00 UTC");
    expect(dashboard).toHaveTextContent("Portfolio manager review required");
    expect(dashboard).toHaveTextContent("Review 2");
    expect(dashboard).toHaveTextContent("26 Mar 2026, 12:00 UTC");
    expect(dashboard).toHaveTextContent("Data readiness blocked");
  });

  it("fails closed when rebalance audit instants do not carry source timezone evidence", () => {
    const { container } = render(
      <RebalanceStatus
        snapshot={{
          status: "READY",
          last_rebalance_run_id: null,
          last_run_at_utc: "2026-03-27T12:00:00",
          recent_runs: [
            {
              rebalance_run_id: "rr_unzoned",
              status: "READY",
              created_at_utc: "not-a-timestamp",
              error_code: null,
              workflow_state: null,
            },
          ],
        }}
      />,
    );

    const scope = within(container);
    expect(scope.getByText("Latest assessment: Not reported")).toBeInTheDocument();
    expect(scope.getByText("Timestamp not reported")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("2026-03-27T12:00:00");
    expect(container).not.toHaveTextContent("not-a-timestamp");
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
    expect(scope.getByText("Pending review")).toBeInTheDocument();
    expect(scope.getByText("Action required")).toBeInTheDocument();
    expect(scope.getByText("Stale")).toBeInTheDocument();
    expect(scope.getByText("Latest assessment: Not reported")).toBeInTheDocument();
    expect(scope.getByText("Data readiness incomplete")).toBeInTheDocument();
    expect(scope.getByLabelText("Rebalance review activity")).toHaveTextContent(
      "No recent rebalance review activity is available for this portfolio."
    );
  });

  it("marks missing supportability as unknown", () => {
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
    expect(scope.getAllByText("Review required").length).toBeGreaterThanOrEqual(2);
    expect(scope.getByLabelText("Rebalance decision evidence")).toHaveTextContent("N/A");
    expect(scope.getByLabelText("Rebalance decision evidence")).not.toHaveTextContent("0");
    expect(
      scope.getByText("Decision support is not available for this portfolio.")
    ).toBeInTheDocument();
  });
});
