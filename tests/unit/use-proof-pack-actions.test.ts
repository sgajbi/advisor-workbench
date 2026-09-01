import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useProofPackActions } from "../../src/features/workbench/use-proof-pack-actions";
import {
  generateDpmProofPackFromRun,
  getDpmProofPack,
  getDpmProofPackMarkdown,
  getDpmProofPackReportInput,
  requestDpmProofPackAiPmMemo,
} from "../../src/features/workbench/proof-pack-api";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";
import type { DpmProofPackGatewayResponse } from "../../src/features/workbench/types";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

vi.mock("../../src/features/workbench/proof-pack-api", () => ({
  generateDpmProofPackFromRun: vi.fn(),
  getDpmProofPack: vi.fn(),
  getDpmProofPackMarkdown: vi.fn(),
  getDpmProofPackReportInput: vi.fn(),
  requestDpmProofPackAiPmMemo: vi.fn(),
}));

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
      mandate_id: "MANDATE_PB_SG_GLOBAL_BAL_001",
      rebalance_run_id: "rr_1",
      status: "READY",
      sections: [
        {
          section_type: "mandate_alignment",
          title: "Mandate Alignment",
          summary: "Ready for advisor review",
          state: "READY",
        },
      ],
    },
  },
};

function renderProofPackActions(
  initialProofPack: DpmProofPackGatewayResponse | null = readyProofPack,
  onProofPackChange?: (proofPack: DpmProofPackGatewayResponse) => void,
) {
  return renderHook(() =>
    useProofPackActions({
      initialProofPack,
      contextProofPackId: "context_ppack",
      contextRebalanceRunId: "context_run",
      contextMandateId: "context_mandate",
      mandateId: "explicit_mandate",
      onProofPackChange,
    })
  );
}

