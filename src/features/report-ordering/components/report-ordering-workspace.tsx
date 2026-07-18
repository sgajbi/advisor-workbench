"use client";

import { useRef } from "react";

import PortfolioScreenRail from "@/apps/portfolio/components/portfolio-screen-rail";
import {
  ActionButton,
  AppPageShell,
  MainWithSideRailLayout,
  ScreenStatePanel,
  SemanticBadge,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import { useReportOrderingWorkflow } from "../use-report-ordering-workflow";
import styles from "../report-ordering-workspace.module.css";
import { ReportConfigurationPanel } from "./report-configuration-panel";
import { ReportReadinessRail } from "./report-readiness-rail";
import { ReportRequestHistory } from "./report-request-history";

export function ReportOrderingWorkspace({
  portfolio,
}: {
  portfolio: {
    portfolioId: string;
    displayName: string;
    asOfDate: string;
    baseCurrency: string;
  };
}) {
  const workflow = useReportOrderingWorkflow({
    portfolioId: portfolio.portfolioId,
    asOfDate: portfolio.asOfDate,
    reportingCurrency: portfolio.baseCurrency,
  });
  const readinessRef = useRef<HTMLDivElement>(null);

  function focusReadiness() {
    requestAnimationFrame(() => readinessRef.current?.focus());
  }

  async function submitRequest() {
    await workflow.submitRequest();
    focusReadiness();
  }

  return (
    <AppPageShell pageKey="reports" className={styles.page}>
      <WorkbenchPageContainer className={styles.container}>
        <MainWithSideRailLayout
          className={styles.layout}
          railClassName="portfolio-screen-rail-shell"
          mainClassName={styles.main}
          sideClassName={styles.side}
          sideDensity="comfortable"
          rail={
            <PortfolioScreenRail
              portfolioId={portfolio.portfolioId}
              activeScreen="reports"
            />
          }
          main={
            <WorkbenchPageFrame
              className={styles.frame}
              title="Report Centre"
              subtitle="Prepare approved portfolio reports, confirm readiness, and monitor each request."
              actions={
                <>
                  <SemanticBadge>{portfolio.displayName}</SemanticBadge>
                  <SemanticBadge>{portfolio.baseCurrency}</SemanticBadge>
                </>
              }
            >
              <WorkbenchSectionStack className={styles.contentStack}>
                {workflow.catalogueState === "loading" ? (
                  <ScreenStatePanel
                    kind="loading"
                    surface="portfolio"
                    title="Loading approved reports"
                    body="Checking portfolio access, available report families, and current output readiness."
                    rows={5}
                  />
                ) : workflow.catalogueState === "permission_blocked" ? (
                  <ScreenStatePanel
                    kind="permission_blocked"
                    surface="portfolio"
                    title="Report ordering is restricted"
                    body={workflow.catalogueError ?? "This portfolio is not available for report ordering."}
                    action={<ActionButton onClick={() => void workflow.refreshCatalogue()}>Check Again</ActionButton>}
                  />
                ) : workflow.catalogueState === "error" ? (
                  <ScreenStatePanel
                    kind="error"
                    surface="portfolio"
                    title="Approved reports are unavailable"
                    body={workflow.catalogueError ?? "Reporting choices could not be loaded."}
                    action={<ActionButton onClick={() => void workflow.refreshCatalogue()}>Try Again</ActionButton>}
                  />
                ) : workflow.model && workflow.configuration ? (
                  <>
                    <ReportConfigurationPanel
                      model={workflow.model}
                      configuration={workflow.configuration}
                      updateConfiguration={workflow.updateConfiguration}
                      toggleSection={workflow.toggleSection}
                    />
                    <ReportRequestHistory
                      rows={workflow.historyRows}
                      state={workflow.historyState}
                      error={workflow.historyError}
                      onRefresh={() => void workflow.refreshHistory()}
                    />
                  </>
                ) : (
                  <ScreenStatePanel
                    kind="empty"
                    surface="portfolio"
                    title="No approved reports available"
                    body="No report family is currently available for this portfolio and business role."
                  />
                )}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={
            <div className={styles.stickyRail}>
              <div ref={readinessRef} tabIndex={-1} className={styles.focusTarget}>
                <ReportReadinessRail
                  model={workflow.model}
                  preflightReviewed={workflow.preflightReviewed}
                  canSubmitReviewedRequest={workflow.canSubmitReviewedRequest}
                  submissionState={workflow.submissionState}
                  submissionError={workflow.submissionError}
                  submittedHandle={workflow.submittedHandle}
                  onReview={() => {
                    workflow.reviewRequest();
                    focusReadiness();
                  }}
                  onSubmit={() => void submitRequest()}
                />
              </div>
            </div>
          }
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
