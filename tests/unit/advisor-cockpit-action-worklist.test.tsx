import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { AdvisorCockpitActionRow } from "../../src/features/proposals/advisor-cockpit-view-model";
import AdvisorCockpitActionWorklist, {
  getAcknowledgementPresentation,
  type AdvisorCockpitAcknowledgementTransaction,
} from "../../src/features/proposals/components/advisor-cockpit-action-worklist";

const rows: AdvisorCockpitActionRow[] = [
  buildRow({
    actionItemId: "action-policy",
    title: "Policy review required",
    family: "Policy Review Required",
    reasonSummary: "Policy Pending Review",
    evidenceSummary: "Policy evaluation requires compliance review.",
    nextRequiredAction: "Review policy evidence before client discussion.",
    sourceHandoff: {
      href: "/proposals/proposal_sg_001",
      label: "Open proposal",
      accessibleLabel: "Open proposal proposal_sg_001",
      recordLabel: "Proposal proposal_sg_001",
    },
  }),
  buildRow({
    actionItemId: "action-liquidity",
    title: "Liquidity evidence review",
    family: "Liquidity Review Required",
    reasonSummary: "Liquidity Evidence Pending",
    evidenceSummary: "Liquidity evidence requires advisor review.",
    nextRequiredAction: "Confirm liquidity evidence with the portfolio team.",
  }),
];

describe("AdvisorCockpitActionWorklist", () => {
  it("keeps every source-backed action field in workstation and compact presentations", () => {
    renderWorklist();

    const table = screen.getByRole("table", {
      name: "Advisor action review worklist",
    });
    const compact = screen.getByRole("list", {
      name: "Advisor action review records",
    });

    const policySurfaces = [
      within(table).getByRole("row", { name: /Policy review required/ }),
      within(compact).getByRole("article", { name: "Policy review required" }),
    ];

    for (const surface of policySurfaces) {
      expect(within(surface).getByText("Policy review required")).toBeInTheDocument();
      expect(within(surface).getByText("Policy Review Required")).toBeInTheDocument();
      expect(within(surface).getByText("Policy Pending Review")).toBeInTheDocument();
      expect(within(surface).getByText("Pending Review")).toBeInTheDocument();
      expect(within(surface).getByText("High")).toBeInTheDocument();
      expect(within(surface).getByText("Advisor")).toBeInTheDocument();
      expect(within(surface).getByText("Due Soon")).toBeInTheDocument();
      expect(
        within(surface).getByText("Policy evaluation requires compliance review."),
      ).toBeInTheDocument();
      expect(within(surface).getByText("No source gaps reported")).toBeInTheDocument();
      expect(
        within(surface).getByText("No dependency degradation reported"),
      ).toBeInTheDocument();
      expect(
        within(surface).getByText("Review policy evidence before client discussion."),
      ).toBeInTheDocument();
      expect(
        within(surface).getByRole("button", { name: "Acknowledge review" }),
      ).toBeEnabled();
      expect(
        within(surface).getByRole("link", {
          name: "Open proposal proposal_sg_001",
        }),
      ).toHaveAttribute("href", "/proposals/proposal_sg_001");
      expect(within(surface).getByText("Proposal proposal_sg_001")).toBeVisible();
    }

    const liquiditySurfaces = [
      within(table).getByRole("row", { name: /Liquidity evidence review/ }),
      within(compact).getByRole("article", { name: "Liquidity evidence review" }),
    ];
    for (const surface of liquiditySurfaces) {
      expect(within(surface).queryByRole("link")).not.toBeInTheDocument();
    }
  });

  it("applies an active transaction only to the submitted row", () => {
    const onAcknowledge = vi.fn();
    renderWorklist({
      transaction: {
        actionItemId: "action-policy",
        status: "recording",
      },
      onAcknowledge,
    });

    const compact = screen.getByRole("list", {
      name: "Advisor action review records",
    });
    const policy = within(compact).getByRole("article", {
      name: "Policy review required",
    });
    const liquidity = within(compact).getByRole("article", {
      name: "Liquidity evidence review",
    });

    const selectedButton = within(policy).getByRole("button", {
      name: "Recording...",
    });
    expect(selectedButton).toHaveAttribute("aria-disabled", "true");
    expect(selectedButton).not.toHaveAttribute("disabled");
    selectedButton.focus();
    expect(selectedButton).toHaveFocus();
    fireEvent.click(selectedButton);
    expect(onAcknowledge).not.toHaveBeenCalled();
    expect(within(policy).getByRole("status")).toHaveTextContent(
      "Recording this review in the source workflow.",
    );
    expect(
      within(liquidity).getByRole("button", { name: "Acknowledge review" }),
    ).toBeDisabled();
    expect(within(liquidity).queryByRole("status")).not.toBeInTheDocument();
    expect(within(liquidity).getByText("Review is available.")).toBeInTheDocument();
  });

  it.each([
    {
      status: "confirming" as const,
      expected: "Review recorded; confirming current advisor evidence.",
    },
    {
      status: "confirmed" as const,
      expected: "Acknowledgement recorded in the source workflow.",
    },
    {
      status: "confirmed-partial" as const,
      expected: "Review recorded; latest advisor evidence is not fully confirmed.",
    },
    {
      status: "failed" as const,
      expected: "Acknowledgement could not be recorded.",
    },
  ])("keeps $status feedback scoped to the submitted row", ({ status, expected }) => {
    expect(
      getAcknowledgementPresentation(rows[0], {
        actionItemId: rows[0].actionItemId,
        status,
      }),
    ).toMatchObject({ detail: expected, isSelected: true });
    expect(
      getAcknowledgementPresentation(rows[1], {
        actionItemId: rows[0].actionItemId,
        status,
      }),
    ).toMatchObject({ detail: "Review is available.", isSelected: false });
  });

  it("delegates the exact compact action record and fails closed when evidence is unsettled", () => {
    const onAcknowledge = vi.fn();
    const { rerender } = renderWorklist({ onAcknowledge });
    const compact = screen.getByRole("list", {
      name: "Advisor action review records",
    });
    const liquidity = within(compact).getByRole("article", {
      name: "Liquidity evidence review",
    });

    fireEvent.click(
      within(liquidity).getByRole("button", { name: "Acknowledge review" }),
    );
    expect(onAcknowledge).toHaveBeenCalledOnce();
    expect(onAcknowledge).toHaveBeenCalledWith(rows[1]);

    rerender(
      <AdvisorCockpitActionWorklist
        rows={rows}
        evidenceConfirmed={false}
        transaction={idleTransaction}
        onAcknowledge={onAcknowledge}
      />,
    );
    for (const button of within(
      screen.getByRole("list", { name: "Advisor action review records" }),
    ).getAllByRole("button", { name: "Acknowledge review" })) {
      expect(button).toBeDisabled();
    }
  });
});

