import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisorCockpitWorkspace from "../../src/features/proposals/components/advisor-cockpit-workspace";

const listAdvisorCockpitActionsMock = vi.fn(async (_filters?: unknown) => ({
  total_count: 1,
  items: [
    {
      action_item_id: "aci_policy_review_001",
      action_item_version: 1,
      action_family: "POLICY_REVIEW_REQUIRED",
      status: "PENDING_REVIEW",
      priority: "HIGH",
      owner_role: "ADVISOR",
      title: "Policy review required",
      next_required_action: "Review policy evidence before client discussion.",
      reason_codes: ["POLICY_PENDING_REVIEW", "CLIENT_READY_BLOCKED"],
      evidence_refs: [
        { summary: "Policy evaluation requires compliance review." },
      ],
      source_readiness_gaps: [
        {
          message:
            "Policy review is pending before client-ready posture can change.",
        },
      ],
      unsupported_capabilities: ["CLIENT_READY_PUBLICATION"],
      acknowledgement_state: { acknowledged: false },
    },
  ],
}));
const getAdvisorCockpitSnapshotMock = vi.fn(async (_filters?: unknown) => ({
  snapshot_id: "cockpit_snapshot_1",
  action_counts: {
    "status.PENDING_REVIEW": 1,
    "status.BLOCKED": 0,
    "priority.HIGH": 1,
  },
  supportability: {
    gateway_posture: "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
    workbench_posture: "SUPPORTED_BY_LOTUS_WORKBENCH_RFC0026",
    client_ready_publication: "BLOCKED",
  },
  preparation_packets: [
    {
      packet_id: "prep_1",
      context_type: "PORTFOLIO",
      context_ref: "PB_SG_GLOBAL_BAL_001",
      status: "READY",
      evidence_refs: [{ summary: "Proposal and policy evidence available." }],
    },
  ],
  unsupported_capabilities: ["EXTERNAL_CLIENT_COMMUNICATION"],
}));
const getAdvisorCockpitSupportabilityMock = vi.fn(
  async (_filters?: unknown) => ({
    posture: "ADVISE_API_SUPPORTED_DOWNSTREAM_GATED",
    unsupported_capabilities: ["OMS_ORDER_LIFECYCLE"],
  }),
);
const acknowledgeAdvisorCockpitActionMock = vi.fn(
  async (_actionItemId: string, _payload: unknown, _options: unknown) => ({
    action_item: { action_item_id: "aci_policy_review_001" },
    acknowledgement: { acknowledged: true },
    replayed: false,
  }),
);

vi.mock("../../src/features/proposals/api", () => ({
  acknowledgeAdvisorCockpitAction: (
    actionItemId: string,
    payload: unknown,
    options: unknown,
  ) => acknowledgeAdvisorCockpitActionMock(actionItemId, payload, options),
  getAdvisorCockpitSnapshot: (filters: unknown) =>
    getAdvisorCockpitSnapshotMock(filters),
  getAdvisorCockpitSupportability: (filters: unknown) =>
    getAdvisorCockpitSupportabilityMock(filters),
  listAdvisorCockpitActions: (filters: unknown) =>
    listAdvisorCockpitActionsMock(filters),
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

describe("AdvisorCockpitWorkspace", () => {
  beforeEach(() => {
    listAdvisorCockpitActionsMock.mockClear();
    getAdvisorCockpitSnapshotMock.mockClear();
    getAdvisorCockpitSupportabilityMock.mockClear();
    acknowledgeAdvisorCockpitActionMock.mockClear();
  });

  it("renders Gateway-backed cockpit actions and supportability without local fallback worklists", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    await waitFor(() => {
      expect(listAdvisorCockpitActionsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        advisorId: "advisor_sg_001",
        role: "ADVISOR",
        limit: 25,
      });
      expect(getAdvisorCockpitSnapshotMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        advisorId: "advisor_sg_001",
        role: "ADVISOR",
        limit: 25,
      });
      expect(getAdvisorCockpitSupportabilityMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        advisorId: "advisor_sg_001",
        role: "ADVISOR",
      });
    });

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Policy review required",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor cockpit counts")).toHaveTextContent(
      /Visible actions\s*1/,
    );
    expect(
      screen.getAllByText("Review policy evidence before client discussion."),
    ).toHaveLength(2);
    expect(
      screen.getByText("Policy evaluation requires compliance review."),
    ).toBeInTheDocument();
    expect(screen.getByText("Client publication")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("External Client Communication, OMS Order Lifecycle"),
    ).toBeInTheDocument();
    expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
    expect(
      screen.queryByText("CLIENT_READY_PUBLICATION"),
    ).not.toBeInTheDocument();
  });

  it("records acknowledgements through Gateway without clearing source-owned blockers locally", async () => {
    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Acknowledge review" }),
    );

    await waitFor(() => {
      expect(acknowledgeAdvisorCockpitActionMock).toHaveBeenCalledWith(
        "aci_policy_review_001",
        {
          action_item_version: 1,
          acknowledged_by: "advisor_sg_001",
          acknowledgement_note: "Reviewed in the advisor cockpit.",
        },
        {
          filters: {
            portfolioId: "PB_SG_GLOBAL_BAL_001",
            advisorId: "advisor_sg_001",
            role: "ADVISOR",
          },
          idempotencyKey: "ui-cockpit-ack-aci_policy_review_001-1",
        },
      );
    });

    expect(screen.getByText(/Client-ready Blocked/)).toBeInTheDocument();
  });

  it("does not render fallback actions when the Gateway cockpit route fails", async () => {
    listAdvisorCockpitActionsMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText(
        "Advisor cockpit is unavailable. No fallback operating worklist is shown.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Advisor cockpit unavailable")).toBeInTheDocument();
    expect(
      screen.queryByText("Policy review required"),
    ).not.toBeInTheDocument();
  });
});
