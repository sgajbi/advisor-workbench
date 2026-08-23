import AdvisoryOverviewWorkspace from "@/features/proposals/components/advisory-overview-workspace";
import {
  WorkbenchContextNotice,
  buildWorkbenchUnsupportedReviewContextNotice,
} from "@/design-system";
import AdvisoryCopilotWorkspace from "@/features/proposals/components/advisory-copilot-workspace";
import AdvisoryOpportunitiesWorkspace from "@/features/proposals/components/advisory-opportunities-workspace";
import AdvisorCockpitWorkspace from "@/features/proposals/components/advisor-cockpit-workspace";
import BankDemoProofWorkspace from "@/features/proposals/components/bank-demo-proof-workspace";
import {
  getAdvisoryJourneyDefinition,
  normalizeAdvisoryJourneyMode,
} from "@/features/proposals/advisory-journey-navigation";
import ProposalWorkspaceShell from "@/features/proposals/components/proposal-workspace-shell";
import {
  buildAdvisorCockpitWorkflowContext,
} from "@/features/proposals/proposal-workflow-context-view-model";
import ReviewContextRecovery from "@/shell/review-context-recovery";
import {
  parseReviewContext,
  type ReviewContextSearchParams,
} from "@/shell/review-context";

export default async function RecommendationsAppPage({
  searchParams,
}: {
  searchParams: Promise<
    ReviewContextSearchParams & {
      mode?: string | readonly string[];
      candidateId?: string | readonly string[];
    }
  >;
}) {
  const resolvedSearch = await searchParams;
  const reviewContextResult = parseReviewContext(resolvedSearch);
  if (reviewContextResult.status === "invalid") {
    return (
      <ReviewContextRecovery
        body="The advisory-workspace address contains repeated or unsupported review context. No advisory evidence was requested."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const portfolioId = reviewContextResult.context.portfolioId;
  if (!portfolioId) {
    return (
      <ReviewContextRecovery
        body="Select a source-confirmed portfolio from My book before opening advisory priorities. No demo portfolio was substituted."
        href="/book"
        actionLabel="Select a portfolio from My book"
      />
    );
  }

  const requestedMode = normalizeAdvisoryJourneyMode(
    typeof resolvedSearch.mode === "string" ? resolvedSearch.mode : undefined,
  );
  const activeMode =
    requestedMode === "opportunities" ||
    requestedMode === "cockpit" ||
    requestedMode === "copilot" ||
    requestedMode === "proof"
      ? requestedMode
      : "overview";
  const definition = getAdvisoryJourneyDefinition(activeMode);
  const sourceContextNotice = buildWorkbenchUnsupportedReviewContextNotice({
    title: "Advisory workspace scope",
    subject: "Advisory evidence",
    destination: "advisory workspace",
    requestedAsOfDate: reviewContextResult.context.asOfDate,
    requestedPeriod: reviewContextResult.context.period,
    requestedReportingCurrency:
      reviewContextResult.context.reportingCurrency,
  });
  return (
    <ProposalWorkspaceShell
      reviewContext={{ ...reviewContextResult.context, portfolioId }}
      activeScreen="advisory"
      activeMode={activeMode}
      title={definition.title}
      subtitle={definition.description}
      workflowContext={
        activeMode === "cockpit"
          ? buildAdvisorCockpitWorkflowContext({ portfolioId })
          : undefined
      }
      workflowContextPresentation={
        activeMode === "cockpit" ? "inline-boundary" : "rail"
      }
    >
      {sourceContextNotice ? (
        <WorkbenchContextNotice {...sourceContextNotice} />
      ) : null}
      {activeMode === "cockpit" ? (
        <AdvisorCockpitWorkspace portfolioId={portfolioId} />
      ) : activeMode === "copilot" ? (
        <AdvisoryCopilotWorkspace portfolioId={portfolioId} />
      ) : activeMode === "proof" ? (
        <BankDemoProofWorkspace portfolioId={portfolioId} />
      ) : activeMode === "opportunities" ? (
        <AdvisoryOpportunitiesWorkspace
          portfolioId={portfolioId}
          reviewContext={{ ...reviewContextResult.context, portfolioId }}
          selectedCandidateId={
            typeof resolvedSearch.candidateId === "string"
              ? resolvedSearch.candidateId
              : undefined
          }
        />
      ) : (
        <AdvisoryOverviewWorkspace
          reviewContext={{ ...reviewContextResult.context, portfolioId }}
        />
      )}
    </ProposalWorkspaceShell>
  );
}
