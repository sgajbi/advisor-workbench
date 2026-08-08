import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DpmCopilotWorkspace from "../../src/features/workbench/components/dpm-copilot-workspace";
import { requestDpmExceptionSummary } from "../../src/features/workbench/dpm-command-center-api";
import {
  requestDpmOperationsHandoffSummary,
  requestDpmWaveAiPmMemo,
} from "../../src/features/workbench/dpm-wave-api";
import { requestDpmOutcomeReviewAiNarrative } from "../../src/features/workbench/outcome-review-api";
import { requestDpmPmOperatingQualitySummary } from "../../src/features/workbench/pm-operating-quality-api";
import { requestDpmProofPackAiPmMemo } from "../../src/features/workbench/proof-pack-api";
import type { DpmProofPackGatewayResponse } from "../../src/features/workbench/types";
import { buildDpmAiWorkflowResponse } from "../fixtures/dpm-ai-workflow-fixtures";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

vi.mock("../../src/features/workbench/dpm-command-center-api", () => ({
  requestDpmExceptionSummary: vi.fn(),
}));
vi.mock("../../src/features/workbench/dpm-wave-api", () => ({
  requestDpmOperationsHandoffSummary: vi.fn(),
  requestDpmWaveAiPmMemo: vi.fn(),
}));
vi.mock("../../src/features/workbench/outcome-review-api", () => ({
  requestDpmOutcomeReviewAiNarrative: vi.fn(),
}));
vi.mock("../../src/features/workbench/pm-operating-quality-api", () => ({
  requestDpmPmOperatingQualitySummary: vi.fn(),
}));
vi.mock("../../src/features/workbench/proof-pack-api", () => ({
  requestDpmProofPackAiPmMemo: vi.fn(),
}));

describe("DpmCopilotWorkspace", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("moves focus to a business result and exposes the governed disclosure", async () => {
    const data = buildManageWorkspaceData();
    data.proofPack = buildProofPack({ aiEvidenceInputAvailable: true });
    vi.mocked(requestDpmProofPackAiPmMemo).mockResolvedValue({
      ...buildDpmAiWorkflowResponse("proof-pack-memo"),
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:proof-pack",
        state: "READY",
        proof_pack_id: "ppack_001",
        reason_codes: ["PROOF_PACK_READY"],
        markdown_available: true,
        report_input_available: true,
        ai_evidence_input_available: true,
      },
      ai_evidence_input: { proof_pack_id: "ppack_001" },
      memo_request: {
        requested_outputs: ["pm_memo"],
        audience: ["portfolio_manager"],
      },
    });

    render(<DpmCopilotWorkspace data={data} mandateId="mandate_001" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare Proof-Pack PM Memo" }),
    );
    expect(requestDpmProofPackAiPmMemo).toHaveBeenCalledWith({ proofPackId: "ppack_001" });

    const heading = await screen.findByRole("heading", {
      name: "Portfolio decision memo",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      screen.getByLabelText("Status Live output • review required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Portfolio decision memo is available for internal review and is not approved for client use.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("How this was prepared"));
    expect(screen.getByText("Source evidence attached")).toBeVisible();
    expect(screen.getByText("Human review required")).toBeVisible();
    expect(screen.getByText("Internal working use only")).toBeVisible();
    expect(screen.getByText("Freshness not reported")).toBeVisible();
    expect(
      screen.getByLabelText("Technical support details"),
    ).toHaveTextContent("packrun_dpm_pm_memo_001");
  });

  it("keeps unavailable actions disabled and names their business blocker", () => {
    const data = buildManageWorkspaceData();
    data.proofPack = null;
    data.outcomeReviews = null;

    render(<DpmCopilotWorkspace data={data} mandateId="mandate_001" />);

    const unavailableAction = screen.getByRole("button", {
      name: "Proof-Pack PM Memo unavailable: No current evidence pack available",
    });
    expect(unavailableAction).toBeDisabled();
    expect(unavailableAction).toHaveTextContent("Unavailable");
    expect(screen.getByText("No current evidence pack available")).toBeInTheDocument();
    expect(requestDpmExceptionSummary).not.toHaveBeenCalled();
    expect(requestDpmWaveAiPmMemo).not.toHaveBeenCalled();
    expect(requestDpmOperationsHandoffSummary).not.toHaveBeenCalled();
    expect(requestDpmOutcomeReviewAiNarrative).not.toHaveBeenCalled();
    expect(requestDpmPmOperatingQualitySummary).not.toHaveBeenCalled();
  });

  it("keeps historical proof-pack lineage visible without presenting it as actionable", () => {
    const data = buildManageWorkspaceData();

    render(<DpmCopilotWorkspace data={data} mandateId="mandate_001" />);

    expect(screen.getByText("Historical Reference")).toBeInTheDocument();
    expect(screen.getByText("ppack_1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Proof-Pack PM Memo unavailable: Current evidence pack unavailable",
      }),
    ).toBeDisabled();
    expect(screen.getByText("Current evidence pack unavailable")).toBeInTheDocument();
    expect(requestDpmProofPackAiPmMemo).not.toHaveBeenCalled();
  });

  it("requires current decision-support evidence before enabling the proof-pack memo", () => {
    const data = buildManageWorkspaceData();
    data.proofPack = buildProofPack({ aiEvidenceInputAvailable: false });

    render(<DpmCopilotWorkspace data={data} mandateId="mandate_001" />);

    expect(
      screen.getByRole("button", {
        name: "Proof-Pack PM Memo unavailable: Decision-support evidence unavailable",
      }),
    ).toBeDisabled();
    expect(screen.getByText("Decision-support evidence unavailable")).toBeInTheDocument();
    expect(requestDpmProofPackAiPmMemo).not.toHaveBeenCalled();
  });

  it.each(["STALE", "UNSUPPORTED"])(
    "keeps a %s proof pack non-actionable even when its evidence flag is inconsistent",
    (state) => {
      const data = buildManageWorkspaceData();
      data.proofPack = buildProofPack({ aiEvidenceInputAvailable: true, state });

      render(<DpmCopilotWorkspace data={data} mandateId="mandate_001" />);

      expect(
        screen.getByRole("button", {
          name: "Proof-Pack PM Memo unavailable: Current evidence pack not ready",
        }),
      ).toBeDisabled();
      expect(screen.getByText("Current evidence pack not ready")).toBeInTheDocument();
      expect(requestDpmProofPackAiPmMemo).not.toHaveBeenCalled();
    },
  );
});

function buildProofPack({
  aiEvidenceInputAvailable,
  state = "READY",
}: {
  aiEvidenceInputAvailable: boolean;
  state?: string;
}): DpmProofPackGatewayResponse {
  return {
    correlation_id: "corr_proof_pack",
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    supportability: {
      source_service: "lotus-manage",
      authority: "lotus-manage:proof-pack",
      state,
      proof_pack_id: "ppack_001",
      reason_codes: ["PROOF_PACK_READY"],
      markdown_available: true,
      report_input_available: true,
      ai_evidence_input_available: aiEvidenceInputAvailable,
    },
    data: {
      proof_pack: {
        proof_pack_id: "ppack_001",
        sections: [{ section: "mandate_alignment", state: "READY" }],
      },
    },
  };
}
