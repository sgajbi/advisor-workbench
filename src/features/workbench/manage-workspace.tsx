import type { ReactNode } from "react";

import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioReviewContext } from "@/apps/portfolio/portfolio-screen-navigation";
import ReviewContextPageRecovery from "@/shell/review-context-page-recovery";
import {
  AppPageShell,
  buildWorkbenchSourceContextNotice,
  buildWorkbenchUnsupportedReviewContextNotice,
  combineWorkbenchContextNotices,
  MainWithSideRailLayout,
  SemanticBadge,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import ConstructionAlternativesPanel from "@/features/workbench/components/construction-alternatives-panel";
import ManageMandateHealth from "@/features/workbench/components/manage-mandate-health";
import {
  buildManageReviewContextStrip,
  readStringFromResponse,
} from "@/features/workbench/manage-workspace-view-model";
import DpmWaveCommandCenterPanel from "@/features/workbench/components/dpm-wave-command-center-panel";
import DpmCopilotWorkspace from "@/features/workbench/components/dpm-copilot-workspace";
import OutcomeReviewPanel from "@/features/workbench/components/outcome-review-panel";
import PortfolioMemoryPanel from "@/features/workbench/components/portfolio-memory-panel";
import PmOperatingQualityPanel from "@/features/workbench/components/pm-operating-quality-panel";
import ProofPackPanel from "@/features/workbench/components/proof-pack-panel";
import ManageEvidenceRail from "@/features/workbench/components/manage-evidence-rail";
import ManageOverview from "@/features/workbench/components/manage-overview";
import { ManageProofPackStateProvider } from "@/features/workbench/manage-proof-pack-state";
import {
  buildManageModeItems,
  getManageModeDefinition,
  type ManageMode,
} from "@/features/workbench/manage-workspace-navigation";
import {
  readDpmMandateId,
  type ManageWorkspaceData,
} from "@/features/workbench/manage-workspace-data";
import { isManageExceptionEvidenceAvailable } from "@/features/workbench/manage-workspace-view-model";
import styles from "./manage-workspace.module.css";

export function ManageWorkspace({
  data,
  mode,
  reviewContext,
}: {
  data: ManageWorkspaceData;
  mode: ManageMode;
  reviewContext: PortfolioReviewContext;
}) {
  const portfolio = data.portfolio.portfolio;
  const modeDefinition = getManageModeDefinition(mode);
  const dpmMandateId = readDpmMandateId(data.mandate?.data ?? null);
  const hasMandateEvidenceGap = Boolean(
    data.commandCenterError ||
      data.commandCenterExceptionsError ||
      !isManageExceptionEvidenceAvailable(data) ||
      data.mandateHealthError ||
      !data.mandateHealth
  );
  const contextNotice = combineWorkbenchContextNotices({
    title: "Mandate source context",
    notices: [
      buildWorkbenchSourceContextNotice({
        title: "Mandate source context",
        subject: "Mandate management",
        requestedAsOfDate: reviewContext.asOfDate,
        requestedReportingCurrency: reviewContext.reportingCurrency,
        sourceAsOfDate: data.portfolio.as_of_date,
        sourceCurrency: portfolio.base_currency,
      }),
      buildWorkbenchUnsupportedReviewContextNotice({
        title: "Mandate source context",
        subject: "Mandate evidence",
        destination: "mandate management workspace",
        requestedPeriod: reviewContext.period,
      }),
    ],
  });

  return (
    <ManageProofPackStateProvider
      key={portfolio.portfolio_id}
      initialProofPack={data.proofPack}
    >
      <AppPageShell
      pageKey="manage"
      className={`portfolio-page manage-page ${styles.manageScope}`}
      reviewContext={buildManageReviewContextStrip(
        data,
        contextNotice
          ? {
              label: contextNotice.title,
              message: contextNotice.body,
              tone: "attention",
            }
          : null,
      )}
    >
      <WorkbenchPageContainer className="portfolio-page-container manage-page-container">
        <MainWithSideRailLayout
          className="manage-layout portfolio-page"
          railClassName="manage-rail-shell"
          mainClassName="manage-main"
          sideClassName="manage-side"
          sideDensity="comfortable"
          rail={
            <PortfolioScreenRail
              portfolioId={portfolio.portfolio_id}
              activeScreen="manage"
              relationshipIdBase="manage-workspace-rail"
              modeItems={buildManageModeItems(reviewContext, mode)}
              modeNavigationLabel="Manage workspace navigation"
            />
          }
          main={
            <WorkbenchPageFrame
              className={`manage-page-frame manage-page-frame-${mode}`}
              bodyClassName="manage-page-frame-body"
              title={modeDefinition.title}
              subtitle={modeDefinition.description}
              actions={
                <>
                  <SemanticBadge
                    tone={hasMandateEvidenceGap ? "warn" : "success"}
                  >
                    {hasMandateEvidenceGap ? "Needs attention" : "Evidence available"}
                  </SemanticBadge>
                </>
              }
            >
              <WorkbenchSectionStack className="manage-page-sections">
                {renderManageMode(mode, data, dpmMandateId, reviewContext)}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={
            <ManageEvidenceRail data={data} />
          }
        />
      </WorkbenchPageContainer>
      </AppPageShell>
    </ManageProofPackStateProvider>
  );
}

export function ManageWorkspaceUnavailable({
  detail,
}: {
  detail: string;
}) {
  return (
    <ReviewContextPageRecovery
      pageKey="manage"
      pageTitle="Manage Workspace"
      pageSubtitle="Confirm the portfolio before using mandate and implementation controls."
      body={detail}
      href="/book"
      actionLabel="Select a portfolio from My book"
    />
  );
}

function renderManageMode(
  mode: ManageMode,
  data: ManageWorkspaceData,
  mandateId: string | null,
  reviewContext: PortfolioReviewContext,
): ReactNode {
  switch (mode) {
    case "mandate":
      return <ManageMandateHealth data={data} />;
    case "waves":
      return (
        <>
          <DpmWaveCommandCenterPanel
            portfolioId={data.portfolio.portfolio.portfolio_id}
            mandateType={
              readStringFromResponse(data.mandate, "mandate_type") ??
              readStringFromResponse(data.mandate, "type")
            }
            portfolioCurrency={data.portfolio.portfolio.base_currency}
            waveList={data.waves}
            campaignDefinitions={data.campaignDefinitions}
            campaignDiscovery={data.campaignDiscovery}
            campaignOperatingQueue={data.campaignOperatingQueue}
            campaignApprovalInbox={data.campaignApprovalInbox}
            campaignWorkflowBoard={data.campaignWorkflowBoard}
            campaignAssignmentPlan={data.campaignAssignmentPlan}
            campaignWorkflowAutomation={data.campaignWorkflowAutomation}
            campaignSourceReadId={data.campaignSourceReadId}
            campaignApprovalDecisions={data.campaignApprovalDecisions}
            campaignAssignmentActions={data.campaignAssignmentActions}
            campaignAssignmentTasks={data.campaignAssignmentTasks}
            campaignMakerCheckerControls={data.campaignMakerCheckerControls}
            campaignDefinitionsError={data.campaignDefinitionsError}
            campaignDiscoveryError={data.campaignDiscoveryError}
            campaignWorkflowSummaryError={
              data.campaignOperatingQueueError ??
              data.campaignApprovalInboxError ??
              data.campaignWorkflowBoardError ??
              data.campaignAssignmentPlanError ??
              data.campaignWorkflowAutomationError
            }
            campaignWorkflowError={
              data.campaignApprovalDecisionsError ??
              data.campaignAssignmentActionsError ??
              data.campaignAssignmentTasksError ??
              data.campaignMakerCheckerControlsError
            }
            errorMessage={data.wavesError}
          />
          <ProofPackPanel
            showEmbeddedHeading
            portfolioId={data.portfolio.portfolio.portfolio_id}
            mandateId={mandateId}
            outcomeReviews={data.outcomeReviews}
            rebalanceSnapshot={data.portfolio.rebalance_snapshot}
            initialProofPack={data.proofPack}
            errorMessage={data.proofPackError}
          />
        </>
      );
    case "construction":
      return <ConstructionAlternativesPanel portfolio={data.portfolio} />;
    case "memory":
      return (
        <PortfolioMemoryPanel
          response={data.portfolioMemory}
          searchResponse={data.portfolioMemorySearch}
          errorMessage={data.portfolioMemoryError}
          sourceSearchErrorMessage={data.portfolioMemorySearchError}
        />
      );
    case "copilot":
      return <DpmCopilotWorkspace data={data} mandateId={mandateId} />;
    case "quality":
      return (
        <PmOperatingQualityPanel
          policies={data.pmOperatingQualityPolicies}
          scoreRuns={data.pmOperatingQualityScoreRuns}
          fairnessAnalyses={data.pmOperatingQualityFairnessAnalyses}
          fairnessAnalysisDetail={data.pmOperatingQualityFairnessAnalysisDetail}
          reviewActions={data.pmOperatingQualityReviewActions}
          reviewActionDetail={data.pmOperatingQualityReviewActionDetail}
          summaryInvocations={data.pmOperatingQualitySummaryInvocations}
          summaryInvocationDetail={data.pmOperatingQualitySummaryInvocationDetail}
          policiesError={data.pmOperatingQualityPoliciesError}
          scoreRunsError={data.pmOperatingQualityScoreRunsError}
          fairnessAnalysesError={data.pmOperatingQualityFairnessAnalysesError}
          fairnessAnalysisDetailError={data.pmOperatingQualityFairnessAnalysisDetailError}
          reviewActionsError={data.pmOperatingQualityReviewActionsError}
          reviewActionDetailError={data.pmOperatingQualityReviewActionDetailError}
          summaryInvocationsError={data.pmOperatingQualitySummaryInvocationsError}
          summaryInvocationDetailError={data.pmOperatingQualitySummaryInvocationDetailError}
        />
      );
    case "reviews":
      return (
        <OutcomeReviewPanel
          portfolioId={data.portfolio.portfolio.portfolio_id}
          response={data.outcomeReviews}
          errorMessage={data.outcomeReviewError}
        />
      );
    case "proof":
      return (
        <ProofPackPanel
          portfolioId={data.portfolio.portfolio.portfolio_id}
          mandateId={mandateId}
          outcomeReviews={data.outcomeReviews}
          rebalanceSnapshot={data.portfolio.rebalance_snapshot}
          initialProofPack={data.proofPack}
          errorMessage={data.proofPackError}
        />
      );
    case "overview":
    default:
      return <ManageOverview data={data} reviewContext={reviewContext} />;
  }
}
