"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { projectQuerySourcePosture } from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import { getProposalDiscussionPack } from "./api";
import { buildProposalDiscussionPackModel } from "./proposal-discussion-pack-view-model";
import type {
  ProposalLifecycleMode,
  ProposalLifecycleRow,
} from "./proposal-lifecycle-workspace-view-model";
import type { ProposalQueueSelectedEvidenceContext } from "./proposal-workflow-context-view-model";

export function useProposalDiscussionPack({
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
    queryKey: discussionPackQueryKey(portfolioId, selectedProposal),
    queryFn: async () =>
      await readDiscussionPack(portfolioId, selectedProposal),
    enabled:
      mode === "discussion-pack" &&
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
    if (mode !== "discussion-pack" || !query.data) return undefined;
    const pack = buildProposalDiscussionPackModel(query.data);
    return {
      proposalId: pack.identity.proposalId,
      title: pack.posture.title,
      summary: pack.posture.summary,
      currentPosture: pack.posture.label,
      nextAction: pack.posture.nextAction,
      blockers: [
        ...pack.controls
          .filter(({ tone }) => tone === "danger" || tone === "warn")
          .map(({ label, status }) => `${label}: ${status}`),
        ...pack.blockers,
      ],
      facts: [
        { label: "Proposal", value: pack.identity.proposalId },
        { label: "Version", value: pack.identity.version },
        {
          label: "Advisor controls",
          value: `${pack.controls.filter(({ tone }) => tone === "success").length} confirmed`,
        },
        {
          label: "Client release",
          value:
            pack.controls.find(({ key }) => key === "release")?.status ??
            "Not confirmed",
        },
      ],
      sourceLabel:
        "Gateway-backed proposal narrative, memo, package, consent, and release evidence",
      boundaryNote:
        "Advisor-use evidence, a report package, and client consent do not by themselves authorize client publication, delivery, or communication.",
      hasEvidenceGap:
        pack.posture.label === "Evidence incomplete" ||
        pack.capabilities.some(
          ({ status }) => status === "Restricted" || status === "Unavailable",
        ),
    };
  }, [mode, query.data]);

  return {
    query,
    selectedProposal,
    selectProposal: (proposalId: string) =>
      setSelection({ portfolioId, proposalId }),
    refreshForProposal: async (proposal: ProposalLifecycleRow) =>
      await queryClient.fetchQuery({
        queryKey: discussionPackQueryKey(portfolioId, proposal),
        queryFn: async () => await readDiscussionPack(portfolioId, proposal),
        ...workbenchStrictQueryDefaults,
        staleTime: 0,
      }),
    sourcePosture,
    workflowContext,
  };
}

function discussionPackQueryKey(
  portfolioId: string,
  proposal: ProposalLifecycleRow | null,
) {
  return [
    "proposal-discussion-pack",
    portfolioId,
    proposal?.proposalId,
    proposal?.versionNo,
    proposal?.currentState,
  ] as const;
}

async function readDiscussionPack(
  portfolioId: string,
  proposal: ProposalLifecycleRow | null,
) {
  return await getProposalDiscussionPack(
    proposal?.proposalId ?? "",
    portfolioId,
    proposal?.versionNo ?? 0,
    proposal?.currentState ?? "",
  );
}
