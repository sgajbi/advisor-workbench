"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import { PROPOSAL_DISCUSSION_PACK_COPY } from "@/copy/proposal-discussion-pack-copy";
import { PROPOSAL_IMPLEMENTATION_COPY } from "@/copy/proposal-implementation-copy";
import {
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  SourceWindowNavigation,
  Text,
  WorkbenchContextNotice,
  buildWorkbenchUnsupportedReviewContextNotice,
  useAdmittedSourceSelection,
  useSourceWindow,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  combineQuerySourcePostures,
  projectQuerySourcePosture,
} from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";
import { buildReviewContextNavigationHref } from "@/shell/review-context";

import {
  getAdvisoryPolicyEvaluation,
  getAdvisoryPolicyReviewQueue,
  getAdvisoryPolicySignOffPackage,
  getAdvisoryPolicyWorkflow,
  getProposal,
  getProposalApprovals,
  getProposalLineage,
  getProposalRiskImpact,
  getProposalWorkflowEvents,
  listProposals,
  recordAdvisoryPolicySignOffDecision,
} from "../api";
import {
  buildAdvisoryJourneyHref,
  type AdvisoryJourneyReviewContext,
} from "../advisory-journey-navigation";
import {
  buildProposalLifecycleWorkspaceModel,
  type ProposalLifecycleMode,
} from "../proposal-lifecycle-workspace-view-model";
import {
  buildProposalApprovalEvidenceModel,
  confirmRefreshedProposalApprovalEvidence,
} from "../proposal-approval-evidence-view-model";
import {
  buildPolicyEvaluationEvidenceModel,
  buildPolicyReviewQueueModel,
  resolvePolicyReviewSelection,
} from "../proposal-policy-review-view-model";
import {
  buildProposalQueueWorkflowContext,
  buildSuitabilityReviewWorkflowContext,
} from "../proposal-workflow-context-view-model";
import { SUITABILITY_WORKFLOW_LABELS } from "../suitability-terminology";
import { useProposalImplementationStatus } from "../use-proposal-implementation-status";
import { useProposalDiscussionPack } from "../use-proposal-discussion-pack";
import PolicyReviewWorkspace from "./policy-review-workspace";
import ProposalDiscussionPackWorkspace from "./proposal-discussion-pack-workspace";
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

type SourceRefreshTransaction = {
  generation: number;
  scope: string;
  state: "pending" | "failed";
};

