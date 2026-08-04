"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import {
  ActionButton,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  SourceWindowNavigation,
  Text,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  combineQuerySourcePostures,
  projectQuerySourcePosture,
} from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import {
  getAdvisoryPolicyEvaluation,
  getAdvisoryPolicyReviewQueue,
  getAdvisoryPolicySignOffPackage,
  getAdvisoryPolicyWorkflow,
  listProposals,
  recordAdvisoryPolicySignOffDecision,
} from "../api";
import {
  buildProposalLifecycleWorkspaceModel,
  type ProposalLifecycleMode,
} from "../proposal-lifecycle-workspace-view-model";
import {
  buildPolicyEvaluationEvidenceModel,
  buildPolicyReviewQueueEmptyPresentation,
  buildPolicyReviewQueueModel,
} from "../proposal-policy-review-view-model";
import { buildProposalQueueWorkflowContext } from "../proposal-workflow-context-view-model";
import { useProposalSourceWindow } from "../use-proposal-source-window";
import { usePublishProposalWorkflowContext } from "./proposal-workflow-context";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalLifecycleWorkspace({
  portfolioId,
  mode,
}: {
  portfolioId: string;
  mode: ProposalLifecycleMode;
}) {
  const queryClient = useQueryClient();
  const sourceWindow = useProposalSourceWindow();
  const proposalQuery = useQuery({
    queryKey: ["proposal-lifecycle-workspace", portfolioId, mode, sourceWindow.cursor],
    queryFn: async () =>
      await listProposals({ portfolioId, cursor: sourceWindow.cursor }),
    ...workbenchStrictQueryDefaults,
  });
  const { data, isLoading } = proposalQuery;
  const policyQueueQuery = useQuery({
    queryKey: ["advisory-policy-review-queue", portfolioId],
    queryFn: async () =>
      await getAdvisoryPolicyReviewQueue({
        evaluationStatus: "PENDING_REVIEW",
        portfolioId,
      }),
    enabled: mode === "suitability",
    ...workbenchStrictQueryDefaults,
  });

  const proposals = useMemo(() => data?.items ?? [], [data?.items]);
  const model = useMemo(
    () =>
      buildProposalLifecycleWorkspaceModel({
        mode,
        proposals,
        hasMoreResults: Boolean(data?.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
      }),
    [data?.next_cursor, mode, proposals, sourceWindow.hasPrevious]
  );
  const policyReviewModel = useMemo(
    () => buildPolicyReviewQueueModel({ records: policyQueueQuery.data?.items ?? [] }),
    [policyQueueQuery.data?.items]
  );
  const selectedPolicyEvaluationId = policyReviewModel.rows[0]?.evaluationId;
  const policyEvaluationQuery = useQuery({
    queryKey: ["advisory-policy-evaluation", selectedPolicyEvaluationId],
    queryFn: async () => await getAdvisoryPolicyEvaluation(selectedPolicyEvaluationId),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const policySignOffPackageQuery = useQuery({
    queryKey: ["advisory-policy-sign-off-package", selectedPolicyEvaluationId],
    queryFn: async () => await getAdvisoryPolicySignOffPackage(selectedPolicyEvaluationId),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const policyWorkflowQuery = useQuery({
    queryKey: ["advisory-policy-workflow", selectedPolicyEvaluationId],
    queryFn: async () => await getAdvisoryPolicyWorkflow(selectedPolicyEvaluationId),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const proposalSourcePosture = projectQuerySourcePosture({
    hasData: Boolean(proposalQuery.data),
    isLoading: proposalQuery.isLoading,
    isFetching: proposalQuery.isFetching,
    hasError: Boolean(proposalQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(proposalQuery.error),
  });
  const policyQueuePosture = projectQuerySourcePosture({
    hasData: Boolean(policyQueueQuery.data),
    isLoading: policyQueueQuery.isLoading,
    isFetching: policyQueueQuery.isFetching,
    hasError: Boolean(policyQueueQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(policyQueueQuery.error),
  });
  const policyEvaluationPosture = projectQuerySourcePosture({
    hasData: Boolean(policyEvaluationQuery.data),
    isLoading: policyEvaluationQuery.isLoading,
    isFetching: policyEvaluationQuery.isFetching,
    hasError: Boolean(policyEvaluationQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(policyEvaluationQuery.error),
  });
  const policySignOffPackagePosture = projectQuerySourcePosture({
    hasData: Boolean(policySignOffPackageQuery.data),
    isLoading: policySignOffPackageQuery.isLoading,
    isFetching: policySignOffPackageQuery.isFetching,
    hasError: Boolean(policySignOffPackageQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(policySignOffPackageQuery.error),
  });
  const policyWorkflowPosture = projectQuerySourcePosture({
    hasData: Boolean(policyWorkflowQuery.data),
    isLoading: policyWorkflowQuery.isLoading,
    isFetching: policyWorkflowQuery.isFetching,
    hasError: Boolean(policyWorkflowQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(policyWorkflowQuery.error),
  });
  const policySourcePosture = combineQuerySourcePostures([
    policyQueuePosture,
    policyEvaluationPosture,
    policySignOffPackagePosture,
    policyWorkflowPosture,
  ]);
  const policyEvidencePosture = combineQuerySourcePostures([
    policyEvaluationPosture,
    policySignOffPackagePosture,
    policyWorkflowPosture,
  ]);
  const policyEvidenceModel = useMemo(
    () =>
      buildPolicyEvaluationEvidenceModel({
        evaluation: policyEvaluationQuery.data,
        signOffPackage: policySignOffPackageQuery.data,
        workflow: policyWorkflowQuery.data,
      }),
    [policyEvaluationQuery.data, policySignOffPackageQuery.data, policyWorkflowQuery.data]
  );
  const requestMoreEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPolicyEvaluationId || !policyEvidenceModel?.sourceEvaluationHash) {
        throw new Error("Policy evaluation evidence is not ready for review request.");
      }
      return await recordAdvisoryPolicySignOffDecision(
        selectedPolicyEvaluationId,
        {
          body: {
            actor_id: "advisor_1",
            decision: "REQUEST_MORE_EVIDENCE",
            source_evaluation_hash: policyEvidenceModel.sourceEvaluationHash,
            reason: {
              purpose: "advisor_policy_review",
              source: "lotus-workbench",
            },
          },
        },
        `ui-policy-review-request-${selectedPolicyEvaluationId}-${Date.now()}`
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["advisory-policy-workflow"] }),
        queryClient.invalidateQueries({ queryKey: ["advisory-policy-evaluation"] }),
        queryClient.invalidateQueries({ queryKey: ["advisory-policy-sign-off-package"] }),
        queryClient.invalidateQueries({ queryKey: ["advisory-policy-review-queue"] }),
      ]);
    },
  });
  const workflowContextModel = useMemo(() => {
    const policySourcesActive = mode === "suitability";

    return buildProposalQueueWorkflowContext({
      portfolioId,
      modeLabel: model.title,
      isLoading:
        proposalSourcePosture.isInitialLoading ||
        (policySourcesActive && policySourcePosture.isInitialLoading),
      isRefreshing:
        proposalSourcePosture.isRefreshing ||
        (policySourcesActive && policySourcePosture.isRefreshing),
      permissionBlocked:
        proposalSourcePosture.isPermissionBlocked ||
        (policySourcesActive && policySourcePosture.isPermissionBlocked),
      hasError: proposalSourcePosture.isUnavailable,
      hasUnavailableEvidence:
        policySourcesActive && policySourcePosture.isUnavailable,
      hasProposalRefreshFailure: proposalSourcePosture.hasRefreshFailure,
      hasSupportingEvidenceRefreshFailure:
        policySourcesActive && policySourcePosture.hasRefreshFailure,
      hasMoreResults: Boolean(data?.next_cursor),
      hasPreviousResults: sourceWindow.hasPrevious,
      windowNumber: sourceWindow.windowNumber,
      totalCount: model.totalCount,
      attentionCount: model.attentionCount,
      primaryDecision: model.primaryDecision,
      recommendedAction: model.recommendedAction,
    });
  }, [
    data?.next_cursor,
    mode,
    model,
    policySourcePosture.hasRefreshFailure,
    policySourcePosture.isInitialLoading,
    policySourcePosture.isPermissionBlocked,
    policySourcePosture.isRefreshing,
    policySourcePosture.isUnavailable,
    portfolioId,
    proposalSourcePosture.hasRefreshFailure,
    proposalSourcePosture.isInitialLoading,
    proposalSourcePosture.isPermissionBlocked,
    proposalSourcePosture.isRefreshing,
    proposalSourcePosture.isUnavailable,
    sourceWindow.hasPrevious,
    sourceWindow.windowNumber,
  ]);
  usePublishProposalWorkflowContext(workflowContextModel);

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading proposal lifecycle...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  if (proposalSourcePosture.isPermissionBlocked) {
    return (
      <SectionBlock>
        <ScreenStatePanel
          kind="permission_blocked"
          title="Proposal access is not available"
          body="Your current role does not permit this portfolio's proposal workflow to be viewed."
          surface="default"
        />
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title={model.title}
      subtitle={model.subtitle}
      actions={
        <Link
          className="nav-link"
          href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
        >
          Build Proposal
        </Link>
      }
    >
      {proposalSourcePosture.isUnavailable ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Proposal lifecycle is unavailable. No fallback proposal queue is shown.
        </Alert>
      ) : null}
      {proposalSourcePosture.hasRefreshFailure ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          The proposal view could not be refreshed. Previously retrieved rows remain visible while
          the source is rechecked.
        </Alert>
      ) : null}
      {mode === "suitability" &&
      policyQueuePosture.isUnavailable &&
      !policyQueuePosture.isPermissionBlocked ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Policy review queue is unavailable. No fallback suitability policy queue is shown.
        </Alert>
      ) : null}

      <div className={styles.decisionPanel}>
        <div>
          <Text variant="microLabel">Advisor Decision</Text>
          <Text variant="subsectionTitle" as="h2">
            {model.primaryDecision}
          </Text>
          <Text variant="secondary">{model.recommendedAction}</Text>
        </div>
        <div className={styles.countStrip} aria-label="Proposal lifecycle counts">
          <div>
            <span>{model.totalCount}</span>
            <strong>In view</strong>
          </div>
          <div>
            <span>{model.attentionCount}</span>
            <strong>Need action</strong>
          </div>
        </div>
      </div>

      {mode === "suitability" ? (
        <PolicyReviewQueueSection
          portfolioId={portfolioId}
          isLoading={policyQueuePosture.isInitialLoading}
          isRefreshing={policyQueuePosture.isRefreshing}
          isPermissionBlocked={policyQueuePosture.isPermissionBlocked}
          hasError={policyQueuePosture.isUnavailable}
          hasRefreshFailure={policyQueuePosture.hasRefreshFailure}
          model={policyReviewModel}
          evidenceModel={policyEvidenceModel}
          evidenceLoading={policyEvidencePosture.isInitialLoading}
          evidenceRefreshing={policyEvidencePosture.isRefreshing}
          evidencePermissionBlocked={policyEvidencePosture.isPermissionBlocked}
          evidenceError={policyEvidencePosture.isUnavailable}
          evidenceRefreshFailure={policyEvidencePosture.hasRefreshFailure}
          reviewRequestPending={requestMoreEvidenceMutation.isPending}
          reviewRequestSucceeded={requestMoreEvidenceMutation.isSuccess}
          reviewRequestFailed={Boolean(requestMoreEvidenceMutation.error)}
          onRequestMoreEvidence={() => requestMoreEvidenceMutation.mutate()}
        />
      ) : null}

      {proposalSourcePosture.isUnavailable ? (
        <ScreenStatePanel
          kind="error"
          title="Proposal lifecycle unavailable"
          body="The proposal queue could not be loaded from the approved advisory workflow."
          surface="default"
        />
      ) : model.rows.length === 0 ? (
        <ScreenStatePanel
          kind="empty"
          title={model.emptyTitle}
          body={model.emptyBody}
          action={
            <Link
              className="nav-link"
              href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
            >
              Build advisor-use draft
            </Link>
          }
          surface="default"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.lifecycleTable}>
            <thead>
              <tr>
                <th>Proposal</th>
                <th>Portfolio</th>
                <th>Stage</th>
                <th>Readiness</th>
                <th>Posture</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.proposalId}>
                  <td>
                    <Link href={row.href}>{row.title}</Link>
                    <span>ID: {row.proposalId}</span>
                  </td>
                  <td>{row.portfolio}</td>
                  <td>
                    <SemanticBadge tone={row.stageTone}>{row.stage}</SemanticBadge>
                  </td>
                  <td>
                    <SemanticBadge tone={row.readinessTone}>{row.readiness}</SemanticBadge>
                  </td>
                  <td>{row.posture}</td>
                  <td>{row.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!proposalSourcePosture.isPermissionBlocked &&
      (!proposalSourcePosture.isUnavailable || sourceWindow.hasPrevious) ? (
        <SourceWindowNavigation
          ariaLabel="Proposal queue navigation"
          currentWindow={sourceWindow.windowNumber}
          hasPrevious={sourceWindow.hasPrevious}
          hasNext={Boolean(data?.next_cursor)}
          isLoading={proposalQuery.isFetching}
          onPrevious={sourceWindow.showPrevious}
          onNext={() => sourceWindow.showNext(data?.next_cursor)}
        />
      ) : null}
    </SectionBlock>
  );
}

function PolicyReviewQueueSection({
  portfolioId,
  isLoading,
  isRefreshing,
  isPermissionBlocked,
  hasError,
  hasRefreshFailure,
  model,
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
      <div className={styles.tableWrap}>
        <table className={styles.lifecycleTable}>
          <thead>
            <tr>
              <th>Proposal</th>
              <th>Policy Review</th>
              <th>Sign-Off</th>
              <th>Open Requirements</th>
              <th>Evidence</th>
              <th>Next Action</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.evaluationId}>
                <td>
                  <Link href={row.href}>{row.proposalId}</Link>
                  <span>{row.proposalVersion}</span>
                </td>
                <td>
                  <SemanticBadge tone={row.policyStatusTone}>{row.policyStatus}</SemanticBadge>
                  <span>{row.policyPack}</span>
                </td>
                <td>
                  <SemanticBadge tone={row.signOffTone}>{row.signOffStatus}</SemanticBadge>
                </td>
                <td>{row.openRequirements}</td>
                <td>{row.evidencePosture}</td>
                <td>{row.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  if (!model) {
    return null;
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
      <div>
        <Text variant="microLabel">Selected Policy Evidence</Text>
        <Text variant="subsectionTitle" as="h4">
          Sign-off source package and source evidence
        </Text>
      </div>
      <div className={styles.policyEvidenceGrid}>
        <EvidenceMetric label="Policy status">
          <SemanticBadge tone={model.policyStatusTone}>{model.policyStatus}</SemanticBadge>
        </EvidenceMetric>
        <EvidenceMetric label="Source evidence">{model.sourcePosture}</EvidenceMetric>
        <EvidenceMetric label="Rule results">{model.ruleCount} reviewed</EvidenceMetric>
        <EvidenceMetric label="Blocking rules">{model.blockingRuleCount} blocking</EvidenceMetric>
        <EvidenceMetric label="Sign-off package">{model.signOffPackagePosture}</EvidenceMetric>
        <EvidenceMetric label="Workflow status">
          <SemanticBadge tone={model.workflowTone}>{model.workflowStatus}</SemanticBadge>
        </EvidenceMetric>
        <EvidenceMetric label="Maker-checker">{model.makerCheckerPosture}</EvidenceMetric>
        <EvidenceMetric label="Review SLA">{model.slaPosture}</EvidenceMetric>
        <EvidenceMetric label="Client publication">{model.clientPublicationPosture}</EvidenceMetric>
      </div>
      <div className={styles.policyEvidenceColumns}>
        <EvidenceList title="Approval dependencies" values={model.approvalDependencies} />
        <EvidenceList title="Disclosure reviews" values={model.disclosureRequirements} />
        <EvidenceList title="Client consent evidence" values={model.consentRequirements} />
        <EvidenceList title="Sign-off blockers" values={model.workflowBlockers} />
        <EvidenceList title="Source references" values={model.sourceRefs} />
        <EvidenceList title="Source gaps" values={model.sourceGaps} />
        <EvidenceMetric label="Next action">{model.nextAction}</EvidenceMetric>
      </div>
      <div className={styles.policyEvidenceActions}>
        <ActionButton
          priority="secondary"
          onClick={onRequestMoreEvidence}
          disabled={reviewRequestPending || !model.sourceEvaluationHash}
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
