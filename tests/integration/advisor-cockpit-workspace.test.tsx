import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisorCockpitWorkspace from "../../src/features/proposals/components/advisor-cockpit-workspace";
import type {
  AdvisorCockpitActionPageData,
  AdvisorCockpitPreparationPacketPageData,
  AdvisorCockpitSnapshotData,
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
const getAdvisorCockpitSnapshotMock = vi.fn(async (
  _filters?: unknown,
): Promise<AdvisorCockpitSnapshotData> => ({
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
        limit: 25,
      });
      expect(getAdvisorCockpitSnapshotMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        limit: 25,
      });
      expect(listAdvisorCockpitPreparationPacketsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        limit: 25,
      });
      expect(getAdvisorCockpitSupportabilityMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
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
    const readiness = screen
      .getByRole("heading", { name: "Preparation Readiness" })
      .closest<HTMLElement>(".section-block")!;
    expect(within(readiness).getByText("Client publication")).toBeInTheDocument();
    expect(within(readiness).getAllByText("Available")).toHaveLength(4);
    expect(within(readiness).getByText("Blocked")).toBeInTheDocument();
    expect(
      within(readiness).getByText("Client communication unavailable"),
    ).toBeInTheDocument();
    expect(
      within(readiness).getByText("Order workflow unavailable"),
    ).toBeInTheDocument();
    expect(within(readiness).queryByText(/OMS/i)).not.toBeVisible();
    expect(within(readiness).queryByText(/RFC 0026/i)).not.toBeInTheDocument();
    const supportDetails = within(readiness).getByText("Support details").closest("details")!;
    expect(supportDetails).not.toHaveAttribute("open");
    fireEvent.click(within(supportDetails).getByText("Support details"));
    expect(within(supportDetails).getByText("OMS_ORDER_LIFECYCLE")).toBeVisible();
    expect(
      within(supportDetails).getByText("SUPPORTED_BY_LOTUS_GATEWAY_RFC0026"),
    ).toBeVisible();
    expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
    expect(
      screen.queryByText("CLIENT_READY_PUBLICATION"),
    ).not.toBeInTheDocument();
  });

  it("keeps unknown readiness neutral and discloses raw values only as support detail", async () => {
    getAdvisorCockpitSnapshotMock.mockResolvedValueOnce({
      snapshot_id: "cockpit_snapshot_unknown",
      action_counts: {
        "status.PENDING_REVIEW": 1,
        "status.BLOCKED": 0,
        "priority.HIGH": 1,
      },
      supportability: {
        gateway_posture: "NEW_GATEWAY_POSTURE",
        workbench_posture: null,
        data_product_posture: "READY",
        client_ready_publication: "PENDING",
      },
      unsupported_capabilities: ["NEW_CAPABILITY"],
    });
    getAdvisorCockpitSupportabilityMock.mockResolvedValueOnce({
      posture: "NEW_OVERALL_POSTURE",
      unsupported_capabilities: ["NEW_CAPABILITY"],
    });

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    const readiness = (
      await screen.findByRole("heading", { name: "Preparation Readiness" })
    ).closest<HTMLElement>(".section-block")!;
    expect(within(readiness).getAllByText("Not reported")).toHaveLength(5);
    expect(
      within(readiness).getByText("Additional workflow capability unavailable"),
    ).toBeInTheDocument();
    expect(within(readiness).queryByText("NEW_GATEWAY_POSTURE")).not.toBeVisible();
    expect(within(readiness).queryByText("NEW_CAPABILITY")).not.toBeVisible();

    const supportDetails = within(readiness).getByText("Support details").closest("details")!;
    fireEvent.click(within(supportDetails).getByText("Support details"));
    expect(within(supportDetails).getByText("NEW_GATEWAY_POSTURE")).toBeVisible();
    expect(within(supportDetails).getByText("NEW_CAPABILITY")).toBeVisible();
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
          acknowledgement_note: "Reviewed in the advisor cockpit.",
        },
        {
          filters: {
            portfolioId: "PB_SG_GLOBAL_BAL_001",
          },
          idempotencyKey: "ui-cockpit-ack-aci_policy_review_001-1",
        },
      );
    });

    expect(screen.getByText(/Client-ready Blocked/)).toBeInTheDocument();
  });

  it("keeps previously loaded preparation evidence visible when its refresh fails", async () => {
    listAdvisorCockpitPreparationPacketsMock
      .mockResolvedValueOnce({
        total_count: 2,
        items: [
          {
            packet_id: "cached_packet_1",
            context_type: "PORTFOLIO",
            context_ref: "PB_SG_GLOBAL_BAL_001",
            status: "READY",
            evidence_refs: [
              { summary: "Previously loaded meeting preparation evidence." },
            ],
          },
        ],
      })
      .mockRejectedValueOnce(new Error("preparation refresh unavailable"));

    renderWithQueryClient(
      <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
    );

    expect(
      await screen.findByText("Previously loaded meeting preparation evidence."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Acknowledge review" }),
    );

    expect(
      await screen.findByText("Meeting preparation refresh unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 previously loaded preparation pack remains visible, but the current source scope cannot be confirmed.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Previously loaded meeting preparation evidence."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Meeting preparation details unavailable"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "2 preparation packs are in scope; 1 is available for review.",
      ),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      totalCount: 0,
      staleTitle: "No preparation packs in scope",
    },
    {
      totalCount: 1,
      staleTitle: "Meeting preparation details unavailable",
    },
  ])(
    "does not present a cached $totalCount preparation-pack scope as current after refresh failure",
    async ({ totalCount, staleTitle }) => {
      listAdvisorCockpitPreparationPacketsMock
        .mockResolvedValueOnce({
          total_count: totalCount,
          items: [],
        })
        .mockRejectedValueOnce(new Error("preparation refresh unavailable"));

      renderWithQueryClient(
        <AdvisorCockpitWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />,
      );

      expect(await screen.findByText(staleTitle)).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: "Acknowledge review" }),
      );

      expect(
        await screen.findByText("Meeting preparation refresh unavailable"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "No previously loaded preparation packs remain visible, and the current source scope cannot be confirmed.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(staleTitle)).not.toBeInTheDocument();
    },
  );

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
    getAdvisorCockpitSnapshotMock.mockResolvedValueOnce({
      snapshot_id: "cockpit_snapshot_with_preparation_fallback",
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
      preparation_packets: [
        {
          packet_id: "snapshot_packet_1",
          context_type: "PORTFOLIO",
          context_ref: "PB_SG_GLOBAL_BAL_001",
          status: "READY",
          evidence_refs: [
            { summary: "Snapshot preparation evidence must not mask route failure." },
          ],
        },
      ],
      unsupported_capabilities: ["EXTERNAL_CLIENT_COMMUNICATION"],
    });
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
    expect(
      screen.queryByText("Snapshot preparation evidence must not mask route failure."),
    ).not.toBeInTheDocument();
  });
});
