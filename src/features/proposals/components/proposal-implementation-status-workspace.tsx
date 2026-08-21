"use client";

import Link from "next/link";
import { useMemo, type Ref } from "react";

import {
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
  Text,
  WorkbenchRefreshStatus,
  useSourceRefreshAction,
  type SourceRefreshState,
} from "@/design-system";

import type { ProposalImplementationStatusEnvelope } from "../proposal-implementation-status-contract";
import {
  buildProposalImplementationStatusModel,
  type ProposalImplementationStatusModel,
} from "../proposal-implementation-status-view-model";
import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import ProposalLifecycleWorklist from "./proposal-lifecycle-worklist";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalImplementationStatusWorkspace({
  portfolioId,
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
  portfolioId: string;
  rows: ProposalLifecycleRow[];
  selectedProposal: ProposalLifecycleRow | null;
  onSelectProposal: (proposalId: string) => void;
  evidence: ProposalImplementationStatusEnvelope | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isPermissionBlocked: boolean;
  hasError: boolean;
  hasRefreshFailure: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const model = useMemo(
    () => (evidence ? buildProposalImplementationStatusModel(evidence) : null),
    [evidence],
  );
  const selectionIdentity = selectedProposal
    ? `${portfolioId}:${selectedProposal.proposalId}:${selectedProposal.versionNo ?? "unversioned"}`
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
  const refreshContext = `${selectedProposal.title} · ${selectedProposal.version}`;

  return (
    <div
      className={styles.decisionWorkspace}
      data-testid="proposal-implementation-status-workspace"
    >
      <ProposalLifecycleWorklist
        ariaLabel="Implementation follow-up proposals"
        rows={rows}
        selectedProposalId={selectedProposal.proposalId}
        defaultNextAction="Select to confirm handoff posture"
        selectedPresentation={
          model
            ? {
                label: model.handoff.label,
                tone: model.handoff.tone,
                nextAction: model.handoff.nextAction,
              }
            : undefined
        }
        onSelectProposal={(proposalId) => {
          resetRefresh();
          onSelectProposal(proposalId);
        }}
      />

      <section
        className={styles.selectedProposalPane}
        aria-label="Selected proposal implementation status"
      >
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Selected proposal: {selectedProposal.title}. Implementation evidence
          is being checked for {selectedProposal.version}.
        </p>
        <header className={styles.selectedProposalHeader}>
          <div>
            <Text variant="microLabel">
              Selected proposal · implementation follow-up
            </Text>
            <Text variant="subsectionTitle" as="h3">
              {selectedProposal.title}
            </Text>
            <Text variant="metadata">
              {selectedProposal.proposalId} · {selectedProposal.version}
            </Text>
          </div>
          <SemanticBadge tone={selectedProposal.stageTone} emphasis="strong">
            {selectedProposal.stage}
          </SemanticBadge>
        </header>

        {refreshState ? (
          <ImplementationRefreshStatus
            state={refreshState}
            requestedContext={refreshContext}
            confirmedContext={model ? refreshContext : "No confirmed evidence"}
            hasConfirmedEvidence={Boolean(model)}
          />
        ) : null}

        {selectedProposal.versionNo === null ? (
          <ScreenStatePanel
            kind="partial"
            title="Proposal version is not available"
            body="Implementation evidence cannot be correlated safely because the proposal list did not identify the selected version."
            action={
              <SourceRefreshAction
                ref={refreshActionRef}
                refreshScope={`${portfolioId}:${selectedProposal.proposalId}:version`}
                idleLabel="Recheck proposal version"
                busyLabel="Rechecking proposal version…"
                isRefreshing={isRefreshing}
                onRefresh={refresh}
              />
            }
            surface="default"
          />
        ) : isPermissionBlocked ? (
          <ScreenStatePanel
            kind="permission_blocked"
            title="Implementation evidence is restricted"
            body="Your current role cannot view this proposal's implementation handoff evidence. No execution status is inferred from lifecycle state."
            surface="default"
          />
        ) : isLoading && !model ? (
          <ScreenStatePanel
            kind="loading"
            title="Checking implementation handoff"
            body="Confirming the selected proposal's current handoff status, source references, and version correlation through Gateway."
            rows={4}
            surface="default"
          />
        ) : hasError && !model ? (
          <ImplementationUnavailable
            portfolioId={portfolioId}
            proposalId={selectedProposal.proposalId}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            refreshActionRef={refreshActionRef}
          />
        ) : !model ? (
          <ImplementationUnavailable
            portfolioId={portfolioId}
            proposalId={selectedProposal.proposalId}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            refreshActionRef={refreshActionRef}
          />
        ) : (
          <ImplementationEvidence
            model={model}
            proposalHref={selectedProposal.href}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            refreshActionRef={refreshActionRef}
          />
        )}
      </section>
    </div>
  );
}

function ImplementationUnavailable({
  portfolioId,
  proposalId,
  isRefreshing,
  onRefresh,
  refreshActionRef,
}: {
  portfolioId: string;
  proposalId: string;
  isRefreshing: boolean;
  onRefresh: () => Promise<unknown>;
  refreshActionRef: Ref<HTMLButtonElement>;
}) {
  return (
    <ScreenStatePanel
      kind="error"
      title="Implementation evidence is unavailable"
      body="The selected proposal could not be confirmed through Gateway. Do not infer handoff or execution progress from the proposal lifecycle stage."
      action={
        <SourceRefreshAction
          ref={refreshActionRef}
          refreshScope={`${portfolioId}:${proposalId}`}
          idleLabel="Retry implementation evidence"
          busyLabel="Retrying implementation evidence…"
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      }
      surface="default"
    />
  );
}

function ImplementationEvidence({
  model,
  proposalHref,
  isRefreshing,
  onRefresh,
  refreshActionRef,
}: {
  model: ProposalImplementationStatusModel;
  proposalHref: string;
  isRefreshing: boolean;
  onRefresh: () => Promise<unknown>;
  refreshActionRef: Ref<HTMLButtonElement>;
}) {
  return (
    <>
      {model.evidence.isPartial ? (
        <ScreenStatePanel
          kind="partial"
          title={model.evidence.label}
          body={model.evidence.summary}
          surface="default"
        />
      ) : null}

      <section
        className={styles.approvalDecisionBrief}
        aria-labelledby="implementation-decision-title"
      >
        <div className={styles.approvalDecisionHeading}>
          <div>
            <Text variant="microLabel">Source handoff posture</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="implementation-decision-title"
            >
              {model.handoff.label}
            </Text>
          </div>
          <SemanticBadge tone={model.handoff.tone} emphasis="strong">
            {model.handoff.attentionRequired
              ? "Review required"
              : model.evidence.label}
          </SemanticBadge>
        </div>
        <p className={styles.approvalSummary}>{model.handoff.summary}</p>
        <dl className={styles.selectedProposalFacts}>
          {model.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.selectedProposalDecision}>
          <div>
            <span>Version evidence</span>
            <strong>
              {model.version.label} · {model.version.relatedVersion}
            </strong>
            <p className={styles.evidenceBoundary}>{model.version.summary}</p>
          </div>
          <div>
            <span>Next business action</span>
            <strong>{model.handoff.nextAction}</strong>
          </div>
        </div>
      </section>

      <section
        className={styles.approvalRegister}
        aria-labelledby="implementation-lineage-title"
      >
        <div className={styles.approvalSectionHeading}>
          <div>
            <Text variant="microLabel">Operational evidence</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="implementation-lineage-title"
            >
              Handoff source and currentness
            </Text>
          </div>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`proposal-implementation:${model.identity.proposalId}`}
            idleLabel="Refresh implementation evidence"
            busyLabel="Refreshing implementation evidence…"
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        </div>
        <dl className={styles.selectedProposalFacts}>
          <div>
            <dt>Observed</dt>
            <dd>{model.lineage.freshness}</dd>
          </div>
          <div>
            <dt>Observation basis</dt>
            <dd>{model.lineage.freshnessBasis}</dd>
          </div>
          <div>
            <dt>Evidence route</dt>
            <dd>{model.lineage.source}</dd>
          </div>
          <div>
            <dt>Proposal version</dt>
            <dd>{model.identity.currentVersion}</dd>
          </div>
        </dl>
      </section>

      <details className={styles.workflowEvidence}>
        <summary>
          Source event and evidence boundary
          <span>
            {model.event ? "Latest event available" : "No event reported"}
          </span>
        </summary>
        {model.event ? (
          <ol>
            <li>
              <div>
                <strong>{model.event.type}</strong>
                <span>{model.event.eventId}</span>
              </div>
              <div>
                <span>{model.event.actor}</span>
                <span>{model.event.occurredAt}</span>
              </div>
            </li>
          </ol>
        ) : (
          <p>No implementation event has been reported for this proposal.</p>
        )}
        <p className={styles.evidenceBoundary}>{model.boundary}</p>
        <p className={styles.evidenceBoundary}>
          Evidence correlation: {model.lineage.correlationId}
        </p>
      </details>

      <footer className={styles.selectedProposalActions}>
        <p>
          This workspace is read-only. Proposal decisions and governed handoff
          actions remain in the full proposal record.
        </p>
        <Link className={styles.reviewProposalLink} href={proposalHref}>
          Open full proposal record
        </Link>
      </footer>
    </>
  );
}

function ImplementationRefreshStatus({
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
        eyebrow="Implementation evidence not updated"
        title="Source refresh failed"
        message={
          hasConfirmedEvidence
            ? "Previously confirmed handoff evidence remains visible and is not relabelled as current."
            : "No source-confirmed implementation evidence is available."
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
        eyebrow="Updating implementation evidence"
        title="Reconfirming selected proposal"
        message="Gateway is refreshing the worklist and selected proposal handoff evidence."
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow="Implementation evidence updated"
      title="Selected proposal handoff confirmed"
      confirmedContext={confirmedContext}
    />
  );
}
