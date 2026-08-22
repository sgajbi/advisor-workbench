export type ProposalRouteSearchParam = string | string[] | undefined;

export function resolveSingleProposalSearchParam(
  value: ProposalRouteSearchParam,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}
