import {
  ProposalApprovalActionRequest,
  ProposalApprovalsData,
  ProposalCreateRequest,
  ProposalDetailData,
  ProposalEnvelopeResponse,
  ProposalListData,
  ProposalSimulateRequest,
  ProposalSimulateResponse,
  ProposalSubmitRequest,
  ProposalWorkflowEventsData,
} from "./types";

const BFF_PROXY_BASE = "/api/bff/api/v1";

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

export async function listProposals(state?: string): Promise<ProposalListData> {
  const query = state ? `?state=${encodeURIComponent(state)}` : "";
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
