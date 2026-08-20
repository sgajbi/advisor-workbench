import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextPublisher,
  ProposalWorkflowContextRail,
} from "@/features/proposals/components/proposal-workflow-context";
import {
  buildNeutralProposalWorkflowContext,
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

  it("publishes source-backed queue posture to the shared rail", async () => {
    const queueModel = buildProposalQueueWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      modeLabel: "Approval queue",
      isLoading: false,
      isRefreshing: false,
      permissionBlocked: false,
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
    expect(screen.getByText("2 proposals need advisor action.")).toBeInTheDocument();
  });

  it("marks supplementary workflow posture without removing source and scope evidence", () => {
    const supplementaryModel = buildProposalQueueWorkflowContext({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      modeLabel: "Advisory overview",
      isLoading: false,
      isRefreshing: false,
      permissionBlocked: false,
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
    expect(screen.getByText("Workflow context")).toBeInTheDocument();
    expect(screen.getByText("Source and scope")).toBeInTheDocument();
  });
});
