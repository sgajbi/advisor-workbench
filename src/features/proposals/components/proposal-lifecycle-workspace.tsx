"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import {
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
  buildPolicyReviewQueueModel,
  resolvePolicyReviewSelection,
} from "../proposal-policy-review-view-model";
import { buildProposalQueueWorkflowContext } from "../proposal-workflow-context-view-model";
import { useProposalSourceWindow } from "../use-proposal-source-window";
import PolicyReviewWorkspace from "./policy-review-workspace";
import { usePublishProposalWorkflowContext } from "./proposal-workflow-context";
import styles from "./proposal-lifecycle-workspace.module.css";

type PolicyEvidenceReviewRequest = {
  portfolioId: string;
  evaluationId: string;
  sourceEvaluationHash: string;
};

export default function ProposalLifecycleWorkspace({
  portfolioId,
  mode,
}: {
  portfolioId: string;
  mode: ProposalLifecycleMode;
}) {
  const queryClient = useQueryClient();
  const [policySelection, setPolicySelection] = useState<{
    portfolioId: string;
    evaluationId: string;
  } | null>(null);
  const sourceWindow = useProposalSourceWindow(portfolioId);
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
  const selectedPolicyEvaluationId = resolvePolicyReviewSelection({
    rows: policyReviewModel.rows,
    preferredEvaluationId:
      policySelection?.portfolioId === portfolioId ? policySelection.evaluationId : null,
  });
  const policyEvaluationQuery = useQuery({
    queryKey: ["advisory-policy-evaluation", portfolioId, selectedPolicyEvaluationId],
    queryFn: async () => await getAdvisoryPolicyEvaluation(selectedPolicyEvaluationId ?? ""),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const policySignOffPackageQuery = useQuery({
    queryKey: ["advisory-policy-sign-off-package", portfolioId, selectedPolicyEvaluationId],
    queryFn: async () => await getAdvisoryPolicySignOffPackage(selectedPolicyEvaluationId ?? ""),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const policyWorkflowQuery = useQuery({
    queryKey: ["advisory-policy-workflow", portfolioId, selectedPolicyEvaluationId],
    queryFn: async () => await getAdvisoryPolicyWorkflow(selectedPolicyEvaluationId ?? ""),
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
  const policyEvidenceModel = useMemo(() => {
    const evidenceModel = buildPolicyEvaluationEvidenceModel({
        evaluation: policyEvaluationQuery.data,
        signOffPackage: policySignOffPackageQuery.data,
        workflow: policyWorkflowQuery.data,
      });
    return evidenceModel?.evaluationId === selectedPolicyEvaluationId ? evidenceModel : null;
  }, [
    policyEvaluationQuery.data,
    policySignOffPackageQuery.data,
    policyWorkflowQuery.data,
    selectedPolicyEvaluationId,
  ]);
  const requestMoreEvidenceMutation = useMutation({
    mutationFn: async ({
      evaluationId,
      sourceEvaluationHash,
    }: PolicyEvidenceReviewRequest) => {
      return await recordAdvisoryPolicySignOffDecision(
        evaluationId,
        {
          body: {
            actor_id: "advisor_1",
            decision: "REQUEST_MORE_EVIDENCE",
            source_evaluation_hash: sourceEvaluationHash,
            reason: {
              purpose: "advisor_policy_review",
              source: "lotus-workbench",
            },
          },
        },
        `ui-policy-review-request-${evaluationId}-${Date.now()}`
      );
    },
    onSuccess: async (_data, request) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["advisory-policy-workflow", request.portfolioId, request.evaluationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["advisory-policy-evaluation", request.portfolioId, request.evaluationId],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "advisory-policy-sign-off-package",
            request.portfolioId,
            request.evaluationId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["advisory-policy-review-queue", request.portfolioId],
        }),
      ]);
    },
  });
  const reviewRequestMatchesSelection =
    requestMoreEvidenceMutation.variables?.portfolioId === portfolioId &&
    requestMoreEvidenceMutation.variables.evaluationId === selectedPolicyEvaluationId;
  const policyEvidenceIdentityMismatch = policyEvidenceModel?.sourceIdentityAligned === false;
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
        policySourcesActive &&
        (policySourcePosture.isUnavailable || policyEvidenceIdentityMismatch),
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
    policyEvidenceIdentityMismatch,
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
        <PolicyReviewWorkspace
          portfolioId={portfolioId}
          isLoading={policyQueuePosture.isInitialLoading}
          isRefreshing={policyQueuePosture.isRefreshing}
          isPermissionBlocked={policyQueuePosture.isPermissionBlocked}
          hasError={policyQueuePosture.isUnavailable}
          hasRefreshFailure={policyQueuePosture.hasRefreshFailure}
          model={policyReviewModel}
          selectedEvaluationId={selectedPolicyEvaluationId}
          onSelectEvaluation={(evaluationId) => {
            requestMoreEvidenceMutation.reset();
            setPolicySelection({ portfolioId, evaluationId });
          }}
          evidenceModel={policyEvidenceModel}
          evidenceLoading={policyEvidencePosture.isInitialLoading}
          evidenceRefreshing={policyEvidencePosture.isRefreshing}
          evidencePermissionBlocked={policyEvidencePosture.isPermissionBlocked}
          evidenceError={policyEvidencePosture.isUnavailable}
          evidenceRefreshFailure={policyEvidencePosture.hasRefreshFailure}
          reviewRequestPending={
            reviewRequestMatchesSelection && requestMoreEvidenceMutation.isPending
          }
          reviewRequestSucceeded={
            reviewRequestMatchesSelection && requestMoreEvidenceMutation.isSuccess
          }
          reviewRequestFailed={
            reviewRequestMatchesSelection && Boolean(requestMoreEvidenceMutation.error)
          }
          onRequestMoreEvidence={() => {
            if (
              selectedPolicyEvaluationId &&
              policyEvidenceModel?.evaluationId === selectedPolicyEvaluationId &&
              policyEvidenceModel.sourceIdentityAligned &&
              policyEvidenceModel.sourceEvaluationHash
            ) {
              requestMoreEvidenceMutation.mutate({
                portfolioId,
                evaluationId: selectedPolicyEvaluationId,
                sourceEvaluationHash: policyEvidenceModel.sourceEvaluationHash,
              });
            }
          }}
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