export default function ProposalLifecycleWorkspace({
  portfolioId,
  reviewContext,
  mode,
}: {
  portfolioId: string;
  reviewContext?: AdvisoryJourneyReviewContext;
  mode: ProposalLifecycleMode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [policySelection, setPolicySelection] = useState<{
    portfolioId: string;
    evaluationId: string;
  } | null>(null);
  const [riskSelection, setRiskSelection] = useState<{
    portfolioId: string;
    proposalId: string;
  } | null>(null);
  const implementationRefreshGenerationRef = useRef(0);
  const implementationRefreshScopeRef = useRef("");
  const discussionRefreshGenerationRef = useRef(0);
  const discussionRefreshScopeRef = useRef("");
  const [
    implementationRefreshTransaction,
    setImplementationRefreshTransaction,
  ] = useState<SourceRefreshTransaction | null>(null);
  const [discussionRefreshTransaction, setDiscussionRefreshTransaction] =
    useState<SourceRefreshTransaction | null>(null);
  const sourceWindow = useSourceWindow(portfolioId);
  const activeReviewContext: AdvisoryJourneyReviewContext = {
    ...reviewContext,
    portfolioId,
  };
  const proposalBuilderHref = buildAdvisoryJourneyHref(
    activeReviewContext,
    "proposal-builder",
  );
  const sourceContextNotice = buildWorkbenchUnsupportedReviewContextNotice({
    title: "Proposal worklist scope",
    subject: "Proposal lifecycle evidence",
    destination: "proposal worklist",
    requestedAsOfDate: reviewContext?.asOfDate,
    requestedPeriod: reviewContext?.period,
    requestedReportingCurrency: reviewContext?.reportingCurrency,
  });
  const proposalQueryKey = [
    "proposal-lifecycle-workspace",
    portfolioId,
    mode,
    sourceWindow.cursor,
  ] as const;
  const readProposalWindow = async () =>
    await listProposals({
      portfolioId,
      cursor: sourceWindow.cursor,
      ...(mode === "risk-impact"
        ? { state: "RISK_REVIEW" }
        : mode === "discussion-pack"
          ? { state: "AWAITING_CLIENT_CONSENT" }
          : {}),
    });
  const proposalQuery = useQuery({
    queryKey: proposalQueryKey,
    queryFn: readProposalWindow,
    enabled: mode !== "suitability",
    ...workbenchStrictQueryDefaults,
  });
  const { data } = proposalQuery;
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
        reviewContext,
        mode,
        proposals,
        hasMoreResults: Boolean(data?.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
      }),
    [
      data?.next_cursor,
      mode,
      portfolioId,
      proposals,
      reviewContext,
      sourceWindow.hasPrevious,
    ],
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
  const [selectedApprovalProposalId, selectApprovalProposal] =
    useAdmittedSourceSelection({
      scopeKey: `${portfolioId}:${sourceWindow.cursor ?? "first"}:${reviewContext?.selectedRecordId ?? ""}`,
      requestedKey: reviewContext?.selectedRecordId,
      admittedKeys: model.rows.map((row) => row.proposalId),
      sourceResolved: data !== undefined,
    });
  const selectedApprovalProposal =
    model.rows.find((row) => row.proposalId === selectedApprovalProposalId) ??
    null;

  function updateApprovalSelection(proposalId: string) {
    selectApprovalProposal(proposalId);
    const href = buildReviewContextNavigationHref({
      pathname,
      searchParams,
      patch: { portfolioId, selectedRecordId: proposalId },
    });
    if (href) router.push(href, { scroll: false });
  }
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
  const {
    query: implementationStatusQuery,
    selectedProposal: selectedImplementationProposal,
    selectProposal: setSelectedImplementationProposal,
    refreshForProposal: refreshImplementationStatusForProposal,
    sourcePosture: implementationStatusPosture,
    workflowContext: selectedImplementationWorkflowContext,
  } = useProposalImplementationStatus({ portfolioId, mode, rows: model.rows });
  const {
    query: discussionPackQuery,
    selectedProposal: selectedDiscussionProposal,
    selectProposal: setSelectedDiscussionProposal,
    refreshForProposal: refreshDiscussionPackForProposal,
    sourcePosture: discussionPackPosture,
    workflowContext: selectedDiscussionWorkflowContext,
  } = useProposalDiscussionPack({ portfolioId, mode, rows: model.rows });
  const implementationRefreshScope = `${portfolioId}:${mode}:${sourceWindow.cursor ?? "first"}:${selectedImplementationProposal?.proposalId ?? "none"}`;
  useEffect(() => {
    implementationRefreshGenerationRef.current += 1;
    implementationRefreshScopeRef.current = implementationRefreshScope;
  }, [implementationRefreshScope]);
  const selectImplementationProposal = (proposalId: string) => {
    implementationRefreshGenerationRef.current += 1;
    setImplementationRefreshTransaction(null);
    setSelectedImplementationProposal(proposalId);
  };
  const implementationCompoundRefreshState =
    implementationRefreshTransaction?.scope === implementationRefreshScope
      ? implementationRefreshTransaction.state
      : null;
  const discussionRefreshScope = `${portfolioId}:${mode}:${sourceWindow.cursor ?? "first"}:${selectedDiscussionProposal?.proposalId ?? "none"}:${selectedDiscussionProposal?.versionNo ?? "unknown"}`;
  useEffect(() => {
    discussionRefreshGenerationRef.current += 1;
    discussionRefreshScopeRef.current = discussionRefreshScope;
  }, [discussionRefreshScope]);
  const selectDiscussionProposal = (proposalId: string) => {
    discussionRefreshGenerationRef.current += 1;
    setDiscussionRefreshTransaction(null);
    setSelectedDiscussionProposal(proposalId);
  };
  const discussionCompoundRefreshState =
    discussionRefreshTransaction?.scope === discussionRefreshScope
      ? discussionRefreshTransaction.state
      : null;
  const policyReviewModel = useMemo(
    () =>
      buildPolicyReviewQueueModel({
        records: policyQueueQuery.data?.items ?? [],
        reviewContext,
      }),
    [policyQueueQuery.data?.items, reviewContext],
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
  const selectedPolicyWorkflowContext = useMemo(() => {
    if (
      mode !== "suitability" ||
      !selectedPolicyReview ||
      !policyEvidenceModel
    ) {
      return undefined;
    }

    const blockers = policyEvidenceModel.sourceIdentityAligned
      ? [
          ...policyEvidenceModel.sourceGaps,
          ...policyEvidenceModel.workflowBlockers,
        ].slice(0, 4)
      : [
          "Selected suitability review identity does not agree across source evidence.",
        ];

    return {
      proposalId: policyEvidenceModel.proposalId,
      title: !policyEvidenceModel.sourceIdentityAligned
        ? "Selected suitability evidence is unconfirmed"
        : policyEvidenceModel.policyStatus === "Ready"
          ? "Suitability evidence ready for review"
          : policyEvidenceModel.nextAction,
      summary: !policyEvidenceModel.sourceIdentityAligned
        ? "The selected suitability review, proposal and supporting policy package do not agree."
        : `${policyEvidenceModel.policyStatus}. ${policyEvidenceModel.sourcePosture}.`,
      currentPosture: !policyEvidenceModel.sourceIdentityAligned
        ? "Source identity conflict"
        : `${policyEvidenceModel.policyStatus} · ${policyEvidenceModel.workflowStatus}`,
      nextAction: !policyEvidenceModel.sourceIdentityAligned
        ? "Recheck the selected suitability evidence before taking an advisory action."
        : policyEvidenceModel.nextAction,
      blockers,
      facts: [
        { label: "Proposal", value: policyEvidenceModel.proposalId },
        { label: "Version", value: policyEvidenceModel.proposalVersion },
        { label: "Policy", value: policyEvidenceModel.policyPack },
        {
          label: "Sign-off",
          value: policyEvidenceModel.signOffPackagePosture,
        },
      ],
      sourceLabel: SUITABILITY_WORKFLOW_LABELS.selectedEvidenceSource,
      boundaryNote:
        "Selected suitability evidence is shown only when evaluation, proposal, portfolio, version, package, and workflow identities agree.",
      hasEvidenceGap:
        !policyEvidenceModel.sourceIdentityAligned ||
        policyEvidenceModel.sourceGaps.length > 0,
    };
  }, [mode, policyEvidenceModel, selectedPolicyReview]);
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
    if (mode === "suitability") {
      return buildSuitabilityReviewWorkflowContext({
        portfolioId,
        isLoading: policySourcePosture.isInitialLoading,
        isRefreshing: policySourcePosture.isRefreshing,
        permissionBlocked:
          policyQueuePosture.isPermissionBlocked ||
          policyEvidencePosture.isPermissionBlocked,
        hasError:
          policyQueuePosture.isUnavailable &&
          !policyQueuePosture.isPermissionBlocked,
        hasRefreshFailure: policySourcePosture.hasRefreshFailure,
        hasUnavailableEvidence:
          (policyEvidencePosture.isUnavailable &&
            !policyEvidencePosture.isPermissionBlocked) ||
          policyEvidenceIdentityMismatch,
        totalCount: policyReviewModel.totalCount,
        actionCount: policyReviewModel.actionCount,
        selectedEvidence: selectedPolicyWorkflowContext,
      });
    }

    const approvalSourcesActive =
      mode === "approval-queue" && Boolean(selectedApprovalProposal);
    const riskSourceActive =
      mode === "risk-impact" && Boolean(selectedRiskProposal);
    const implementationSourceActive =
      mode === "implementation" && Boolean(selectedImplementationProposal);
    const discussionSourceActive =
      mode === "discussion-pack" && Boolean(selectedDiscussionProposal);
    const implementationVersionUnavailable =
      implementationSourceActive &&
      selectedImplementationProposal?.versionNo === null;
    const implementationEvidenceIncomplete =
      implementationSourceActive &&
      implementationStatusQuery.data?.data.evidence_state === "partial";
    const riskVersionUnavailable =
      riskSourceActive && selectedRiskProposal?.versionNo === null;
    const discussionVersionUnavailable =
      discussionSourceActive && selectedDiscussionProposal?.versionNo === null;
    const discussionEvidenceIncomplete =
      discussionSourceActive &&
      discussionPackQuery.data?.data.overall_state === "partial";
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
        (riskSourceActive && riskImpactPosture.isInitialLoading) ||
        (discussionSourceActive && discussionPackPosture.isInitialLoading) ||
        (implementationSourceActive &&
          implementationStatusPosture.isInitialLoading),
      isRefreshing:
        proposalSourcePosture.isRefreshing ||
        (approvalSourcesActive && approvalEvidencePosture.isRefreshing) ||
        (riskSourceActive && riskImpactPosture.isRefreshing) ||
        (discussionSourceActive &&
          (discussionPackPosture.isRefreshing ||
            discussionCompoundRefreshState === "pending")) ||
        (implementationSourceActive &&
          (implementationStatusPosture.isRefreshing ||
            implementationCompoundRefreshState === "pending")),
      permissionBlocked: proposalSourcePosture.isPermissionBlocked,
      hasRestrictedEvidence:
        (approvalSourcesActive &&
          approvalEvidencePosture.isPermissionBlocked) ||
        (riskSourceActive && riskImpactPosture.isPermissionBlocked) ||
        (discussionSourceActive && discussionPackPosture.isPermissionBlocked) ||
        (implementationSourceActive &&
          implementationStatusPosture.isPermissionBlocked),
      hasError:
        proposalSourcePosture.isUnavailable &&
        !proposalSourcePosture.isPermissionBlocked,
      hasUnavailableEvidence:
        (approvalSourcesActive &&
          approvalEvidencePosture.isUnavailable &&
          !approvalEvidencePosture.isPermissionBlocked) ||
        (riskSourceActive &&
          ((riskImpactPosture.isUnavailable &&
            !riskImpactPosture.isPermissionBlocked) ||
            riskVersionUnavailable ||
            riskEvidenceIncomplete)) ||
        (discussionSourceActive &&
          ((discussionPackPosture.isUnavailable &&
            !discussionPackPosture.isPermissionBlocked) ||
            discussionVersionUnavailable ||
            discussionEvidenceIncomplete)) ||
        (implementationSourceActive &&
          ((implementationStatusPosture.isUnavailable &&
            !implementationStatusPosture.isPermissionBlocked) ||
            implementationVersionUnavailable ||
            implementationEvidenceIncomplete)),
      hasProposalRefreshFailure: proposalSourcePosture.hasRefreshFailure,
      hasSupportingEvidenceRefreshFailure:
        (approvalSourcesActive && approvalEvidencePosture.hasRefreshFailure) ||
        (riskSourceActive && riskImpactPosture.hasRefreshFailure) ||
        (discussionSourceActive &&
          (discussionPackPosture.hasRefreshFailure ||
            discussionCompoundRefreshState === "failed")) ||
        (implementationSourceActive &&
          (implementationStatusPosture.hasRefreshFailure ||
            implementationCompoundRefreshState === "failed")),
      hasMoreResults: Boolean(data?.next_cursor),
      hasPreviousResults: sourceWindow.hasPrevious,
      windowNumber: sourceWindow.windowNumber,
      totalCount: model.totalCount,
      attentionCount: model.attentionCount,
      primaryDecision: model.primaryDecision,
      recommendedAction: model.recommendedAction,
      selectedEvidence:
        selectedApprovalWorkflowContext ??
        selectedDiscussionWorkflowContext ??
        selectedImplementationWorkflowContext,
      responsivePriority:
        mode === "implementation" ? "supplementary" : undefined,
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
    implementationCompoundRefreshState,
    implementationStatusQuery.data,
    mode,
    model,
    policySourcePosture.hasRefreshFailure,
    policySourcePosture.isInitialLoading,
    policySourcePosture.isRefreshing,
    policyEvidenceIdentityMismatch,
    policyEvidencePosture.isPermissionBlocked,
    policyEvidencePosture.isUnavailable,
    policyQueuePosture.isPermissionBlocked,
    policyQueuePosture.isUnavailable,
    policyReviewModel.actionCount,
    policyReviewModel.totalCount,
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
    discussionPackPosture.hasRefreshFailure,
    discussionPackPosture.isInitialLoading,
    discussionPackPosture.isPermissionBlocked,
    discussionPackPosture.isRefreshing,
    discussionPackPosture.isUnavailable,
    discussionPackQuery.data,
    discussionCompoundRefreshState,
    selectedApprovalProposal,
    selectedApprovalWorkflowContext,
    selectedImplementationProposal,
    selectedImplementationWorkflowContext,
    selectedDiscussionProposal,
    selectedDiscussionWorkflowContext,
    selectedRiskProposal,
    selectedPolicyWorkflowContext,
    sourceWindow.hasPrevious,
    sourceWindow.windowNumber,
  ]);
  usePublishProposalWorkflowContext(workflowContextModel);

  async function refreshImplementationStatus() {
    const refreshGeneration = ++implementationRefreshGenerationRef.current;
    const refreshScope = implementationRefreshScope;
    setImplementationRefreshTransaction({
      generation: refreshGeneration,
      scope: refreshScope,
      state: "pending",
    });

    try {
      const refreshedWindow = await readProposalWindow();
      const refreshedModel = buildProposalLifecycleWorkspaceModel({
        portfolioId,
        mode,
        proposals: refreshedWindow.items,
        hasMoreResults: Boolean(refreshedWindow.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
      });
      const refreshedProposal = refreshedModel.rows.find(
        (row) => row.proposalId === selectedImplementationProposal?.proposalId,
      );
      if (!refreshedProposal || refreshedProposal.versionNo === null) {
        throw new Error(
          "The selected proposal is no longer available for implementation follow-up.",
        );
      }
      const refreshedEvidence =
        await refreshImplementationStatusForProposal(refreshedProposal);
      const transactionIsCurrent =
        implementationRefreshGenerationRef.current === refreshGeneration &&
        implementationRefreshScopeRef.current === refreshScope;
      setImplementationRefreshTransaction((current) =>
        current?.generation === refreshGeneration ? null : current,
      );
      if (!transactionIsCurrent) return refreshedEvidence;
      queryClient.setQueryData(proposalQueryKey, refreshedWindow);
      return refreshedEvidence;
    } catch (error) {
      const transactionIsCurrent =
        implementationRefreshGenerationRef.current === refreshGeneration &&
        implementationRefreshScopeRef.current === refreshScope;
      setImplementationRefreshTransaction((current) =>
        current?.generation === refreshGeneration
          ? transactionIsCurrent
            ? { ...current, state: "failed" }
            : null
          : current,
      );
      throw error;
    }
  }

  async function refreshDiscussionPack() {
    const refreshGeneration = ++discussionRefreshGenerationRef.current;
    const refreshScope = discussionRefreshScope;
    setDiscussionRefreshTransaction({
      generation: refreshGeneration,
      scope: refreshScope,
      state: "pending",
    });

    try {
      const refreshedWindow = await refetchProposalWindow();
      const refreshedModel = buildProposalLifecycleWorkspaceModel({
        portfolioId,
        mode,
        proposals: refreshedWindow.items,
        hasMoreResults: Boolean(refreshedWindow.next_cursor),
        hasPreviousResults: sourceWindow.hasPrevious,
      });
      const refreshedProposal = refreshedModel.rows.find(
        (row) => row.proposalId === selectedDiscussionProposal?.proposalId,
      );
      if (!refreshedProposal || refreshedProposal.versionNo === null) {
        throw new Error(
          PROPOSAL_DISCUSSION_PACK_COPY.selectionUnavailableError,
        );
      }
      const refreshedEvidence =
        await refreshDiscussionPackForProposal(refreshedProposal);
      const transactionIsCurrent =
        discussionRefreshGenerationRef.current === refreshGeneration &&
        discussionRefreshScopeRef.current === refreshScope;
      setDiscussionRefreshTransaction((current) =>
        current?.generation === refreshGeneration ? null : current,
      );
      if (transactionIsCurrent) {
        queryClient.setQueryData(proposalQueryKey, refreshedWindow);
      }
      return refreshedEvidence;
    } catch (error) {
      const transactionIsCurrent =
        discussionRefreshGenerationRef.current === refreshGeneration &&
        discussionRefreshScopeRef.current === refreshScope;
      setDiscussionRefreshTransaction((current) =>
        current?.generation === refreshGeneration
          ? transactionIsCurrent
            ? { ...current, state: "failed" }
            : null
          : current,
      );
      throw error;
    }
  }

  async function refreshSuitabilityReview() {
    const queueResult = await policyQueueQuery.refetch();
    if (queueResult.isError || !queueResult.data) {
      throw (
        queueResult.error ??
        new Error(
          "The suitability worklist refresh did not return source data.",
        )
      );
    }

    if (!selectedPolicyEvaluationId) {
      return [queueResult];
    }

    const selectedReview = buildPolicyReviewQueueModel({
      records: queueResult.data.items ?? [],
      reviewContext,
    }).rows.find((row) => row.evaluationId === selectedPolicyEvaluationId);
    if (!selectedReview) {
      throw new Error(
        "The selected suitability review is no longer present in the worklist.",
      );
    }

    const evidenceResults = await Promise.all([
      policyEvaluationQuery.refetch(),
      policySignOffPackageQuery.refetch(),
      policyWorkflowQuery.refetch(),
    ]);
    const failedResult = evidenceResults.find(
      (result) => result.isError || result.error !== null,
    );
    if (failedResult) {
      throw (
        failedResult.error ??
        new Error("The selected suitability evidence refresh did not complete.")
      );
    }

    const refreshedEvidence = buildPolicyEvaluationEvidenceModel({
      evaluation: evidenceResults[0].data,
      signOffPackage: evidenceResults[1].data,
      workflow: evidenceResults[2].data,
      selectedReview,
      portfolioId,
    });
    if (!refreshedEvidence?.sourceIdentityAligned) {
      throw new Error(
        "The refreshed suitability evidence does not agree on the selected policy identity.",
      );
    }

    return [queueResult, ...evidenceResults];
  }

  async function refetchProposalWindow() {
    const result = await proposalQuery.refetch();
    if (result.isError || !result.data) {
      throw (
        result.error ??
        new Error("The proposal worklist refresh did not return source data.")
      );
    }
    return result.data;
  }

  const activeQueuePosture =
    mode === "suitability" ? policyQueuePosture : proposalSourcePosture;

  if (activeQueuePosture.isInitialLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">
            {mode === "suitability"
              ? "Loading suitability reviews..."
              : "Loading proposal lifecycle..."}
          </Text>
        </Stack>
      </SectionBlock>
    );
  }

  if (activeQueuePosture.isPermissionBlocked) {
    return (
      <SectionBlock>
        <ScreenStatePanel
          kind="permission_blocked"
          title={
            mode === "suitability"
              ? "Suitability review access is unavailable"
              : "Proposal access is not available"
          }
          body={
            mode === "suitability"
              ? "Your current role does not permit this portfolio's suitability review worklist to be viewed."
              : "Your current role does not permit this portfolio's proposal workflow to be viewed."
          }
          surface="default"
        />
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title={
        mode === "approval-queue"
          ? "Review desk"
          : mode === "suitability"
            ? "Suitability decision desk"
            : mode === "discussion-pack"
              ? PROPOSAL_DISCUSSION_PACK_COPY.workspaceTitle
              : mode === "implementation"
                ? PROPOSAL_IMPLEMENTATION_COPY.workspaceTitle
                : model.title
      }
      subtitle={
        mode === "approval-queue"
          ? "Select a proposal, confirm its source posture, and continue to the full review record."
          : mode === "suitability"
            ? "Select a suitability review, confirm its client and product constraints, and resolve the next evidence requirement."
            : mode === "discussion-pack"
              ? PROPOSAL_DISCUSSION_PACK_COPY.workspaceSubtitle
              : mode === "implementation"
                ? PROPOSAL_IMPLEMENTATION_COPY.workspaceSubtitle
                : model.subtitle
      }
      actions={
        <Link className="nav-link" href={proposalBuilderHref}>
          Build Proposal
        </Link>
      }
    >
      {sourceContextNotice ? (
        <WorkbenchContextNotice {...sourceContextNotice} />
      ) : null}
      {mode !== "suitability" && proposalSourcePosture.isUnavailable ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Proposal lifecycle is unavailable. No fallback proposal queue is
          shown.
        </Alert>
      ) : null}
      {mode !== "suitability" && proposalSourcePosture.hasRefreshFailure ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          The proposal view could not be refreshed. Previously retrieved rows
          remain visible while the source is rechecked.
        </Alert>
      ) : null}
      {mode === "suitability" &&
      policyQueuePosture.isUnavailable &&
      !policyQueuePosture.isPermissionBlocked ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Suitability review worklist is unavailable. No fallback suitability
          worklist is shown.
        </Alert>
      ) : null}

      {mode !== "suitability" ? (
        <div className={styles.decisionPanel}>
          <div>
            <Text variant="microLabel">Adviser decision</Text>
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
                    : "Needs action"}
                </strong>
              </div>
            )}
          </div>
        </div>
      ) : null}

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
          onRefresh={refreshSuitabilityReview}
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

      {mode === "suitability" ? null : proposalSourcePosture.isUnavailable ? (
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
            <Link className="nav-link" href={proposalBuilderHref}>
              Build proposal
            </Link>
          }
          surface="default"
        />
      ) : mode === "approval-queue" ? (
        <ProposalLifecycleDecisionWorkspace
          key={`${portfolioId}:${sourceWindow.cursor ?? "first"}`}
          rows={model.rows}
          selectedProposal={selectedApprovalProposal}
          onSelectProposal={updateApprovalSelection}
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
      ) : mode === "discussion-pack" ? (
        <ProposalDiscussionPackWorkspace
          key={`${portfolioId}:${sourceWindow.cursor ?? "first"}`}
          rows={model.rows}
          selectedProposal={selectedDiscussionProposal}
          onSelectProposal={selectDiscussionProposal}
          evidence={discussionPackQuery.data ?? null}
          isLoading={discussionPackPosture.isInitialLoading}
          isRefreshing={
            discussionPackPosture.isRefreshing ||
            discussionCompoundRefreshState === "pending"
          }
          isPermissionBlocked={discussionPackPosture.isPermissionBlocked}
          hasError={discussionPackPosture.isUnavailable}
          hasRefreshFailure={
            discussionPackPosture.hasRefreshFailure ||
            discussionCompoundRefreshState === "failed"
          }
          onRefresh={refreshDiscussionPack}
        />
      ) : mode === "implementation" ? (
        <ProposalImplementationStatusWorkspace
          key={`${portfolioId}:${sourceWindow.cursor ?? "first"}`}
          portfolioId={portfolioId}
          rows={model.rows}
          selectedProposal={selectedImplementationProposal}
          onSelectProposal={selectImplementationProposal}
          evidence={implementationStatusQuery.data ?? null}
          isLoading={implementationStatusPosture.isInitialLoading}
          isRefreshing={
            implementationStatusPosture.isRefreshing ||
            implementationCompoundRefreshState === "pending"
          }
          isPermissionBlocked={implementationStatusPosture.isPermissionBlocked}
          hasError={implementationStatusPosture.isUnavailable}
          hasRefreshFailure={
            implementationStatusPosture.hasRefreshFailure ||
            implementationCompoundRefreshState === "failed"
          }
          onRefresh={refreshImplementationStatus}
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
      {mode !== "suitability" &&
      !proposalSourcePosture.isPermissionBlocked &&
      (!proposalSourcePosture.isUnavailable || sourceWindow.hasPrevious) ? (
        <SourceWindowNavigation
          ariaLabel="Proposal queue navigation"
          currentWindow={sourceWindow.windowNumber}
          hasPrevious={sourceWindow.hasPrevious}
          hasNext={Boolean(data?.next_cursor)}
          isLoading={proposalQuery.isFetching}
          itemLabel="proposals"
          viewLabel="Proposal view"
          onPrevious={sourceWindow.showPrevious}
          onNext={() => sourceWindow.showNext(data?.next_cursor)}
        />
      ) : null}
    </SectionBlock>
  );
}
