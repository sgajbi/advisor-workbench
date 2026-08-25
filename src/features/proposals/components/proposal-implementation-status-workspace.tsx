"use client";

import Link from "next/link";
import { useMemo, type Ref } from "react";

import {
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
  SupportDetails,
  Text,
  WorkbenchRefreshStatus,
  useSourceRefreshAction,
  type SourceRefreshState,
} from "@/design-system";
import { PROPOSAL_IMPLEMENTATION_COPY } from "@/copy/proposal-implementation-copy";

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
    ? `${portfolioId}:${selectedProposal.proposalId}`
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
        ariaLabel={PROPOSAL_IMPLEMENTATION_COPY.worklistAriaLabel}
        rows={rows}
        selectedProposalId={selectedProposal.proposalId}
        defaultNextAction={PROPOSAL_IMPLEMENTATION_COPY.defaultNextAction}
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
        aria-label={PROPOSAL_IMPLEMENTATION_COPY.selectedRegionAriaLabel}
      >
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Selected proposal: {selectedProposal.title}.{" "}
          {PROPOSAL_IMPLEMENTATION_COPY.selectionStatus}
        </p>
        <header className={styles.selectedProposalHeader}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_IMPLEMENTATION_COPY.selectedRecordLabel}
            </Text>
            <Text variant="subsectionTitle" as="h3">
              {selectedProposal.title}
            </Text>
            <Text variant="metadata">
              {selectedProposal.version}
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
            title={PROPOSAL_IMPLEMENTATION_COPY.missingVersion.title}
            body={PROPOSAL_IMPLEMENTATION_COPY.missingVersion.body}
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
            title={PROPOSAL_IMPLEMENTATION_COPY.restricted.title}
            body={PROPOSAL_IMPLEMENTATION_COPY.restricted.body}
            surface="default"
          />
        ) : isLoading && !model ? (
          <ScreenStatePanel
            kind="loading"
            title={PROPOSAL_IMPLEMENTATION_COPY.loading.title}
            body={PROPOSAL_IMPLEMENTATION_COPY.loading.body}
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
      title={PROPOSAL_IMPLEMENTATION_COPY.unavailable.title}
      body={PROPOSAL_IMPLEMENTATION_COPY.unavailable.body}
      action={
        <SourceRefreshAction
          ref={refreshActionRef}
          refreshScope={`${portfolioId}:${proposalId}`}
          idleLabel={PROPOSAL_IMPLEMENTATION_COPY.refresh.retryIdleLabel}
          busyLabel={PROPOSAL_IMPLEMENTATION_COPY.refresh.retryBusyLabel}
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
            <Text variant="microLabel">
              {PROPOSAL_IMPLEMENTATION_COPY.decisionLabel}
            </Text>
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
            <span>{PROPOSAL_IMPLEMENTATION_COPY.versionLabel}</span>
            <strong>
              {model.version.label} · {model.version.relatedVersion}
            </strong>
            <p className={styles.evidenceBoundary}>{model.version.summary}</p>
          </div>
          <div>
            <span>{PROPOSAL_IMPLEMENTATION_COPY.nextActionLabel}</span>
            <strong>{model.handoff.nextAction}</strong>
          </div>
        </div>
      </section>

      <SupportDetails
        className={styles.workflowEvidence}
        summary={PROPOSAL_IMPLEMENTATION_COPY.supportDetailsLabel}
        context={model.event ? "Latest event available" : "No event reported"}
      >
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
          <p>{PROPOSAL_IMPLEMENTATION_COPY.noEvent}</p>
        )}
        <dl
          className={`${styles.selectedProposalFacts} ${styles.supportFacts}`}
        >
          {model.supportDetails.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.evidenceBoundary}>{model.boundary}</p>
      </SupportDetails>

      <footer className={styles.selectedProposalActions}>
        <p>{PROPOSAL_IMPLEMENTATION_COPY.footer}</p>
        <div className={styles.selectedProposalActionControls}>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`proposal-implementation:${model.identity.proposalId}`}
            idleLabel={PROPOSAL_IMPLEMENTATION_COPY.refresh.refreshIdleLabel}
            busyLabel={PROPOSAL_IMPLEMENTATION_COPY.refresh.refreshBusyLabel}
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
          <Link className={styles.reviewProposalLink} href={proposalHref}>
            Open full proposal record
          </Link>
        </div>
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
        eyebrow={PROPOSAL_IMPLEMENTATION_COPY.refresh.failedEyebrow}
        title={PROPOSAL_IMPLEMENTATION_COPY.refresh.failedTitle}
        message={
          hasConfirmedEvidence
            ? PROPOSAL_IMPLEMENTATION_COPY.refresh.failedWithEvidence
            : PROPOSAL_IMPLEMENTATION_COPY.refresh.failedWithoutEvidence
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
        eyebrow={PROPOSAL_IMPLEMENTATION_COPY.refresh.pendingEyebrow}
        title={PROPOSAL_IMPLEMENTATION_COPY.refresh.pendingTitle}
        message={PROPOSAL_IMPLEMENTATION_COPY.refresh.pendingMessage}
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow={PROPOSAL_IMPLEMENTATION_COPY.refresh.confirmedEyebrow}
      title={PROPOSAL_IMPLEMENTATION_COPY.refresh.confirmedTitle}
      confirmedContext={confirmedContext}
    />
  );
}
