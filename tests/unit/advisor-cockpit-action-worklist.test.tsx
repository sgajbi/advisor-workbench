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
  it("states each priority once and progressively reveals the selected decision", () => {
    renderWorklist();

    const worklist = screen.getByRole("listbox", {
      name: "Advisor action review worklist",
    });
    expect(within(worklist).getAllByRole("option")).toHaveLength(2);
    expect(screen.getAllByText("Policy review required")).toHaveLength(1);
    expect(screen.getAllByText("Liquidity evidence review")).toHaveLength(1);
    expect(worklist).not.toHaveTextContent("Policy Review Required");
    expect(worklist).not.toHaveTextContent("Policy Pending Review");

    const decision = screen.getByRole("region", {
      name: "Selected advisor action",
    });
    expect(decision).toHaveTextContent(
      "Review policy evidence before client discussion.",
    );
    expect(within(decision).getByText("Policy Review Required")).toBeInTheDocument();
    expect(decision).toHaveTextContent("Policy Pending Review");
    expect(decision).toHaveTextContent(
      "Policy evaluation requires compliance review.",
    );
    expect(decision).toHaveTextContent("No source gaps reported");
    expect(decision).toHaveTextContent("No dependency degradation reported");
    expect(
      within(decision).getByRole("link", {
        name: "Open proposal proposal_sg_001",
      }),
    ).toHaveAttribute("href", "/proposals/proposal_sg_001");

    fireEvent.click(
      within(worklist).getByRole("option", {
        name: /Liquidity evidence review/,
      }),
    );
    expect(decision).toHaveTextContent(
      "Confirm liquidity evidence with the portfolio team.",
    );
    expect(decision).toHaveTextContent(
      "Liquidity evidence requires advisor review.",
    );
    expect(within(decision).queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps a pending source transaction focused and non-repeatable", () => {
    const onAcknowledge = vi.fn();
    renderWorklist({
      transaction: {
        actionItemId: "action-policy",
        status: "recording",
      },
      onAcknowledge,
    });

    const decision = screen.getByRole("region", {
      name: "Selected advisor action",
    });
    const selectedButton = within(decision).getByRole("button", {
      name: "Recording...",
    });
    expect(selectedButton).toHaveAttribute("aria-disabled", "true");
    expect(selectedButton).not.toHaveAttribute("disabled");
    selectedButton.focus();
    fireEvent.click(selectedButton);
    expect(selectedButton).toHaveFocus();
    expect(onAcknowledge).not.toHaveBeenCalled();
    expect(within(decision).getByRole("status")).toHaveTextContent(
      "Recording this review in the source workflow.",
    );
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
      expected:
        "Review recorded; latest advisor evidence is not fully confirmed.",
    },
    {
      status: "failed" as const,
      expected: "Acknowledgement could not be recorded.",
    },
  ])(
    "keeps $status feedback scoped to the submitted row",
    ({ status, expected }) => {
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
    },
  );

  it("delegates only the selected decision and fails closed when evidence is unsettled", () => {
    const onAcknowledge = vi.fn();
    const { rerender } = renderWorklist({ onAcknowledge });
    const worklist = screen.getByRole("listbox", {
      name: "Advisor action review worklist",
    });

    fireEvent.click(
      within(worklist).getByRole("option", {
        name: /Liquidity evidence review/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge review" }));
    expect(onAcknowledge).toHaveBeenCalledOnce();
    expect(onAcknowledge).toHaveBeenCalledWith(rows[1]);

    rerender(
      <AdvisorCockpitActionWorklist
        selectionScopeKey="portfolio-a"
        rows={rows}
        evidenceConfirmed={false}
        transaction={idleTransaction}
        onAcknowledge={onAcknowledge}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Acknowledge review" }),
    ).toBeDisabled();
  });

  it("retains the admitted fallback action when source ranking changes", () => {
    const { rerender } = renderWorklist();

    rerender(
      <AdvisorCockpitActionWorklist
        selectionScopeKey="portfolio-a"
        rows={[rows[1], rows[0]]}
        evidenceConfirmed
        transaction={idleTransaction}
        onAcknowledge={vi.fn()}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Liquidity evidence review");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveTextContent("Policy review required");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("region", { name: "Selected advisor action" }),
    ).toHaveTextContent("Review policy evidence before client discussion.");
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
      selectionScopeKey="portfolio-a"
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
  > &
    Partial<Pick<AdvisorCockpitActionRow, "sourceHandoff">>,
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
