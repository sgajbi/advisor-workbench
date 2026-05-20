import type { ReactNode } from "react";

import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import {
  AppPageShell,
  DegradedStatePanel,
  MainWithSideRailLayout,
  SemanticBadge,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import ConstructionAlternativesPanel from "@/features/workbench/components/construction-alternatives-panel";
import ManageMandateHealth from "@/features/workbench/components/manage-mandate-health";
import DpmWaveCommandCenterPanel from "@/features/workbench/components/dpm-wave-command-center-panel";
import OutcomeReviewPanel from "@/features/workbench/components/outcome-review-panel";
import PortfolioMemoryPanel from "@/features/workbench/components/portfolio-memory-panel";
import PmOperatingQualityPanel from "@/features/workbench/components/pm-operating-quality-panel";
import ProofPackPanel from "@/features/workbench/components/proof-pack-panel";
import ManageContextRail from "@/features/workbench/components/manage-context-rail";
import ManageOverview from "@/features/workbench/components/manage-overview";
import {
  buildManageModeItems,
  getManageModeDefinition,
  type ManageMode,
} from "@/features/workbench/manage-workspace-navigation";
import {
  readDpmMandateId,
  type ManageWorkspaceData,
} from "@/features/workbench/manage-workspace-data";
import styles from "./manage-workspace.module.css";

export function ManageWorkspace({
  data,
  mode,
}: {
  data: ManageWorkspaceData;
  mode: ManageMode;
}) {
  const portfolio = data.portfolio.portfolio;
  const modeDefinition = getManageModeDefinition(mode);
  const dpmMandateId = readDpmMandateId(data.mandate?.data ?? null);

  return (
    <AppPageShell pageKey="manage" className={`portfolio-page manage-page ${styles.manageScope}`}>
      <WorkbenchPageContainer className="portfolio-page-container manage-page-container">
        <MainWithSideRailLayout
          className="manage-layout portfolio-page"
          railClassName="portfolio-screen-rail-shell manage-rail-shell"
          mainClassName="manage-main"
          sideClassName="manage-side"
          sideDensity="comfortable"
          rail={
            <PortfolioScreenRail
              portfolioId={portfolio.portfolio_id}
              activeScreen="manage"
              modeItems={buildManageModeItems(portfolio.portfolio_id, mode)}
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
                  <SemanticBadge tone={data.commandCenterError ? "warn" : "success"}>
                    {data.commandCenterError ? "Needs attention" : "Evidence available"}
                  </SemanticBadge>
                  <SemanticBadge>{portfolio.base_currency}</SemanticBadge>
                </>
              }
            >
              <WorkbenchSectionStack className="manage-page-sections">
                {renderManageMode(mode, data, dpmMandateId)}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={<ManageContextRail data={data} activeMode={mode} />}
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}

export function ManageWorkspaceUnavailable({
  portfolioId,
  detail,
}: {
  portfolioId: string;
  detail: string;
}) {
  return (
    <main className="page-container">
      <WorkbenchPageFrame
        title="Manage Workspace"
        subtitle={`Manage context is temporarily unavailable for ${portfolioId}.`}
      >
        <DegradedStatePanel
          label="Operational status"
          title={`Unable to load portfolio context for ${portfolioId}.`}
          tone="danger"
          status="Unavailable"
          actions={[
            {
              href: `/performance?portfolioId=${encodeURIComponent(portfolioId)}`,
              label: "Open Performance Workspace",
            },
            { href: "/portfolio", label: "Return To Portfolio" },
          ]}
        >
          {detail}
        </DegradedStatePanel>
      </WorkbenchPageFrame>
    </main>
  );
}

function renderManageMode(
  mode: ManageMode,
  data: ManageWorkspaceData,
  mandateId: string | null
): ReactNode {
  switch (mode) {
    case "mandate":
      return <ManageMandateHealth data={data} />;
    case "waves":
      return (
        <>
          <DpmWaveCommandCenterPanel
            portfolioId={data.portfolio.portfolio.portfolio_id}
            waveList={data.waves}
            campaignDefinitions={data.campaignDefinitions}
            campaignDiscovery={data.campaignDiscovery}
            campaignDefinitionsError={data.campaignDefinitionsError}
            campaignDiscoveryError={data.campaignDiscoveryError}
            errorMessage={data.wavesError}
          />
          <ProofPackPanel
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
          errorMessage={data.portfolioMemoryError}
        />
      );
    case "quality":
      return (
        <PmOperatingQualityPanel
          policies={data.pmOperatingQualityPolicies}
          scoreRuns={data.pmOperatingQualityScoreRuns}
          fairnessAnalyses={data.pmOperatingQualityFairnessAnalyses}
          fairnessAnalysisDetail={data.pmOperatingQualityFairnessAnalysisDetail}
          reviewActions={data.pmOperatingQualityReviewActions}
          reviewActionDetail={data.pmOperatingQualityReviewActionDetail}
          policiesError={data.pmOperatingQualityPoliciesError}
          scoreRunsError={data.pmOperatingQualityScoreRunsError}
          fairnessAnalysesError={data.pmOperatingQualityFairnessAnalysesError}
          fairnessAnalysisDetailError={data.pmOperatingQualityFairnessAnalysisDetailError}
          reviewActionsError={data.pmOperatingQualityReviewActionsError}
          reviewActionDetailError={data.pmOperatingQualityReviewActionDetailError}
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
      return <ManageOverview data={data} />;
  }
}
