import type { ReactNode } from "react";

import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioScreenNavigationKey } from "@/apps/portfolio/portfolio-screen-navigation";
import {
  buildAdvisoryJourneyModeItems,
  type AdvisoryJourneyMode,
} from "../advisory-journey-navigation";
import {
  AppPageShell,
  MainWithSideRailLayout,
  SemanticBadge,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import {
  buildNeutralProposalWorkflowContext,
  type ProposalWorkflowContextModel,
} from "../proposal-workflow-context-view-model";
import {
  ProposalWorkflowBoundary,
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "./proposal-workflow-context";
import styles from "./proposal-workspace-shell.module.css";

export const CANONICAL_ADVISORY_PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";

export function resolveProposalPortfolioId(portfolioId?: string | null): string {
  return portfolioId?.trim() || CANONICAL_ADVISORY_PORTFOLIO_ID;
}

export default function ProposalWorkspaceShell({
  portfolioId,
  activeScreen,
  activeMode = activeScreen === "advisory" ? "overview" : "approval-queue",
  title,
  subtitle,
  workflowContext,
  workflowContextPresentation = "rail",
  children,
}: {
  portfolioId: string;
  activeScreen: Extract<PortfolioScreenNavigationKey, "proposal" | "advisory">;
  activeMode?: AdvisoryJourneyMode;
  title: string;
  subtitle: string;
  workflowContext?: ProposalWorkflowContextModel;
  workflowContextPresentation?: "rail" | "inline-boundary";
  children: ReactNode;
}) {
  const initialWorkflowContext =
    workflowContext ??
    buildNeutralProposalWorkflowContext({
      portfolioId,
      surfaceLabel: activeScreen === "advisory" ? "Advisory next actions" : "Proposal lifecycle",
    });

  return (
    <AppPageShell pageKey={activeScreen} className={`portfolio-page proposal-page ${styles.proposalScope}`}>
      <WorkbenchPageContainer className="portfolio-page-container proposal-page-container">
        <ProposalWorkflowContextProvider initialModel={initialWorkflowContext}>
          <MainWithSideRailLayout
            className="proposal-layout portfolio-page"
            railClassName="proposal-rail-shell"
            mainClassName="proposal-main"
            sideClassName={styles.proposalSide}
            sideDensity="comfortable"
            rail={
              <PortfolioScreenRail
                portfolioId={portfolioId}
                activeScreen={activeScreen}
                modeItems={buildAdvisoryJourneyModeItems(portfolioId, activeMode)}
                modeNavigationLabel="Advisory lifecycle navigation"
              />
            }
            main={
              <WorkbenchPageFrame
                className={`proposal-page-frame proposal-page-frame-${activeScreen}`}
                bodyClassName="proposal-page-frame-body"
                title={title}
                subtitle={subtitle}
                actions={
                  <>
                    <SemanticBadge tone="warn">Advisor use only</SemanticBadge>
                    <SemanticBadge>{portfolioId}</SemanticBadge>
                  </>
                }
              >
                <WorkbenchSectionStack className="proposal-page-sections">
                  {workflowContextPresentation === "inline-boundary" ? (
                    <ProposalWorkflowBoundary
                      model={initialWorkflowContext}
                      presentation="inline"
                    />
                  ) : null}
                  {children}
                </WorkbenchSectionStack>
              </WorkbenchPageFrame>
            }
            side={
              workflowContextPresentation === "rail" ? (
                <ProposalWorkflowContextRail />
              ) : undefined
            }
          />
        </ProposalWorkflowContextProvider>
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
