"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ProposalApprovalActionRequest,
  ProposalSubmitRequest,
} from "./types";
import { proposalDetailQueryKeys } from "./proposal-detail-query-keys";

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "lotus:proposal-command-recovery";

type ProposalLifecycleCommandIdentity = Readonly<{
  expectedState: string;
  idempotencyKey: string;
  kind: "lifecycle";
  previousState: string;
  proposalId: string;
}>;

export type ProposalLifecycleCommandIntent = ProposalLifecycleCommandIdentity & (
  | Readonly<{ action: "submit"; request: ProposalSubmitRequest }>
  | Readonly<{
      action: "approve-compliance" | "approve-risk" | "record-client-consent";
      request: ProposalApprovalActionRequest;
    }>
);

export type ProposalVersionCommandIntent = Readonly<{
  idempotencyKey: string;
  kind: "create-version";
  previousVersionNo: number;
  proposalId: string;
  simulateRequest: Record<string, unknown>;
}>;

export type ProposalCommandIntent =
  | ProposalLifecycleCommandIntent
  | ProposalVersionCommandIntent;

export type ProposalCommandRecovery =
  | Readonly<{ state: "invalid" }>
  | Readonly<{ intent: ProposalCommandIntent; state: "recoverable" }>;

function storageKey(proposalId: string): string {
  return `${STORAGE_PREFIX}:${proposalId}`;
}

function sessionStorageOrNull(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function lifecycleIntentMatchesClosedWorkflow(value: Record<string, unknown>): boolean {
  if (!isRecord(value.request) || value.request.expected_state !== value.previousState) {
    return false;
  }
  switch (value.action) {
    case "submit":
      return (
        value.expectedState === `${String(value.request.review_type)}_REVIEW`
        && ["RISK", "COMPLIANCE"].includes(String(value.request.review_type))
        && value.request.actor_id === "advisor_1"
      );
    case "approve-risk":
      return value.expectedState === "AWAITING_CLIENT_CONSENT"
        && value.request.actor_id === "risk_officer_1";
    case "approve-compliance":
      return value.expectedState === "AWAITING_CLIENT_CONSENT"
        && value.request.actor_id === "compliance_officer_1";
    case "record-client-consent":
      return value.expectedState === "EXECUTION_READY"
        && value.request.actor_id === "advisor_1";
    default:
      return false;
  }
}

function parseIntent(value: unknown, proposalId: string): ProposalCommandIntent | null {
  if (
    !isRecord(value)
    || value.storageVersion !== STORAGE_VERSION
    || value.proposalId !== proposalId
    || !isNonBlankString(value.idempotencyKey)
  ) {
    return null;
  }
  if (
    value.kind === "lifecycle"
    && ["approve-compliance", "approve-risk", "record-client-consent", "submit"].includes(
      String(value.action),
    )
    && isNonBlankString(value.expectedState)
    && isNonBlankString(value.previousState)
    && lifecycleIntentMatchesClosedWorkflow(value)
  ) {
    const { storageVersion: _storageVersion, ...intent } = value;
    return intent as ProposalLifecycleCommandIntent;
  }
  if (
    value.kind === "create-version"
    && Number.isInteger(value.previousVersionNo)
    && Number(value.previousVersionNo) > 0
    && isRecord(value.simulateRequest)
  ) {
    const { storageVersion: _storageVersion, ...intent } = value;
    return intent as ProposalVersionCommandIntent;
  }
  return null;
}

export function readProposalCommandRecovery(proposalId: string): ProposalCommandRecovery | null {
  const storage = sessionStorageOrNull();
  if (!storage) {
    return { state: "invalid" };
  }
  try {
    const stored = storage.getItem(storageKey(proposalId));
    if (stored === null) {
      return null;
    }
    const intent = parseIntent(JSON.parse(stored), proposalId);
    return intent ? { intent, state: "recoverable" } : { state: "invalid" };
  } catch {
    return { state: "invalid" };
  }
}

export function writeProposalCommandRecovery(intent: ProposalCommandIntent): boolean {
  const storage = sessionStorageOrNull();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(storageKey(intent.proposalId), JSON.stringify({
      ...intent,
      storageVersion: STORAGE_VERSION,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearProposalCommandRecovery(proposalId: string): boolean {
  try {
    const storage = sessionStorageOrNull();
    if (!storage) {
      return false;
    }
    storage.removeItem(storageKey(proposalId));
    return storage.getItem(storageKey(proposalId)) === null;
  } catch {
    return false;
  }
}

export function useProposalCommandRecovery(proposalId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const queryKey = proposalDetailQueryKeys.commandRecovery(proposalId);
  const query = useQuery({
    queryKey,
    queryFn: () => readProposalCommandRecovery(proposalId),
    enabled,
    gcTime: Infinity,
    retry: false,
    staleTime: Infinity,
  });

  function remember(intent: ProposalCommandIntent): boolean {
    if (!writeProposalCommandRecovery(intent)) {
      return false;
    }
    queryClient.setQueryData(queryKey, { intent, state: "recoverable" });
    return true;
  }

  function forget(): void {
    queryClient.setQueryData(
      queryKey,
      clearProposalCommandRecovery(proposalId) ? null : { state: "invalid" },
    );
  }

  return { forget, query, remember };
}
