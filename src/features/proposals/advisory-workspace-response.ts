import type { AdvisoryWorkspaceEnvelopeResponse } from "./types";

export function recordValue(source: unknown): Record<string, unknown> | null {
  return source && typeof source === "object" && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function extractAdvisoryWorkspace(
  envelope: AdvisoryWorkspaceEnvelopeResponse
): Record<string, unknown> {
  const data = recordValue(envelope.data) ?? {};
  return recordValue(data.workspace) ?? data;
}

export function extractAdvisoryWorkspaceId(
  envelope: AdvisoryWorkspaceEnvelopeResponse
): string | null {
  return stringValue(extractAdvisoryWorkspace(envelope).workspace_id);
}

export function extractLatestProposalResult(
  envelope: AdvisoryWorkspaceEnvelopeResponse
): Record<string, unknown> | null {
  return recordValue(extractAdvisoryWorkspace(envelope).latest_proposal_result);
}

export function extractEvaluationSummary(
  envelope: AdvisoryWorkspaceEnvelopeResponse | null
): Record<string, unknown> | null {
  return envelope ? recordValue(extractAdvisoryWorkspace(envelope).evaluation_summary) : null;
}

export function extractHandoffProposalId(
  envelope: AdvisoryWorkspaceEnvelopeResponse
): string | null {
  const data = recordValue(envelope.data) ?? {};
  const proposalEnvelope = recordValue(data.proposal);
  const proposal = recordValue(proposalEnvelope?.proposal) ?? recordValue(proposalEnvelope?.data)?.proposal;
  const proposalRecord = recordValue(proposal);
  return stringValue(proposalRecord?.proposal_id);
}
