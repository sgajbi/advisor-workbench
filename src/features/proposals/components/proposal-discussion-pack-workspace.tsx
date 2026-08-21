"use client";

import Link from "next/link";
import type { Ref } from "react";

import {
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
      className={lifecycleStyles.decisionWorkspace}
      data-testid="proposal-discussion-pack-workspace"
    >
      <ProposalLifecycleWorklist
        ariaLabel="Discussion Pack Review proposals"
        rows={rows}
        selectedProposalId={selectedProposal.proposalId}
        onSelectProposal={(proposalId) => {
          resetRefresh();
          onSelectProposal(proposalId);
        }}
        defaultNextAction="Confirm advisor-use material and every client boundary."
        selectedPresentation={
          model
            ? {
                label: model.posture.label,
                tone: model.posture.tone,
                nextAction: model.posture.nextAction,
              }
            : undefined
        }
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
          Selected proposal: {selectedProposal.title}. Conversation evidence is
          being checked for {selectedProposal.version}.
        </p>
        <div className={lifecycleStyles.selectedProposalHeader}>
          <div>
            <Text variant="microLabel">Selected conversation record</Text>
            <Text variant="subsectionTitle" as="h3">
              {selectedProposal.title}
            </Text>
            <Text variant="metadata">{selectedProposal.proposalId}</Text>
          </div>
          <SemanticBadge
            tone={model?.posture.tone ?? selectedProposal.stageTone}
            emphasis="strong"
          >
            {model?.posture.label ?? selectedProposal.stage}
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
            title="Conversation evidence is restricted"
            body="Your current role cannot view the selected narrative, memo, report-package, consent, or release evidence. No discussion posture is inferred."
          />
        ) : isLoading && !model ? (
          <ScreenStatePanel
            kind="loading"
            title="Checking conversation evidence"
            body="Retrieving the selected proposal's source-backed advisor material and client-control boundaries through Gateway."
            rows={5}
          />
        ) : hasError && !model ? (
          <ScreenStatePanel
            kind="error"
            title="Conversation evidence is unavailable"
            body="Gateway could not confirm the selected proposal's narrative, memo, package, consent, and release boundaries. Lifecycle stage alone is not shown as meeting readiness."
            action={
              <SourceRefreshAction
                ref={refreshActionRef}
                refreshScope={`proposal-discussion-pack:${selectedProposal.proposalId}`}
                idleLabel="Retry conversation evidence"
                busyLabel="Retrying conversation evidence…"
                isRefreshing={isRefreshing}
                onRefresh={refresh}
              />
            }
          />
        ) : !model ? (
          <ScreenStatePanel
            kind="partial"
            title="Conversation evidence is incomplete"
            body="Gateway did not return one request-bound evidence set for the selected proposal version. Refresh before relying on this material."
            action={
              <SourceRefreshAction
                ref={refreshActionRef}
                refreshScope={`proposal-discussion-pack:${selectedProposal.proposalId}`}
                idleLabel="Refresh conversation evidence"
                busyLabel="Refreshing conversation evidence…"
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
            <Text variant="microLabel">Conversation decision</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="discussion-decision-title"
            >
              {model.posture.title}
            </Text>
          </div>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`proposal-discussion-pack:${model.identity.proposalId}`}
            idleLabel="Refresh evidence"
            busyLabel="Refreshing evidence…"
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        </div>
        <p className={styles.summary}>{model.posture.summary}</p>
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
          <strong>{model.posture.nextAction}</strong>
        </div>
      </section>

      <section
        className={styles.controlLedger}
        aria-labelledby="conversation-controls-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">Independent controls</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="conversation-controls-title"
            >
              Conversation control ledger
            </Text>
          </div>
          <Text variant="secondary">
            Advisor use is not client-release authority.
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
            <Text variant="microLabel">Meeting preparation</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="meeting-narrative-title"
            >
              Advisor conversation narrative
            </Text>
          </div>
          <SemanticBadge
            tone={model.narrative.isAvailable ? "success" : "warn"}
          >
            {model.narrative.generationLabel}
          </SemanticBadge>
        </div>
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
            title="Advisor narrative is not confirmed"
            body="No source-backed conversation narrative is available for the selected version. Do not substitute lifecycle stage or an earlier-version narrative."
          />
        )}
      </section>

      <SupportingEvidence model={model} />

      <details className={styles.provenance}>
        <summary>Evidence capability and lineage</summary>
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
              <dt>Gateway correlation</dt>
              <dd>{model.lineage.correlationId}</dd>
            </div>
            <div>
              <dt>Response contract</dt>
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
          </dl>
        </div>
      </details>

      <footer className={lifecycleStyles.selectedProposalActions}>
        <p>
          Review and workflow actions remain in the governed full proposal
          record. This workspace does not publish, deliver, or contact the
          client.
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
            <Text variant="microLabel">Decision record</Text>
            <Text variant="subsectionTitle" as="h4" id="memo-evidence-title">
              Advisor memo
            </Text>
          </div>
          <SemanticBadge tone={model.memo.isAvailable ? "success" : "warn"}>
            {model.memo.status}
          </SemanticBadge>
        </div>
        {model.memo.sections.length > 0 ? (
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
            No source-backed memo sections are available.
          </p>
        )}
      </section>

      <section aria-labelledby="exception-register-title">
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">External-use controls</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="exception-register-title"
            >
              Disclosure and limitation register
            </Text>
          </div>
          <span className={styles.exceptionCount}>
            {model.blockers.length + model.limitations.length} exceptions
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
              <strong>No source exception reported</strong>
              <p>
                Client release remains governed separately even when this
                register is empty.
              </p>
            </li>
          ) : null}
        </ul>
        <details className={styles.disclosures}>
          <summary>
            {model.disclosures.length} policy{" "}
            {model.disclosures.length === 1 ? "disclosure" : "disclosures"}
          </summary>
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
    return (
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow="Conversation evidence not updated"
        title="Source refresh failed"
        message={
          hasConfirmedEvidence
            ? "Previously confirmed evidence remains visible and is not relabelled as current."
            : "No source-confirmed conversation evidence is available."
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
        eyebrow="Updating conversation evidence"
        title="Reconfirming the selected proposal"
        message="Gateway is refreshing narrative, memo, report-package, consent, and release-boundary evidence."
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }
  return (
    <WorkbenchRefreshStatus
      kind="confirmed"
      eyebrow="Conversation evidence updated"
      title="Selected proposal evidence confirmed"
      confirmedContext={confirmedContext}
    />
  );
}
