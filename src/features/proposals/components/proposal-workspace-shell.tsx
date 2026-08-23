import type { ReactNode } from "react";

import { getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import type { PortfolioWorkspace } from "@/apps/portfolio/types";
import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioScreenNavigationKey } from "@/apps/portfolio/portfolio-screen-navigation";
import {
  buildAdvisoryJourneyModeItems,
  type AdvisoryJourneyReviewContext,
  type AdvisoryJourneyMode,
} from "../advisory-journey-navigation";
import {
  AppPageShell,
  buildWorkbenchSourceContextNotice,
  buildWorkbenchUnsupportedReviewContextNotice,
  MainWithSideRailLayout,
  SemanticBadge,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import { buildProposalReviewContextStrip } from "../proposal-review-context-strip-view-model";
import {
  buildNeutralProposalWorkflowContext,
  type ProposalWorkflowContextModel,
} from "../proposal-workflow-context-view-model";
import {
  ProposalWorkflowContextBoundary,
  ProposalWorkflowContextProvider,
  ProposalWorkflowContextRail,
} from "./proposal-workflow-context";
import styles from "./proposal-workspace-shell.module.css";

export default async function ProposalWorkspaceShell({
  reviewContext,
  activeScreen,
  activeMode = activeScreen === "advisory" ? "overview" : "approval-queue",
  title,
  subtitle,
  workflowContext,
  workflowContextPresentation = "rail",
  children,
}: {
  reviewContext: AdvisoryJourneyReviewContext;
  activeScreen: Extract<PortfolioScreenNavigationKey, "proposal" | "advisory">;
  activeMode?: AdvisoryJourneyMode;
  title: string;
  subtitle: string;
  workflowContext?: ProposalWorkflowContextModel;
  workflowContextPresentation?: "rail" | "inline-boundary";
  children:
    | ReactNode
    | ((portfolioContext: PortfolioWorkspace | null) => ReactNode);
}) {
  const { portfolioId } = reviewContext;
  const portfolioContext = resolveProposalPortfolioContext(
    portfolioId,
    await getPortfolioWorkspaceShell(portfolioId),
  );
  const sourceContextNotice =
    activeMode === "proposal-builder"
      ? buildWorkbenchSourceContextNotice({
          title: "Proposal source context",
          subject: "Proposal construction",
          requestedAsOfDate: reviewContext.asOfDate,
          requestedReportingCurrency: reviewContext.reportingCurrency,
          sourceAsOfDate: portfolioContext?.as_of_date,
          sourceCurrency: portfolioContext?.portfolio.base_currency,
        })
      : buildWorkbenchUnsupportedReviewContextNotice({
          title:
            activeScreen === "advisory"
              ? "Advisory workspace scope"
              : "Proposal workspace scope",
          subject:
            activeScreen === "advisory"
              ? "Advisory evidence"
              : "Proposal workflow evidence",
          destination:
            activeScreen === "advisory"
              ? "advisory workspace"
              : "proposal worklist",
          requestedAsOfDate: reviewContext.asOfDate,
          requestedPeriod: reviewContext.period,
          requestedReportingCurrency: reviewContext.reportingCurrency,
        });
  const reviewContextStrip = buildProposalReviewContextStrip({
    portfolioId,
    portfolioContext,
    notice: sourceContextNotice
      ? {
          label: sourceContextNotice.title,
          message: sourceContextNotice.body,
          tone: "attention",
        }
      : undefined,
  });
  const initialWorkflowContext =
    workflowContext ??
    buildNeutralProposalWorkflowContext({
      portfolioId,
      surfaceLabel: activeScreen === "advisory" ? "Advisory next actions" : "Proposal lifecycle",
    });
  const workspaceContent =
    typeof children === "function" ? children(portfolioContext) : children;

  return (
    <AppPageShell
      pageKey={activeScreen}
      className={`portfolio-page proposal-page ${styles.proposalScope}`}
      reviewContext={reviewContextStrip}
    >
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
                modeItems={buildAdvisoryJourneyModeItems(reviewContext, activeMode)}
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
                  <SemanticBadge tone="warn">Advisor use only</SemanticBadge>
                }
              >
                <WorkbenchSectionStack className="proposal-page-sections">
                  {workflowContextPresentation === "inline-boundary" ? (
                    <ProposalWorkflowContextBoundary presentation="inline" />
                  ) : null}
                  {workspaceContent}
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

export function resolveProposalPortfolioContext(
  portfolioId: string,
  portfolioContext: PortfolioWorkspace | null,
): PortfolioWorkspace | null {
  return portfolioContext?.portfolio.portfolio_id === portfolioId
    ? portfolioContext
    : null;
}
