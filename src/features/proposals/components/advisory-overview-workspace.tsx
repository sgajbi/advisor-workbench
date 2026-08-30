"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ActionLink,
  ActionButton,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  SourceRefreshAction,
  SourceWindowNavigation,
  Text,
  useAdmittedSourceSelection,
  useSourceWindow,
  WorkbenchWorklist,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { projectQuerySourcePosture } from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";
import {
  ADVISORY_OVERVIEW_COPY,
  ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY,
  advisoryOverviewLoadingCopy,
  advisoryOverviewUnavailableCopy,
} from "@/copy/advisory-overview-copy";

import { listProposals } from "../api";
import {
  buildAdvisoryJourneyHref,
  type AdvisoryJourneyReviewContext,
} from "../advisory-journey-navigation";
import { buildAdvisoryOverviewModel } from "../advisory-overview-view-model";
import { buildProposalQueueWorkflowContext } from "../proposal-workflow-context-view-model";
import { MAXIMUM_PROPOSAL_SOURCE_WINDOW_NUMBER } from "../proposal-source-window-navigation";
import { usePublishProposalWorkflowContext } from "./proposal-workflow-context";
import styles from "./advisory-overview-workspace.module.css";

const ADVISORY_OVERVIEW_WINDOW_SIZE = 8;
type SourceRefreshOutcome = {
  queryIdentity: string;
  state: "pending" | "confirmed" | "failed";
};

