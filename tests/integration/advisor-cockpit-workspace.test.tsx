import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisorCockpitWorkspace from "../../src/features/proposals/components/advisor-cockpit-workspace";
import type {
  AdvisorCockpitActionPageData,
  AdvisorCockpitPreparationPacketPageData,
} from "../../src/features/proposals/types";

const listAdvisorCockpitActionsMock = vi.fn(
  async (_filters?: unknown): Promise<AdvisorCockpitActionPageData> => ({
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
  }),
);
const getAdvisorCockpitSnapshotMock = vi.fn(async (_filters?: unknown) => ({
  snapshot_id: "cockpit_snapshot_1",
  action_counts: {
    "status.PENDING_REVIEW": 1,
    "status.BLOCKED": 0,
    "priority.HIGH": 1,
  },
  supportability: {
    gateway_posture: "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
    workbench_posture: "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
    data_product_posture: "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
    client_ready_publication: "BLOCKED",
  },
  unsupported_capabilities: ["EXTERNAL_CLIENT_COMMUNICATION"],
}));
const listAdvisorCockpitPreparationPacketsMock = vi.fn(
  async (_filters?: unknown): Promise<AdvisorCockpitPreparationPacketPageData> => ({
    total_count: 1,
    items: [
      {
        packet_id: "prep_1",
        context_type: "PORTFOLIO",
        context_ref: "PB_SG_GLOBAL_BAL_001",
        status: "READY",
        evidence_refs: [{ summary: "Proposal and policy evidence available." }],
      },
    ],
  }),
);
const getAdvisorCockpitSupportabilityMock = vi.fn(
  async (_filters?: unknown) => ({
    posture: "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
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
  listAdvisorCockpitPreparationPackets: (filters: unknown) =>
    listAdvisorCockpitPreparationPacketsMock(filters),
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
    listAdvisorCockpitPreparationPacketsMock.mockClear();
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
      expect(listAdvisorCockpitPreparationPacketsMock).toHaveBeenCalledWith({
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
      /Actions in scope\s*1/,
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

  it("keeps the meeting preparation section visible when source packets are absent", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({
      items: [],
      total_count: 0,
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Meeting Preparation",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("No preparation packs in scope")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The source reports no meeting preparation packs for this portfolio.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps a reported preparation scope partial when packet details are unavailable", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({
      items: [],
      total_count: 1,
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Meeting preparation details unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 preparation pack is reported in scope, but its review evidence is not available.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No preparation packs in scope")).not.toBeInTheDocument();
  });

  it("does not infer an empty preparation scope when the source total is missing", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Meeting preparation details unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The preparation scope and review evidence are not available for this portfolio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No preparation packs in scope")).not.toBeInTheDocument();
  });

  it("discloses a minimum review count when preparation evidence has no source total", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockResolvedValueOnce({
      items: [
        {
          packet_id: "packet_sg_001",
          context_type: "PROPOSAL",
          context_ref: "proposal_sg_001",
          status: "READY",
          evidence_refs: [
            { summary: "Suitability and policy evidence assembled." },
          ],
        },
      ],
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText(
        "At least 1 preparation pack is available for review; the full source scope is not reported.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal proposal_sg_001")).toBeInTheDocument();
    expect(
      screen.queryByText("Meeting preparation details unavailable"),
    ).not.toBeInTheDocument();
  });

  it("keeps source actions partial when worklist details are unavailable", async () => {
    listAdvisorCockpitActionsMock.mockResolvedValueOnce({
      items: [],
      total_count: 1,
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findAllByText("Action details unavailable"),
    ).toHaveLength(2);
    expect(screen.getByLabelText("Advisor cockpit counts")).toHaveTextContent(
      /Actions in scope\s*1/,
    );
    expect(
      screen.getByText(
        "1 advisor action is reported in scope, but its review details are not available.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No open actions")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Acknowledge review" }),
    ).not.toBeInTheDocument();
  });

  it("does not claim an all-clear when the source action total is not reported", async () => {
    listAdvisorCockpitActionsMock.mockResolvedValueOnce({ items: [] });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findAllByText("Action details unavailable"),
    ).toHaveLength(2);
    expect(screen.getByLabelText("Advisor cockpit counts")).toHaveTextContent(
      /Actions in scope\s*Not reported/,
    );
    expect(
      screen.getByText(
        "The source action total and review details are not available for this portfolio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No open actions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No advisor actions require review"),
    ).not.toBeInTheDocument();
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
        "Advisor action worklist is unavailable. No fallback operating worklist is shown.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Advisor action worklist unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Worklist unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Advisor action review unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No advisor actions require review"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No open actions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Policy review required"),
    ).not.toBeInTheDocument();
  });

  it("keeps the worklist posture when a non-action cockpit source fails", async () => {
    listAdvisorCockpitPreparationPacketsMock.mockRejectedValueOnce(
      new Error("preparation unavailable"),
    );

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(await screen.findByText("Action required")).toBeInTheDocument();
    expect(screen.queryByText("Worklist unavailable")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Some Advisor Cockpit evidence is unavailable. Available source-backed information remains visible.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Policy review required" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Acknowledge review" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Advisor action worklist unavailable"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Meeting preparation details unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The preparation scope and review evidence are not available for this portfolio.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No preparation packs in scope")).not.toBeInTheDocument();
  });
});
