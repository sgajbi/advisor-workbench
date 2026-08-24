import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextPublisher,
  ProposalWorkflowContextRail,
  ProposalWorkflowContextBoundary,
  ProposalWorkflowBoundary,
} from "@/features/proposals/components/proposal-workflow-context";
import {
  buildAdvisorCockpitWorkflowContext,
  buildNeutralProposalWorkflowContext,
  buildPersistedProposalDraftWorkflowContext,
  buildProposalQueueWorkflowContext,
} from "@/features/proposals/proposal-workflow-context-view-model";

describe("ProposalWorkflowContextRail", () => {
  const neutralModel = buildNeutralProposalWorkflowContext({
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    surfaceLabel: "Proposal lifecycle",
  });

  it("renders a dense neutral context without invented evidence or tasks", () => {
    render(
      <ProposalWorkflowContextProvider initialModel={neutralModel}>
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(screen.getByRole("heading", { name: "Select a source record" })).toBeInTheDocument();
    expect(screen.getByText("No record selected")).toBeInTheDocument();
    expect(screen.getByText("Next business action")).toBeInTheDocument();
    expect(screen.getByText("Approved advisory workflow")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/kyc validity verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/client readiness/i)).not.toBeInTheDocument();
  });

  it("renders the Cockpit source boundary without duplicating a workflow decision", () => {
    const model = buildAdvisorCockpitWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });
    render(<ProposalWorkflowBoundary model={model} presentation="inline" />);

    const boundary = screen.getByText("Source and scope").closest("article");
    expect(boundary).toHaveAttribute("data-context-presentation", "inline");
    expect(boundary).toHaveTextContent(
      "Advisor Cockpit source-owned action evidence",
    );
    expect(boundary).toHaveTextContent(
      "Review and acknowledgement do not establish suitability",
    );
    expect(screen.queryByText("Workflow context")).not.toBeInTheDocument();
    expect(screen.queryByText("Select a source record")).not.toBeInTheDocument();
  });

  it("publishes source-backed queue posture to the shared rail", async () => {
    const queueModel = buildProposalQueueWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      modeLabel: "Approval queue",
      isLoading: false,
      isRefreshing: false,
      permissionBlocked: false,
      hasRestrictedEvidence: false,
      hasError: false,
      hasUnavailableEvidence: false,
      hasProposalRefreshFailure: false,
      hasSupportingEvidenceRefreshFailure: false,
      hasMoreResults: false,
      hasPreviousResults: false,
      windowNumber: 1,
      totalCount: 3,
      attentionCount: 2,
      primaryDecision: "Which proposals require review?",
      recommendedAction: "Review proposals with open decisions.",
    });

    render(
      <ProposalWorkflowContextProvider initialModel={neutralModel}>
        <ProposalWorkflowContextPublisher model={queueModel} />
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(await screen.findByRole("heading", { name: "2 need attention" })).toBeInTheDocument();
    expect(screen.getByText("Source current")).toBeInTheDocument();
    expect(screen.getByText("3 proposals in view")).toBeInTheDocument();
    expect(screen.getByText("2 proposals need adviser action.")).toBeInTheDocument();
  });

  it("renders the current published source boundary instead of the initial model", async () => {
    const persistedModel = buildPersistedProposalDraftWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      proposalId: "pp_test_001",
    });

    render(
      <ProposalWorkflowContextProvider initialModel={neutralModel}>
        <ProposalWorkflowContextPublisher model={persistedModel} />
        <ProposalWorkflowContextBoundary presentation="inline" />
      </ProposalWorkflowContextProvider>
    );

    const boundary = screen.getByText("Source and scope").closest("article");
    expect(boundary).toHaveAttribute("data-context-presentation", "inline");
    expect(await screen.findByText("Advisory proposal lifecycle")).toBeInTheDocument();
    expect(boundary).toHaveTextContent(
      "A saved draft does not imply suitability completion"
    );
    expect(boundary).not.toHaveTextContent("No persisted advisory workflow record");
  });

  it("reduces supplementary workflow posture to non-duplicated source and scope evidence", () => {
    const supplementaryModel = buildProposalQueueWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      modeLabel: "Advisory overview",
      isLoading: false,
      isRefreshing: false,
      permissionBlocked: false,
      hasRestrictedEvidence: false,
      hasError: false,
      hasUnavailableEvidence: false,
      hasProposalRefreshFailure: false,
      hasSupportingEvidenceRefreshFailure: false,
      hasMoreResults: false,
      hasPreviousResults: false,
      windowNumber: 1,
      totalCount: 3,
      attentionCount: 2,
      primaryDecision: "Which proposals require review?",
      recommendedAction: "Review proposals with open decisions.",
      responsivePriority: "supplementary",
    });

    const { container } = render(
      <ProposalWorkflowContextProvider initialModel={supplementaryModel}>
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>
    );

    expect(container.firstElementChild).toHaveAttribute(
      "data-responsive-priority",
      "supplementary"
    );
    expect(screen.queryByText("Decision posture")).not.toBeInTheDocument();
    expect(screen.queryByText("2 need attention")).not.toBeInTheDocument();
    expect(screen.queryByText("PB_SG_GLOBAL_BAL_001")).not.toBeInTheDocument();
    expect(screen.getByText("Source and scope")).toBeInTheDocument();
  });

  it("preserves repeated source blockers without duplicate-key warnings", () => {
    const repeatedBlocker = "Selected evidence remains unavailable.";
    const model = {
      ...neutralModel,
      blockers: [repeatedBlocker, repeatedBlocker],
    };

    render(
      <ProposalWorkflowContextProvider initialModel={model}>
        <ProposalWorkflowContextRail />
      </ProposalWorkflowContextProvider>,
    );

    expect(screen.getAllByText(repeatedBlocker)).toHaveLength(2);
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.queryByText("Attention required")).not.toBeInTheDocument();
  });
});