export default function AdvisoryOverviewWorkspace({
  reviewContext,
}: {
  reviewContext: AdvisoryJourneyReviewContext;
}) {
  const { portfolioId } = reviewContext;
  const sourceWindow = useSourceWindow(portfolioId, undefined, {
    maximumWindowNumber: MAXIMUM_PROPOSAL_SOURCE_WINDOW_NUMBER,
  });
  const [sourceRefreshOutcome, setSourceRefreshOutcome] =
    useState<SourceRefreshOutcome | null>(null);
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
  const proposals = useMemo(
    () => proposalQuery.data?.items ?? [],
    [proposalQuery.data?.items],
  );
  const sourceHasMoreProposalResults = Boolean(
    proposalQuery.data?.next_cursor,
  );
  const hasNextProposalWindow = sourceWindow.canShowNext(
    proposalQuery.data?.next_cursor,
  );
  const model = useMemo(
    () =>
      buildAdvisoryOverviewModel({
        reviewContext,
        proposals,
        hasMoreResults: sourceHasMoreProposalResults,
        hasPreviousResults: sourceWindow.hasEarlierWindows,
        windowNumber: sourceWindow.windowNumber,
      }),
    [
      reviewContext,
      proposals,
      sourceWindow.hasEarlierWindows,
      sourceHasMoreProposalResults,
      sourceWindow.windowNumber,
    ],
  );
  const [selectedProposalId, setSelectedProposalId] =
    useAdmittedSourceSelection({
      scopeKey: `${portfolioId}:${reviewContext.selectedRecordId ?? ""}`,
      requestedKey: reviewContext.selectedRecordId,
      admittedKeys: model.proposalRows.map((proposal) => proposal.proposalId),
      sourceResolved: proposalQuery.data !== undefined,
    });
  const selectedProposal =
    model.proposalRows.find(
      (proposal) => proposal.proposalId === selectedProposalId,
    ) ?? model.proposalRows[0];
  const sourcePosture = projectQuerySourcePosture({
    hasData: Boolean(proposalQuery.data),
    isLoading: proposalQuery.isLoading,
    isFetching: proposalQuery.isFetching,
    hasError: Boolean(proposalQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(proposalQuery.error),
  });
  const queryIdentity = `${portfolioId}:${sourceWindow.cursor ?? "first"}`;
  const recordedRefreshState =
    sourceRefreshOutcome?.queryIdentity === queryIdentity
      ? sourceRefreshOutcome.state
      : null;
  const refreshState =
    recordedRefreshState === "failed" &&
    proposalQuery.isSuccess &&
    !sourcePosture.isRefreshing &&
    !sourcePosture.hasRefreshFailure
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
        hasMoreResults: sourceHasMoreProposalResults,
        hasPreviousResults: sourceWindow.hasEarlierWindows,
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
      sourcePosture.hasRefreshFailure,
      sourcePosture.isInitialLoading,
      sourcePosture.isPermissionBlocked,
      sourcePosture.isRefreshing,
      sourcePosture.isUnavailable,
      sourceWindow.hasEarlierWindows,
      sourceHasMoreProposalResults,
      sourceWindow.windowNumber,
    ],
  );
  usePublishProposalWorkflowContext(workflowContext);

  async function refreshAdvisoryPriorities() {
    const requestedIdentity = queryIdentity;
    setSourceRefreshOutcome({
      queryIdentity: requestedIdentity,
      state: "pending",
    });
    const result = await proposalQuery.refetch({ cancelRefetch: true });
    setSourceRefreshOutcome((currentOutcome) =>
      currentOutcome && currentOutcome.queryIdentity !== requestedIdentity
        ? currentOutcome
        : {
            queryIdentity: requestedIdentity,
            state: result.error ? "failed" : "confirmed",
          },
    );
  }

  const showRefreshAction =
    !sourcePosture.isPermissionBlocked &&
    (!sourcePosture.isInitialLoading || refreshState === "pending");
  const refreshLabel =
    sourcePosture.isUnavailable ||
    sourcePosture.hasRefreshFailure ||
    refreshState === "failed"
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
    </>
  );

  if (sourcePosture.isInitialLoading) {
    const loadingCopy = advisoryOverviewLoadingCopy(
      refreshState === "pending" ? "retrying" : "initial",
    );
    return (
      <SectionBlock
        title={ADVISORY_OVERVIEW_COPY.heading}
        subtitle={ADVISORY_OVERVIEW_COPY.subtitle}
        actions={sectionActions}
      >
        <ScreenStatePanel
          kind="loading"
          title={loadingCopy.title}
          body={loadingCopy.body}
          surface="default"
          rows={5}
        />
      </SectionBlock>
    );
  }

  if (sourcePosture.isPermissionBlocked) {
    return (
      <SectionBlock
        title={ADVISORY_OVERVIEW_COPY.heading}
        subtitle={ADVISORY_OVERVIEW_COPY.subtitle}
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
    const unavailableCopy = advisoryOverviewUnavailableCopy({
      hasPreviousWindow: sourceWindow.hasPrevious,
      retryFailed: refreshState === "failed",
    });
    return (
      <SectionBlock
        title={ADVISORY_OVERVIEW_COPY.heading}
        subtitle={ADVISORY_OVERVIEW_COPY.subtitle}
        actions={sectionActions}
      >
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <ScreenStatePanel
            kind="error"
            title={unavailableCopy.title}
            body={unavailableCopy.body}
            hint={unavailableCopy.hint}
            action={
              sourceWindow.hasPrevious ? (
                <ActionButton
                  priority="secondary"
                  onClick={sourceWindow.showPrevious}
                >
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
      title={ADVISORY_OVERVIEW_COPY.heading}
      subtitle={ADVISORY_OVERVIEW_COPY.subtitle}
      actions={sectionActions}
    >
      <div
        className={styles.workspace}
        data-testid="advisory-overview-workspace"
      >
        {sourcePosture.isRefreshing ? (
          <div className={styles.sourceNotice} role="status" aria-live="polite">
            <SemanticBadge>Refreshing</SemanticBadge>
            <Text variant="secondary">
              {ADVISORY_OVERVIEW_COPY.refreshingDetail}
            </Text>
          </div>
        ) : refreshState === "confirmed" && !sourcePosture.hasRefreshFailure ? (
          <div
            className={styles.sourceNotice}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <SemanticBadge tone="success">
              {ADVISORY_OVERVIEW_COPY.refreshConfirmedLabel}
            </SemanticBadge>
            <Text variant="secondary">
              {ADVISORY_OVERVIEW_COPY.refreshConfirmedDetail}
            </Text>
          </div>
        ) : null}
        {sourcePosture.hasRefreshFailure ? (
          <ScreenStatePanel
            kind="partial"
            title={ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY.title}
            body={ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY.body}
            hint={ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY.hint}
            surface="default"
          />
        ) : null}

        <section
          className={styles.decisionPanel}
          aria-labelledby="advisory-decision-title"
          data-testid="advisory-decision-brief"
        >
          <div>
            <Text variant="microLabel">
              {ADVISORY_OVERVIEW_COPY.decisionEyebrow}
            </Text>
            <Text
              variant="subsectionTitle"
              as="h2"
              id="advisory-decision-title"
            >
              {model.primaryDecision}
            </Text>
            <Text variant="secondary">{model.recommendedAction}</Text>
          </div>
          <SemanticBadge
            tone={model.attentionCount > 0 ? "warn" : "success"}
            emphasis="strong"
          >
            {model.attentionCount > 0
              ? `${model.attentionCount} ${model.attentionCount === 1 ? "item needs" : "items need"} action`
              : "No action in view"}
          </SemanticBadge>
        </section>

        <section
          className={styles.priorityPanel}
          aria-label="Advisory proposal priorities"
          data-testid="advisory-priority-worklist"
        >
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
                  : ADVISORY_OVERVIEW_COPY.emptyDetail
              }
              action={
                !model.hasPartialWindow ? (
                  <Link
                    className="nav-link"
                    href={buildAdvisoryJourneyHref(
                      reviewContext,
                      "proposal-builder",
                    )}
                  >
                    {ADVISORY_OVERVIEW_COPY.buildDraftAction}
                  </Link>
                ) : undefined
              }
              surface="default"
            />
          ) : (
            <WorkbenchWorklist
              ariaLabel="Advisory proposal decision worklist"
              relationshipIdBase="advisory-proposal-decision-worklist"
              eyebrow={ADVISORY_OVERVIEW_COPY.worklistEyebrow}
              title="Proposal decisions"
              description="Select a proposal to review its current business status and next permitted action."
              items={model.proposalRows.map((row) => ({
                key: row.proposalId,
                title: row.title,
                sourceEvidence: {
                  source: "proposal-list",
                  identity: row.proposalId,
                  state: row.sourceState,
                },
                status: (
                  <SemanticBadge tone={row.statusTone}>
                    {row.status}
                  </SemanticBadge>
                ),
              }))}
              selectedKey={selectedProposal?.proposalId ?? null}
              onSelectionChange={setSelectedProposalId}
              decisionLabel="Selected advisory proposal"
              decision={
                selectedProposal ? (
                  <SelectedProposalDecision proposal={selectedProposal} />
                ) : null
              }
              className={styles.decisionWorkspace}
            />
          )}

          <SourceWindowNavigation
            ariaLabel="Advisory proposal worklist navigation"
            currentWindow={sourceWindow.windowNumber}
            hasPrevious={sourceWindow.hasPrevious}
            hasNext={Boolean(proposalQuery.data?.next_cursor)}
            canNext={hasNextProposalWindow}
            isLoading={proposalQuery.isFetching}
            itemLabel="proposals"
            viewLabel="Proposal view"
            onPrevious={sourceWindow.showPrevious}
            onNext={() =>
              sourceWindow.showNext(proposalQuery.data?.next_cursor)
            }
          />
        </section>
      </div>
    </SectionBlock>
  );
}

function SelectedProposalDecision({
  proposal,
}: {
  proposal: ReturnType<
    typeof buildAdvisoryOverviewModel
  >["proposalRows"][number];
}) {
  return (
    <article
      className={styles.selectedDecision}
      data-testid="advisory-selected-decision"
    >
      <header className={styles.selectedDecisionHeader}>
        <Text variant="microLabel">Next business action</Text>
        <Text variant="subsectionTitle" as="h3">
          {proposal.nextAction}
        </Text>
      </header>
      <dl
        className={styles.decisionEvidence}
        aria-label="Selected proposal evidence"
      >
        <div>
          <dt>Proposal reference</dt>
          <dd>{proposal.proposalId}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd>{proposal.createdBy}</dd>
        </div>
        <div>
          <dt>Recorded on</dt>
          <dd>{proposal.recordedAt}</dd>
        </div>
      </dl>
      <footer className={styles.selectedDecisionFooter}>
        <Text variant="bodySmall">
          {ADVISORY_OVERVIEW_COPY.selectedProposalDetail}
        </Text>
        <ActionLink href={proposal.href} className={styles.actionLink}>
          Open proposal review
        </ActionLink>
      </footer>
    </article>
  );
}
