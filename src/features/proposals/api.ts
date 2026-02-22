import {
  ProposalCreateRequest,
  ProposalDetailData,
  ProposalEnvelopeResponse,
  ProposalListData,
  ProposalSimulateRequest,
  ProposalSimulateResponse,
  ProposalSubmitRequest,
} from "./types";

const BFF_BASE_URL = process.env.BFF_BASE_URL ?? "http://localhost:8100";

export async function simulateProposal(
  payload: ProposalSimulateRequest,
  idempotencyKey: string
): Promise<ProposalSimulateResponse> {
  const response = await fetch(`${BFF_BASE_URL}/api/v1/proposals/simulate`, {
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
  return await postJson("/api/v1/proposals", payload, idempotencyKey);
}

export async function listProposals(state?: string): Promise<ProposalListData> {
  const query = state ? `?state=${encodeURIComponent(state)}` : "";
  const response = await fetch(`${BFF_BASE_URL}/api/v1/proposals${query}`);
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
  const response = await fetch(
    `${BFF_BASE_URL}/api/v1/proposals/${proposalId}${query}`
  );
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
  return await postJson(`/api/v1/proposals/${proposalId}/submit`, payload);
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
  const response = await fetch(`${BFF_BASE_URL}${path}`, {
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
