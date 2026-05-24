import type { ReactNode } from "react";

import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioScreenRailModeItem } from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioScreenNavigationKey } from "@/apps/portfolio/portfolio-screen-navigation";
import {
  AppPageShell,
  MainWithSideRailLayout,
  Panel,
  SemanticBadge,
  Text,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";
import styles from "./proposal-workspace-shell.module.css";

export const CANONICAL_ADVISORY_PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";

export function resolveProposalPortfolioId(portfolioId?: string | null): string {
  return portfolioId?.trim() || CANONICAL_ADVISORY_PORTFOLIO_ID;
}

export default function ProposalWorkspaceShell({
  portfolioId,
  activeScreen,
  activeMode = activeScreen === "advisory" ? "advisory" : "queue",
  title,
  subtitle,
  children,
}: {
  portfolioId: string;
  activeScreen: Extract<PortfolioScreenNavigationKey, "proposal" | "advisory">;
  activeMode?: "queue" | "draft" | "advisory";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <AppPageShell pageKey={activeScreen} className={`portfolio-page proposal-page ${styles.proposalScope}`}>
      <WorkbenchPageContainer className="portfolio-page-container proposal-page-container">
        <MainWithSideRailLayout
          className="proposal-layout portfolio-page"
          railClassName="portfolio-screen-rail-shell proposal-rail-shell"
          mainClassName="proposal-main"
          sideClassName={styles.proposalSide}
          sideDensity="comfortable"
          rail={
            <PortfolioScreenRail
              portfolioId={portfolioId}
              activeScreen={activeScreen}
              modeItems={buildProposalModeItems(portfolioId, activeMode)}
              modeNavigationLabel="Proposal and advisory workflow navigation"
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
              <WorkbenchSectionStack className="proposal-page-sections">{children}</WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={<ProposalWorkflowContextRail portfolioId={portfolioId} activeScreen={activeScreen} />}
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}

function buildProposalModeItems(
  portfolioId: string,
  activeMode: "queue" | "draft" | "advisory"
): PortfolioScreenRailModeItem[] {
  const portfolioQuery = `portfolioId=${encodeURIComponent(portfolioId)}`;
  return [
    {
      key: "proposal-queue",
      label: "Proposal Queue",
      detail: "Drafts and workflow state",
      active: activeMode === "queue",
      href: `/proposals?${portfolioQuery}`,
    },
    {
      key: "proposal-draft",
      label: "Create Draft",
      detail: "Simulate and save proposal",
      active: activeMode === "draft",
      href: `/proposals/simulate?${portfolioQuery}`,
    },
    {
      key: "advisory-queue",
      label: "Advisory Queue",
      detail: "Advisor next actions",
      active: activeMode === "advisory",
      href: `/recommendations?${portfolioQuery}`,
    },
  ];
}

function ProposalWorkflowContextRail({
  portfolioId,
  activeScreen,
}: {
  portfolioId: string;
  activeScreen: Extract<PortfolioScreenNavigationKey, "proposal" | "advisory">;
}) {
  const isAdvisory = activeScreen === "advisory";
  return (
    <div className={styles.proposalSide}>
      <Panel className={`${styles.contextPanel} ${styles.evidenceDrawer}`}>
        <div className={styles.drawerHeader}>
          <span>Contextual Evidence</span>
          <strong>{isAdvisory ? "Workflow Status" : "Tasks"}</strong>
        </div>
        <div className={styles.evidenceAlert} role="status">
          Evidence pack: advisor-use review in progress
        </div>
        <div className={styles.evidenceTabs} aria-label="Evidence drawer sections">
          <span>Evidence Log</span>
          <strong>{isAdvisory ? "Workflow Status" : "Tasks"}</strong>
          <span>Audit Trail</span>
        </div>
        <div className={styles.reviewPosture}>
          <h3>{isAdvisory ? "Latest Review Posture" : "Package Readiness"}</h3>
          <p>
            {isAdvisory
              ? "Select an advisory proposal to review the evidence gates before risk routing."
              : "Proposal drafts remain advisor-use only until suitability, disclosure, and approval gates pass."}
          </p>
        </div>
        {isAdvisory ? (
          <ol className={styles.reviewStepper} aria-label="Advisory workflow status">
            <li className={styles.stepComplete}>
              <span>Draft captured</span>
              <strong>Proposal context and rationale recorded</strong>
            </li>
            <li className={styles.stepActive}>
              <span>Advisor review</span>
              <strong>Relationship manager action required</strong>
              <div className={styles.checklist}>
                <label>
                  <input type="checkbox" checked readOnly />
                  KYC validity verified
                </label>
                <label>
                  <input type="checkbox" readOnly />
                  Suitability evidence complete
                </label>
              </div>
            </li>
            <li>
              <span>Risk and compliance review</span>
              <strong>Awaiting advisor sign-off</strong>
            </li>
          </ol>
        ) : (
          <ul className={styles.taskList} aria-label="Proposal evidence tasks">
            <li>
              <span>Pre-trade disclosure</span>
              <strong>Prepare disclosure pack after advisor approval.</strong>
            </li>
            <li>
              <span>Suitability evidence</span>
              <strong>Attach rationale for mandate and portfolio fit.</strong>
            </li>
            <li className={styles.taskComplete}>
              <span>KYC verification</span>
              <strong>Current profile evidence is available.</strong>
            </li>
          </ul>
        )}
      </Panel>
      <Panel className={styles.contextPanel}>
        <Text variant="label">Advisor Decision Path</Text>
        <ul className={styles.contextList}>
          <li>
            <span>Portfolio</span>
            <strong>{portfolioId}</strong>
          </li>
          <li>
            <span>Current Surface</span>
            <strong>{isAdvisory ? "Advisory next actions" : "Proposal lifecycle"}</strong>
          </li>
          <li>
            <span>Client Readiness</span>
            <strong>Not client ready until evidence gates pass</strong>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
