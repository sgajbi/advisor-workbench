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
  const configurationRef = useRef<HTMLDivElement>(null);
  const workspaceState = workflow.screenState.workspace;

  function focusReadiness() {
    requestAnimationFrame(() => readinessRef.current?.focus());
  }

  async function submitRequest() {
    await workflow.submitRequest();
    focusReadiness();
  }

  function startAnotherReport() {
    if (!workflow.startAnotherReport()) {
      return;
    }
    requestAnimationFrame(() => configurationRef.current?.focus());
  }

  const requestHistory = (
    <ReportRequestHistory
      rows={workflow.historyRows}
      state={workflow.historyState}
      error={workflow.historyError}
      onRefresh={() => void workflow.refreshHistory()}
    />
  );

  return (
    <AppPageShell pageKey="reports" className={styles.page}>
      <WorkbenchPageContainer className={styles.container}>
        <MainWithSideRailLayout
          className={styles.layout}
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
                {workspaceState.kind !== "configuration" &&
                workspaceState.kind !== "accepted" ? (
                  <ScreenStatePanel
                    className={styles.terminalState}
                    kind={workspaceState.kind}
                    surface="portfolio"
                    title={workspaceState.title}
                    body={workspaceState.body}
                    rows={workspaceState.kind === "loading" ? 5 : undefined}
                    action={
                      workspaceState.actionLabel ? (
                        <ActionButton onClick={() => void workflow.refreshCatalogue()}>
                          {workspaceState.actionLabel}
                        </ActionButton>
                      ) : undefined
                    }
                  />
                ) : workspaceState.kind === "accepted" ? (
                  requestHistory
                ) : workflow.configuration ? (
                  <>
                    <div
                      ref={configurationRef}
                      tabIndex={-1}
                      aria-label="Report configuration"
                      className={styles.focusTarget}
                    >
                      <ReportConfigurationPanel
                        model={workspaceState.model}
                        configuration={workflow.configuration}
                        updateConfiguration={workflow.updateConfiguration}
                        toggleSection={workflow.toggleSection}
                      />
                    </div>
                    {requestHistory}
                  </>
                ) : null}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={
            <div className={styles.stickyRail}>
              <div ref={readinessRef} tabIndex={-1} className={styles.focusTarget}>
                <ReportReadinessRail
                  model={workflow.model}
                  screenState={workflow.screenState.readiness}
                  preflightReviewed={workflow.preflightReviewed}
                  canSubmitReviewedRequest={workflow.canSubmitReviewedRequest}
                  submissionState={workflow.submissionState}
                  submittedHandle={workflow.submittedHandle}
                  onReview={() => {
                    workflow.reviewRequest();
                    focusReadiness();
                  }}
                  onSubmit={() => void submitRequest()}
                  onStartAnother={startAnotherReport}
                />
              </div>
            </div>
          }
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
