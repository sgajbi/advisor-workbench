"use client";

import {
  useIsMutating,
  useMutation,
  useMutationState,
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
  expectedState: string;
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

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : undefined;
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
    mutationFn: async ({ action, expectedState, previousState, successPrefix }: LifecycleActionVariables) => {
      const response = await action();
      try {
        confirmProposalTransitionResponse(response, proposalId, expectedState);
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
      try {
        const responseData = objectRecord(objectRecord(response)?.data);
        const proposalData = objectRecord(responseData?.proposal);
        const versionData = objectRecord(responseData?.version);
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
  const persistedCommandErrors = useMutationState({
    filters: {
      mutationKey: proposalDetailMutationKeys.persisted(proposalId),
      status: "error",
    },
    select: (mutation) => mutation.state.error,
  });
  let persistedConfirmationFailure: ProposalPersistedEvidenceConfirmationError | null = null;
  for (const error of persistedCommandErrors) {
    if (error instanceof ProposalPersistedEvidenceConfirmationError) {
      persistedConfirmationFailure = error;
    }
  }

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
    persistedConfirmationFailure,
    versionLookupMutation,
    workflowQuery,
  };
}