describe("useProofPackActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("derives display model and resolved action identifiers without leaking source work into the panel", () => {
    const { result } = renderProofPackActions();

    expect(result.current.model.proofPackId).toBe("ppack_1");
    expect(result.current.proofPackId).toBe("ppack_1");
    expect(result.current.rebalanceRunId).toBe("context_run");
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.markdown).toBeNull();
  });

  it("generates a proof pack through Gateway using the resolved mandate", async () => {
    vi.mocked(generateDpmProofPackFromRun).mockResolvedValue(readyProofPack);
    const onProofPackChange = vi.fn();
    const { result } = renderProofPackActions(null, onProofPackChange);

    expect(result.current.proofPackId).toBe("context_ppack");

    act(() => {
      result.current.generateProofPack();
    });

    await waitFor(() => {
      expect(generateDpmProofPackFromRun).toHaveBeenCalledWith({
        rebalanceRunId: "context_run",
        mandateId: "explicit_mandate",
      });
    });
    await waitFor(() => expect(result.current.handoffStatus).toBe("Evidence pack prepared."));
    expect(result.current.model.proofPackId).toBe("ppack_1");
    expect(onProofPackChange).toHaveBeenCalledWith(readyProofPack);
  });

  it("keeps context proof-pack ids available for intentional manual loading", async () => {
    vi.mocked(getDpmProofPack).mockResolvedValue(readyProofPack);
    const onProofPackChange = vi.fn();
    const { result } = renderProofPackActions(null, onProofPackChange);

    expect(result.current.model.proofPackId).toBe("N/A");
    expect(result.current.proofPackId).toBe("context_ppack");

    act(() => result.current.loadProofPack());

    await waitFor(() => expect(getDpmProofPack).toHaveBeenCalledWith("context_ppack"));
    await waitFor(() => expect(result.current.handoffStatus).toBe("Evidence pack loaded."));
    expect(result.current.model.proofPackId).toBe("ppack_1");
    expect(onProofPackChange).toHaveBeenCalledWith(readyProofPack);
  });

  it("reports missing context proof-pack detail as a product-safe unavailable state", async () => {
    vi.mocked(getDpmProofPack).mockRejectedValue(new WorkbenchApiError("DPM proof pack", 404));
    const { result } = renderProofPackActions(null);

    act(() => result.current.loadProofPack());

    await waitFor(() => expect(getDpmProofPack).toHaveBeenCalledWith("context_ppack"));
    await waitFor(() =>
      expect(result.current.actionError).toBe(
        "Evidence pack is not available from Gateway. Prepare evidence to generate the current review pack."
      )
    );
  });

  it("loads proof-pack detail and handoff payload posture through Gateway only", async () => {
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
    const { result } = renderProofPackActions();

    act(() => result.current.loadProofPack());
    await waitFor(() => expect(getDpmProofPack).toHaveBeenCalledWith("ppack_1"));
    await waitFor(() => expect(result.current.handoffStatus).toBe("Evidence pack loaded."));

    act(() => result.current.loadMarkdown());
    await waitFor(() => expect(getDpmProofPackMarkdown).toHaveBeenCalledWith("ppack_1"));
    await waitFor(() => expect(result.current.markdown).toContain("Ready."));

    act(() => result.current.loadReportInput());
    await waitFor(() => expect(getDpmProofPackReportInput).toHaveBeenCalledWith("ppack_1"));
    await waitFor(() => expect(result.current.handoffStatus).toBe("Report-ready evidence is available."));

    act(() => result.current.requestAiPmMemo());
    await waitFor(() => expect(requestDpmProofPackAiPmMemo).toHaveBeenCalledWith({ proofPackId: "ppack_1" }));
    await waitFor(() => expect(result.current.aiMemoOutcome?.family).toBe("proof-pack-memo"));
    expect(result.current.handoffStatus).toBeNull();
    expect(result.current.aiMemoOutcome?.disclosure).toMatchObject({
      availability: "live",
      humanReview: { state: "review-required" },
      clientUse: "internal-only",
    });
  });

  it("does not present report readiness when Gateway says the evidence is unavailable", async () => {
    vi.mocked(getDpmProofPackReportInput).mockResolvedValue({
      ...readyProofPack,
      supportability: {
        ...readyProofPack.supportability,
        report_input_available: false,
      },
    });
    const { result } = renderProofPackActions();

    act(() => result.current.loadReportInput());

    await waitFor(() => expect(getDpmProofPackReportInput).toHaveBeenCalledWith("ppack_1"));
    await waitFor(() =>
      expect(result.current.handoffStatus).toBe("Report-ready evidence is not available.")
    );
  });

  it("removes a memo outcome when generation replaces its source proof pack", async () => {
    const replacementProofPack: DpmProofPackGatewayResponse = {
      ...readyProofPack,
      correlation_id: "corr-rfc40-replacement",
      supportability: {
        ...readyProofPack.supportability,
        proof_pack_id: "ppack_2",
        content_hash: "sha256:replacement-proof-pack",
      },
      data: {
        proof_pack: {
          ...(readyProofPack.data.proof_pack as Record<string, unknown>),
          proof_pack_id: "ppack_2",
        },
      },
    };
    vi.mocked(requestDpmProofPackAiPmMemo).mockResolvedValue({
      correlation_id: "corr-rfc40-ai-memo",
      contract_version: "v1",
      source_service: "lotus-ai",
      evidence_source_service: "lotus-manage",
      manage_upstream_status: 200,
      ai_upstream_status: 200,
      supportability: readyProofPack.supportability,
      ai_evidence_input: { proof_pack_id: "ppack_1" },
      memo_request: { requested_outputs: ["pm_memo"] },
      data: buildDpmAiWorkflowExecution("proof-pack-memo", {
        runId: "packrun_ppack_1",
      }),
    });
    vi.mocked(generateDpmProofPackFromRun).mockResolvedValue(
      replacementProofPack,
    );
    const { result } = renderProofPackActions();

    act(() => result.current.requestAiPmMemo());
    await waitFor(() => expect(result.current.aiMemoOutcome).not.toBeNull());

    act(() => result.current.generateProofPack());
    await waitFor(() => expect(result.current.proofPackId).toBe("ppack_2"));

    expect(result.current.aiMemoOutcome).toBeNull();
  });

  it("does not call Gateway when required proof-pack or rebalance identifiers are absent", async () => {
    const { result } = renderHook(() =>
      useProofPackActions({
        initialProofPack: null,
        contextProofPackId: null,
        contextRebalanceRunId: null,
        contextMandateId: null,
      })
    );

    act(() => {
      result.current.generateProofPack();
      result.current.loadProofPack();
      result.current.loadMarkdown();
      result.current.loadReportInput();
      result.current.requestAiPmMemo();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(generateDpmProofPackFromRun).not.toHaveBeenCalled();
    expect(getDpmProofPack).not.toHaveBeenCalled();
    expect(getDpmProofPackMarkdown).not.toHaveBeenCalled();
    expect(getDpmProofPackReportInput).not.toHaveBeenCalled();
    expect(requestDpmProofPackAiPmMemo).not.toHaveBeenCalled();
  });
});
