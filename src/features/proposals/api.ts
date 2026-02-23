import {
  ProposalApprovalActionRequest,
  ProposalApprovalsData,
  ProposalCreateRequest,
  ProposalDetailData,
  ProposalEnvelopeResponse,
  ProposalListData,
  ProposalLineageData,
  ProposalSimulateRequest,
  ProposalSimulateResponse,
  ProposalSubmitRequest,
  ProposalVersionData,
  ProposalWorkflowEventsData,
} from "./types";

const BFF_PROXY_BASE = "/api/bff/api/v1";

export type ProposalListFilters = {
  portfolioId?: string;
  state?: string;
  createdBy?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  cursor?: string;
};

export async function simulateProposal(
  payload: ProposalSimulateRequest,
  idempotencyKey: string
): Promise<ProposalSimulateResponse> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal simulate failed (${response.status}): ${body}`);
  }

  return (await response.json()) as ProposalSimulateResponse;
}

export async function createProposal(
  payload: ProposalCreateRequest,
  idempotencyKey: string
): Promise<ProposalEnvelopeResponse> {
  return await postJson("/proposals", payload, idempotencyKey);
}

export async function listProposals(filters: ProposalListFilters = {}): Promise<ProposalListData> {
  const params = new URLSearchParams();
  if (filters.portfolioId) {
    params.set("portfolio_id", filters.portfolioId);
  }
  if (filters.state) {
    params.set("state", filters.state);
  }
  if (filters.createdBy) {
    params.set("created_by", filters.createdBy);
  }
  if (filters.createdFrom) {
    params.set("created_from", filters.createdFrom);
  }
  if (filters.createdTo) {
    params.set("created_to", filters.createdTo);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.cursor) {
    params.set("cursor", filters.cursor);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${BFF_PROXY_BASE}/proposals${query}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal list failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalListData;
}

export async function getProposal(
  proposalId: string,
  includeEvidence = false
): Promise<ProposalDetailData> {
  const query = `?include_evidence=${includeEvidence ? "true" : "false"}`;
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}${query}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal detail failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalDetailData;
}

export async function getProposalVersion(
  proposalId: string,
  versionNo: number,
  includeEvidence = false
): Promise<ProposalVersionData> {
  const query = `?include_evidence=${includeEvidence ? "true" : "false"}`;
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/versions/${versionNo}${query}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal version failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalVersionData;
}

export async function createProposalVersion(
  proposalId: string,
  payload: ProposalCreateRequest,
  idempotencyKey: string
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/versions`, payload, idempotencyKey);
}

export async function getProposalLineage(
  proposalId: string
): Promise<ProposalLineageData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/lineage`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal lineage failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalLineageData;
}

export async function submitProposal(
  proposalId: string,
  payload: ProposalSubmitRequest
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/submit`, payload);
}

export async function approveRisk(
  proposalId: string,
  payload: ProposalApprovalActionRequest
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/approve-risk`, payload);
}

export async function approveCompliance(
  proposalId: string,
  payload: ProposalApprovalActionRequest
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/approve-compliance`, payload);
}

export async function recordClientConsent(
  proposalId: string,
  payload: ProposalApprovalActionRequest
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/record-client-consent`, payload);
}

export async function getProposalWorkflowEvents(
  proposalId: string
): Promise<ProposalWorkflowEventsData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/workflow-events`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Workflow events failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalWorkflowEventsData;
}

export async function getProposalApprovals(
  proposalId: string
): Promise<ProposalApprovalsData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/approvals`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Approvals fetch failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalApprovalsData;
}

async function postJson(
  path: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string
): Promise<ProposalEnvelopeResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  const response = await fetch(`${BFF_PROXY_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as ProposalEnvelopeResponse;
}