const idleTransaction: AdvisorCockpitAcknowledgementTransaction = {
  actionItemId: null,
  status: "idle",
};

function renderWorklist({
  transaction = idleTransaction,
  evidenceConfirmed = true,
  onAcknowledge = vi.fn(),
}: {
  transaction?: AdvisorCockpitAcknowledgementTransaction;
  evidenceConfirmed?: boolean;
  onAcknowledge?: (row: AdvisorCockpitActionRow) => void;
} = {}) {
  return render(
    <AdvisorCockpitActionWorklist
      rows={rows}
      evidenceConfirmed={evidenceConfirmed}
      transaction={transaction}
      onAcknowledge={onAcknowledge}
    />,
  );
}

function buildRow(
  overrides: Pick<
    AdvisorCockpitActionRow,
    | "actionItemId"
    | "title"
    | "family"
    | "reasonSummary"
    | "evidenceSummary"
    | "nextRequiredAction"
  > & Partial<Pick<AdvisorCockpitActionRow, "sourceHandoff">>,
): AdvisorCockpitActionRow {
  return {
    actionItemVersion: 1,
    status: "Pending Review",
    statusTone: "warn",
    priority: "High",
    priorityTone: "warn",
    owner: "Advisor",
    sla: "Due Soon",
    sourceHandoff: null,
    sourceGapSummary: "No source gaps reported",
    dependencySummary: "No dependency degradation reported",
    unsupportedClaims: "No unsupported claims reported",
    acknowledgementLabel: "Acknowledge review",
    acknowledgementDetail: "Review is available.",
    canAcknowledge: true,
    ...overrides,
  };
}
