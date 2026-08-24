"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";

import {
  ActionButton,
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
  Text,
  WorkbenchDecisionWorkspace,
  WorkbenchRecordSelector,
  WorkbenchRefreshStatus,
  useSourceRefreshAction,
  type SourceRefreshState,
} from "@/design-system";

import {
  buildPolicyEvaluationEvidenceModel,
  buildPolicyReviewQueueEmptyPresentation,
  buildPolicyReviewQueueModel,
} from "../proposal-policy-review-view-model";
import { SUITABILITY_WORKFLOW_LABELS } from "../suitability-terminology";
import styles from "./policy-review-workspace.module.css";

export default function PolicyReviewWorkspace({
  portfolioId,
  isLoading,
  isRefreshing,
  isPermissionBlocked,
  hasError,
  hasRefreshFailure,
  model,
  selectedEvaluationId,
  onSelectEvaluation,
  evidenceModel,
  evidenceLoading,
  evidenceRefreshing,
  evidencePermissionBlocked,
  evidenceError,
  evidenceRefreshFailure,
  reviewRequestPending,
  reviewRequestSucceeded,
  reviewRequestFailed,
  onRefresh,
  onRequestMoreEvidence,
}: {
  portfolioId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isPermissionBlocked: boolean;
  hasError: boolean;
  hasRefreshFailure: boolean;
  model: ReturnType<typeof buildPolicyReviewQueueModel>;
  selectedEvaluationId: string | null;
  onSelectEvaluation: (evaluationId: string) => void;
  evidenceModel: ReturnType<typeof buildPolicyEvaluationEvidenceModel>;
  evidenceLoading: boolean;
  evidenceRefreshing: boolean;
  evidencePermissionBlocked: boolean;
  evidenceError: boolean;
  evidenceRefreshFailure: boolean;
  reviewRequestPending: boolean;
  reviewRequestSucceeded: boolean;
  reviewRequestFailed: boolean;
  onRefresh: () => Promise<unknown>;
  onRequestMoreEvidence: () => void;
}) {
  const selectedReview =
    model.rows.find((row) => row.evaluationId === selectedEvaluationId) ?? null;
  const refreshIdentity = selectedReview
    ? `${portfolioId}:${selectedReview.evaluationId}`
    : `${portfolioId}:worklist`;
  const {
    actionRef: refreshActionRef,
    refresh,
    refreshState,
    reset: resetRefresh,
  } = useSourceRefreshAction({
    identity: refreshIdentity,
    isRefreshing: isRefreshing || evidenceRefreshing,
    hasRefreshFailure: hasRefreshFailure || evidenceRefreshFailure,
    onRefresh,
  });
  const emptyPresentation = buildPolicyReviewQueueEmptyPresentation({
    portfolioId,
    rowCount: model.rows.length,
    isRefreshing,
    hasRefreshFailure,
  });

  if (isLoading) {
    return (
      <ScreenStatePanel
        kind="loading"
        title="Loading suitability reviews"
        body="Retrieving the suitability evaluations that require adviser review for this portfolio."
        rows={5}
        surface="default"
      />
    );
  }

  if (isPermissionBlocked) {
    return (
      <ScreenStatePanel
        kind="permission_blocked"
        title="Suitability review access is unavailable"
        body="Your current role does not permit this portfolio's suitability review queue to be viewed."
        surface="default"
      />
    );
  }

  if (hasError) {
    return (
      <ScreenStatePanel
        kind="error"
        title="Suitability review worklist is unavailable"
        body="Suitability evaluations could not be confirmed through the approved advisory workflow. No fallback reviews are shown."
        action={
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`suitability:${portfolioId}:worklist`}
            idleLabel="Retry suitability worklist"
            busyLabel="Retrying suitability worklist…"
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />
        }
        surface="default"
      />
    );
  }

  if (emptyPresentation) {
    return (
      <ScreenStatePanel
        kind={emptyPresentation.kind}
        title={emptyPresentation.title}
        body={emptyPresentation.body}
        action={
          emptyPresentation.kind === "partial" ? (
            <SourceRefreshAction
              ref={refreshActionRef}
              refreshScope={`suitability:${portfolioId}:empty-worklist`}
              idleLabel="Retry suitability worklist"
              busyLabel="Retrying suitability worklist…"
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
          ) : undefined
        }
        surface="default"
      />
    );
  }

  return (
    <div className={styles.policyReviewPanel}>
      <div className={styles.policyReviewHeader}>
        <div>
          <Text variant="microLabel">{SUITABILITY_WORKFLOW_LABELS.review}</Text>
          <Text variant="subsectionTitle" as="h3">
            {SUITABILITY_WORKFLOW_LABELS.adviserDecisionWorklist}
          </Text>
          <Text variant="secondary">
            One source-backed queue for suitability evidence, control gaps and
            the next review step.
          </Text>
        </div>
        <div
          className={styles.policyReviewCounts}
          aria-label={SUITABILITY_WORKFLOW_LABELS.reviewCounts}
        >
          <div>
            <span>{model.totalCount}</span>
            <strong>In review</strong>
          </div>
          <div>
            <span>{model.actionCount}</span>
            <strong>{SUITABILITY_WORKFLOW_LABELS.needsAction}</strong>
          </div>
        </div>
      </div>

      {refreshState ? (
        <SuitabilityRefreshStatus
          state={refreshState}
          requestedContext={
            selectedReview
              ? `${selectedReview.proposalId} · ${selectedReview.proposalVersion}`
              : portfolioId
          }
          confirmedContext={
            evidenceModel?.sourceIdentityAligned && selectedReview
              ? `${selectedReview.proposalId} · ${selectedReview.proposalVersion}`
              : "Not confirmed"
          }
          onRetry={() => void refresh()}
          retrying={isRefreshing || evidenceRefreshing}
        />
      ) : null}

      <WorkbenchDecisionWorkspace
        ariaLabel="Selected suitability review"
        className={styles.policyReviewWorkspace}
        worklistClassName={styles.policyWorklist}
        decisionClassName={styles.policyDetail}
        worklist={
          <section aria-labelledby="policy-review-worklist-title">
            <div className={styles.policyPaneHeader}>
              <div>
                <Text variant="microLabel">Priority worklist</Text>
                <Text variant="body" as="h4" id="policy-review-worklist-title">
                  {SUITABILITY_WORKFLOW_LABELS.chooseReview}
                </Text>
              </div>
              <SourceRefreshAction
                ref={refreshActionRef}
                refreshScope={`suitability:${refreshIdentity}`}
                idleLabel="Refresh source evidence"
                busyLabel="Refreshing source evidence…"
                isRefreshing={isRefreshing || evidenceRefreshing}
                onRefresh={refresh}
                priority="quiet"
              />
            </div>
            <WorkbenchRecordSelector
              ariaLabel={SUITABILITY_WORKFLOW_LABELS.reviews}
              className={styles.policyWorklistSelector}
              selectedKey={selectedEvaluationId}
              onSelectionChange={(evaluationId) => {
                resetRefresh();
                onSelectEvaluation(evaluationId);
              }}
              items={model.rows.map((row) => ({
                key: row.evaluationId,
                title: row.proposalId,
                subtitle: `${row.proposalVersion} · ${row.policyPack}`,
                status: (
                  <SemanticBadge tone={row.policyStatusTone}>
                    {row.policyStatus}
                  </SemanticBadge>
                ),
                facts: [
                  { label: "Sign-off", value: row.signOffStatus },
                  { label: "Requirements", value: row.openRequirements },
                  { label: "Evidence", value: row.evidencePosture },
                ],
                nextAction: row.nextAction,
              }))}
            />
          </section>
        }
        decision={
          <PolicyEvaluationEvidenceSection
            isLoading={evidenceLoading}
            isRefreshing={evidenceRefreshing}
            isPermissionBlocked={evidencePermissionBlocked}
            hasError={evidenceError}
            hasRefreshFailure={evidenceRefreshFailure}
            model={evidenceModel}
            reviewRequestPending={reviewRequestPending}
            reviewRequestSucceeded={reviewRequestSucceeded}
            reviewRequestFailed={reviewRequestFailed}
            proposalHref={selectedReview?.href ?? null}
            onRefresh={refresh}
            refreshActionRef={refreshActionRef}
            onRequestMoreEvidence={onRequestMoreEvidence}
          />
        }
      />
    </div>
  );
}

