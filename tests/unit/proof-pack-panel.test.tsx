import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProofPackPanel from "../../src/features/workbench/components/proof-pack-panel";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmProofPackGatewayResponse,
} from "../../src/features/workbench/types";
import {
  generateDpmProofPackFromRun,
  getDpmProofPack,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  requestDpmProofPackAiPmMemo,
} from "../../src/features/workbench/proof-pack-api";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";
import ManageEvidenceRail from "../../src/features/workbench/components/manage-evidence-rail";
import { ManageProofPackStateProvider } from "../../src/features/workbench/manage-proof-pack-state";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

vi.mock("../../src/features/workbench/proof-pack-api", () => ({
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
      decision_summary: {
        approval_state: "SIGNATURE_PENDING",
        business_rationale: "Portfolio positioning remains within the mandate corridor.",
      },
      sections: [
        {
          section_type: "mandate_alignment",
          title: "Mandate Alignment",
          summary: "Ready for advisor review",
          state: "READY",
          source_service: "lotus-manage",
          content_hash: "sha256:policy",
        },
        {
          section_type: "risk_disclosure",
          title: "Risk Disclosure",
          summary: "Within approved profile",
          state: "READY",
          source_service: "lotus-risk",
          content_hash: "sha256:risk-section",
        },
      ],
      markdown_summary_ref: { ref_type: "mandate_alignment_report", ref_id: "doc_1" },
      report_input_ref: { ref_type: "client_report", ref_id: "doc_2" },
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

  it("renders decision evidence posture", () => {
    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        mandateId="MANDATE_PB_SG_GLOBAL_BAL_001"
        outcomeReviews={outcomeReviews}
        rebalanceSnapshot={rebalanceSnapshot}
        initialProofPack={readyProofPack}
      />
    );

    expect(document.querySelector("#evidence-pack-panel")).toBeInTheDocument();
    expect(screen.getByText("Evidence status")).toBeInTheDocument();
    expect(screen.getByText("Approval readiness")).toBeInTheDocument();
    expect(screen.getByText("Signature Pending")).toBeInTheDocument();
    expect(screen.getByText("Mandate coverage")).toBeInTheDocument();
    expect(screen.getAllByText("Mandate Alignment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ready for advisor review").length).toBeGreaterThan(0);
    expect(screen.queryByText("ppack_1")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:proof-pack")).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:risk")).not.toBeInTheDocument();
    expect(screen.queryByText("lotus-manage")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare evidence" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Load evidence summary/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Check report readiness/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Open advisor memo/ })).toBeEnabled();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("prepares an evidence pack from the rebalance snapshot run", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Prepare evidence" }));

    await waitFor(() => {
      expect(generateDpmProofPackFromRun).toHaveBeenCalledWith({
        rebalanceRunId: "run_001",
        mandateId: "MANDATE_PB_SG_GLOBAL_BAL_001",
      });
    });
    expect(await screen.findByText("Evidence pack prepared.")).toBeInTheDocument();
    expect(screen.queryByText("ppack_1")).not.toBeInTheDocument();
  });

  it("updates the adjacent evidence rail after a source-backed pack is prepared", async () => {
    vi.mocked(generateDpmProofPackFromRun).mockResolvedValue(readyProofPack);
    const data = buildManageWorkspaceData({
      outcomeReviews,
      proofPack: null,
      proofPackError: null,
    });

    render(
      <ManageProofPackStateProvider initialProofPack={null}>
        <ProofPackPanel
          portfolioId="PB_SG_GLOBAL_BAL_001"
          mandateId="MANDATE_PB_SG_GLOBAL_BAL_001"
          outcomeReviews={outcomeReviews}
          rebalanceSnapshot={rebalanceSnapshot}
          initialProofPack={null}
          errorMessage="Evidence pack preload is temporarily unavailable."
        />
        <ManageEvidenceRail data={data} />
      </ManageProofPackStateProvider>
    );

    const rail = screen.getByLabelText("Manage source evidence");
    expect(within(rail).getByText("Referenced; not retrieved")).toBeInTheDocument();
    expect(screen.getByText("Evidence pack preload is temporarily unavailable.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Prepare evidence" }));

    await waitFor(() => expect(within(rail).getByText("Available")).toBeInTheDocument());
    expect(within(rail).queryByText("Referenced; not retrieved")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence pack preload is temporarily unavailable.")).not.toBeInTheDocument();
  });

  it("uses the shared current pack when a Manage mode remount has stale server props", () => {
    render(
      <ManageProofPackStateProvider initialProofPack={readyProofPack}>
        <ProofPackPanel
          portfolioId="PB_SG_GLOBAL_BAL_001"
          outcomeReviews={outcomeReviews}
          rebalanceSnapshot={rebalanceSnapshot}
          initialProofPack={null}
        />
      </ManageProofPackStateProvider>
    );

    expect(screen.getByText("Signature Pending")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Load evidence summary/ })).toBeEnabled();
  });

  it("retains a published pack across a mode remount with a new transport correlation", async () => {
    const currentProofPack: DpmProofPackGatewayResponse = {
      ...readyProofPack,
      correlation_id: "corr-current-runtime-pack",
      data: {
        ...readyProofPack.data,
        proof_pack: {
          ...(readyProofPack.data.proof_pack as Record<string, unknown>),
          decision_summary: {
            approval_state: "REVIEW_PENDING",
            business_rationale: "Current runtime evidence remains under review.",
          },
        },
      },
    };
    const staleServerPack = {
      ...readyProofPack,
      correlation_id: "corr-new-request-stale-pack",
    };
    vi.mocked(generateDpmProofPackFromRun).mockResolvedValue(currentProofPack);

    function Harness({ panelKey, serverPack }: { panelKey: string; serverPack: DpmProofPackGatewayResponse }) {
      return (
        <ManageProofPackStateProvider initialProofPack={serverPack}>
          <ProofPackPanel
            key={panelKey}
            portfolioId="PB_SG_GLOBAL_BAL_001"
            outcomeReviews={outcomeReviews}
            rebalanceSnapshot={rebalanceSnapshot}
            initialProofPack={serverPack}
          />
        </ManageProofPackStateProvider>
      );
    }

    const { rerender } = render(<Harness panelKey="proof" serverPack={readyProofPack} />);
    fireEvent.click(screen.getByRole("button", { name: "Prepare evidence" }));
    expect(await screen.findByText("Review Pending")).toBeInTheDocument();

    rerender(<Harness panelKey="waves" serverPack={staleServerPack} />);

    expect(screen.getByText("Review Pending")).toBeInTheDocument();
    expect(screen.queryByText("Signature Pending")).not.toBeInTheDocument();
  });

  it("adopts refreshed shared server evidence before any local action", () => {
    const refreshedProofPack: DpmProofPackGatewayResponse = {
      ...readyProofPack,
      correlation_id: "corr-refreshed-server-pack",
      data: {
        ...readyProofPack.data,
        proof_pack: {
          ...(readyProofPack.data.proof_pack as Record<string, unknown>),
          decision_summary: {
            approval_state: "REVIEW_PENDING",
            business_rationale: "Refreshed source evidence is under review.",
          },
        },
      },
    };

    function Harness({ serverPack }: { serverPack: DpmProofPackGatewayResponse }) {
      return (
        <ManageProofPackStateProvider initialProofPack={serverPack}>
          <ProofPackPanel
            portfolioId="PB_SG_GLOBAL_BAL_001"
            outcomeReviews={outcomeReviews}
            rebalanceSnapshot={rebalanceSnapshot}
            initialProofPack={serverPack}
          />
        </ManageProofPackStateProvider>
      );
    }

    const { rerender } = render(<Harness serverPack={readyProofPack} />);
    expect(screen.getByText("Signature Pending")).toBeInTheDocument();

    rerender(<Harness serverPack={refreshedProofPack} />);

    expect(screen.getByText("Review Pending")).toBeInTheDocument();
    expect(screen.queryByText("Signature Pending")).not.toBeInTheDocument();
  });

  it("loads evidence detail and handoff payloads", async () => {
    vi.mocked(getDpmProofPack).mockResolvedValue(readyProofPack);
    vi.mocked(getDpmProofPackMarkdown).mockResolvedValue({
      ...readyProofPack,
      data: { markdown: "# Proof Pack\n\nReady." },
    });
    vi.mocked(getDpmProofPackReportInput).mockResolvedValue(readyProofPack);
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
      data: buildDpmAiWorkflowExecution("proof-pack-memo", { runId: "packrun_ppack_1" }),
    });

    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        outcomeReviews={outcomeReviews}
        rebalanceSnapshot={rebalanceSnapshot}
        initialProofPack={readyProofPack}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Load evidence" }));
    await waitFor(() => expect(getDpmProofPack).toHaveBeenCalledWith("ppack_1"));
    fireEvent.click(screen.getByRole("button", { name: /^Load evidence summary/ }));
    await waitFor(() => expect(getDpmProofPackMarkdown).toHaveBeenCalledWith("ppack_1"));
    expect(await screen.findByLabelText("Evidence pack summary preview")).toHaveTextContent(
      "Ready."
    );
    fireEvent.click(screen.getByRole("button", { name: /^Check report readiness/ }));
    await waitFor(() => expect(getDpmProofPackReportInput).toHaveBeenCalledWith("ppack_1"));
    fireEvent.click(screen.getByRole("button", { name: /^Open advisor memo/ }));
    await waitFor(() =>
      expect(requestDpmProofPackAiPmMemo).toHaveBeenCalledWith({ proofPackId: "ppack_1" })
    );
    const resultHeading = await screen.findByRole("heading", {
      name: "Portfolio decision memo",
    });
    expect(resultHeading).toHaveFocus();
    expect(screen.getByLabelText("Status Live output • review required")).toBeInTheDocument();
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

    expect(screen.getByText("Evidence pack is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch DPM proof pack (503)")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Evidence areas" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Evidence pack next actions")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare evidence" })).toBeDisabled();
  });

  it("withholds stale workspace data when source supportability is unavailable", () => {
    render(
      <ProofPackPanel
        portfolioId="PB_SG_GLOBAL_BAL_001"
        outcomeReviews={outcomeReviews}
        rebalanceSnapshot={rebalanceSnapshot}
        initialProofPack={{
          ...readyProofPack,
          supportability: {
            ...readyProofPack.supportability,
            state: "UNAVAILABLE",
            reason_codes: ["PROOF_PACK_SOURCE_UNAVAILABLE"],
          },
        }}
      />
    );

    expect(screen.getByText("Evidence pack is unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Status Unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Evidence areas" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Evidence pack next actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for advisor review")).not.toBeInTheDocument();
  });
});
