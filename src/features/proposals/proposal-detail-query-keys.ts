export const PROPOSAL_DETAIL_COMMAND_SCOPE = "proposal-detail-command";

export const proposalDetailQueryKeys = {
  all: ["workbench", "proposal-detail"] as const,
  proposal: (proposalId: string) =>
    [...proposalDetailQueryKeys.all, proposalId] as const,
  record: (proposalId: string, includeEvidence: boolean) =>
    [
      ...proposalDetailQueryKeys.proposal(proposalId),
      "detail",
      { includeEvidence },
    ] as const,
  workflow: (proposalId: string) =>
    [...proposalDetailQueryKeys.proposal(proposalId), "workflow"] as const,
  approvals: (proposalId: string) =>
    [...proposalDetailQueryKeys.proposal(proposalId), "approvals"] as const,
  lineage: (proposalId: string) =>
    [...proposalDetailQueryKeys.proposal(proposalId), "lineage"] as const,
  commandRecovery: (proposalId: string) =>
    [...proposalDetailQueryKeys.proposal(proposalId), "command-recovery"] as const,
};

export const proposalDetailMutationKeys = {
  all: (proposalId: string) =>
    [...proposalDetailQueryKeys.proposal(proposalId), "mutation"] as const,
  persisted: (proposalId: string) =>
    [...proposalDetailMutationKeys.all(proposalId), "persisted"] as const,
  lifecycle: (proposalId: string) =>
    [...proposalDetailMutationKeys.persisted(proposalId), "lifecycle"] as const,
  createVersion: (proposalId: string) =>
    [...proposalDetailMutationKeys.persisted(proposalId), "create-version"] as const,
  loadVersion: (proposalId: string) =>
    [...proposalDetailMutationKeys.all(proposalId), "load-version"] as const,
};

export function proposalDetailCommandScope(proposalId: string): string {
  return `${PROPOSAL_DETAIL_COMMAND_SCOPE}:${proposalId}`;
}
