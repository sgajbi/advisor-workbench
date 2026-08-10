import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";

import {
  ActionButton,
  ScreenStatePanel,
  SemanticBadge,
  Text,
  WorkbenchRecordSelector,
} from "@/design-system";

import {
  buildPolicyEvaluationEvidenceModel,
  buildPolicyReviewQueueEmptyPresentation,
  buildPolicyReviewQueueModel,
} from "../proposal-policy-review-view-model";
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
  onRequestMoreEvidence: () => void;
}) {
  const emptyPresentation = buildPolicyReviewQueueEmptyPresentation({
    portfolioId,
    rowCount: model.rows.length,
    isRefreshing,
    hasRefreshFailure,
  });

  if (isLoading) {
    return (
      <div className={styles.policyReviewPanel}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading policy review queue...</Text>
        </Stack>
      </div>
    );
  }

  if (isPermissionBlocked) {
    return (
      <ScreenStatePanel
        kind="permission_blocked"
        title="Policy review access is not available"
        body="Your current role does not permit this portfolio's suitability review queue to be viewed."
        surface="default"
      />
    );
  }

  if (hasError) {
    return (
      <ScreenStatePanel
        kind="error"
        title="Policy review queue unavailable"
        body="Suitability policy evaluations could not be loaded from the approved advisory workflow."
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
        surface="default"
      />
    );
  }

  return (
    <div className={styles.policyReviewPanel}>
      {isRefreshing ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          Refreshing the policy review queue. Previously retrieved evaluations remain visible.
        </Alert>
      ) : null}
      {hasRefreshFailure ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          The policy review queue could not be refreshed. Previously retrieved evaluations remain
          visible while the source is rechecked.
        </Alert>
      ) : null}
      <div className={styles.policyReviewHeader}>
        <div>
          <Text variant="microLabel">Suitability Policy Queue</Text>
          <Text variant="subsectionTitle" as="h3">
            Policy evaluations needing review
          </Text>
        </div>
        <div className={styles.policyReviewCounts} aria-label="Policy review counts">
          <span>{model.totalCount}</span>
          <strong>{model.actionCount} need action</strong>
        </div>
      </div>
      <div className={styles.policyReviewWorkspace}>
        <section className={styles.policyWorklist} aria-labelledby="policy-review-worklist-title">
          <div className={styles.policyPaneHeader}>
            <div>
              <Text variant="microLabel">Review worklist</Text>
              <Text variant="body" as="h4" id="policy-review-worklist-title">
                Choose a proposal to review
              </Text>
            </div>
            <Text variant="secondary">Arrow keys move between reviews.</Text>
          </div>
          <WorkbenchRecordSelector
            ariaLabel="Suitability policy reviews"
            className={styles.policyWorklistSelector}
            selectedKey={selectedEvaluationId}
            onSelectionChange={onSelectEvaluation}
            items={model.rows.map((row) => ({
              key: row.evaluationId,
              title: row.proposalId,
              subtitle: `${row.proposalVersion} · ${row.policyPack}`,
              status: (
                <SemanticBadge tone={row.policyStatusTone}>{row.policyStatus}</SemanticBadge>
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
        <section className={styles.policyDetail} aria-label="Selected suitability review">
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
            onRequestMoreEvidence={onRequestMoreEvidence}
          />
        </section>
      </div>
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
  onRequestMoreEvidence: () => void;
}) {
  if (isLoading) {
    return (
      <div className={styles.policyEvidencePanel}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading policy evidence...</Text>
        </Stack>
      </div>
    );
  }

  if (isPermissionBlocked) {
    return (
      <ScreenStatePanel
        kind="permission_blocked"
        title="Policy evidence access is not available"
        body="Your current role does not permit the selected suitability evidence to be viewed."
        surface="default"
      />
    );
  }

  if (hasError) {
    return (
      <ScreenStatePanel
        kind="error"
        title="Policy evidence unavailable"
        body="Policy detail and sign-off package posture could not be loaded from the approved advisory workflow."
        surface="default"
      />
    );
  }

  if (!model) return null;

  if (!model.sourceIdentityAligned) {
    return (
      <ScreenStatePanel
        kind="partial"
        title="Selected policy evidence is unconfirmed"
        body="The selected proposal and its supporting policy evidence do not agree. No review request is available until the source package is refreshed."
        surface="default"
      />
    );
  }

  return (
    <div className={styles.policyEvidencePanel}>
      {isRefreshing ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          Refreshing the selected policy evidence. The prior source package remains visible during
          this check.
        </Alert>
      ) : null}
      {hasRefreshFailure ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          The selected policy evidence could not be refreshed. The prior source package remains
          visible but is not confirmed current.
        </Alert>
      ) : null}
      <div className={styles.policyEvidenceHeader}>
        <div>
          <Text variant="microLabel">Selected suitability review</Text>
          <Text variant="subsectionTitle" as="h4">
            {model.proposalId} · {model.proposalVersion}
          </Text>
          <Text variant="secondary">{model.policyPack}</Text>
        </div>
        <Link href={`/proposals/${encodeURIComponent(model.proposalId)}`}>Open proposal</Link>
      </div>
      <div className={styles.policyDecisionBrief}>
        <div>
          <Text variant="microLabel">Required next step</Text>
          <Text variant="subsectionTitle" as="h5">
            {model.nextAction}
          </Text>
        </div>
        <SemanticBadge tone={model.policyStatusTone}>{model.policyStatus}</SemanticBadge>
      </div>
      <div className={styles.policyEvidenceGrid}>
        <EvidenceMetric label="Source evidence">{model.sourcePosture}</EvidenceMetric>
        <EvidenceMetric label="Blocking rules">{model.blockingRuleCount} blocking</EvidenceMetric>
        <EvidenceMetric label="Sign-off package">{model.signOffPackagePosture}</EvidenceMetric>
        <EvidenceMetric label="Review SLA">{model.slaPosture}</EvidenceMetric>
      </div>
      <div className={styles.policyControlGrid}>
        <EvidenceMetric label="Workflow status">
          <SemanticBadge tone={model.workflowTone}>{model.workflowStatus}</SemanticBadge>
        </EvidenceMetric>
        <EvidenceMetric label="Maker-checker">{model.makerCheckerPosture}</EvidenceMetric>
        <EvidenceMetric label="Client publication">{model.clientPublicationPosture}</EvidenceMetric>
        <EvidenceMetric label="Rule results">{model.ruleCount} reviewed</EvidenceMetric>
      </div>
      <details className={styles.policyEvidenceDisclosure}>
        <summary>
          <span>
            <Text variant="microLabel">Supporting evidence</Text>
            <Text variant="body">Dependencies, source references and outstanding gaps</Text>
          </span>
          <span>Show detail</span>
        </summary>
        <div className={styles.policyEvidenceColumns}>
          <EvidenceList title="Approval dependencies" values={model.approvalDependencies} />
          <EvidenceList title="Disclosure reviews" values={model.disclosureRequirements} />
          <EvidenceList title="Client consent evidence" values={model.consentRequirements} />
          <EvidenceList title="Sign-off blockers" values={model.workflowBlockers} />
          <EvidenceList title="Source references" values={model.sourceRefs} />
          <EvidenceList title="Source gaps" values={model.sourceGaps} />
        </div>
      </details>
      <div className={styles.policyEvidenceActions}>
        <ActionButton
          priority="secondary"
          onClick={onRequestMoreEvidence}
          disabled={
            reviewRequestPending || !model.sourceIdentityAligned || !model.sourceEvaluationHash
          }
        >
          {reviewRequestPending ? "Recording request..." : "Request more evidence"}
        </ActionButton>
        <Text variant="secondary">
          {reviewRequestSucceeded
            ? "Evidence review request recorded through the advisory policy workflow."
            : reviewRequestFailed
              ? "Evidence review request could not be recorded from the advisory policy workflow."
              : "Records a review request only; it does not approve sign-off or client publication."}
        </Text>
      </div>
    </div>
  );
}

function EvidenceMetric({ label, children }: { label: string; children: ReactNode }) {
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
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
