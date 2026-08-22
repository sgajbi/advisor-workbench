"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ActionButton,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  SourceRefreshAction,
  SourceWindowNavigation,
  Text,
  useSourceWindow,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { projectQuerySourcePosture } from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import { listProposals } from "../api";
import { buildAdvisoryOverviewModel } from "../advisory-overview-view-model";
import { buildProposalQueueWorkflowContext } from "../proposal-workflow-context-view-model";
import { usePublishProposalWorkflowContext } from "./proposal-workflow-context";
import styles from "./advisory-overview-workspace.module.css";

const ADVISORY_OVERVIEW_WINDOW_SIZE = 8;

type SourceRefreshOutcome = {
  queryIdentity: string;
  state: "pending" | "confirmed" | "failed";
};

export default function AdvisoryOverviewWorkspace({ portfolioId }: { portfolioId: string }) {
  const sourceWindow = useSourceWindow(portfolioId);
  const [sourceRefreshOutcome, setSourceRefreshOutcome] = useState<SourceRefreshOutcome | null>(null);
  const proposalQuery = useQuery({
    queryKey: ["advisory-overview", portfolioId, sourceWindow.cursor],
    queryFn: async () =>
      await listProposals({
        portfolioId,
        cursor: sourceWindow.cursor,
        limit: ADVISORY_OVERVIEW_WINDOW_SIZE,
      }),
    ...workbenchStrictQueryDefaults,
  });
  const proposals = useMemo(() => proposalQuery.data?.items ?? [], [proposalQuery.data?.items]);
  const model = useMemo(
    () =>
      buildAdvisoryOverviewModel({
        portfolioId,
        proposals,
        hasMoreResults: Boolean(proposalQuery.data?.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
        windowNumber: sourceWindow.windowNumber,
      }),
    [
      portfolioId,
      proposalQuery.data?.next_cursor,
      proposals,
      sourceWindow.hasPrevious,
      sourceWindow.windowNumber,
    ]
  );
  const sourcePosture = projectQuerySourcePosture({
    hasData: Boolean(proposalQuery.data),
    isLoading: proposalQuery.isLoading,
    isFetching: proposalQuery.isFetching,
    hasError: Boolean(proposalQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(proposalQuery.error),
  });
  const queryIdentity = `${portfolioId}:${sourceWindow.cursor ?? "first"}`;
  const recordedRefreshState =
    sourceRefreshOutcome?.queryIdentity === queryIdentity ? sourceRefreshOutcome.state : null;
  const refreshState =
    recordedRefreshState === "failed"
    && proposalQuery.isSuccess
    && !sourcePosture.isRefreshing
    && !sourcePosture.hasRefreshFailure
      ? "confirmed"
      : recordedRefreshState;
  const workflowContext = useMemo(
    () =>
      buildProposalQueueWorkflowContext({
        portfolioId,
        modeLabel: "Advisory overview",
        isLoading: sourcePosture.isInitialLoading,
        isRefreshing: sourcePosture.isRefreshing,
        permissionBlocked: sourcePosture.isPermissionBlocked,
        hasRestrictedEvidence: false,
        hasError: sourcePosture.isUnavailable,
        hasUnavailableEvidence: false,
        hasProposalRefreshFailure: sourcePosture.hasRefreshFailure,
        hasSupportingEvidenceRefreshFailure: false,
        hasMoreResults: Boolean(proposalQuery.data?.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
        windowNumber: sourceWindow.windowNumber,
        totalCount: model.visibleProposalCount,
        attentionCount: model.attentionCount,
        primaryDecision: model.primaryDecision,
        recommendedAction: model.recommendedAction,
        responsivePriority: "supplementary",
      }),
    [
      model,
      portfolioId,
      proposalQuery.data?.next_cursor,
      sourcePosture.hasRefreshFailure,
      sourcePosture.isInitialLoading,
      sourcePosture.isPermissionBlocked,
      sourcePosture.isRefreshing,
      sourcePosture.isUnavailable,
      sourceWindow.hasPrevious,
      sourceWindow.windowNumber,
    ]
  );
  usePublishProposalWorkflowContext(workflowContext);

  async function refreshAdvisoryPriorities() {
    const requestedIdentity = queryIdentity;
    setSourceRefreshOutcome({ queryIdentity: requestedIdentity, state: "pending" });
    const result = await proposalQuery.refetch({ cancelRefetch: true });
    setSourceRefreshOutcome((currentOutcome) =>
      currentOutcome && currentOutcome.queryIdentity !== requestedIdentity
        ? currentOutcome
        : {
            queryIdentity: requestedIdentity,
            state: result.error ? "failed" : "confirmed",
          }
    );
  }

  const showRefreshAction =
    !sourcePosture.isPermissionBlocked
    && (!sourcePosture.isInitialLoading || refreshState === "pending");
  const refreshLabel =
    sourcePosture.isUnavailable || sourcePosture.hasRefreshFailure || refreshState === "failed"
      ? sourceWindow.hasPrevious
        ? "Retry proposal window"
        : "Retry advisory priorities"
      : "Refresh advisory priorities";
  const sectionActions = (
    <>
      {showRefreshAction ? (
        <SourceRefreshAction
          refreshScope={queryIdentity}
          idleLabel={refreshLabel}
          busyLabel="Checking advisory priorities"
          isRefreshing={proposalQuery.isFetching}
          onRefresh={refreshAdvisoryPriorities}
        />
      ) : null}
      {proposalQuery.data && !sourcePosture.isPermissionBlocked ? (
        <Link
          className="nav-link"
          href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
        >
          Build Proposal
        </Link>
      ) : null}
    </>
  );

  if (sourcePosture.isInitialLoading) {
    return (
      <SectionBlock
        title="Advisor Priorities"
        subtitle="Portfolio-scoped proposal posture, lifecycle handoffs, and next actions."
        actions={sectionActions}
      >
        <ScreenStatePanel
          kind="loading"
          title={refreshState === "pending" ? "Checking advisory priorities" : "Loading advisory priorities"}
          body={
            refreshState === "pending"
              ? "Recontacting the approved advisory workflow for this portfolio."
              : "Retrieving the current proposal posture for this portfolio."
          }
          surface="default"
          rows={5}
        />
      </SectionBlock>
    );
  }

  if (sourcePosture.isPermissionBlocked) {
    return (
      <SectionBlock
        title="Advisor Priorities"
        subtitle="Portfolio-scoped proposal posture, lifecycle handoffs, and next actions."
      >
        <ScreenStatePanel
          kind="permission_blocked"
          title="Advisory proposal access is not available"
          body="Your current role does not permit this portfolio's proposal workflow to be viewed."
          hint="Use an entitled portfolio or request access through the bank's support process."
          surface="default"
        />
      </SectionBlock>
    );
  }

  if (sourcePosture.isUnavailable) {
    return (
      <SectionBlock
        title="Advisor Priorities"
        subtitle="Portfolio-scoped proposal posture, lifecycle handoffs, and next actions."
        actions={sectionActions}
      >
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <ScreenStatePanel
            kind="error"
            title={
              sourceWindow.hasPrevious
                ? "This proposal window is unavailable"
                : refreshState === "failed"
                  ? "Advisory priorities remain unavailable"
                  : "Advisory priorities are unavailable"
            }
            body={
              sourceWindow.hasPrevious
                ? "The next proposal window could not be loaded from the approved advisory workflow."
                : "The proposal worklist could not be loaded from the approved advisory workflow."
            }
            hint={
              sourceWindow.hasPrevious
                ? "Retry this proposal window, or return to the previously loaded proposals."
                : "Use Retry advisory priorities when the source is available. No fallback proposal, review, or implementation posture is shown."
            }
            action={
              sourceWindow.hasPrevious ? (
                <ActionButton priority="secondary" onClick={sourceWindow.showPrevious}>
                  Return to previous proposals
                </ActionButton>
              ) : undefined
            }
            surface="default"
          />
        </div>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Advisor Priorities"
      subtitle="Portfolio-scoped proposal posture, lifecycle handoffs, and next actions."
      actions={sectionActions}
    >
      <div className={styles.workspace} data-testid="advisory-overview-workspace">
        {sourcePosture.isRefreshing ? (
          <div className={styles.sourceNotice} role="status" aria-live="polite">
            <SemanticBadge>Refreshing</SemanticBadge>
            <Text variant="secondary">
              The current worklist remains visible while source-owned proposal posture refreshes.
            </Text>
          </div>
        ) : refreshState === "confirmed" && !sourcePosture.hasRefreshFailure ? (
          <div className={styles.sourceNotice} role="status" aria-live="polite" aria-atomic="true">
            <SemanticBadge tone="success">Source confirmed</SemanticBadge>
            <Text variant="secondary">
              Latest advisory priorities confirmed through Gateway.
            </Text>
          </div>
        ) : null}
        {sourcePosture.hasRefreshFailure ? (
          <ScreenStatePanel
            kind="partial"
            title="Latest proposal posture is not confirmed"
            body="Previously retrieved proposals remain visible, but the latest source refresh did not complete."
            hint="Retry before relying on this worklist for a client discussion or implementation decision."
            surface="default"
          />
        ) : null}

        <section
          className={styles.decisionPanel}
          aria-labelledby="advisory-decision-title"
          data-testid="advisory-decision-brief"
        >
          <div>
            <Text variant="microLabel">Advisor Decision</Text>
            <Text variant="subsectionTitle" as="h2" id="advisory-decision-title">
              {model.primaryDecision}
            </Text>
            <Text variant="secondary">{model.recommendedAction}</Text>
          </div>
          <SemanticBadge tone={model.attentionCount > 0 ? "warn" : "success"} emphasis="strong">
            {model.attentionCount > 0
              ? `${model.attentionCount} ${model.attentionCount === 1 ? "item needs" : "items need"} action`
              : "No action in view"}
          </SemanticBadge>
        </section>

        <section
          className={styles.priorityPanel}
          aria-labelledby="priority-advisory-actions-title"
          data-testid="advisory-priority-worklist"
        >
          <div className={styles.panelHeader}>
            <div>
              <Text variant="microLabel">Advisor Worklist</Text>
              <Text variant="subsectionTitle" as="h2" id="priority-advisory-actions-title">
                Priority Advisory Actions
              </Text>
            </div>
            <Link href={`/proposals?portfolioId=${encodeURIComponent(portfolioId)}`}>
              Open Approval Queue
            </Link>
          </div>

          <div
            className={`${styles.sourceWindowPosture} ${
              model.hasPartialWindow ? styles.partialWindow : ""
            }`}
            data-testid="advisory-source-window-posture"
            role="status"
          >
            <SemanticBadge tone={model.hasPartialWindow ? "warn" : "success"}>
              {model.sourceWindowLabel}
            </SemanticBadge>
            <Text variant="secondary">{model.sourceWindowDetail}</Text>
          </div>

          {model.proposalRows.length === 0 ? (
            <ScreenStatePanel
              kind={model.hasPartialWindow ? "partial" : "empty"}
              title={
                model.hasPartialWindow
                  ? "No proposals in this source window"
                  : "No open advisory proposals"
              }
              body={
                model.hasPartialWindow
                  ? "Review adjacent proposal windows before concluding this portfolio has no open advisory work."
                  : "Review source-backed ideas or build a proposal when a client objective is ready."
              }
              action={
                !model.hasPartialWindow ? (
                  <Link
                    className="nav-link"
                    href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
                  >
                    Build advisor-use draft
                  </Link>
                ) : undefined
              }
              surface="default"
            />
          ) : (
            <div className={styles.priorityTableWrap}>
              <table className={styles.priorityTable}>
                <caption className="sr-only">
                  Proposals ranked by the next advisor action within the current source window
                </caption>
                <thead>
                  <tr>
                    <th>Proposal</th>
                    <th>Stage</th>
                    <th>Readiness</th>
                    <th>Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {model.proposalRows.map((row) => (
                    <tr key={row.proposalId}>
                      <td>
                        <Link href={row.href}>{row.title}</Link>
                        <span>ID: {row.proposalId}</span>
                      </td>
                      <td>
                        <SemanticBadge tone={row.stageTone}>{row.stage}</SemanticBadge>
                      </td>
                      <td>
                        <SemanticBadge tone={row.readinessTone}>{row.readiness}</SemanticBadge>
                      </td>
                      <td>{row.nextAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <SourceWindowNavigation
            ariaLabel="Advisory proposal worklist navigation"
            currentWindow={sourceWindow.windowNumber}
            hasPrevious={sourceWindow.hasPrevious}
            hasNext={Boolean(proposalQuery.data?.next_cursor)}
            isLoading={proposalQuery.isFetching}
            onPrevious={sourceWindow.showPrevious}
            onNext={() => sourceWindow.showNext(proposalQuery.data?.next_cursor)}
          />
        </section>

        <WorkbenchSummaryMetricStrip
          ariaLabel="Advisory overview summary"
          className={styles.summaryGrid}
          itemClassName={styles.summaryMetric}
          layout="custom"
          items={model.metrics.map((metric) => ({
            key: metric.label,
            label: metric.label,
            value: metric.value,
            support: metric.detail,
            className: styles[metric.tone],
          }))}
        />

        <section
          className={styles.lifecyclePanel}
          aria-labelledby="advisory-lifecycle-title"
          data-testid="advisory-lifecycle-summary"
        >
          <div className={styles.panelHeader}>
            <div>
              <Text variant="microLabel">Proposal Lifecycle</Text>
              <Text variant="subsectionTitle" as="h2" id="advisory-lifecycle-title">
                Move recommendations from insight to implementation
              </Text>
            </div>
            <Text variant="metadata">{portfolioId}</Text>
          </div>
          <ol className={styles.lifecycleGrid}>
            {model.lifecycleStages.map((stage) => (
              <li key={stage.key}>
                <Link href={stage.href} className={styles.lifecycleStage}>
                  <span className={styles.stageSequence}>{stage.sequence}</span>
                  <span className={styles.stageContent}>
                    <strong>{stage.label}</strong>
                    <span>{stage.detail}</span>
                  </span>
                  <span className={styles.stagePosture}>
                    <SemanticBadge tone={stage.tone}>{stage.value}</SemanticBadge>
                    <span>{stage.valueLabel}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </SectionBlock>
  );
}
