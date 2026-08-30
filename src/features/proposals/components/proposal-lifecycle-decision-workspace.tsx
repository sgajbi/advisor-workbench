"use client";

import Link from "next/link";
import type { Ref } from "react";

import {
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
  Text,
  WorkbenchWorklist,
  WorkbenchRefreshStatus,
  useSourceRefreshAction,
  type SourceRefreshState,
} from "@/design-system";

import type { ProposalApprovalEvidenceModel } from "../proposal-approval-evidence-view-model";
import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import { buildProposalLifecycleWorklistItems } from "./proposal-lifecycle-worklist";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalLifecycleDecisionWorkspace({
  rows,
  selectedProposal,
  onSelectProposal,
  evidence,
  isLoading,
  isRefreshing,
  isPermissionBlocked,
  hasError,
  hasRefreshFailure,
  onRefresh,
}: {
  rows: ProposalLifecycleRow[];
  selectedProposal: ProposalLifecycleRow | null;
  onSelectProposal: (proposalId: string) => void;
  evidence: ProposalApprovalEvidenceModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isPermissionBlocked: boolean;
  hasError: boolean;
  hasRefreshFailure: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const selectionIdentity = selectedProposal
    ? selectedProposal.proposalId
    : null;
  const {
    actionRef: refreshActionRef,
    refresh,
    refreshState,
    reset: resetRefresh,
  } = useSourceRefreshAction({
    identity: selectionIdentity,
    isRefreshing,
    hasRefreshFailure,
    onRefresh,
  });

  if (!selectedProposal) return null;

  const contextLabel = `${selectedProposal.title} · ${selectedProposal.version}`;

  return (
    <div data-testid="proposal-approval-decision-workspace">
      <WorkbenchWorklist
        ariaLabel="Approval Queue proposals"
        relationshipIdBase="proposal-approval-queue"
        eyebrow="Review worklist"
        title="Proposals in this view"
        description="Use arrow keys to move between proposals. Press Enter to review source evidence and Escape to return."
        items={buildProposalLifecycleWorklistItems({
          rows,
          selectedProposalId: selectedProposal.proposalId,
        })}
        selectedKey={selectedProposal.proposalId}
        onSelectionChange={(proposalId) => {
          resetRefresh();
          onSelectProposal(proposalId);
        }}
        decisionLabel="Selected proposal decision"
        decisionClassName={styles.selectedProposalPane}
        decision={
          <>
            <p
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Selected proposal: {selectedProposal.title}. Source evidence is
              being checked for {selectedProposal.version}.
            </p>
            <div className={styles.selectedProposalHeader}>
              <div>
                <Text variant="microLabel">Selected proposal</Text>
                <Text variant="subsectionTitle" as="h3">
                  {selectedProposal.title}
                </Text>
                <Text variant="metadata">{selectedProposal.proposalId}</Text>
              </div>
              <SemanticBadge
                tone={selectedProposal.stageTone}
                emphasis="strong"
              >
                {selectedProposal.stage}
              </SemanticBadge>
            </div>

            {refreshState ? (
              <ApprovalEvidenceRefreshStatus
                state={refreshState}
                requestedContext={contextLabel}
                confirmedContext={evidence ? contextLabel : "Not confirmed"}
                hasConfirmedEvidence={Boolean(evidence)}
              />
            ) : null}

            {isPermissionBlocked ? (
              <ScreenStatePanel
                kind="permission_blocked"
                title="Approval evidence is restricted"
                body="Your current role cannot view the selected proposal's approval, workflow, or lineage evidence. No maker-checker posture is inferred."
                surface="default"
              />
            ) : isLoading && !evidence ? (
              <ScreenStatePanel
                kind="loading"
                title="Checking maker-checker evidence"
                body="Retrieving the selected proposal's current detail, workflow, approval register, and active-version lineage through Gateway."
                rows={4}
                surface="default"
              />
            ) : hasError && !evidence ? (
              <ScreenStatePanel
                kind="error"
                title="Approval evidence is unavailable"
                body="The selected proposal's source evidence could not be confirmed. Lifecycle state alone is not shown as maker-checker readiness."
                action={
                  <SourceRefreshAction
                    ref={refreshActionRef}
                    refreshScope={`proposal-approval:${selectedProposal.proposalId}`}
                    idleLabel="Retry approval evidence"
                    busyLabel="Retrying approval evidence…"
                    isRefreshing={isRefreshing}
                    onRefresh={refresh}
                  />
                }
                surface="default"
              />
            ) : !evidence ? (
              <ScreenStatePanel
                kind="error"
                title="Approval evidence is incomplete"
                body="Gateway did not return one complete selected-proposal evidence set. Refresh before relying on this review."
                action={
                  <SourceRefreshAction
                    ref={refreshActionRef}
                    refreshScope={`proposal-approval:${selectedProposal.proposalId}`}
                    idleLabel="Refresh approval evidence"
                    busyLabel="Refreshing approval evidence…"
                    isRefreshing={isRefreshing}
                    onRefresh={refresh}
                  />
                }
                surface="default"
              />
            ) : evidence.agreement.issue ? (
              <div className={styles.approvalEvidenceConflict}>
                <ScreenStatePanel
                  kind="error"
                  title={evidence.posture.title}
                  body={evidence.posture.summary}
                  action={
                    <SourceRefreshAction
                      ref={refreshActionRef}
                      refreshScope={`proposal-approval:${selectedProposal.proposalId}`}
                      idleLabel="Recheck source evidence"
                      busyLabel="Rechecking source evidence…"
                      isRefreshing={isRefreshing}
                      onRefresh={refresh}
                    />
                  }
                  surface="default"
                />
                <p className={styles.evidenceBoundary}>
                  Approval records remain hidden while proposal identity,
                  workflow state, and active-version lineage do not agree.
                </p>
              </div>
            ) : (
              <ApprovalEvidenceDecision
                evidence={evidence}
                proposalHref={selectedProposal.href}
                isRefreshing={isRefreshing}
                onRefresh={refresh}
                refreshActionRef={refreshActionRef}
              />
            )}
          </>
        }
      />
    </div>
  );
}

function ApprovalEvidenceDecision({
  evidence,
  proposalHref,
  isRefreshing,
  onRefresh,
  refreshActionRef,
}: {
  evidence: ProposalApprovalEvidenceModel;
  proposalHref: string;
  isRefreshing: boolean;
  onRefresh: () => Promise<unknown>;
  refreshActionRef: Ref<HTMLButtonElement>;
}) {
  return (
    <>
      <section
        className={styles.approvalDecisionBrief}
        aria-labelledby="approval-decision-brief-title"
      >
        <div className={styles.approvalDecisionHeading}>
          <div>
            <Text variant="microLabel">Maker-checker evidence</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="approval-decision-brief-title"
            >
              {evidence.posture.title}
            </Text>
          </div>
          <SemanticBadge tone={evidence.posture.tone} emphasis="strong">
            {evidence.posture.label}
          </SemanticBadge>
        </div>
        <p className={styles.approvalSummary}>{evidence.posture.summary}</p>
        <dl className={styles.selectedProposalFacts}>
          <div>
            <dt>Current stage</dt>
            <dd>{evidence.workflow.currentStage}</dd>
          </div>
          <div>
            <dt>Active version</dt>
            <dd>{evidence.identity.version}</dd>
          </div>
          <div>
            <dt>Approval records</dt>
            <dd>{evidence.approvals.count}</dd>
          </div>
          <div>
            <dt>Workflow events</dt>
            <dd>{evidence.workflow.eventCount}</dd>
          </div>
        </dl>
        <div className={styles.approvalNextAction}>
          <Text variant="microLabel">Next business action</Text>
          <strong>{evidence.posture.nextAction}</strong>
        </div>
      </section>

      <section
        className={styles.approvalRegister}
        aria-labelledby="approval-register-title"
      >
        <div className={styles.approvalSectionHeading}>
          <div>
            <Text variant="microLabel">Source register</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="approval-register-title"
            >
              Recorded approval decisions
            </Text>
          </div>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`proposal-approval:${evidence.identity.proposalId}`}
            idleLabel="Refresh evidence"
            busyLabel="Refreshing evidence…"
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        </div>
        {evidence.approvals.records.length > 0 ? (
          <ul className={styles.approvalRecords}>
            {evidence.approvals.records.map((record) => (
              <li key={record.id}>
                <div>
                  <strong>{record.type}</strong>
                  <span>{record.actor}</span>
                </div>
                <div>
                  <SemanticBadge tone={record.tone}>
                    {record.decision}
                  </SemanticBadge>
                  <span>{record.recorded}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.approvalEmpty}>
            No approval records were returned for this proposal. Required
            approvals must be confirmed in the full proposal record.
          </p>
        )}
      </section>

      <details className={styles.workflowEvidence}>
        <summary>
          Workflow evidence
          <span>
            {evidence.workflow.eventCount} source{" "}
            {evidence.workflow.eventCount === 1 ? "event" : "events"}
          </span>
        </summary>
        {evidence.workflow.recentEvents.length > 0 ? (
          <ol>
            {evidence.workflow.recentEvents.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>{event.event}</strong>
                  <span>{event.transition}</span>
                </div>
                <div>
                  <span>{event.actor}</span>
                  <span>{event.recorded}</span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p>No workflow events were returned for this proposal.</p>
        )}
        <p className={styles.evidenceBoundary}>
          Active version {evidence.lineage.activeVersion} is confirmed across{" "}
          {evidence.lineage.versionCount} lineage{" "}
          {evidence.lineage.versionCount === 1 ? "record" : "records"}.
        </p>
      </details>

      <footer className={styles.selectedProposalActions}>
        <p>
          The queue is evidence-only. Approval and lifecycle actions remain in
          the governed full proposal record.
        </p>
        <Link className={styles.reviewProposalLink} href={proposalHref}>
          Open full proposal review
        </Link>
      </footer>
    </>
  );
}

function ApprovalEvidenceRefreshStatus({
  state,
  requestedContext,
  confirmedContext,
  hasConfirmedEvidence,
}: {
  state: SourceRefreshState;
  requestedContext: string;
  confirmedContext: string;
  hasConfirmedEvidence: boolean;
}) {
  if (state === "failed") {
    return (
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow="Approval evidence not updated"
        title="Source refresh failed"
        message={
          hasConfirmedEvidence
            ? "Previously confirmed evidence remains visible and is not relabelled as current."
            : "No source-confirmed maker-checker evidence is available."
        }
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  if (state === "pending") {
    return (
      <WorkbenchRefreshStatus
        kind="pending"
        eyebrow="Updating approval evidence"
        title="Reconfirming selected proposal"
        message="Gateway is refreshing detail, workflow, approvals, and active-version lineage for this proposal."
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow="Approval evidence updated"
      title="Selected proposal evidence confirmed"
      confirmedContext={confirmedContext}
    />
  );
}
