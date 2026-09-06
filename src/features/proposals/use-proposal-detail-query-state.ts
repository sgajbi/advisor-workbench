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
  getProposal,
  getProposalApprovals,
  getProposalLineage,
  getProposalVersion,
  getProposalWorkflowEvents,
} from "./api";
import { ProposalActionBusinessError } from "./proposal-action-error";
import {
  asPersistedProposalConfirmationError,
  confirmCreatedProposalVersion,
  executeProposalLifecycleCommand,
  executeProposalVersionCommand,
  isAmbiguousProposalCommandFailure,
  isProposalCommandStateConflict,
  proposalLifecycleSuccessMessage,
} from "./proposal-command-execution";
import {
  latestCommandSnapshot,
  removeSettledCommandHistory,
  type PersistedCommandSnapshot,
} from "./proposal-detail-command-state";
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
import {
  useProposalCommandRecovery,
  type ProposalLifecycleCommandIntent,
  type ProposalVersionCommandIntent,
} from "./use-proposal-command-recovery";

type CreateVersionVariables = Readonly<{
  idempotencyKey: string;
  previousVersionNo: number;
  simulateRequest: Record<string, unknown> | null;
}>;

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
  const commandRecovery = useProposalCommandRecovery(proposalId, proposalIdValid);
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
        "The source action completed, but the refreshed review evidence could not be confirmed. Use Recheck earlier action before continuing.",
      );
    }
    return {
      approvals: approvalsResult.data,
      lineage: lineageResult.data,
      proposalDetail: detailResult.data,
      workflow: workflowResult.data,
    };
  }

  async function reconcileRejectedCommand(error: unknown) {
    if (isProposalCommandStateConflict(error)) {
      commandRecovery.forget();
      await refreshProposalEvidence().catch(() => undefined);
      return;
    }
    if (!isAmbiguousProposalCommandFailure(error)) {
      commandRecovery.forget();
    }
  }

  const actionMutation = useMutation({
    mutationKey: proposalDetailMutationKeys.lifecycle(proposalId),
    scope: { id: proposalDetailCommandScope(proposalId) },
    gcTime: Infinity,
    onMutate: () => {
      removeSettledCommandHistory(
        queryClient,
        proposalDetailMutationKeys.lifecycle(proposalId),
      );
    },
    mutationFn: async (intent: ProposalLifecycleCommandIntent) => {
      if (!commandRecovery.remember(intent)) {
        throw new ProposalActionBusinessError(
          "This browser cannot retain a replay-safe proposal action. No proposal change was requested.",
        );
      }
      let response;
      try {
        response = await executeProposalLifecycleCommand(intent);
      } catch (error) {
        await reconcileRejectedCommand(error);
        throw error;
      }
      try {
        const confirmation = confirmProposalTransitionResponse(response, intent);
        const refreshed = await refreshProposalEvidence();
        confirmRefreshedProposalActionEvidence({
          approvals: refreshed.approvals,
          confirmation,
          expectedProposalId: proposalId,
          expectedState: intent.expectedState,
          lineage: refreshed.lineage,
          previousState: intent.previousState,
          proposalDetail: refreshed.proposalDetail,
          workflow: refreshed.workflow,
        });
        commandRecovery.forget();
        return proposalLifecycleSuccessMessage(intent);
      } catch (error) {
        throw asPersistedProposalConfirmationError(error);
      }
    },
  });

  const createVersionMutation = useMutation({
    mutationKey: proposalDetailMutationKeys.createVersion(proposalId),
    scope: { id: proposalDetailCommandScope(proposalId) },
    gcTime: Infinity,
    onMutate: () => {
      removeSettledCommandHistory(
        queryClient,
        proposalDetailMutationKeys.createVersion(proposalId),
      );
    },
    mutationFn: async ({ idempotencyKey, previousVersionNo, simulateRequest }: CreateVersionVariables) => {
      if (!simulateRequest) {
        throw new ProposalActionBusinessError(
          "Current proposal evidence does not include the source inputs required to create a new version. Refresh the full evidence record before trying again.",
        );
      }
      const intent: ProposalVersionCommandIntent = {
        idempotencyKey,
        kind: "create-version",
        previousVersionNo,
        proposalId,
        simulateRequest,
      };
      if (!commandRecovery.remember(intent)) {
        throw new ProposalActionBusinessError(
          "This browser cannot retain replay-safe version recovery. No proposal change was requested.",
        );
      }
      let response;
      try {
        response = await executeProposalVersionCommand(intent);
      } catch (error) {
        await reconcileRejectedCommand(error);
        throw error;
      }
      try {
        const expectedVersionNo = confirmCreatedProposalVersion(
          response,
          proposalId,
          previousVersionNo,
        );
        const refreshed = await refreshProposalEvidence();
        const confirmedVersionNo = confirmRefreshedProposalVersionEvidence({
          approvals: refreshed.approvals,
          expectedProposalId: proposalId,
          expectedVersionNo,
          lineage: refreshed.lineage,
          previousVersionNo,
          proposalDetail: refreshed.proposalDetail,
          workflow: refreshed.workflow,
        });
        commandRecovery.forget();
        return confirmedVersionNo;
      } catch (error) {
        throw asPersistedProposalConfirmationError(error);
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
  const lifecycleCommandSnapshots = useMutationState({
    filters: {
      exact: true,
      mutationKey: proposalDetailMutationKeys.lifecycle(proposalId),
    },
    select: (mutation): PersistedCommandSnapshot<string> => ({
      data: typeof mutation.state.data === "string" ? mutation.state.data : null,
      error: mutation.state.error,
      status: mutation.state.status,
      submittedAt: mutation.state.submittedAt,
    }),
  });
  const createVersionCommandSnapshots = useMutationState({
    filters: {
      exact: true,
      mutationKey: proposalDetailMutationKeys.createVersion(proposalId),
    },
    select: (mutation): PersistedCommandSnapshot<number> => ({
      data: typeof mutation.state.data === "number" ? mutation.state.data : null,
      error: mutation.state.error,
      status: mutation.state.status,
      submittedAt: mutation.state.submittedAt,
    }),
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

  function recoverPersistedCommand(): void {
    const recovery = commandRecovery.query.data;
    if (recovery?.state !== "recoverable" || hasPendingCommand()) {
      return;
    }
    if (recovery.intent.kind === "lifecycle") {
      actionMutation.mutate(recovery.intent);
    } else {
      createVersionMutation.mutate(recovery.intent);
    }
  }

  return {
    actionCommandState: latestCommandSnapshot(lifecycleCommandSnapshots),
    actionMutation,
    approvalsQuery,
    createVersionCommandState: latestCommandSnapshot(createVersionCommandSnapshots),
    createVersionMutation,
    detailQuery,
    hasPendingCommand,
    lineageQuery,
    persistedCommandCount,
    persistedConfirmationFailure,
    recoverPersistedCommand,
    recoveryState: commandRecovery.query.data ?? null,
    recoveryStateLoading: commandRecovery.query.isPending,
    versionLookupMutation,
    workflowQuery,
  };
}
