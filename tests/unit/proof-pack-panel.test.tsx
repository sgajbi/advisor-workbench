import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProofPackPanel from "../../src/features/workbench/components/proof-pack-panel";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
} from "../../src/features/workbench/types";
import {
  generateDpmProofPackFromRun,
  getDpmProofPack,
  getDpmProofPackAiEvidenceInput,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  requestDpmProofPackAiPmMemo,
} from "../../src/features/workbench/api";

vi.mock("../../src/features/workbench/api", () => ({
  generateDpmProofPackFromRun: vi.fn(),
  getDpmProofPack: vi.fn(),
  getDpmProofPackAiEvidenceInput: vi.fn(),
  getDpmProofPackMarkdown: vi.fn(),
  getDpmProofPackReportInput: vi.fn(),
  requestDpmProofPackAiPmMemo: vi.fn(),
}));

const outcomeReviews: DpmOutcomeReviewGatewayResponse = {
  correlation_id: "corr-rfc42",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042",
    state: "SUPPORTED",
    reason_codes: [],
    blocked_actions: [],
  },
  data: {
    items: [
      {
        outcome_review_id: "or_1",
        proof_pack_id: "dpp_rfc0042_1",
        rebalance_run_id: "rr_1",
        mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      },
    ],
  },
};

const readyProofPack: DpmProofPackGatewayResponse = {
  correlation_id: "corr-rfc40",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0040",
    state: "READY",
    proof_pack_id: "ppack_1",
    reason_codes: ["PROOF_PACK_READY"],
    section_state_counts: { READY: 1 },
    content_hash: "sha256:proof-pack",
    markdown_available: true,
    report_input_available: true,
    ai_evidence_input_available: true,
  },
  data: {
    proof_pack: {
      proof_pack_id: "ppack_1",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      rebalance_run_id: "rr_1",
      status: "READY",
      content_hash: "sha256:proof-pack",
      sections: [
        {
          section: "investment_policy",
          state: "READY",
          source_service: "lotus-manage",
          content_hash: "sha256:policy",
        },
      ],
      source_hashes: {
        risk_snapshot_1: "sha256:risk",
      },
    },
  },
};

const rebalanceSnapshot = {
  status: "READY",
  last_rebalance_run_id: "run_001",
  last_run_at_utc: "2026-05-07T01:00:00Z",
  recent_runs: [
    {
      rebalance_run_id: "run_001",
      status: "READY",
      created_at_utc: "2026-05-07T01:00:00Z",
      error_code: null,
      workflow_state: "REVIEW_READY",
    },
  ],
};

describe("ProofPackPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders manage-backed proof-pack evidence posture", () => {
    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mandateId="MANDATE_PB_SG_GLOBAL_BAL_001"
        outcomeReviews={outcomeReviews}
        rebalanceSnapshot={rebalanceSnapshot}
        initialProofPack={readyProofPack}
      />
    );

    expect(screen.getByRole("heading", { name: "Proof-Pack Evidence" })).toBeInTheDocument();
    expect(screen.getAllByText("READY").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ppack_1")).toBeInTheDocument();
    expect(screen.getAllByText("sha256:proof-pack").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("investment_policy")).toBeInTheDocument();
    expect(screen.getByText("sha256:risk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate proof pack" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Load Markdown" })).toBeEnabled();
  });

  it("generates a proof pack from the Workbench rebalance snapshot run", async () => {
    vi.mocked(generateDpmProofPackFromRun).mockResolvedValue(readyProofPack);

    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mandateId="MANDATE_PB_SG_GLOBAL_BAL_001"
        outcomeReviews={outcomeReviews}
        rebalanceSnapshot={rebalanceSnapshot}
        initialProofPack={null}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate proof pack" }));

    await waitFor(() => {
      expect(generateDpmProofPackFromRun).toHaveBeenCalledWith({
        rebalanceRunId: "run_001",
        mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
      });
    });
    expect(screen.getByText("Proof-pack generation completed through Gateway.")).toBeInTheDocument();
    expect(screen.getByText("ppack_1")).toBeInTheDocument();
  });

  it("loads proof-pack detail and handoff payloads through Gateway", async () => {
    vi.mocked(getDpmProofPack).mockResolvedValue(readyProofPack);
    vi.mocked(getDpmProofPackMarkdown).mockResolvedValue({
      ...readyProofPack,
      data: { markdown: "# Proof Pack\n\nReady." },
    });
    vi.mocked(getDpmProofPackReportInput).mockResolvedValue(readyProofPack);
    vi.mocked(getDpmProofPackAiEvidenceInput).mockResolvedValue(readyProofPack);
    vi.mocked(requestDpmProofPackAiPmMemo).mockResolvedValue({
      correlation_id: "corr-rfc40-ai-memo",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: readyProofPack.supportability,
      ai_evidence_input: { proof_pack_id: "ppack_1" },
      memo_request: { requested_outputs: ["pm_memo"], audience: ["portfolio_manager"] },
      data: {
        workflow_pack_run: {
          run_id: "packrun_ppack_1",
          review_state: "AWAITING_REVIEW",
        },
      },
    });

    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        outcomeReviews={outcomeReviews}
        rebalanceSnapshot={rebalanceSnapshot}
        initialProofPack={readyProofPack}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Load proof pack" }));
    await waitFor(() => expect(getDpmProofPack).toHaveBeenCalledWith("ppack_1"));
    fireEvent.click(screen.getByRole("button", { name: "Load Markdown" }));
    await waitFor(() => expect(getDpmProofPackMarkdown).toHaveBeenCalledWith("ppack_1"));
    expect(await screen.findByLabelText("Proof-pack Markdown preview")).toHaveTextContent(
      "Ready."
    );
    fireEvent.click(screen.getByRole("button", { name: "Report Input" }));
    await waitFor(() => expect(getDpmProofPackReportInput).toHaveBeenCalledWith("ppack_1"));
    fireEvent.click(screen.getByRole("button", { name: "AI Evidence" }));
    await waitFor(() => expect(getDpmProofPackAiEvidenceInput).toHaveBeenCalledWith("ppack_1"));
    fireEvent.click(screen.getByRole("button", { name: "AI PM Memo" }));
    await waitFor(() =>
      expect(requestDpmProofPackAiPmMemo).toHaveBeenCalledWith({ proofPackId: "ppack_1" })
    );
    expect(screen.getByText("PM memo AWAITING_REVIEW (packrun_ppack_1).")).toBeInTheDocument();
  });

  it("renders unavailable state without claiming generated proof", () => {
    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        outcomeReviews={null}
        initialProofPack={null}
        errorMessage="Failed to fetch DPM proof pack (503)"
      />
    );

    expect(screen.getByText("Proof-pack endpoint is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM proof pack (503)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate proof pack" })).toBeDisabled();
  });
});