function PolicyEvaluationEvidenceSection({
  isLoading,
  isRefreshing,
  isPermissionBlocked,
  hasError,
  hasRefreshFailure,
  model,
  reviewRequestPending,
  reviewRequestSucceeded,
  reviewRequestFailed,
  proposalHref,
  onRefresh,
  refreshActionRef,
  onRequestMoreEvidence,
}: {
  isLoading: boolean;
  isRefreshing: boolean;
  isPermissionBlocked: boolean;
  hasError: boolean;
  hasRefreshFailure: boolean;
  model: ReturnType<typeof buildPolicyEvaluationEvidenceModel>;
  reviewRequestPending: boolean;
  reviewRequestSucceeded: boolean;
  reviewRequestFailed: boolean;
  proposalHref: string | null;
  onRefresh: () => Promise<unknown>;
  refreshActionRef: Ref<HTMLButtonElement>;
  onRequestMoreEvidence: () => void;
}) {
  if (isLoading) {
    return (
      <ScreenStatePanel
        kind="loading"
        title="Checking selected suitability evidence"
        body="Confirming the evaluation, sign-off package and workflow identity through Gateway."
        rows={5}
        surface="default"
      />
    );
  }

  if (isPermissionBlocked) {
    return (
      <ScreenStatePanel
        kind="permission_blocked"
        title="Suitability evidence access is unavailable"
        body="Your current role does not permit the selected suitability evidence to be viewed."
        surface="default"
      />
    );
  }

  if (hasError) {
    return (
      <ScreenStatePanel
        kind="error"
        title="Suitability evidence is unavailable"
        body="Suitability evaluation detail and sign-off package posture could not be loaded from the approved advisory workflow."
        action={
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope="suitability:selected-evidence"
            idleLabel="Retry selected evidence"
            busyLabel="Retrying selected evidence…"
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }
        surface="default"
      />
    );
  }

  if (!model) return null;

  if (!model.sourceIdentityAligned) {
    return (
      <ScreenStatePanel
        kind="partial"
        title="Selected suitability evidence is unconfirmed"
        body="The selected proposal and its supporting policy evidence do not agree. No review request is available until the source package is refreshed."
        action={
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope="suitability:identity-check"
            idleLabel="Recheck suitability evidence"
            busyLabel="Rechecking suitability evidence…"
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }
        surface="default"
      />
    );
  }

  return (
    <div className={styles.policyEvidencePanel}>
      <div className={styles.policyEvidenceHeader}>
        <div>
          <Text variant="microLabel">{SUITABILITY_WORKFLOW_LABELS.selectedReview}</Text>
          <Text variant="subsectionTitle" as="h4">
            {model.proposalId}
          </Text>
          <Text variant="secondary">
            {model.proposalVersion} · {model.policyPack}
          </Text>
        </div>
        {proposalHref ? (
          <Link href={proposalHref}>Open full proposal</Link>
        ) : null}
      </div>
      {hasRefreshFailure ? (
        <div className={styles.refreshException} role="alert">
          <div>
            <Text variant="microLabel">Source exception</Text>
            <Text variant="body">
              The prior evidence remains visible but is not confirmed current.
            </Text>
          </div>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={`suitability:${model.evaluationId}:retry`}
            idleLabel="Retry evidence refresh"
            busyLabel="Retrying evidence refresh…"
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        </div>
      ) : null}
      <div className={styles.policyDecisionBrief}>
        <div>
          <Text variant="microLabel">Required next step</Text>
          <Text variant="subsectionTitle" as="h5">
            {model.nextAction}
          </Text>
        </div>
        <SemanticBadge tone={model.policyStatusTone}>
          {model.policyStatus}
        </SemanticBadge>
      </div>
      <div className={styles.policyEvidenceGrid}>
        <EvidenceMetric label="Source evidence">
          {model.sourcePosture}
        </EvidenceMetric>
        <EvidenceMetric label="Blocking rules">
          {model.blockingRuleCount} blocking
        </EvidenceMetric>
        <EvidenceMetric label="Sign-off package">
          {model.signOffPackagePosture}
        </EvidenceMetric>
        <EvidenceMetric label={SUITABILITY_WORKFLOW_LABELS.reviewDeadline}>
          {model.slaPosture}
        </EvidenceMetric>
      </div>
      <div className={styles.policyControlGrid}>
        <EvidenceMetric label="Workflow status">
          <SemanticBadge tone={model.workflowTone}>
            {model.workflowStatus}
          </SemanticBadge>
        </EvidenceMetric>
        <EvidenceMetric label="Maker-checker">
          {model.makerCheckerPosture}
        </EvidenceMetric>
        <EvidenceMetric label="Client publication">
          {model.clientPublicationPosture}
        </EvidenceMetric>
        <EvidenceMetric label="Rule results">
          {model.ruleCount} reviewed
        </EvidenceMetric>
      </div>
      <details className={styles.policyEvidenceDisclosure}>
        <summary>
          <span>
            <Text variant="microLabel">Supporting evidence</Text>
            <Text variant="body">
              Dependencies, source references and outstanding gaps
            </Text>
          </span>
          <span>Show detail</span>
        </summary>
        <div className={styles.policyEvidenceColumns}>
          <EvidenceList
            title="Approval dependencies"
            values={model.approvalDependencies}
          />
          <EvidenceList
            title="Disclosure reviews"
            values={model.disclosureRequirements}
          />
          <EvidenceList
            title="Client consent evidence"
            values={model.consentRequirements}
          />
          <EvidenceList
            title="Sign-off blockers"
            values={model.workflowBlockers}
          />
          <EvidenceList title="Source references" values={model.sourceRefs} />
          <EvidenceList title="Source gaps" values={model.sourceGaps} />
        </div>
      </details>
      <div className={styles.policyEvidenceActions}>
        <ActionButton
          priority="primary"
          onClick={onRequestMoreEvidence}
          disabled={
            reviewRequestPending ||
            !model.sourceIdentityAligned ||
            !model.sourceEvaluationHash
          }
        >
          {reviewRequestPending
            ? "Recording request..."
            : "Request more evidence"}
        </ActionButton>
        <p
          className={styles.actionStatus}
          role={reviewRequestFailed ? "alert" : "status"}
          aria-live={reviewRequestFailed ? "assertive" : "polite"}
        >
          {reviewRequestSucceeded
            ? "Evidence review request recorded through the advisory policy workflow."
            : reviewRequestFailed
              ? "Evidence review request could not be recorded from the advisory policy workflow."
              : "Records a review request only; it does not approve sign-off or client publication."}
        </p>
      </div>
    </div>
  );
}

