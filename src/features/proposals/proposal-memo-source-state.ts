import { getWorkbenchApiErrorStatus } from "@/features/workbench/api-client";

import {
  isCurrentVersionNoMemoLineage,
  resolveMemoSourceIdentity,
  resolveProjectionSourceIdentity,
  resolveReplaySourceIdentity,
} from "./proposal-memo-source-identity";

import type {
  ProposalMemoData,
  ProposalMemoLineageData,
  ProposalMemoProjectionData,
  ProposalMemoReplayEvidenceData,
} from "./types";

export type ProposalMemoSourceState =
  | "loading"
  | "not-prepared"
  | "ready"
  | "unavailable";

type ProposalMemoSourceStateInput = {
  isChecking: boolean;
  lineageData?: ProposalMemoLineageData;
  lineageError?: unknown;
  memoData?: ProposalMemoData;
  memoError?: unknown;
  projectionData?: ProposalMemoProjectionData;
  projectionError?: unknown;
  proposalId: string;
  replayData?: ProposalMemoReplayEvidenceData;
  replayError?: unknown;
  sourceIdentityCurrent: boolean;
  versionNo: number | null;
};

type ProposalMemoAbsenceInput = Pick<
  ProposalMemoSourceStateInput,
  | "lineageData"
  | "lineageError"
  | "memoData"
  | "memoError"
  | "projectionData"
  | "projectionError"
  | "proposalId"
  | "replayData"
  | "replayError"
  | "versionNo"
>;

export function isProposalMemoSourceConfirmedAbsent({
  lineageData,
  lineageError,
  memoData,
  memoError,
  projectionData,
  projectionError,
  proposalId,
  replayData,
  replayError,
  versionNo,
}: ProposalMemoAbsenceInput): boolean {
  return Boolean(
    versionNo !== null
    && getWorkbenchApiErrorStatus(memoError) === 404
    && getWorkbenchApiErrorStatus(projectionError) === 404
    && getWorkbenchApiErrorStatus(replayError) === 404
    && !lineageError
    && lineageData
    && !resolveMemoSourceIdentity(memoData, proposalId, versionNo)
    && !resolveProjectionSourceIdentity(projectionData, proposalId, versionNo)
    && !resolveReplaySourceIdentity(replayData, proposalId, versionNo)
    && isCurrentVersionNoMemoLineage(lineageData, proposalId, versionNo)
  );
}

export function resolveProposalMemoSourceState({
  isChecking,
  lineageData,
  lineageError,
  memoData,
  memoError,
  projectionData,
  projectionError,
  proposalId,
  replayData,
  replayError,
  sourceIdentityCurrent,
  versionNo,
}: ProposalMemoSourceStateInput): ProposalMemoSourceState {
  if (isChecking) {
    return "loading";
  }
  if (
    versionNo !== null
    && !memoError
    && !projectionError
    && !lineageError
    && !replayError
    && memoData
    && projectionData
    && lineageData
    && replayData
    && sourceIdentityCurrent
  ) {
    return "ready";
  }
  if (isProposalMemoSourceConfirmedAbsent({
    lineageData,
    lineageError,
    memoData,
    memoError,
    projectionData,
    projectionError,
    proposalId,
    replayData,
    replayError,
    versionNo,
  })) {
    return "not-prepared";
  }
  return "unavailable";
}
