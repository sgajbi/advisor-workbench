import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioMemoryPanel from "../../src/features/workbench/components/portfolio-memory-panel";
import type { DpmPortfolioMemoryGatewayResponse } from "../../src/features/workbench/types";

const readyResponse: DpmPortfolioMemoryGatewayResponse = {
  correlation_id: "corr-memory",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0040/RFC-0041/RFC-0042",
    state: "READY",
    event_count: 1,
    event_type_counts: { OUTCOME_REVIEW_CREATED: 1 },
    source_systems: ["lotus-manage", "lotus-risk"],
    reason_codes: ["SOURCE_READY"],
    content_hash: "sha256:portfolio-memory",
  },
  data: {
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    events: [
      {
        event_id: "memory:outcome-review:or_1",
        event_type: "OUTCOME_REVIEW_CREATED",
        event_time: "2026-05-07T10:05:00Z",
        source_refs: [{ source_system: "lotus-manage", source_id: "or_1" }],
        artifact_refs: [{ artifact_type: "outcome_review", artifact_id: "or_1" }],
        reason_codes: ["OUTCOME_REVIEW_READY"],
      },
    ],
  },
};

const searchResponse: DpmPortfolioMemoryGatewayResponse = {
  correlation_id: "corr-memory-search",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0040/RFC-0041/RFC-0042",
    state: "READY",
    event_count: 2,
    event_type_counts: { OUTCOME_REVIEW_SOURCE_LINEAGE_RECORDED: 2 },
    source_systems: ["lotus-performance"],
    source_system_counts: { "lotus-performance": 2 },
    source_type_counts: {
      "PortfolioRealizedTaxSummary:v1": 1,
      "PortfolioCashMovementSummary:v1": 1,
    },
    reason_codes: ["PERSISTED_LINEAGE_SEARCH_ONLY"],
    content_hash: "sha256:memory-search",
  },
  data: {
    support_boundary: {
      manage_persisted_lineage_only: true,
      source_owner_store_query: false,
    },
    items: [],
  },
};

describe("PortfolioMemoryPanel", () => {
  it("renders business-facing portfolio memory supportability and timeline", () => {
    render(<PortfolioMemoryPanel response={readyResponse} searchResponse={searchResponse} />);

    expect(screen.getByRole("heading", { name: "Portfolio Memory" })).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Latest Memory Event")).toBeInTheDocument();
    expect(screen.getByText("Memory Coverage")).toBeInTheDocument();
    expect(screen.getByText("lotus-performance (2)")).toBeInTheDocument();
    expect(screen.getByText("PortfolioRealizedTaxSummary:v1 (1)")).toBeInTheDocument();
    expect(screen.getByText("Source Owner Store Query: No")).toBeInTheDocument();
    expect(screen.getAllByText("Outcome Review Created").length).toBeGreaterThan(1);
    expect(
      screen.getByRole("button", { name: "Outcome Review Created 1" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review required/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Outcome Review Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Historical Event Log")).toBeInTheDocument();
    expect(screen.getByText("Recommended Actions")).toBeInTheDocument();
    expect(screen.getByText("Review supportability posture")).toBeInTheDocument();
    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
    expect(screen.queryByText("Add advisor note")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-manage:or_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:portfolio-memory")).not.toBeInTheDocument();
    expect(screen.queryByText("memory:outcome-review:or_1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Details: Outcome Review Created",
      }),
    ).toBeInTheDocument();
  });

  it("renders endpoint errors without claiming local reconstruction", () => {
    render(
      <PortfolioMemoryPanel
        response={null}
        errorMessage="Failed to fetch DPM portfolio memory (503)"
      />,
    );

    expect(screen.getByText("Portfolio memory is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM portfolio memory (503)")).toBeInTheDocument();
    expect(
      screen.getByText("No timeline rows are currently available."),
    ).toBeInTheDocument();
  });
});
