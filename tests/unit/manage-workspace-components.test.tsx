import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ManageContextRail from "../../src/features/workbench/components/manage-context-rail";
import ManageOverview from "../../src/features/workbench/components/manage-overview";
import type { ManageWorkspaceData } from "../../src/features/workbench/manage-workspace-data";

describe("manage workspace split components", () => {
  it("renders overview decision posture from Gateway-backed manage data", () => {
    render(<ManageOverview data={buildManageWorkspaceData()} />);

    expect(screen.getByRole("heading", { name: "Mandate Operating Posture" })).toBeInTheDocument();
    expect(screen.getByLabelText("Decision readiness")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
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
});

function buildManageWorkspaceData(): ManageWorkspaceData {
  return {
    portfolio: {
      correlation_id: "corr_1",
      contract_version: "v1",
      as_of_date: "2026-05-13",
      portfolio: {
        portfolio_id: "PF_1001",
        client_id: "CL_1001",
        base_currency: "USD",
        booking_center_code: "SG",
      },
      overview: {
        market_value_base: 1250000,
        cash_weight_pct: 8.42,
        position_count: 12,
      },
      performance_snapshot: null,
      rebalance_snapshot: null,
      current_positions: [],
      projected_positions: [],
      projected_summary: null,
      active_session_id: null,
      warnings: [],
      partial_failures: [],
    },
    commandCenter: {
      correlation_id: "corr_command",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:command-center",
        state: "SUPPORTED",
        reason_codes: ["COMMAND_CENTER_READY"],
        blocked_actions: [],
      },
      data: {
        summary: {
          active_exception_count: 2,
          data_completeness_state: "PARTIAL",
        },
        latest_monitoring_run: {
          monitoring_run_id: "run_001",
          status: "READY",
        },
      },
    },
    commandCenterExceptions: {
      correlation_id: "corr_exceptions",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:exceptions",
        state: "SUPPORTED",
        reason_codes: ["ACTIVE_EXCEPTIONS"],
        blocked_actions: [],
      },
      data: {
        items: [
          {
            exception_id: "exc_001",
            severity: "HIGH",
            title: "Missing benchmark constituent mapping",
            source_system: "lotus-performance",
            owner: "PM Ops",
            age_hours: 48,
            state: "ACTIVE",
            next_action: "Review benchmark mapping",
          },
          {
            exception_id: "exc_002",
            severity: "MEDIUM",
            title: "Stale price for fixed income instrument",
            source_system: "lotus-pricing",
            owner: "Data Ops",
            age_hours: 24,
            state: "ACTIVE",
            next_action: "Request refresh",
          },
        ],
      },
    },
    mandate: {
      correlation_id: "corr_mandate",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:mandate",
        state: "SUPPORTED",
        reason_codes: ["MANDATE_READY"],
        blocked_actions: [],
      },
      data: {
        mandate_id: "mandate_001",
        mandate_type: "Discretionary Balanced",
        risk_profile: "Balanced",
        pm_book_id: "PM_BOOK_SG_BALANCED",
      },
    },
    mandateHealth: {
      correlation_id: "corr_health",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:mandate-health",
        state: "SUPPORTED",
        reason_codes: ["HEALTH_READY"],
        blocked_actions: [],
      },
      data: {
        mandate_id: "mandate_001",
        health_state: "PARTIAL",
        health_score: 82,
      },
    },
    commandCenterError: null,
    portfolioMemory: {
      correlation_id: "corr_memory",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:portfolio-memory",
        state: "SUPPORTED",
        event_count: 42,
        event_type_counts: { MONITORING_RUN: 1 },
        source_systems: ["lotus-manage"],
        reason_codes: ["MEMORY_READY"],
        blocked_actions: [],
      },
      data: { events: [] },
    },
    portfolioMemoryError: null,
    pmOperatingQualityPolicies: {
      correlation_id: "corr_policy",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:pm-quality-policy",
        state: "READY",
        reason_codes: ["READY"],
        blocked_actions: [],
        count: 1,
      },
      data: { policies: [], count: 1 },
    },
    pmOperatingQualityPoliciesError: null,
    pmOperatingQualityScoreRuns: null,
    pmOperatingQualityScoreRunsError: null,
    pmOperatingQualityFairnessAnalyses: null,
    pmOperatingQualityFairnessAnalysesError: null,
    pmOperatingQualityFairnessAnalysisDetail: null,
    pmOperatingQualityFairnessAnalysisDetailError: null,
    waves: {
      correlation_id: "corr_waves",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:waves",
        state: "SUPPORTED",
        reason_codes: ["WAVE_READY"],
        blocked_actions: [],
      },
      data: {
        items: [
          {
            wave_id: "wave_001",
            state: "READY",
            trigger_type: "EXPLICIT_PORTFOLIO_LIST",
            item_count: 4,
            issue_count: 0,
          },
        ],
      },
    },
    wavesError: null,
    campaignDefinitions: null,
    campaignDefinitionsError: null,
    campaignDiscovery: null,
    campaignDiscoveryError: null,
    outcomeReviews: {
      correlation_id: "corr_reviews",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:outcome-reviews",
        state: "SUPPORTED",
        reason_codes: ["READY_FOR_REPORT_INPUT"],
        blocked_actions: [],
      },
      data: {
        items: [
          {
            outcome_review_id: "or_1",
            state: "READY",
            proof_pack_id: "ppack_1",
          },
        ],
      },
    },
    outcomeReviewError: null,
    proofPack: null,
    proofPackError: null,
  } as unknown as ManageWorkspaceData;
}
