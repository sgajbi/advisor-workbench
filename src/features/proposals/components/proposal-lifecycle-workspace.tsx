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
  getProposal,
  getProposalApprovals,
  getProposalExecutionStatus,
  getProposalLineage,
  getProposalRiskImpact,
  getProposalWorkflowEvents,
  listProposals,
  recordAdvisoryPolicySignOffDecision,
} from "../api";
import {
  buildProposalLifecycleWorkspaceModel,
  type ProposalLifecycleMode,
} from "../proposal-lifecycle-workspace-view-model";
import {
  buildProposalApprovalEvidenceModel,
  confirmRefreshedProposalApprovalEvidence,
} from "../proposal-approval-evidence-view-model";
import { buildProposalImplementationStatusModel } from "../proposal-implementation-status-view-model";
import {
  buildPolicyEvaluationEvidenceModel,
  buildPolicyReviewQueueModel,
  resolvePolicyReviewSelection,
} from "../proposal-policy-review-view-model";
import { buildProposalQueueWorkflowContext } from "../proposal-workflow-context-view-model";
import { useProposalSourceWindow } from "../use-proposal-source-window";
import PolicyReviewWorkspace from "./policy-review-workspace";
import ProposalLifecycleDecisionWorkspace from "./proposal-lifecycle-decision-workspace";
import ProposalImplementationStatusWorkspace from "./proposal-implementation-status-workspace";
import ProposalRiskImpactWorkspace from "./proposal-risk-impact-workspace";
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
  const [riskSelection, setRiskSelection] = useState<{
    portfolioId: string;
    proposalId: string;
  } | null>(null);
  const [approvalSelection, setApprovalSelection] = useState<{
    portfolioId: string;
    proposalId: string;
  } | null>(null);
  const [implementationSelection, setImplementationSelection] = useState<{
    portfolioId: string;
    proposalId: string;
  } | null>(null);
  const sourceWindow = useProposalSourceWindow(portfolioId);
  const proposalQuery = useQuery({
    queryKey: [
      "proposal-lifecycle-workspace",
      portfolioId,
      mode,
      sourceWindow.cursor,
    ],
    queryFn: async () =>
      await listProposals({
        portfolioId,
        cursor: sourceWindow.cursor,
        ...(mode === "risk-impact"
          ? { state: "RISK_REVIEW" }
          : mode === "implementation"
            ? { state: "EXECUTION_READY" }
            : {}),
      }),
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
        portfolioId,
        mode,
        proposals,
        hasMoreResults: Boolean(data?.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
      }),
    [data?.next_cursor, mode, portfolioId, proposals, sourceWindow.hasPrevious],
  );
  const riskSelectionIsCurrent =
    riskSelection?.portfolioId === portfolioId &&
    model.rows.some((row) => row.proposalId === riskSelection.proposalId);
  const selectedRiskProposal =
    model.rows.find(
      (row) =>
        row.proposalId ===
        (riskSelectionIsCurrent ? riskSelection.proposalId : null),
    ) ??
    model.rows[0] ??
    null;
  const approvalSelectionIsCurrent =
    approvalSelection?.portfolioId === portfolioId &&
    model.rows.some((row) => row.proposalId === approvalSelection.proposalId);
  const selectedApprovalProposal =
    model.rows.find(
      (row) =>
        row.proposalId ===
        (approvalSelectionIsCurrent ? approvalSelection.proposalId : null),
    ) ??
    model.rows[0] ??
    null;
  const implementationSelectionIsCurrent =
    implementationSelection?.portfolioId === portfolioId &&
    model.rows.some(
      (row) => row.proposalId === implementationSelection.proposalId,
    );
  const selectedImplementationProposal =
    model.rows.find(
      (row) =>
        row.proposalId ===
        (implementationSelectionIsCurrent
          ? implementationSelection.proposalId
          : null),
    ) ??
    model.rows[0] ??
    null;
  const approvalEvidenceQueryKey = [
    "proposal-approval-evidence",
    portfolioId,
    selectedApprovalProposal?.proposalId,
    selectedApprovalProposal?.versionNo,
  ] as const;
  const approvalDetailQuery = useQuery({
    queryKey: [...approvalEvidenceQueryKey, "detail"],
    queryFn: async () =>
      await getProposal(selectedApprovalProposal?.proposalId ?? "", true),
    enabled: mode === "approval-queue" && Boolean(selectedApprovalProposal),
    ...workbenchStrictQueryDefaults,
  });
  const approvalWorkflowQuery = useQuery({
    queryKey: [...approvalEvidenceQueryKey, "workflow"],
    queryFn: async () =>
      await getProposalWorkflowEvents(
        selectedApprovalProposal?.proposalId ?? "",
      ),
    enabled: mode === "approval-queue" && Boolean(selectedApprovalProposal),
    ...workbenchStrictQueryDefaults,
  });
  const approvalRecordsQuery = useQuery({
    queryKey: [...approvalEvidenceQueryKey, "approvals"],
    queryFn: async () =>
      await getProposalApprovals(selectedApprovalProposal?.proposalId ?? ""),
    enabled: mode === "approval-queue" && Boolean(selectedApprovalProposal),
    ...workbenchStrictQueryDefaults,
  });
  const approvalLineageQuery = useQuery({
    queryKey: [...approvalEvidenceQueryKey, "lineage"],
    queryFn: async () =>
      await getProposalLineage(selectedApprovalProposal?.proposalId ?? ""),
    enabled: mode === "approval-queue" && Boolean(selectedApprovalProposal),
    ...workbenchStrictQueryDefaults,
  });
  const riskImpactQuery = useQuery({
    queryKey: [
      "proposal-risk-impact",
      portfolioId,
      selectedRiskProposal?.proposalId,
      selectedRiskProposal?.versionNo,
      selectedRiskProposal?.currentState,
    ],
    queryFn: async () =>
      await getProposalRiskImpact(
        selectedRiskProposal?.proposalId ?? "",
        portfolioId,
        selectedRiskProposal?.versionNo ?? 0,
        selectedRiskProposal?.currentState ?? "",
      ),
    enabled:
      mode === "risk-impact" &&
      Boolean(selectedRiskProposal) &&
      selectedRiskProposal?.versionNo !== null,
    ...workbenchStrictQueryDefaults,
  });
  const implementationStatusQuery = useQuery({
    queryKey: [
      "proposal-implementation-status",
      portfolioId,
      selectedImplementationProposal?.proposalId,
      selectedImplementationProposal?.versionNo,
      selectedImplementationProposal?.currentState,
    ],
    queryFn: async () =>
      await getProposalExecutionStatus(
        selectedImplementationProposal?.proposalId ?? "",
        portfolioId,
        selectedImplementationProposal?.versionNo ?? 0,
        selectedImplementationProposal?.currentState ?? "",
      ),
    enabled:
      mode === "implementation" &&
      Boolean(selectedImplementationProposal) &&
      selectedImplementationProposal?.versionNo !== null,
    ...workbenchStrictQueryDefaults,
  });
  const policyReviewModel = useMemo(
    () =>
      buildPolicyReviewQueueModel({
        records: policyQueueQuery.data?.items ?? [],
      }),
    [policyQueueQuery.data?.items],
  );
  const resolvedPolicyEvaluationId = resolvePolicyReviewSelection({
    rows: policyReviewModel.rows,
    preferredEvaluationId:
      policySelection?.portfolioId === portfolioId
        ? policySelection.evaluationId
        : null,
  });
  const policySelectionIsCurrent =
    policySelection?.portfolioId === portfolioId &&
    policyReviewModel.rows.some(
      (row) => row.evaluationId === policySelection.evaluationId,
    );
  if (
    mode === "suitability" &&
    resolvedPolicyEvaluationId &&
    !policySelectionIsCurrent
  ) {
    setPolicySelection({
      portfolioId,
      evaluationId: resolvedPolicyEvaluationId,
    });
  }
  const selectedPolicyEvaluationId = policySelectionIsCurrent
    ? policySelection.evaluationId
    : resolvedPolicyEvaluationId;
  const selectedPolicyReview = policyReviewModel.rows.find(
    (row) => row.evaluationId === selectedPolicyEvaluationId,
  );
  const policyEvaluationQuery = useQuery({
    queryKey: [
      "advisory-policy-evaluation",
      portfolioId,
      selectedPolicyEvaluationId,
    ],
    queryFn: async () =>
      await getAdvisoryPolicyEvaluation(selectedPolicyEvaluationId ?? ""),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const policySignOffPackageQuery = useQuery({
    queryKey: [
      "advisory-policy-sign-off-package",
      portfolioId,
      selectedPolicyEvaluationId,
    ],
    queryFn: async () =>
      await getAdvisoryPolicySignOffPackage(selectedPolicyEvaluationId ?? ""),
    enabled: mode === "suitability" && Boolean(selectedPolicyEvaluationId),
    ...workbenchStrictQueryDefaults,
  });
  const policyWorkflowQuery = useQuery({
    queryKey: [
      "advisory-policy-workflow",
      portfolioId,
      selectedPolicyEvaluationId,
    ],
    queryFn: async () =>
      await getAdvisoryPolicyWorkflow(selectedPolicyEvaluationId ?? ""),
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
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      policyQueueQuery.error,
    ),
  });
  const policyEvaluationPosture = projectQuerySourcePosture({
    hasData: Boolean(policyEvaluationQuery.data),
    isLoading: policyEvaluationQuery.isLoading,
    isFetching: policyEvaluationQuery.isFetching,
    hasError: Boolean(policyEvaluationQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      policyEvaluationQuery.error,
    ),
  });
  const policySignOffPackagePosture = projectQuerySourcePosture({
    hasData: Boolean(policySignOffPackageQuery.data),
    isLoading: policySignOffPackageQuery.isLoading,
    isFetching: policySignOffPackageQuery.isFetching,
    hasError: Boolean(policySignOffPackageQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      policySignOffPackageQuery.error,
    ),
  });
  const policyWorkflowPosture = projectQuerySourcePosture({
    hasData: Boolean(policyWorkflowQuery.data),
    isLoading: policyWorkflowQuery.isLoading,
    isFetching: policyWorkflowQuery.isFetching,
    hasError: Boolean(policyWorkflowQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      policyWorkflowQuery.error,
    ),
  });
  const riskImpactPosture = projectQuerySourcePosture({
    hasData: Boolean(riskImpactQuery.data),
    isLoading: riskImpactQuery.isLoading,
    isFetching: riskImpactQuery.isFetching,
    hasError: Boolean(riskImpactQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      riskImpactQuery.error,
    ),
  });
  const implementationStatusPosture = projectQuerySourcePosture({
    hasData: Boolean(implementationStatusQuery.data),
    isLoading: implementationStatusQuery.isLoading,
    isFetching: implementationStatusQuery.isFetching,
    hasError: Boolean(implementationStatusQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      implementationStatusQuery.error,
    ),
  });
  const approvalDetailPosture = projectQuerySourcePosture({
    hasData: Boolean(approvalDetailQuery.data),
    isLoading: approvalDetailQuery.isLoading,
    isFetching: approvalDetailQuery.isFetching,
    hasError: Boolean(approvalDetailQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      approvalDetailQuery.error,
    ),
  });
  const approvalWorkflowPosture = projectQuerySourcePosture({
    hasData: Boolean(approvalWorkflowQuery.data),
    isLoading: approvalWorkflowQuery.isLoading,
    isFetching: approvalWorkflowQuery.isFetching,
    hasError: Boolean(approvalWorkflowQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      approvalWorkflowQuery.error,
    ),
  });
  const approvalRecordsPosture = projectQuerySourcePosture({
    hasData: Boolean(approvalRecordsQuery.data),
    isLoading: approvalRecordsQuery.isLoading,
    isFetching: approvalRecordsQuery.isFetching,
    hasError: Boolean(approvalRecordsQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      approvalRecordsQuery.error,
    ),
  });
  const approvalLineagePosture = projectQuerySourcePosture({
    hasData: Boolean(approvalLineageQuery.data),
    isLoading: approvalLineageQuery.isLoading,
    isFetching: approvalLineageQuery.isFetching,
    hasError: Boolean(approvalLineageQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      approvalLineageQuery.error,
    ),
  });
  const approvalEvidencePosture = combineQuerySourcePostures([
    approvalDetailPosture,
    approvalWorkflowPosture,
    approvalRecordsPosture,
    approvalLineagePosture,
  ]);
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
      selectedReview: selectedPolicyReview,
      portfolioId,
    });
    return evidenceModel;
  }, [
    policyEvaluationQuery.data,
    policySignOffPackageQuery.data,
    policyWorkflowQuery.data,
    portfolioId,
    selectedPolicyReview,
  ]);
  const approvalEvidenceModel = useMemo(() => {
    if (
      !selectedApprovalProposal ||
      !approvalDetailQuery.data ||
      !approvalWorkflowQuery.data ||
      !approvalRecordsQuery.data ||
      !approvalLineageQuery.data
    ) {
      return null;
    }
    return buildProposalApprovalEvidenceModel({
      approvals: approvalRecordsQuery.data,
      detail: approvalDetailQuery.data,
      expectedPortfolioId: selectedApprovalProposal.sourcePortfolioId,
      expectedProposalId: selectedApprovalProposal.proposalId,
      expectedState: selectedApprovalProposal.currentState,
      expectedVersionNo: selectedApprovalProposal.versionNo,
      lineage: approvalLineageQuery.data,
      workflow: approvalWorkflowQuery.data,
    });
  }, [
    approvalDetailQuery.data,
    approvalLineageQuery.data,
    approvalRecordsQuery.data,
    approvalWorkflowQuery.data,
    selectedApprovalProposal,
  ]);
  const selectedApprovalWorkflowContext = useMemo(() => {
    if (mode !== "approval-queue" || !approvalEvidenceModel) return undefined;
    const { approvals, identity, posture, workflow } = approvalEvidenceModel;
    const blockers =
      posture.state === "attention"
        ? [
            `${approvals.notApprovedCount} recorded ${approvals.notApprovedCount === 1 ? "approval decision is" : "approval decisions are"} not approved.`,
          ]
        : posture.state === "empty" || posture.state === "conflict"
          ? [posture.title]
          : [];
    return {
      proposalId: identity.proposalId,
      title: posture.title,
      summary: posture.summary,
      currentPosture: posture.label,
      nextAction: posture.nextAction,
      blockers,
      facts: [
        { label: "Proposal", value: identity.proposalId },
        { label: "Stage", value: workflow.currentStage },
        { label: "Approval records", value: String(approvals.count) },
        { label: "Active version", value: identity.version },
      ],
      sourceLabel:
        "Gateway-backed proposal detail, workflow, approvals, and lineage",
      boundaryNote:
        "Recorded approval evidence is shown only when proposal identity, workflow state, and active-version lineage agree. Source-current evidence does not by itself prove every required gate is complete.",
      hasEvidenceGap: posture.state === "empty" || posture.state === "conflict",
    };
  }, [approvalEvidenceModel, mode]);
  const selectedImplementationWorkflowContext = useMemo(() => {
    if (mode !== "implementation" || !implementationStatusQuery.data) {
      return undefined;
    }
    const implementation = buildProposalImplementationStatusModel(
      implementationStatusQuery.data,
    );
    return {
      proposalId: implementation.identity.proposalId,
      title: implementation.handoff.label,
      summary: implementation.handoff.summary,
      currentPosture: implementation.evidence.label,
      nextAction: implementation.handoff.nextAction,
      blockers: implementation.handoff.attentionRequired
        ? [implementation.handoff.summary]
        : implementation.evidence.isPartial
          ? [implementation.evidence.summary]
          : [],
      facts: [
        {
          label: "Proposal",
          value: implementation.identity.proposalId,
        },
        {
          label: "Handoff",
          value: implementation.handoff.label,
        },
        {
          label: "Version evidence",
          value: implementation.version.label,
        },
        {
          label: "Observed",
          value: implementation.lineage.freshness,
        },
      ],
      sourceLabel: "Gateway-backed advisory implementation handoff",
      boundaryNote: implementation.boundary,
      hasEvidenceGap:
        implementation.evidence.isPartial ||
        implementation.version.label === "Earlier version",
    };
  }, [implementationStatusQuery.data, mode]);
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
        `ui-policy-review-request-${evaluationId}-${Date.now()}`,
      );
    },
    onSuccess: async (_data, request) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "advisory-policy-workflow",
            request.portfolioId,
            request.evaluationId,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "advisory-policy-evaluation",
            request.portfolioId,
            request.evaluationId,
          ],
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
    requestMoreEvidenceMutation.variables.evaluationId ===
      selectedPolicyEvaluationId;
  const policyEvidenceIdentityMismatch =
    policyEvidenceModel?.sourceIdentityAligned === false;
  const workflowContextModel = useMemo(() => {
    const policySourcesActive = mode === "suitability";
    const approvalSourcesActive =
      mode === "approval-queue" && Boolean(selectedApprovalProposal);
    const riskSourceActive =
      mode === "risk-impact" && Boolean(selectedRiskProposal);
    const implementationSourceActive =
      mode === "implementation" && Boolean(selectedImplementationProposal);
    const implementationVersionUnavailable =
      implementationSourceActive &&
      selectedImplementationProposal?.versionNo === null;
    const implementationEvidenceIncomplete =
      implementationSourceActive &&
      implementationStatusQuery.data?.data.evidence_state === "partial";
    const riskVersionUnavailable =
      riskSourceActive && selectedRiskProposal?.versionNo === null;
    const riskEvidenceIncomplete =
      riskSourceActive &&
      Boolean(riskImpactQuery.data) &&
      [
        riskImpactQuery.data?.data.overall_state,
        riskImpactQuery.data?.data.allocation.state,
        riskImpactQuery.data?.data.risk.state,
        riskImpactQuery.data?.data.decision.state,
        riskImpactQuery.data?.data.workflow_gate.state,
      ].some((state) => state !== "ready");

    return buildProposalQueueWorkflowContext({
      portfolioId,
      modeLabel: model.title,
      isLoading:
        proposalSourcePosture.isInitialLoading ||
        (approvalSourcesActive &&
          !approvalEvidenceModel &&
          approvalEvidencePosture.isInitialLoading) ||
        (policySourcesActive && policySourcePosture.isInitialLoading) ||
        (riskSourceActive && riskImpactPosture.isInitialLoading) ||
        (implementationSourceActive &&
          implementationStatusPosture.isInitialLoading),
      isRefreshing:
        proposalSourcePosture.isRefreshing ||
        (approvalSourcesActive && approvalEvidencePosture.isRefreshing) ||
        (policySourcesActive && policySourcePosture.isRefreshing) ||
        (riskSourceActive && riskImpactPosture.isRefreshing) ||
        (implementationSourceActive &&
          implementationStatusPosture.isRefreshing),
      permissionBlocked: proposalSourcePosture.isPermissionBlocked,
      hasRestrictedEvidence:
        (approvalSourcesActive &&
          approvalEvidencePosture.isPermissionBlocked) ||
        (policySourcesActive && policySourcePosture.isPermissionBlocked) ||
        (riskSourceActive && riskImpactPosture.isPermissionBlocked) ||
        (implementationSourceActive &&
          implementationStatusPosture.isPermissionBlocked),
      hasError:
        proposalSourcePosture.isUnavailable &&
        !proposalSourcePosture.isPermissionBlocked,
      hasUnavailableEvidence:
        (approvalSourcesActive &&
          approvalEvidencePosture.isUnavailable &&
          !approvalEvidencePosture.isPermissionBlocked) ||
        (policySourcesActive &&
          ((policySourcePosture.isUnavailable &&
            !policySourcePosture.isPermissionBlocked) ||
            policyEvidenceIdentityMismatch)) ||
        (riskSourceActive &&
          ((riskImpactPosture.isUnavailable &&
            !riskImpactPosture.isPermissionBlocked) ||
            riskVersionUnavailable ||
            riskEvidenceIncomplete)) ||
        (implementationSourceActive &&
          ((implementationStatusPosture.isUnavailable &&
            !implementationStatusPosture.isPermissionBlocked) ||
            implementationVersionUnavailable ||
            implementationEvidenceIncomplete)),
      hasProposalRefreshFailure: proposalSourcePosture.hasRefreshFailure,
      hasSupportingEvidenceRefreshFailure:
        (approvalSourcesActive && approvalEvidencePosture.hasRefreshFailure) ||
        (policySourcesActive && policySourcePosture.hasRefreshFailure) ||
        (riskSourceActive && riskImpactPosture.hasRefreshFailure) ||
        (implementationSourceActive &&
          implementationStatusPosture.hasRefreshFailure),
      hasMoreResults: Boolean(data?.next_cursor),
      hasPreviousResults: sourceWindow.hasPrevious,
      windowNumber: sourceWindow.windowNumber,
      totalCount: model.totalCount,
      attentionCount: model.attentionCount,
      primaryDecision: model.primaryDecision,
      recommendedAction: model.recommendedAction,
      selectedEvidence:
        selectedApprovalWorkflowContext ??
        selectedImplementationWorkflowContext,
    });
  }, [
    data?.next_cursor,
    approvalEvidenceModel,
    approvalEvidencePosture.hasRefreshFailure,
    approvalEvidencePosture.isInitialLoading,
    approvalEvidencePosture.isPermissionBlocked,
    approvalEvidencePosture.isRefreshing,
    approvalEvidencePosture.isUnavailable,
    implementationStatusPosture.hasRefreshFailure,
    implementationStatusPosture.isInitialLoading,
    implementationStatusPosture.isPermissionBlocked,
    implementationStatusPosture.isRefreshing,
    implementationStatusPosture.isUnavailable,
    implementationStatusQuery.data,
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
    riskImpactPosture.hasRefreshFailure,
    riskImpactPosture.isInitialLoading,
    riskImpactPosture.isPermissionBlocked,
    riskImpactPosture.isRefreshing,
    riskImpactPosture.isUnavailable,
    riskImpactQuery.data,
    selectedApprovalProposal,
    selectedApprovalWorkflowContext,
    selectedImplementationProposal,
    selectedImplementationWorkflowContext,
    selectedRiskProposal,
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
      title={mode === "approval-queue" ? "Review desk" : model.title}
      subtitle={
        mode === "approval-queue"
          ? "Select a proposal, confirm its source posture, and continue to the full review record."
          : model.subtitle
      }
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
          Proposal lifecycle is unavailable. No fallback proposal queue is
          shown.
        </Alert>
      ) : null}
      {proposalSourcePosture.hasRefreshFailure ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          The proposal view could not be refreshed. Previously retrieved rows
          remain visible while the source is rechecked.
        </Alert>
      ) : null}
      {mode === "suitability" &&
      policyQueuePosture.isUnavailable &&
      !policyQueuePosture.isPermissionBlocked ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Policy review queue is unavailable. No fallback suitability policy
          queue is shown.
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
        <div
          className={styles.countStrip}
          aria-label="Proposal lifecycle counts"
        >
          <div>
            <span>{model.totalCount}</span>
            <strong>In view</strong>
          </div>
          {mode === "implementation" ? null : (
            <div>
              <span>{model.attentionCount}</span>
              <strong>
                {mode === "approval-queue"
                  ? "Not execution-ready"
                  : "Need action"}
              </strong>
            </div>
          )}
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
            reviewRequestMatchesSelection &&
            requestMoreEvidenceMutation.isPending
          }
          reviewRequestSucceeded={
            reviewRequestMatchesSelection &&
            requestMoreEvidenceMutation.isSuccess
          }
          reviewRequestFailed={
            reviewRequestMatchesSelection &&
            Boolean(requestMoreEvidenceMutation.error)
          }
          onRequestMoreEvidence={() => {
            if (
              selectedPolicyEvaluationId &&
              policyEvidenceModel?.evaluationId ===
                selectedPolicyEvaluationId &&
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
      ) : mode === "approval-queue" ? (
        <ProposalLifecycleDecisionWorkspace
          key={`${portfolioId}:${sourceWindow.cursor ?? "first"}`}
          rows={model.rows}
          selectedProposal={selectedApprovalProposal}
          onSelectProposal={(proposalId) =>
            setApprovalSelection({ portfolioId, proposalId })
          }
          evidence={approvalEvidenceModel}
          isLoading={approvalEvidencePosture.isInitialLoading}
          isRefreshing={approvalEvidencePosture.isRefreshing}
          isPermissionBlocked={approvalEvidencePosture.isPermissionBlocked}
          hasError={approvalEvidencePosture.isUnavailable}
          hasRefreshFailure={approvalEvidencePosture.hasRefreshFailure}
          onRefresh={async () => {
            const results = await Promise.all([
              proposalQuery.refetch(),
              approvalDetailQuery.refetch(),
              approvalWorkflowQuery.refetch(),
              approvalRecordsQuery.refetch(),
              approvalLineageQuery.refetch(),
            ]);
            const [
              proposalResult,
              detailResult,
              workflowResult,
              approvalsResult,
              lineageResult,
            ] = results;
            const failedResult = results.find(
              (result) => result.isError || result.error !== null,
            );
            if (failedResult) {
              throw (
                failedResult.error ??
                new Error(
                  "The selected proposal evidence refresh did not complete.",
                )
              );
            }
            const refreshedProposal = proposalResult.data?.items.find(
              (proposal) =>
                proposal.proposal_id === selectedApprovalProposal?.proposalId,
            );
            if (
              !refreshedProposal ||
              refreshedProposal.portfolio_id !== portfolioId
            ) {
              throw new Error(
                "The selected proposal is no longer present in the current portfolio worklist.",
              );
            }
            confirmRefreshedProposalApprovalEvidence({
              approvals: approvalsResult.data,
              detail: detailResult.data,
              expectedPortfolioId: refreshedProposal.portfolio_id,
              expectedProposalId: refreshedProposal.proposal_id,
              expectedState: refreshedProposal.current_state,
              expectedVersionNo: refreshedProposal.current_version_no ?? null,
              lineage: lineageResult.data,
              workflow: workflowResult.data,
            });
            const refreshedEvidenceQueryKey = [
              "proposal-approval-evidence",
              portfolioId,
              refreshedProposal.proposal_id,
              refreshedProposal.current_version_no ?? null,
            ] as const;
            queryClient.setQueryData(
              [...refreshedEvidenceQueryKey, "detail"],
              detailResult.data,
            );
            queryClient.setQueryData(
              [...refreshedEvidenceQueryKey, "workflow"],
              workflowResult.data,
            );
            queryClient.setQueryData(
              [...refreshedEvidenceQueryKey, "approvals"],
              approvalsResult.data,
            );
            queryClient.setQueryData(
              [...refreshedEvidenceQueryKey, "lineage"],
              lineageResult.data,
            );
            return results;
          }}
        />
      ) : mode === "risk-impact" ? (
        <ProposalRiskImpactWorkspace
          key={`${portfolioId}:${sourceWindow.cursor ?? "first"}`}
          portfolioId={portfolioId}
          rows={model.rows}
          selectedProposal={selectedRiskProposal}
          onSelectProposal={(proposalId) =>
            setRiskSelection({ portfolioId, proposalId })
          }
          evidence={riskImpactQuery.data ?? null}
          isLoading={riskImpactPosture.isInitialLoading}
          isRefreshing={riskImpactPosture.isRefreshing}
          isPermissionBlocked={riskImpactPosture.isPermissionBlocked}
          hasError={riskImpactPosture.isUnavailable}
          hasRefreshFailure={riskImpactPosture.hasRefreshFailure}
          onRefresh={async () => await riskImpactQuery.refetch()}
        />
      ) : mode === "implementation" ? (
        <ProposalImplementationStatusWorkspace
          key={`${portfolioId}:${sourceWindow.cursor ?? "first"}`}
          portfolioId={portfolioId}
          rows={model.rows}
          selectedProposal={selectedImplementationProposal}
          onSelectProposal={(proposalId) =>
            setImplementationSelection({ portfolioId, proposalId })
          }
          evidence={implementationStatusQuery.data ?? null}
          isLoading={implementationStatusPosture.isInitialLoading}
          isRefreshing={implementationStatusPosture.isRefreshing}
          isPermissionBlocked={implementationStatusPosture.isPermissionBlocked}
          hasError={implementationStatusPosture.isUnavailable}
          hasRefreshFailure={implementationStatusPosture.hasRefreshFailure}
          onRefresh={async () => {
            const [proposalResult, statusResult] = await Promise.all([
              proposalQuery.refetch(),
              implementationStatusQuery.refetch(),
            ]);
            const failedResult = [proposalResult, statusResult].find(
              (result) => result.isError || result.error !== null,
            );
            if (failedResult) {
              throw (
                failedResult.error ??
                new Error("Implementation evidence refresh did not complete.")
              );
            }
            const refreshedProposal = proposalResult.data?.items.find(
              (proposal) =>
                proposal.proposal_id ===
                selectedImplementationProposal?.proposalId,
            );
            const refreshedEvidence = statusResult.data?.data;
            if (
              !refreshedProposal ||
              refreshedProposal.portfolio_id !== portfolioId ||
              !refreshedEvidence ||
              refreshedEvidence.proposal_id !== refreshedProposal.proposal_id ||
              refreshedEvidence.portfolio_id !==
                refreshedProposal.portfolio_id ||
              refreshedEvidence.current_version_no !==
                refreshedProposal.current_version_no ||
              refreshedEvidence.current_state !==
                refreshedProposal.current_state
            ) {
              throw new Error(
                "The refreshed worklist and implementation evidence do not identify the same proposal state.",
              );
            }
            return [proposalResult, statusResult];
          }}
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
                    <SemanticBadge tone={row.stageTone}>
                      {row.stage}
                    </SemanticBadge>
                  </td>
                  <td>
                    <SemanticBadge tone={row.readinessTone}>
                      {row.readiness}
                    </SemanticBadge>
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
