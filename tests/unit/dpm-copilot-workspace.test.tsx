import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import {
  ManageProofPackStateProvider,
  useManageProofPackState,
} from "../../src/features/workbench/manage-proof-pack-state";
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
        authority: "lotus-manage:RFC-0040",
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

  it("discards an in-flight result when its portfolio and source reference change", async () => {
    const response = {
      ...buildDpmAiWorkflowResponse("proof-pack-memo"),
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:RFC-0040",
        state: "READY",
        proof_pack_id: "ppack_001",
        reason_codes: ["PROOF_PACK_READY"],
        markdown_available: true,
        report_input_available: true,
        ai_evidence_input_available: true,
      },
      ai_evidence_input: { proof_pack_id: "ppack_001" },
      memo_request: { requested_outputs: ["pm_memo"] },
    };
    let resolveRequest: ((value: typeof response) => void) | null = null;
    vi.mocked(requestDpmProofPackAiPmMemo).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const initialData = buildManageWorkspaceData();
    initialData.proofPack = buildProofPack({ aiEvidenceInputAvailable: true });
    const { rerender } = render(
      <DpmCopilotWorkspace data={initialData} mandateId="mandate_001" />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Prepare Proof-Pack PM Memo" }),
    );

    const nextData = buildManageWorkspaceData();
    nextData.portfolio.portfolio.portfolio_id = "PB_SG_GLOBAL_GROWTH_002";
    nextData.proofPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_002",
    });
    rerender(<DpmCopilotWorkspace data={nextData} mandateId="mandate_002" />);

    await act(async () => {
      resolveRequest?.(response);
    });

    expect(
      screen.queryByRole("heading", { name: "Portfolio decision memo" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("PB_SG_GLOBAL_GROWTH_002")).toBeInTheDocument();
    expect(screen.getByText("ppack_002")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Prepare Proof-Pack PM Memo" }),
    ).toBeEnabled();
  });

  it("uses the source-confirmed evidence pack published in the Manage session", async () => {
    const data = buildManageWorkspaceData();
    const serverPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_server_001",
    });
    const publishedPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_published_002",
    });
    data.proofPack = serverPack;
    vi.mocked(requestDpmProofPackAiPmMemo).mockResolvedValue(
      buildProofPackMemoResponse("ppack_published_002"),
    );

    render(
      <ManageProofPackStateProvider initialProofPack={serverPack}>
        <PublishProofPackButton proofPack={publishedPack} />
        <DpmCopilotWorkspace data={data} mandateId="mandate_001" />
      </ManageProofPackStateProvider>,
    );

    expect(screen.getByText("ppack_server_001")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish ppack_published_002" }));
    expect(screen.getByText("ppack_published_002")).toBeInTheDocument();
    expect(screen.queryByText("ppack_server_001")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Prepare Proof-Pack PM Memo" }));
    await waitFor(() =>
      expect(requestDpmProofPackAiPmMemo).toHaveBeenCalledWith({
        proofPackId: "ppack_published_002",
      }),
    );
  });

  it("uses a newly published pack's supportability instead of stale server readiness", () => {
    const data = buildManageWorkspaceData();
    const serverPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_server_ready",
    });
    const publishedPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_published_stale",
      state: "STALE",
    });
    data.proofPack = serverPack;

    render(
      <ManageProofPackStateProvider initialProofPack={serverPack}>
        <PublishProofPackButton proofPack={publishedPack} />
        <DpmCopilotWorkspace data={data} mandateId="mandate_001" />
      </ManageProofPackStateProvider>,
    );

    expect(screen.getByRole("button", { name: "Prepare Proof-Pack PM Memo" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Publish ppack_published_stale" }));
    expect(
      screen.getByRole("button", {
        name: "Proof-Pack PM Memo unavailable: Current evidence pack not ready",
      }),
    ).toBeDisabled();
    expect(screen.getByText("ppack_published_stale")).toBeInTheDocument();
    expect(requestDpmProofPackAiPmMemo).not.toHaveBeenCalled();
  });

  it("enables the action when a source-confirmed pack replaces blocked server evidence", () => {
    const data = buildManageWorkspaceData();
    const serverPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_server_stale",
      state: "STALE",
    });
    const publishedPack = buildProofPack({
      aiEvidenceInputAvailable: true,
      proofPackId: "ppack_published_ready",
    });
    data.proofPack = serverPack;

    render(
      <ManageProofPackStateProvider initialProofPack={serverPack}>
        <PublishProofPackButton proofPack={publishedPack} />
        <DpmCopilotWorkspace data={data} mandateId="mandate_001" />
      </ManageProofPackStateProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: "Proof-Pack PM Memo unavailable: Current evidence pack not ready",
      }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Publish ppack_published_ready" }));
    expect(screen.getByRole("button", { name: "Prepare Proof-Pack PM Memo" })).toBeEnabled();
    expect(screen.getByText("ppack_published_ready")).toBeInTheDocument();
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
  proofPackId = "ppack_001",
  state = "READY",
}: {
  aiEvidenceInputAvailable: boolean;
  proofPackId?: string;
  state?: string;
}): DpmProofPackGatewayResponse {
  return {
    correlation_id: "corr_proof_pack",
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    supportability: {
      source_service: "lotus-manage",
      authority: "lotus-manage:RFC-0040",
      state,
      proof_pack_id: proofPackId,
      reason_codes: ["PROOF_PACK_READY"],
      markdown_available: true,
      report_input_available: true,
      ai_evidence_input_available: aiEvidenceInputAvailable,
    },
    data: {
      proof_pack: {
        proof_pack_id: proofPackId,
        sections: [{ section: "mandate_alignment", state: "READY" }],
      },
    },
  };
}

function PublishProofPackButton({
  proofPack,
}: {
  proofPack: DpmProofPackGatewayResponse;
}) {
  const state = useManageProofPackState();
  return (
    <button type="button" onClick={() => state?.publishProofPack(proofPack)}>
      Publish {proofPack.supportability.proof_pack_id}
    </button>
  );
}

function buildProofPackMemoResponse(proofPackId: string) {
  return {
    ...buildDpmAiWorkflowResponse("proof-pack-memo"),
    supportability: {
      source_service: "lotus-manage",
      authority: "lotus-manage:RFC-0040",
      state: "READY",
      proof_pack_id: proofPackId,
      reason_codes: ["PROOF_PACK_READY"],
      markdown_available: true,
      report_input_available: true,
      ai_evidence_input_available: true,
    },
    ai_evidence_input: { proof_pack_id: proofPackId },
    memo_request: {
      requested_outputs: ["pm_memo"],
      audience: ["portfolio_manager"],
    },
  };
}
