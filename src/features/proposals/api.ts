import {
  ProposalApprovalActionRequest,
  ProposalApprovalsData,
  ProposalCreateRequest,
  ProposalDeliveryEventsData,
  ProposalDeliverySummaryData,
  ProposalDetailData,
  ProposalEnvelopeResponse,
  ProposalListData,
  ProposalLineageData,
  ProposalMemoAiCommentaryData,
  ProposalMemoAiCommentaryRequest,
  ProposalMemoCreateRequest,
  ProposalMemoData,
  ProposalMemoLineageData,
  ProposalMemoProjectionData,
  ProposalMemoReplayEvidenceData,
  ProposalMemoReportPackageData,
  ProposalMemoReportPackageRequest,
  ProposalMemoReviewRequest,
  ProposalNarrativeReviewData,
  ProposalNarrativeReviewRequest,
  ProposalReportRequest,
  ProposalReportRequestData,
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

export async function reviewProposalNarrative(
  proposalId: string,
  versionNo: number,
  payload: ProposalNarrativeReviewRequest,
  idempotencyKey?: string
): Promise<ProposalNarrativeReviewData> {
  const envelope = await postJson(
    `/proposals/${proposalId}/versions/${versionNo}/narrative/review`,
    payload,
    idempotencyKey
  );
  return envelope.data as unknown as ProposalNarrativeReviewData;
}

export async function createProposalReportRequest(
  proposalId: string,
  payload: ProposalReportRequest
): Promise<ProposalReportRequestData> {
  const envelope = await postJson(`/proposals/${proposalId}/report-requests`, payload);
  return envelope.data as unknown as ProposalReportRequestData;
}

export async function getProposalDeliverySummary(
  proposalId: string
): Promise<ProposalDeliverySummaryData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/delivery-summary`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal delivery summary failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalDeliverySummaryData;
}

export async function getProposalDeliveryEvents(
  proposalId: string
): Promise<ProposalDeliveryEventsData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/delivery-events`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal delivery events failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalDeliveryEventsData;
}

export async function createProposalMemo(
  proposalId: string,
  versionNo: number,
  payload: ProposalMemoCreateRequest,
  idempotencyKey: string
): Promise<ProposalMemoData> {
  const envelope = await postJson(
    `/proposals/${proposalId}/versions/${versionNo}/memo`,
    payload,
    idempotencyKey
  );
  return envelope.data as unknown as ProposalMemoData;
}

export async function getProposalMemo(
  proposalId: string,
  versionNo: number
): Promise<ProposalMemoData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/versions/${versionNo}/memo`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal memo fetch failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalMemoData;
}

export async function getProposalMemoProjection(
  proposalId: string,
  versionNo: number,
  audience?: string
): Promise<ProposalMemoProjectionData> {
  const params = new URLSearchParams();
  if (audience) {
    params.set("audience", audience);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(
    `${BFF_PROXY_BASE}/proposals/${proposalId}/versions/${versionNo}/memo/projection${query}`
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal memo projection failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalMemoProjectionData;
}

export async function reviewProposalMemo(
  proposalId: string,
  versionNo: number,
  payload: ProposalMemoReviewRequest,
  idempotencyKey?: string
): Promise<ProposalMemoData> {
  const envelope = await postJson(
    `/proposals/${proposalId}/versions/${versionNo}/memo/review`,
    payload,
    idempotencyKey
  );
  return envelope.data as unknown as ProposalMemoData;
}

export async function requestProposalMemoReportPackage(
  proposalId: string,
  versionNo: number,
  payload: ProposalMemoReportPackageRequest,
  idempotencyKey?: string
): Promise<ProposalMemoReportPackageData> {
  const envelope = await postJson(
    `/proposals/${proposalId}/versions/${versionNo}/memo/report-packages`,
    payload,
    idempotencyKey
  );
  return envelope.data as unknown as ProposalMemoReportPackageData;
}

export async function requestProposalMemoAiCommentary(
  proposalId: string,
  versionNo: number,
  payload: ProposalMemoAiCommentaryRequest,
  idempotencyKey?: string
): Promise<ProposalMemoAiCommentaryData> {
  const envelope = await postJson(
    `/proposals/${proposalId}/versions/${versionNo}/memo/ai-commentary`,
    payload,
    idempotencyKey
  );
  return envelope.data as unknown as ProposalMemoAiCommentaryData;
}

export async function getProposalMemoLineage(
  proposalId: string
): Promise<ProposalMemoLineageData> {
  const response = await fetch(`${BFF_PROXY_BASE}/proposals/${proposalId}/memos/lineage`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal memo lineage failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalMemoLineageData;
}

export async function getProposalMemoReplayEvidence(
  proposalId: string,
  versionNo: number
): Promise<ProposalMemoReplayEvidenceData> {
  const response = await fetch(
    `${BFF_PROXY_BASE}/proposals/${proposalId}/versions/${versionNo}/memo/replay-evidence`
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proposal memo replay evidence failed (${response.status}): ${body}`);
  }
  const envelope = (await response.json()) as ProposalEnvelopeResponse;
  return envelope.data as unknown as ProposalMemoReplayEvidenceData;
}

export async function submitProposal(
  proposalId: string,
  payload: ProposalSubmitRequest,
  idempotencyKey: string
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/submit`, payload, idempotencyKey);
}

export async function approveRisk(
  proposalId: string,
  payload: ProposalApprovalActionRequest,
  idempotencyKey: string
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/approve-risk`, payload, idempotencyKey);
}

export async function approveCompliance(
  proposalId: string,
  payload: ProposalApprovalActionRequest,
  idempotencyKey: string
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/approve-compliance`, payload, idempotencyKey);
}

export async function recordClientConsent(
  proposalId: string,
  payload: ProposalApprovalActionRequest,
  idempotencyKey: string
): Promise<ProposalEnvelopeResponse> {
  return await postJson(`/proposals/${proposalId}/record-client-consent`, payload, idempotencyKey);
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
  payload: unknown,
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
