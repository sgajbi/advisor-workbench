"use client";

import { useEffect, useRef, useState } from "react";

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
import { findPortfolioReviewBatchMode, type ReportOrderingScopeMode } from "../view-model";
import styles from "../report-ordering-workspace.module.css";
import { ReportBatchStatusPanel } from "./report-batch-status";
import { ReportConfigurationPanel } from "./report-configuration-panel";
import { ReportReadinessRail } from "./report-readiness-rail";
import { ReportRequestHistory } from "./report-request-history";
import { ReportPortfolioScopePanel } from "./report-portfolio-scope-panel";

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
  const [scopeMode, setScopeMode] = useState<ReportOrderingScopeMode>("single_portfolio");
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const workflow = useReportOrderingWorkflow({
    portfolioId: portfolio.portfolioId,
    asOfDate: portfolio.asOfDate,
    reportingCurrency: portfolio.baseCurrency,
    scopeMode,
    selectedPortfolioIds,
  });
  const readinessRef = useRef<HTMLDivElement>(null);
  const configurationRef = useRef<HTMLDivElement>(null);
  const focusIntentRef = useRef(0);
  const selectionDateRef = useRef(portfolio.asOfDate);
  const workspaceState = workflow.screenState.workspace;
  const batchAvailable = Boolean(findPortfolioReviewBatchMode(workflow.model?.family ?? null));
  const configurationLocked = workflow.submissionState === "submitting";

  useEffect(() => {
    setScopeMode("single_portfolio");
    setSelectedPortfolioIds([]);
    selectionDateRef.current = portfolio.asOfDate;
  }, [portfolio.asOfDate, portfolio.portfolioId]);

  useEffect(() => {
    const configurationDate = workflow.configuration?.asOfDate;
    if (!configurationDate || configurationDate === selectionDateRef.current) return;
    selectionDateRef.current = configurationDate;
    setSelectedPortfolioIds([]);
  }, [portfolio.portfolioId, workflow.configuration?.asOfDate]);

  function focusReadiness() {
    requestAnimationFrame(() => readinessRef.current?.focus());
  }

  async function submitRequest() {
    const focusIntent = ++focusIntentRef.current;
    await workflow.submitRequest();
    if (focusIntentRef.current === focusIntent) {
      focusReadiness();
    }
  }

  function startAnotherReport() {
    if (!workflow.startAnotherReport()) {
      return;
    }
    focusIntentRef.current += 1;
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
                  scopeMode === "explicit_portfolio_batch" ? (
                    <ReportBatchStatusPanel
                      status={workflow.batchStatus}
                      error={workflow.batchStatusError}
                      onRefresh={() => void workflow.refreshBatchStatus()}
                    />
                  ) : requestHistory
                ) : workflow.configuration ? (
                  <>
                    <div
                      ref={configurationRef}
                      tabIndex={-1}
                      role="region"
                      aria-label="Report configuration"
                      className={styles.focusTarget}
                    >
                      <ReportPortfolioScopePanel
                        currentPortfolioId={portfolio.portfolioId}
                        asOfDate={workflow.configuration.asOfDate}
                        scopeMode={scopeMode}
                        batchAvailable={batchAvailable}
                        disabled={configurationLocked}
                        selectedPortfolioIds={selectedPortfolioIds}
                        onScopeModeChange={(mode) => {
                          if (!configurationLocked) setScopeMode(mode);
                        }}
                        onSelectionChange={(portfolioIds) => {
                          if (!configurationLocked) setSelectedPortfolioIds(portfolioIds);
                        }}
                      />
                      <ReportConfigurationPanel
                        model={workspaceState.model}
                        configuration={workflow.configuration}
                        disabled={configurationLocked}
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
              <div
                ref={readinessRef}
                tabIndex={-1}
                role="region"
                aria-label="Report request readiness"
                className={styles.focusTarget}
              >
                <ReportReadinessRail
                  model={workflow.model}
                  screenState={workflow.screenState.readiness}
                  preflightReviewed={workflow.preflightReviewed}
                  canSubmitReviewedRequest={workflow.canSubmitReviewedRequest}
                  submissionState={workflow.submissionState}
                  supportReference={workflow.supportReference}
                  scopeLabel={scopeMode === "explicit_portfolio_batch"
                    ? `${selectedPortfolioIds.length} selected portfolios`
                    : "Selected portfolio"}
                  isPortfolioBundle={scopeMode === "explicit_portfolio_batch"}
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
