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
}));

vi.mock("../../src/features/proposals/api", () => ({
  requestAdvisorIdeaAIExplanation:
    dependencies.requestAdvisorIdeaAIExplanation,
}));

vi.mock("../../src/features/proposals/idea-ai-explanation-telemetry", () => ({
  recordIdeaExplanationOpened: dependencies.opened,
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

function renderExplanation() {
  return render(
    <IdeaCandidateExplanation
      candidateId="idea-001"
      portfolioId="PB_SG_GLOBAL_BAL_001"
    />,
    { wrapper },
  );
}

function servedResponse() {
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
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "request-runtime"),
    });
  });

  it("renders governed rationale separately from evidence gaps and provenance", async () => {
    dependencies.requestAdvisorIdeaAIExplanation.mockResolvedValueOnce(
      servedResponse(),
    );
    renderExplanation();

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
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      idempotencyKey: "idea-explanation-idea-001-request-runtime",
      request: {
        requestId: "idea-explanation-idea-001-request-runtime",
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
    expect(dependencies.unavailable).toHaveBeenCalledWith("request_failed");
  });

  it("creates a fresh request identity after candidate evidence conflicts", async () => {
    vi.mocked(crypto.randomUUID)
      .mockReturnValueOnce("conflicted-request")
      .mockReturnValueOnce("fresh-request");
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
    expect(first.request.requestId).toContain("conflicted-request");
    expect(second.request.requestId).toContain("fresh-request");
    expect(second.idempotencyKey).toBe(second.request.requestId);
  });

  it("shows an explicit failure when secure request identity is unavailable", async () => {
    vi.stubGlobal("crypto", {});
    renderExplanation();

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));

    expect(await screen.findByTestId("idea-explanation-error")).toHaveTextContent(
      "A protected request reference could not be created",
    );
    expect(dependencies.requestAdvisorIdeaAIExplanation).not.toHaveBeenCalled();
    expect(dependencies.unavailable).toHaveBeenCalledWith("request_failed");
  });
});
