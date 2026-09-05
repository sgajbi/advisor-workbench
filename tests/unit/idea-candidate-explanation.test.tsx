import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IdeaCandidateExplanation from "../../src/features/proposals/components/idea-candidate-explanation";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

const dependencies = vi.hoisted(() => ({
  requestAdvisorIdeaAIExplanation: vi.fn(),
  opened: vi.fn(),
  served: vi.fn(),
  unavailable: vi.fn(),
  failed: vi.fn(),
}));

const EVIDENCE_IDENTITY = {
  evidencePacketId: "evidence-001",
  evidenceContentHash: "sha256:evidence-001",
  sourceRevisionVectorDigest: "sha256:revision-001",
};

vi.mock("../../src/features/proposals/api", () => ({
  requestAdvisorIdeaAIExplanation:
    dependencies.requestAdvisorIdeaAIExplanation,
}));

vi.mock("../../src/features/proposals/idea-ai-explanation-telemetry", () => ({
  recordIdeaExplanationOpened: dependencies.opened,
  recordIdeaExplanationFailed: dependencies.failed,
  recordIdeaExplanationServed: dependencies.served,
  recordIdeaExplanationUnavailable: dependencies.unavailable,
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderExplanation(evidenceIdentity = EVIDENCE_IDENTITY) {
  return render(
    <IdeaCandidateExplanation
      candidateId="idea-001"
      evidenceIdentity={evidenceIdentity}
      portfolioId="PB_SG_GLOBAL_BAL_001"
    />,
    { wrapper },
  );
}

function servedResponse(evidenceIdentity = EVIDENCE_IDENTITY) {
  return {
    status: "EXPLANATION_SERVED" as const,
    disposition: "executed",
    lotusAiRunId: "run-001",
    lotusAiRuntimeExecutionConfirmed: true,
    evaluationVerdict: "accepted",
    explanation: {
      requestId: "request-runtime",
      candidateId: "idea-001",
      posture: "ready_for_advisor_review",
      verifierOutcome: "passed",
      explanationText: "Cash weight is above the policy threshold.",
      fallbackUsed: false,
      fallbackReason: null,
      grantsDownstreamAuthority: false,
      supportedFeaturePromoted: false,
      executionProvenancePosture: "unattested_local_test_fixture",
      aiLineageRecorded: true,
      verifiedOutput: {
        groundedClaims: [
          {
            claimId: "claim-001",
            claimText: "Cash weight is above the policy threshold.",
            sourceRefs: [],
          },
        ],
      },
      redactedEvidence: {
        ...evidenceIdentity,
        reasonCodes: ["high_cash_ratio"],
        unsupportedReasons: ["benchmark_evidence_missing"],
        scorePolicyVersion: "idle-liquidity-v2",
        sourceRefs: [
          {
            productId: "idea-eligibility-v1",
            sourceSystem: "lotus-idea",
            productVersion: "v1",
            asOfDate: "2026-06-21",
            freshness: "current",
            dataQualityStatus: "complete",
          },
        ],
      },
    },
  };
}

describe("IdeaCandidateExplanation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let requestSequence = 0;
    vi.stubGlobal("crypto", {
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.fill(0);
        bytes[15] = ++requestSequence;
        return bytes;
      }),
    });
  });

  it("renders governed rationale separately from evidence gaps and provenance", async () => {
    dependencies.requestAdvisorIdeaAIExplanation.mockResolvedValueOnce(
      servedResponse(),
    );
    renderExplanation();

    expect(crypto.randomUUID).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));

    expect(await screen.findByText("Rationale available")).toBeInTheDocument();
    expect(screen.getByText("Grounded rationale")).toBeInTheDocument();
    expect(
      screen.getAllByText("Cash weight is above the policy threshold."),
    ).not.toHaveLength(0);
    expect(screen.getByText("Benchmark Evidence Missing")).toBeInTheDocument();
    expect(screen.getByText("High Cash Ratio")).toBeInTheDocument();
    expect(screen.getByText("Supporting evidence")).toBeInTheDocument();
    expect(
      screen.getByText(/idea-eligibility-v1 · lotus-idea · Version v1/),
    ).toBeInTheDocument();
    expect(screen.getByText("run-001")).toBeInTheDocument();
    expect(screen.getByText("unattested_local_test_fixture")).toBeInTheDocument();
    expect(
      screen.getByText(/it is not verified production provenance/i),
    ).toBeInTheDocument();
    expect(dependencies.opened).toHaveBeenCalledTimes(1);
    expect(dependencies.served).toHaveBeenCalledWith("executed");
    expect(dependencies.unavailable).not.toHaveBeenCalled();
    expect(dependencies.requestAdvisorIdeaAIExplanation).toHaveBeenCalledWith({
      candidateId: "idea-001",
      evidenceIdentity: EVIDENCE_IDENTITY,
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      idempotencyKey:
        "idea-explanation-idea-001-00000000-0000-4000-8000-000000000001",
      request: {
        requestId:
          "idea-explanation-idea-001-00000000-0000-4000-8000-000000000001",
        purpose: "advisor_rationale_draft",
        requestedAtUtc: expect.any(String),
      },
    });
  });

  it("shows source fallback as deterministic evidence when AI is unavailable", async () => {
    const unavailable = servedResponse();
    dependencies.requestAdvisorIdeaAIExplanation.mockResolvedValueOnce({
      ...unavailable,
      status: "EXPLANATION_UNAVAILABLE",
      disposition: "runtime_unavailable",
      lotusAiRunId: null,
      lotusAiRuntimeExecutionConfirmed: false,
      evaluationVerdict: "not_evaluated",
      explanation: {
        ...unavailable.explanation,
        explanationText: "Cash remains above the source policy threshold.",
        fallbackUsed: true,
        fallbackReason: "ai_unavailable",
        verifiedOutput: null,
      },
    });
    renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));

    expect(
      await screen.findByText("AI explanation unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Deterministic evidence summary")).toBeInTheDocument();
    expect(
      screen.getByText("Cash remains above the source policy threshold."),
    ).toBeInTheDocument();
    expect(screen.getByText("Benchmark Evidence Missing")).toBeInTheDocument();
    expect(screen.getByText("High Cash Ratio")).toBeInTheDocument();
    expect(dependencies.unavailable).toHaveBeenCalledWith(
      "runtime_unavailable",
    );
  });

  it("keeps the exact request identity for a failed retry", async () => {
    dependencies.requestAdvisorIdeaAIExplanation
      .mockRejectedValueOnce(new WorkbenchApiError("explanation", 502))
      .mockResolvedValueOnce(servedResponse());
    renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));
    expect(await screen.findByTestId("idea-explanation-error")).toHaveTextContent(
      "temporarily unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry explanation" }));
    await screen.findByText("Rationale available");

    await waitFor(() =>
      expect(dependencies.requestAdvisorIdeaAIExplanation).toHaveBeenCalledTimes(2),
    );
    expect(
      dependencies.requestAdvisorIdeaAIExplanation.mock.calls[1][0],
    ).toEqual(dependencies.requestAdvisorIdeaAIExplanation.mock.calls[0][0]);
    expect(dependencies.failed).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh request identity after candidate evidence conflicts", async () => {
    dependencies.requestAdvisorIdeaAIExplanation
      .mockRejectedValueOnce(new WorkbenchApiError("explanation", 409))
      .mockImplementationOnce(async ({ request }) => ({
        ...servedResponse(),
        explanation: {
          ...servedResponse().explanation,
          requestId: request.requestId,
        },
      }));
    renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));
    expect(await screen.findByTestId("idea-explanation-error")).toHaveTextContent(
      "evidence changed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry explanation" }));
    await screen.findByText("Rationale available");

    const [first, second] = dependencies.requestAdvisorIdeaAIExplanation.mock.calls.map(
      ([submission]) => submission,
    );
    expect(first.request.requestId).toMatch(
      /^idea-explanation-idea-001-[0-9a-f-]{36}$/,
    );
    expect(second.request.requestId).not.toBe(first.request.requestId);
    expect(second.idempotencyKey).toBe(second.request.requestId);
  });

  it("supersedes a rationale when the same candidate moves to new evidence", async () => {
    dependencies.requestAdvisorIdeaAIExplanation.mockResolvedValueOnce(
      servedResponse(),
    );
    const view = renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));
    await screen.findByText("Rationale available");

    view.rerender(
      <IdeaCandidateExplanation
        candidateId="idea-001"
        evidenceIdentity={{
          ...EVIDENCE_IDENTITY,
          sourceRevisionVectorDigest: "sha256:revision-002",
        }}
        portfolioId="PB_SG_GLOBAL_BAL_001"
      />,
    );

    expect(screen.getByTestId("idea-explanation-superseded")).toHaveTextContent(
      "earlier rationale is no longer current",
    );
    expect(screen.queryByText("Rationale available")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Cash weight is above the policy threshold."),
    ).not.toBeInTheDocument();
  });

  it("fences a delayed prior-revision response from becoming current", async () => {
    let completeRequest: ((response: ReturnType<typeof servedResponse>) => void) | undefined;
    dependencies.requestAdvisorIdeaAIExplanation.mockImplementationOnce(
      async () =>
        await new Promise<ReturnType<typeof servedResponse>>((resolve) => {
          completeRequest = resolve;
        }),
    );
    const view = renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));
    await waitFor(() => expect(completeRequest).toBeTypeOf("function"));
    view.rerender(
      <IdeaCandidateExplanation
        candidateId="idea-001"
        evidenceIdentity={{
          ...EVIDENCE_IDENTITY,
          evidenceContentHash: "sha256:evidence-002",
          sourceRevisionVectorDigest: "sha256:revision-002",
        }}
        portfolioId="PB_SG_GLOBAL_BAL_001"
      />,
    );
    completeRequest?.(servedResponse());

    expect(
      await screen.findByTestId("idea-explanation-superseded"),
    ).toBeInTheDocument();
    expect(dependencies.served).not.toHaveBeenCalled();
    expect(dependencies.unavailable).toHaveBeenCalledWith(
      "candidate_evidence_changed",
    );
  });

  it("abandons a transient retry identity when displayed evidence changes", async () => {
    const nextEvidenceIdentity = {
      ...EVIDENCE_IDENTITY,
      evidencePacketId: "evidence-002",
      evidenceContentHash: "sha256:evidence-002",
      sourceRevisionVectorDigest: "sha256:revision-002",
    };
    dependencies.requestAdvisorIdeaAIExplanation
      .mockRejectedValueOnce(new WorkbenchApiError("explanation", 502))
      .mockResolvedValueOnce(servedResponse(nextEvidenceIdentity));
    const view = renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));
    await screen.findByTestId("idea-explanation-error");
    view.rerender(
      <IdeaCandidateExplanation
        candidateId="idea-001"
        evidenceIdentity={nextEvidenceIdentity}
        portfolioId="PB_SG_GLOBAL_BAL_001"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry explanation" }));
    await screen.findByText("Rationale available");

    const [first, second] = dependencies.requestAdvisorIdeaAIExplanation.mock.calls.map(
      ([submission]) => submission,
    );
    expect(second.request.requestId).not.toBe(first.request.requestId);
    expect(second.evidenceIdentity).toEqual(nextEvidenceIdentity);
  });

  it("cannot request or claim current rationale without source evidence identity", () => {
    render(
      <IdeaCandidateExplanation
        candidateId="idea-001"
        portfolioId="PB_SG_GLOBAL_BAL_001"
      />,
      { wrapper },
    );

    expect(screen.getByRole("button", { name: "Explanation unavailable" })).toBeDisabled();
    expect(screen.getByTestId("idea-explanation-evidence-unavailable")).toHaveTextContent(
      "opportunity record does not include its evidence identity",
    );
    expect(dependencies.requestAdvisorIdeaAIExplanation).not.toHaveBeenCalled();
  });

  it("shows an explicit failure when secure request identity is unavailable", async () => {
    vi.stubGlobal("crypto", {});
    renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));

    expect(await screen.findByTestId("idea-explanation-error")).toHaveTextContent(
      "A protected request reference could not be created",
    );
    expect(dependencies.requestAdvisorIdeaAIExplanation).not.toHaveBeenCalled();
    expect(dependencies.failed).toHaveBeenCalledTimes(1);
  });
});