function SuitabilityRefreshStatus({
  state,
  requestedContext,
  confirmedContext,
  onRetry,
  retrying,
}: {
  state: SourceRefreshState;
  requestedContext: string;
  confirmedContext: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  if (state === "confirmed") {
    return (
      <WorkbenchRefreshStatus
        kind="confirmed"
        eyebrow="Source confirmed"
        title="Suitability evidence refreshed"
        confirmedContext={confirmedContext}
      />
    );
  }

  if (state === "pending") {
    return (
      <WorkbenchRefreshStatus
        kind="pending"
        eyebrow="Source refresh"
        title="Refreshing suitability evidence"
        message="The existing worklist remains visible while Gateway confirms the selected suitability evidence."
        requestedContext={requestedContext}
        confirmedContext={confirmedContext}
      />
    );
  }

  return (
    <WorkbenchRefreshStatus
      kind="failed"
      eyebrow="Source exception"
      title="Suitability evidence refresh failed"
      message="The latest policy package could not be confirmed. Earlier evidence remains visible and is marked unconfirmed."
      requestedContext={requestedContext}
      confirmedContext={confirmedContext}
      onRetry={onRetry}
      retrying={retrying}
      retryLabel="Retry suitability evidence"
    />
  );
}

function EvidenceMetric({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.policyEvidenceMetric}>
      <Text variant="microLabel">{label}</Text>
      <Text variant="body">{children}</Text>
    </div>
  );
}

function EvidenceList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className={styles.policyEvidenceList}>
      <Text variant="microLabel">{title}</Text>
      {values.length === 0 ? (
        <Text variant="secondary">None reported</Text>
      ) : (
        <ul>
          {values.map((value, index) => (
            <li key={`${value}:${index}`}>{value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
