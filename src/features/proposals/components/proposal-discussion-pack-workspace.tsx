"use client";

import Link from "next/link";
import type { Ref } from "react";

import {
  PROPOSAL_DISCUSSION_PACK_COPY,
  PROPOSAL_DISCUSSION_PACK_STATE_COPY,
  proposalDiscussionPackRefreshCopy,
} from "@/copy/proposal-discussion-pack-copy";
import {
  AiAssistanceDisclosure,
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
  Text,
  WorkbenchRefreshStatus,
  useSourceRefreshAction,
  type SourceRefreshState,
} from "@/design-system";

import type { ProposalDiscussionPackEnvelope } from "../proposal-discussion-pack-contract";
import {
  buildProposalDiscussionPackModel,
  type ProposalDiscussionPackModel,
} from "../proposal-discussion-pack-view-model";
import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import ProposalLifecycleWorklist from "./proposal-lifecycle-worklist";
import lifecycleStyles from "./proposal-lifecycle-workspace.module.css";
import styles from "./proposal-discussion-pack-workspace.module.css";

export default function ProposalDiscussionPackWorkspace({
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
  evidence: ProposalDiscussionPackEnvelope | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isPermissionBlocked: boolean;
  hasError: boolean;
  hasRefreshFailure: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const selectionIdentity = selectedProposal?.proposalId ?? null;
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

  const model = evidence ? buildProposalDiscussionPackModel(evidence) : null;
  const requestedContext = `${selectedProposal.title} · ${selectedProposal.version}`;

  return (
    <div
      className={`${lifecycleStyles.decisionWorkspace} ${styles.workspace}`}
      data-testid="proposal-discussion-pack-workspace"
    >
      <ProposalLifecycleWorklist
        ariaLabel={PROPOSAL_DISCUSSION_PACK_COPY.worklistAriaLabel}
        rows={rows}
        selectedProposalId={selectedProposal.proposalId}
        onSelectProposal={(proposalId) => {
          resetRefresh();
          onSelectProposal(proposalId);
        }}
        defaultNextAction={PROPOSAL_DISCUSSION_PACK_COPY.defaultNextAction}
        selectedPresentation={
          model
            ? {
                label: model.status.label,
                tone: model.status.tone,
                nextAction: model.status.nextAction,
              }
            : undefined
        }
        className={styles.discussionWorklist}
        layout="grid"
      />

      <section
        className={`${lifecycleStyles.selectedProposalPane} ${styles.selectedPane}`}
        aria-label="Selected proposal conversation review"
      >
        <p
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Selected proposal: {selectedProposal.title}.{" "}
          {PROPOSAL_DISCUSSION_PACK_COPY.selectionStatus} {selectedProposal.version}.
        </p>
        <div className={lifecycleStyles.selectedProposalHeader}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_DISCUSSION_PACK_COPY.selectedRecordLabel}
            </Text>
            <Text variant="subsectionTitle" as="h3">
              {selectedProposal.title}
            </Text>
            <Text variant="metadata">
              {PROPOSAL_DISCUSSION_PACK_COPY.proposalReferenceLabel}{" "}
              {selectedProposal.proposalId}
            </Text>
          </div>
          <SemanticBadge
            tone={model?.status.tone ?? selectedProposal.stageTone}
            emphasis="strong"
          >
            {model?.status.label ?? selectedProposal.stage}
          </SemanticBadge>
        </div>

        {refreshState ? (
          <DiscussionPackRefreshStatus
            state={refreshState}
            requestedContext={requestedContext}
            confirmedContext={
              model
                ? `${model.identity.title} · ${model.identity.version}`
                : "Not confirmed"
            }
            hasConfirmedEvidence={Boolean(model)}
          />
        ) : null}

        {isPermissionBlocked ? (
          <ScreenStatePanel
            kind="permission_blocked"
            {...PROPOSAL_DISCUSSION_PACK_STATE_COPY.permissionBlocked}
          />
        ) : isLoading && !model ? (
          <ScreenStatePanel
            kind="loading"
            {...PROPOSAL_DISCUSSION_PACK_STATE_COPY.loading}
            rows={5}
          />
        ) : hasError && !model ? (
          <ScreenStatePanel
            kind="error"
            {...PROPOSAL_DISCUSSION_PACK_STATE_COPY.unavailable}
            action={
              <SourceRefreshAction
                ref={refreshActionRef}
                refreshScope={`proposal-discussion-pack:${selectedProposal.proposalId}`}
                idleLabel={PROPOSAL_DISCUSSION_PACK_COPY.retryAction}
                busyLabel={PROPOSAL_DISCUSSION_PACK_COPY.retryingAction}
                isRefreshing={isRefreshing}
                onRefresh={refresh}
              />
            }
          />
        ) : !model ? (
          <ScreenStatePanel
            kind="partial"
            {...PROPOSAL_DISCUSSION_PACK_STATE_COPY.incomplete}
            action={
              <SourceRefreshAction
                ref={refreshActionRef}
                refreshScope={`proposal-discussion-pack:${selectedProposal.proposalId}`}
                idleLabel={PROPOSAL_DISCUSSION_PACK_COPY.refreshAction}
                busyLabel={PROPOSAL_DISCUSSION_PACK_COPY.refreshingAction}
                isRefreshing={isRefreshing}
                onRefresh={refresh}
              />
            }
          />
        ) : (
          <DiscussionPackDecision
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

function DiscussionPackDecision({
  model,
  proposalHref,
  isRefreshing,
  onRefresh,
  refreshActionRef,
}: {
  model: ProposalDiscussionPackModel;
  proposalHref: string;
  isRefreshing: boolean;
  onRefresh: () => Promise<unknown>;
  refreshActionRef: Ref<HTMLButtonElement>;
}) {
  return (
    <>
      <section
        className={styles.decisionBrief}
        aria-labelledby="discussion-decision-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_DISCUSSION_PACK_COPY.decisionLabel}
            </Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="discussion-decision-title"
            >
              {model.status.title}
            </Text>
          </div>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`proposal-discussion-pack:${model.identity.proposalId}`}
            idleLabel={PROPOSAL_DISCUSSION_PACK_COPY.refreshAction}
            busyLabel={PROPOSAL_DISCUSSION_PACK_COPY.refreshingAction}
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        </div>
        <p className={styles.summary}>{model.status.summary}</p>
        <dl className={styles.identityStrip}>
          <div>
            <dt>Selected version</dt>
            <dd>{model.identity.version}</dd>
          </div>
          <div>
            <dt>Version recorded</dt>
            <dd>{model.identity.recorded}</dd>
          </div>
          <div>
            <dt>Controls confirmed</dt>
            <dd>
              {model.controls.filter(({ tone }) => tone === "success").length}{" "}
              of {model.controls.length}
            </dd>
          </div>
          <div>
            <dt>External use</dt>
            <dd>
              {model.controls.find(({ key }) => key === "release")?.status}
            </dd>
          </div>
        </dl>
        <div className={styles.nextAction}>
          <Text variant="microLabel">Next business action</Text>
          <strong>{model.status.nextAction}</strong>
        </div>
      </section>

      <section
        className={styles.controlLedger}
        aria-labelledby="conversation-controls-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_DISCUSSION_PACK_COPY.controlsLabel}
            </Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="conversation-controls-title"
            >
              {PROPOSAL_DISCUSSION_PACK_COPY.controlsTitle}
            </Text>
          </div>
          <Text variant="secondary">
            {PROPOSAL_DISCUSSION_PACK_COPY.controlsBoundary}
          </Text>
        </div>
        <ol>
          {model.controls.map((control, index) => (
            <li key={control.key}>
              <span className={styles.controlIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={styles.controlName}>
                <strong>{control.label}</strong>
                <span>{control.source}</span>
              </div>
              <p>{control.summary}</p>
              <SemanticBadge tone={control.tone}>
                {control.status}
              </SemanticBadge>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={styles.narrativeSection}
        aria-labelledby="meeting-narrative-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_DISCUSSION_PACK_COPY.narrativeLabel}
            </Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="meeting-narrative-title"
            >
              {PROPOSAL_DISCUSSION_PACK_COPY.narrativeTitle}
            </Text>
          </div>
          <SemanticBadge
            tone={model.narrative.isAvailable ? "success" : "warn"}
          >
            {model.narrative.generationLabel}
          </SemanticBadge>
        </div>
        {model.narrative.isAiAssisted ? (
          <AiAssistanceDisclosure
            disclosure={model.narrative.aiDisclosure}
          />
        ) : null}
        {model.narrative.isAvailable && model.narrative.sections.length > 0 ? (
          <div className={styles.narrativeFlow}>
            {model.narrative.sections.map((section) => (
              <article key={section.key}>
                <div>
                  <h5>{section.title}</h5>
                  <span>
                    {section.sourceCount} source{" "}
                    {section.sourceCount === 1 ? "reference" : "references"}
                  </span>
                </div>
                <p>{section.text}</p>
                {section.limitationCount > 0 ? (
                  <small>
                    {section.limitationCount} linked limitation{" "}
                    {section.limitationCount === 1 ? "applies" : "apply"}
                  </small>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <ScreenStatePanel
            kind="partial"
            {...PROPOSAL_DISCUSSION_PACK_STATE_COPY.narrativeUnavailable}
          />
        )}
      </section>

      <SupportingEvidence model={model} />

      <details className={styles.provenance}>
        <summary>{PROPOSAL_DISCUSSION_PACK_COPY.supportDetailsLabel}</summary>
        <div className={styles.provenanceBody}>
          <ul className={styles.capabilities}>
            {model.capabilities.map((capability) => (
              <li key={capability.key}>
                <div>
                  <strong>{capability.name}</strong>
                  <span>{capability.source}</span>
                </div>
                <SemanticBadge tone={capability.tone}>
                  {capability.status}
                </SemanticBadge>
              </li>
            ))}
          </ul>
          <dl className={styles.lineage}>
            <div>
              <dt>Proposal version</dt>
              <dd>{model.lineage.proposalVersionId}</dd>
            </div>
            <div>
              <dt>{PROPOSAL_DISCUSSION_PACK_COPY.supportReferenceLabel}</dt>
              <dd>{model.lineage.correlationId}</dd>
            </div>
            <div>
              <dt>{PROPOSAL_DISCUSSION_PACK_COPY.responseVersionLabel}</dt>
              <dd>{model.lineage.contractVersion}</dd>
            </div>
            <div>
              <dt>Request hash</dt>
              <dd>{model.lineage.requestHash}</dd>
            </div>
            <div>
              <dt>Artifact hash</dt>
              <dd>{model.lineage.artifactHash}</dd>
            </div>
            <div>
              <dt>Client-release boundary</dt>
              <dd>{model.support.clientReleaseExplanation}</dd>
            </div>
          </dl>
        </div>
      </details>

      <footer className={lifecycleStyles.selectedProposalActions}>
        <p>
          {PROPOSAL_DISCUSSION_PACK_COPY.footer}
        </p>
        <Link
          className={lifecycleStyles.reviewProposalLink}
          href={proposalHref}
        >
          Open full proposal review
        </Link>
      </footer>
    </>
  );
}

function SupportingEvidence({ model }: { model: ProposalDiscussionPackModel }) {
  return (
    <div className={styles.supportingGrid}>
      <section aria-labelledby="memo-evidence-title">
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_DISCUSSION_PACK_COPY.memoLabel}
            </Text>
            <Text variant="subsectionTitle" as="h4" id="memo-evidence-title">
              {PROPOSAL_DISCUSSION_PACK_COPY.memoTitle}
            </Text>
          </div>
          <SemanticBadge tone={model.memo.tone}>
            {model.memo.status}
          </SemanticBadge>
        </div>
        {model.memo.isAvailable && model.memo.sections.length > 0 ? (
          <ul className={styles.memoList}>
            {model.memo.sections.map((section) => (
              <li key={section.key}>
                <div>
                  <strong>{section.title}</strong>
                  <span>{section.owner}</span>
                </div>
                <p>{section.summary}</p>
                <SemanticBadge tone={section.tone}>
                  {section.reviewRequired ? "Review required" : section.status}
                </SemanticBadge>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyEvidence}>
            {PROPOSAL_DISCUSSION_PACK_COPY.memoUnavailable}
          </p>
        )}
      </section>

      <section aria-labelledby="exception-register-title">
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">
              {PROPOSAL_DISCUSSION_PACK_COPY.registerLabel}
            </Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="exception-register-title"
            >
              {PROPOSAL_DISCUSSION_PACK_COPY.registerTitle}
            </Text>
          </div>
          <span className={styles.exceptionCount}>
            {model.blockers.length + model.limitations.length}{" "}
            {model.blockers.length + model.limitations.length === 1
              ? "item"
              : "items"}
          </span>
        </div>
        <ul className={styles.exceptionList}>
          {model.blockers.map((blocker, index) => (
            <li key={`blocker:${index}`}>
              <strong>Client-use blocker</strong>
              <p>{blocker}</p>
            </li>
          ))}
          {model.limitations.map((limitation) => (
            <li key={limitation.key}>
              <strong>{limitation.area}</strong>
              <p>{limitation.message}</p>
            </li>
          ))}
          {model.blockers.length === 0 && model.limitations.length === 0 ? (
            <li>
              <strong>{PROPOSAL_DISCUSSION_PACK_COPY.noIssueTitle}</strong>
              <p>{PROPOSAL_DISCUSSION_PACK_COPY.noIssueBody}</p>
            </li>
          ) : null}
        </ul>
        <details className={styles.disclosures}>
          <summary>
            {model.disclosurePolicy.isSupported
              ? `${model.disclosures.length} policy ${
                  model.disclosures.length === 1 ? "disclosure" : "disclosures"
                }`
              : PROPOSAL_DISCUSSION_PACK_COPY.policyDisclosureUnavailableLabel}
          </summary>
          {model.disclosurePolicy.isSupported ? (
            <ul>
              {model.disclosures.map((disclosure) => (
                <li key={disclosure.key}>
                  <strong>
                    {disclosure.audience} · {disclosure.jurisdiction}
                  </strong>
                  <p>{disclosure.text}</p>
                  <span>
                    {disclosure.authority} · {disclosure.policyVersion}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{PROPOSAL_DISCUSSION_PACK_COPY.policyDisclosureUnavailableBody}</p>
          )}
        </details>
      </section>
    </div>
  );
}

function DiscussionPackRefreshStatus({
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
    const copy = proposalDiscussionPackRefreshCopy({
      state: "failed",
      hasConfirmedMaterial: hasConfirmedEvidence,
    });
    return (
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow={copy.eyebrow}
        title={copy.title}
        message={copy.message}
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  if (state === "pending") {
    const copy = proposalDiscussionPackRefreshCopy({
      state: "pending",
      hasConfirmedMaterial: hasConfirmedEvidence,
    });
    return (
      <WorkbenchRefreshStatus
        kind="pending"
        eyebrow={copy.eyebrow}
        title={copy.title}
        message={copy.message}
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  const copy = proposalDiscussionPackRefreshCopy({
    state: "confirmed",
    hasConfirmedMaterial: hasConfirmedEvidence,
  });
  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow={copy.eyebrow}
      title={copy.title}
      confirmedContext={confirmedContext}
    />
  );
}
