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
  return (
    <div className={styles.proposalSide}>
      <Panel className={styles.contextPanel}>
        <h3>Workflow Posture</h3>
        <p>
          Proposal and advisory work remains gated for advisor review until risk, disclosure, and
          compliance evidence is complete.
        </p>
        <ul className={styles.contextList}>
          <li>
            <span>Portfolio</span>
            <strong>{portfolioId}</strong>
          </li>
          <li>
            <span>Current Surface</span>
            <strong>{activeScreen === "advisory" ? "Advisory next actions" : "Proposal lifecycle"}</strong>
          </li>
          <li>
            <span>Client Readiness</span>
            <strong>Not client ready until evidence gates pass</strong>
          </li>
        </ul>
      </Panel>
      <Panel className={styles.contextPanel}>
        <Text variant="label">Advisor Decision Path</Text>
        <ul className={styles.contextList}>
          <li>
            <span>1. Prepare</span>
            <strong>Capture portfolio context, cash movements, and security orders.</strong>
          </li>
          <li>
            <span>2. Simulate</span>
            <strong>Review projected impact before saving an advisor-use draft.</strong>
          </li>
          <li>
            <span>3. Route</span>
            <strong>Send the proposal through risk and compliance review before client use.</strong>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
