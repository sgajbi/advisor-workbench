import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisoryCopilotWorkspace from "../../src/features/proposals/components/advisory-copilot-workspace";

const listProposalsMock = vi.fn(async (_filters: unknown) => ({
  items: [
    {
      proposal_id: "proposal_sg_structured_note_001",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "COMPLIANCE_REVIEW",
      current_version_no: 1,
      title: "Structured note proposal review",
    },
  ],
}));
const getAdvisoryCopilotSupportabilityMock = vi.fn(async () => ({
  support_status: "ADVISE_API_CERTIFIED_GATEWAY_WORKBENCH_PENDING",
  client_ready_publication: "BLOCKED",
  supported_action_families: [
    "PROPOSAL_EXPLANATION",
    "MEETING_PREPARATION",
  ],
  boundaries: ["No client-ready publication"],
}));
const createEvidencePacketMock = vi.fn(async (_payload: unknown) => ({
  evidence_packet: {
    evidence_packet_id: "copilot_packet_1",
    client_ready_publication: "BLOCKED",
    sections: [
      {
        section_key: "POLICY_POSTURE",
        title: "Policy posture",
        summary_items: ["Policy evaluation requires compliance review."],
      },
    ],
    unsupported_evidence: [
      {
        reason_code: "SOURCE_NOT_AVAILABLE",
        advisor_message: "Report readiness is not available.",
      },
    ],
  },
}));
const runAdvisoryCopilotActionMock = vi.fn(
  async (_payload: unknown, _idempotencyKey: string) => ({
  run: {
    run_id: "copilot_run_1",
    review_posture: "REVIEW_REQUIRED",
    client_ready_publication: "BLOCKED",
    output_sections_json: [
      {
        section_key: "SUMMARY",
        title: "Advisor summary",
        text: "Policy review is required before client communication.",
      },
    ],
    review_guidance_json: ["Review source evidence before internal use."],
    guardrail_results_json: [],
  },
  }),
);
const reviewAdvisoryCopilotRunMock = vi.fn(
  async (_runId: string, _payload: unknown, _idempotencyKey: string) => ({
  run: {
    run_id: "copilot_run_1",
    review_posture: "APPROVED_FOR_INTERNAL_USE",
    client_ready_publication: "BLOCKED",
    output_sections_json: [
      {
        section_key: "SUMMARY",
        title: "Advisor summary",
        text: "Policy review is required before client communication.",
      },
    ],
    review_guidance_json: ["Review source evidence before internal use."],
    guardrail_results_json: [],
  },
  }),
);

vi.mock("../../src/features/proposals/api", () => ({
  createAdvisoryCopilotEvidencePacketFromProposalVersion: (payload: unknown) =>
    createEvidencePacketMock(payload),
  getAdvisoryCopilotSupportability: () =>
    getAdvisoryCopilotSupportabilityMock(),
  listProposals: (filters: unknown) => listProposalsMock(filters),
  reviewAdvisoryCopilotRun: (
    runId: string,
    payload: unknown,
    idempotencyKey: string,
  ) => reviewAdvisoryCopilotRunMock(runId, payload, idempotencyKey),
  runAdvisoryCopilotAction: (payload: unknown, idempotencyKey: string) =>
    runAdvisoryCopilotActionMock(payload, idempotencyKey),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("AdvisoryCopilotWorkspace", () => {
  beforeEach(() => {
    listProposalsMock.mockClear();
    getAdvisoryCopilotSupportabilityMock.mockClear();
    createEvidencePacketMock.mockClear();
    runAdvisoryCopilotActionMock.mockClear();
    reviewAdvisoryCopilotRunMock.mockClear();
  });

  it("runs Gateway-backed copilot actions without building evidence sections locally", async () => {
    renderWithQueryClient(
      <AdvisoryCopilotWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Prepare review" }))[0],
    );

    await waitFor(() => {
      expect(createEvidencePacketMock).toHaveBeenCalledWith({
        proposal_id: "proposal_sg_structured_note_001",
        proposal_version_no: 1,
        action_family: "PROPOSAL_EXPLANATION",
        audience: "ADVISOR",
        created_by: "advisor_sg_001",
        reason: {
          business_reason: "Prepare advisor-use copilot review.",
        },
      });
    });
    expect(runAdvisoryCopilotActionMock).toHaveBeenCalledWith(
      {
        evidence_packet_id: "copilot_packet_1",
        audience: "ADVISOR",
        requested_outputs: ["advisor_review_summary"],
        requested_by: "advisor_sg_001",
        requested_intents: ["explain_policy_posture"],
        user_instruction: "",
        reason: {
          business_reason: "Prepare advisor-use copilot review.",
        },
      },
      "ui-copilot-run-PROPOSAL_EXPLANATION-proposal_sg_structured_note_001-1",
    );
    expect(JSON.stringify(createEvidencePacketMock.mock.calls)).not.toContain(
      "source_sections",
    );
    expect(screen.getByText("Policy posture")).toBeInTheDocument();
    expect(
      screen.getByText("Policy evaluation requires compliance review."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Blocked").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("workflow_pack")).not.toBeInTheDocument();
    expect(screen.queryByText("PROPOSAL_EXPLANATION")).not.toBeInTheDocument();
  });

  it("records internal review without presenting client-ready approval", async () => {
    renderWithQueryClient(
      <AdvisoryCopilotWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Prepare review" }))[0],
    );
    await screen.findByText("Advisor summary");
    fireEvent.click(screen.getByRole("button", { name: "Record internal review" }));

    await waitFor(() => {
      expect(reviewAdvisoryCopilotRunMock).toHaveBeenCalledWith(
        "copilot_run_1",
        {
          action: "APPROVE_FOR_INTERNAL_USE",
          actor_id: "desk_head_sg_001",
          reason: {
            decision: "Reviewed against source evidence for internal advisor use.",
          },
        },
        "ui-copilot-review-copilot_run_1",
      );
    });
    await waitFor(() => {
      expect(screen.getAllByText("Approved For Internal Use").length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Client publication:/).parentElement).toHaveTextContent(
      "Blocked",
    );
    expect(screen.queryByText("Client-ready approved")).not.toBeInTheDocument();
  });
});
