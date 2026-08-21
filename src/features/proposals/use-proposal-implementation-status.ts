"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { projectQuerySourcePosture } from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import { getProposalExecutionStatus } from "./api";
import { buildProposalImplementationStatusModel } from "./proposal-implementation-status-view-model";
import type {
  ProposalLifecycleMode,
  ProposalLifecycleRow,
} from "./proposal-lifecycle-workspace-view-model";
import type { ProposalQueueSelectedEvidenceContext } from "./proposal-workflow-context-view-model";

export function useProposalImplementationStatus({
  portfolioId,
  mode,
  rows,
}: {
  portfolioId: string;
  mode: ProposalLifecycleMode;
  rows: ProposalLifecycleRow[];
}) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<{
    portfolioId: string;
    proposalId: string;
  } | null>(null);
  const selectionIsCurrent =
    selection?.portfolioId === portfolioId &&
    rows.some((row) => row.proposalId === selection.proposalId);
  const selectedProposal =
    rows.find(
      (row) =>
        row.proposalId === (selectionIsCurrent ? selection.proposalId : null),
    ) ??
    rows[0] ??
    null;
  const query = useQuery({
    queryKey: implementationStatusQueryKey(portfolioId, selectedProposal),
    queryFn: async () =>
      await readImplementationStatus(portfolioId, selectedProposal),
    enabled:
      mode === "implementation" &&
      Boolean(selectedProposal) &&
      selectedProposal?.versionNo !== null,
    ...workbenchStrictQueryDefaults,
  });
  const sourcePosture = projectQuerySourcePosture({
    hasData: Boolean(query.data),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasError: Boolean(query.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(query.error),
  });
  const workflowContext = useMemo<
    ProposalQueueSelectedEvidenceContext | undefined
  >(() => {
    if (mode !== "implementation" || !query.data) return undefined;
    const implementation = buildProposalImplementationStatusModel(query.data);
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
        { label: "Proposal", value: implementation.identity.proposalId },
        { label: "Handoff", value: implementation.handoff.label },
        { label: "Version evidence", value: implementation.version.label },
        { label: "Observed", value: implementation.lineage.freshness },
      ],
      sourceLabel: "Gateway-backed advisory implementation handoff",
      boundaryNote: implementation.boundary,
      hasEvidenceGap:
        implementation.evidence.isPartial ||
        implementation.version.label === "Earlier version",
    };
  }, [mode, query.data]);

  return {
    query,
    selectedProposal,
    selectProposal: (proposalId: string) =>
      setSelection({ portfolioId, proposalId }),
    refreshForProposal: async (proposal: ProposalLifecycleRow) =>
      await queryClient.fetchQuery({
        queryKey: implementationStatusQueryKey(portfolioId, proposal),
        queryFn: async () =>
          await readImplementationStatus(portfolioId, proposal),
        ...workbenchStrictQueryDefaults,
        staleTime: 0,
      }),
    sourcePosture,
    workflowContext,
  };
}

function implementationStatusQueryKey(
  portfolioId: string,
  proposal: ProposalLifecycleRow | null,
) {
  return [
    "proposal-implementation-status",
    portfolioId,
    proposal?.proposalId,
    proposal?.versionNo,
    proposal?.currentState,
  ] as const;
}

async function readImplementationStatus(
  portfolioId: string,
  proposal: ProposalLifecycleRow | null,
) {
  return await getProposalExecutionStatus(
    proposal?.proposalId ?? "",
    portfolioId,
    proposal?.versionNo ?? 0,
    proposal?.currentState ?? "",
  );
}
