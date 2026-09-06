"use client";

import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  createProposalVersion,
  getProposal,
  getProposalApprovals,
  getProposalLineage,
  getProposalVersion,
  getProposalWorkflowEvents,
} from "./api";
import { ProposalActionBusinessError } from "./proposal-action-error";
import {
  confirmProposalTransitionResponse,
  confirmRefreshedProposalActionEvidence,
  confirmRefreshedProposalVersionEvidence,
  ProposalPersistedEvidenceConfirmationError,
} from "./proposal-action-evidence";
import {
  proposalDetailCommandScope,
  proposalDetailMutationKeys,
  proposalDetailQueryKeys,
} from "./proposal-detail-query-keys";
import { proposalStageDescription } from "./proposal-workflow-copy";
import type { ProposalStateTransitionEnvelopeResponse } from "./types";

type LifecycleActionVariables = Readonly<{
  action: () => Promise<ProposalStateTransitionEnvelopeResponse>;
  previousState: string;
  successPrefix: string;
}>;

type CreateVersionVariables = Readonly<{
  previousVersionNo: number;
  simulateRequest: Record<string, unknown> | null;
}>;

function persistedConfirmationError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : "The source action completed, but refreshed review evidence could not be confirmed.";
  return new ProposalPersistedEvidenceConfirmationError(message);
}

export function useProposalDetailQueryState({
  includeEvidence,
  proposalId,
  proposalIdValid,
}: {
  includeEvidence: boolean;
  proposalId: string;
  proposalIdValid: boolean;
}) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: proposalDetailQueryKeys.record(proposalId, includeEvidence),
    queryFn: async () => await getProposal(proposalId, includeEvidence),
    enabled: proposalIdValid,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === proposalId ? previousData : undefined,
    ...workbenchStrictQueryDefaults,
  });
  const workflowQuery = useQuery({
    queryKey: proposalDetailQueryKeys.workflow(proposalId),
    queryFn: async () => await getProposalWorkflowEvents(proposalId),
    enabled: !!detailQuery.data?.proposal,
    ...workbenchStrictQueryDefaults,
  });
  const approvalsQuery = useQuery({
    queryKey: proposalDetailQueryKeys.approvals(proposalId),
    queryFn: async () => await getProposalApprovals(proposalId),
    enabled: !!detailQuery.data?.proposal,
    ...workbenchStrictQueryDefaults,
  });
  const lineageQuery = useQuery({
    queryKey: proposalDetailQueryKeys.lineage(proposalId),
    queryFn: async () => await getProposalLineage(proposalId),
    enabled: !!detailQuery.data?.proposal,
    ...workbenchStrictQueryDefaults,
  });

  async function refreshProposalEvidence() {
    await queryClient.invalidateQueries({
      queryKey: proposalDetailQueryKeys.proposal(proposalId),
      refetchType: "none",
    });
    const [detailResult, workflowResult, approvalsResult, lineageResult] = await Promise.all([
      detailQuery.refetch(),
      workflowQuery.refetch(),
      approvalsQuery.refetch(),
      lineageQuery.refetch(),
    ]);
    if (detailResult.error || workflowResult.error || approvalsResult.error || lineageResult.error) {
      throw new ProposalActionBusinessError(
        "The source action completed, but the refreshed review evidence could not be confirmed. Reload the proposal before continuing.",
      );
    }
    return {
      approvals: approvalsResult.data,
      lineage: lineageResult.data,
      proposalDetail: detailResult.data,
      workflow: workflowResult.data,
    };
  }

  const actionMutation = useMutation({
    mutationKey: proposalDetailMutationKeys.lifecycle(proposalId),
    scope: { id: proposalDetailCommandScope(proposalId) },
    mutationFn: async ({ action, previousState, successPrefix }: LifecycleActionVariables) => {
      const response = await action();
      try {
        const expectedState = confirmProposalTransitionResponse(response, proposalId);
        const refreshed = await refreshProposalEvidence();
        const refreshedState = confirmRefreshedProposalActionEvidence({
          approvals: refreshed.approvals,
          expectedProposalId: proposalId,
          expectedState,
          lineage: refreshed.lineage,
          previousState,
          proposalDetail: refreshed.proposalDetail,
          workflow: refreshed.workflow,
        });
        return `${successPrefix} Current posture: ${proposalStageDescription(refreshedState)}`;
      } catch (error) {
        throw persistedConfirmationError(error);
      }
    },
  });

  const createVersionMutation = useMutation({
    mutationKey: proposalDetailMutationKeys.createVersion(proposalId),
    scope: { id: proposalDetailCommandScope(proposalId) },
    mutationFn: async ({ previousVersionNo, simulateRequest }: CreateVersionVariables) => {
      if (!simulateRequest) {
        throw new ProposalActionBusinessError(
          "Current proposal evidence does not include the source inputs required to create a new version. Refresh the full evidence record before trying again.",
        );
      }
      const response = await createProposalVersion(
        proposalId,
        {
          body: {
            created_by: "advisor_1",
            simulate_request: simulateRequest,
          },
        },
        `ui-version-${proposalId}-${Date.now()}`,
      );
      const proposalData = (response.data.proposal as Record<string, unknown> | undefined) ?? undefined;
      const versionData = (response.data.version as Record<string, unknown> | undefined) ?? undefined;
      const expectedVersionNo = proposalData?.current_version_no;
      if (
        proposalData?.proposal_id !== proposalId
        || versionData?.proposal_id !== proposalId
        || versionData?.version_no !== expectedVersionNo
        || typeof expectedVersionNo !== "number"
        || !Number.isInteger(expectedVersionNo)
        || expectedVersionNo < 1
        || expectedVersionNo <= previousVersionNo
      ) {
        throw new ProposalPersistedEvidenceConfirmationError(
          "The source action completed, but did not identify a matching newly created proposal version. Reload the proposal before continuing.",
        );
      }
      try {
        const refreshed = await refreshProposalEvidence();
        return confirmRefreshedProposalVersionEvidence({
          approvals: refreshed.approvals,
          expectedProposalId: proposalId,
          expectedVersionNo,
          lineage: refreshed.lineage,
          previousVersionNo,
          proposalDetail: refreshed.proposalDetail,
          workflow: refreshed.workflow,
        });
      } catch (error) {
        throw persistedConfirmationError(error);
      }
    },
  });

  const versionLookupMutation = useMutation({
    mutationKey: proposalDetailMutationKeys.loadVersion(proposalId),
    mutationFn: async ({
      includeEvidence: requestedEvidence,
      versionNo,
    }: {
      includeEvidence: boolean;
      versionNo: number;
    }) => await getProposalVersion(proposalId, versionNo, requestedEvidence),
  });
  const persistedCommandCount = useIsMutating({
    mutationKey: proposalDetailMutationKeys.persisted(proposalId),
  });

  function hasPendingCommand(): boolean {
    return queryClient.isMutating({
      mutationKey: proposalDetailMutationKeys.persisted(proposalId),
    }) > 0;
  }

  return {
    actionMutation,
    approvalsQuery,
    createVersionMutation,
    detailQuery,
    hasPendingCommand,
    lineageQuery,
    persistedCommandCount,
    versionLookupMutation,
    workflowQuery,
  };
}
