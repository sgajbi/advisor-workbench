import { getWorkbenchApiErrorStatus } from "@/features/workbench/api-client";

import {
  approveCompliance,
  approveRisk,
  createProposalVersion,
  recordClientConsent,
  submitProposal,
} from "./api";
import { ProposalPersistedEvidenceConfirmationError } from "./proposal-action-evidence";
import type {
  ProposalLifecycleCommandIntent,
  ProposalVersionCommandIntent,
} from "./use-proposal-command-recovery";

export async function executeProposalLifecycleCommand(
  intent: ProposalLifecycleCommandIntent,
) {
  switch (intent.action) {
    case "submit":
      return await submitProposal(intent.proposalId, intent.request, intent.idempotencyKey);
    case "approve-risk":
      return await approveRisk(intent.proposalId, intent.request, intent.idempotencyKey);
    case "approve-compliance":
      return await approveCompliance(intent.proposalId, intent.request, intent.idempotencyKey);
    case "record-client-consent":
      return await recordClientConsent(intent.proposalId, intent.request, intent.idempotencyKey);
  }
}

export function proposalLifecycleSuccessMessage(
  intent: ProposalLifecycleCommandIntent,
): string {
  switch (intent.action) {
    case "submit":
      return `Proposal submitted for ${intent.request.review_type === "RISK" ? "risk" : "compliance"} review.`;
    case "approve-risk":
      return "Risk review recorded.";
    case "approve-compliance":
      return "Compliance review recorded.";
    case "record-client-consent":
      return "Client consent recorded.";
  }
}

export async function executeProposalVersionCommand(intent: ProposalVersionCommandIntent) {
  return await createProposalVersion(intent.proposalId, {
    body: {
      created_by: "advisor_1",
      simulate_request: intent.simulateRequest,
    },
  }, intent.idempotencyKey);
}

export function isAmbiguousProposalCommandFailure(error: unknown): boolean {
  const status = getWorkbenchApiErrorStatus(error);
  return status == null || status === 408 || status === 429 || status >= 500;
}

export function asPersistedProposalConfirmationError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : "The source action completed, but refreshed review evidence could not be confirmed.";
  return new ProposalPersistedEvidenceConfirmationError(message);
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : undefined;
}

export function confirmCreatedProposalVersion(
  response: unknown,
  proposalId: string,
  previousVersionNo: number,
): number {
  const responseData = objectRecord(objectRecord(response)?.data);
  const proposalData = objectRecord(responseData?.proposal);
  const versionData = objectRecord(responseData?.version);
  const expectedVersionNo = proposalData?.current_version_no;
  if (
    proposalData?.proposal_id !== proposalId
    || versionData?.proposal_id !== proposalId
    || versionData?.version_no !== expectedVersionNo
    || typeof expectedVersionNo !== "number"
    || !Number.isInteger(expectedVersionNo)
    || expectedVersionNo < 1
    || expectedVersionNo <= previousVersionNo
  ) {
    throw new ProposalPersistedEvidenceConfirmationError(
      "The source action completed, but did not identify a matching newly created proposal version. Use Recheck earlier action before continuing.",
    );
  }
  return expectedVersionNo;
}
