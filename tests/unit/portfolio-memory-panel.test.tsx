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

describe("PortfolioMemoryPanel", () => {
  it("renders Gateway-backed portfolio-memory supportability and timeline", () => {
    render(<PortfolioMemoryPanel response={readyResponse} />);

    expect(screen.getByRole("heading", { name: "Portfolio Memory" })).toBeInTheDocument();
    expect(screen.getAllByText("READY").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:portfolio-memory")).toBeInTheDocument();
    expect(screen.getAllByText("OUTCOME_REVIEW_CREATED").length).toBeGreaterThan(1);
    expect(screen.getByText("lotus-manage:or_1")).toBeInTheDocument();
    expect(screen.getByText("outcome_review:or_1")).toBeInTheDocument();
    expect(screen.getByText("OUTCOME_REVIEW_READY")).toBeInTheDocument();
  });

  it("renders endpoint errors without claiming local reconstruction", () => {
    render(
      <PortfolioMemoryPanel
        response={null}
        errorMessage="Failed to fetch DPM portfolio memory (503)"
      />,
    );

    expect(screen.getByText("Portfolio-memory endpoint is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM portfolio memory (503)")).toBeInTheDocument();
    expect(
      screen.getByText("Workbench does not reconstruct portfolio-memory timeline rows locally."),
    ).toBeInTheDocument();
  });
});
