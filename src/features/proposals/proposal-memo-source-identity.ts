import type {
  ProposalMemoData,
  ProposalMemoLineageData,
  ProposalMemoProjectionData,
  ProposalMemoReplayEvidenceData,
  ProposalSummary,
} from "./types";

export type ProposalMemoIdentity = {
  memoHash: string;
  memoId: string;
  proposalId: string;
  versionNo: number;
};

export type ProposalMemoLineageItem = NonNullable<
  ProposalMemoLineageData["memos"]
>[number];

export function resolveMemoSourceIdentity(
  source: ProposalMemoData | null | undefined,
  proposalId: string,
  versionNo: number | null,
): ProposalMemoIdentity | null {
  if (
    !activeProposalIdentityIsValid(proposalId, versionNo)
    || !proposalSummaryMatchesActiveVersion(source?.proposal, proposalId, versionNo)
    || source?.proposal_version_no !== versionNo
    || exactString(source.memo, "proposal_id") !== proposalId
    || source.memo?.proposal_version_no !== versionNo
  ) {
    return null;
  }
  const memoId = exactString(source, "memo_id");
  const memoHash = exactString(source, "memo_hash");
  if (
    !memoId
    || !memoHash
    || exactString(source.memo, "memo_id") !== memoId
    || exactString(source.memo, "memo_hash") !== memoHash
  ) {
    return null;
  }
  return { memoHash, memoId, proposalId, versionNo };
}

export function resolveProjectionSourceIdentity(
  source: ProposalMemoProjectionData | null | undefined,
  proposalId: string,
  versionNo: number | null,
): ProposalMemoIdentity | null {
  if (
    !activeProposalIdentityIsValid(proposalId, versionNo)
    || !proposalSummaryMatchesActiveVersion(source?.proposal, proposalId, versionNo)
    || source?.proposal_version_no !== versionNo
  ) {
    return null;
  }
  const memoId = exactString(source, "memo_id");
  const memoHash = exactString(source, "memo_hash");
  return memoId && memoHash
    ? { memoHash, memoId, proposalId, versionNo }
    : null;
}

export function resolveReplaySourceIdentity(
  source: ProposalMemoReplayEvidenceData | null | undefined,
  proposalId: string,
  versionNo: number | null,
): ProposalMemoIdentity | null {
  if (
    !activeProposalIdentityIsValid(proposalId, versionNo)
    || exactString(source?.subject, "proposal_id") !== proposalId
    || source?.subject?.proposal_version_no !== versionNo
  ) {
    return null;
  }
  const memoId = exactString(source.subject, "memo_id");
  const memoHash = exactString(source.hashes, "memo_hash");
  return memoId && memoHash
    ? { memoHash, memoId, proposalId, versionNo }
    : null;
}

export function selectCurrentMemoLineageItem(
  lineageData: ProposalMemoLineageData | null | undefined,
  currentIdentity: ProposalMemoIdentity | null,
  proposalId: string,
  versionNo: number | null,
): ProposalMemoLineageItem | undefined {
  const memos = lineageData?.memos;
  const memoCount = lineageData?.memo_count;
  const lineageProposalId = lineageData?.proposal_id;
  if (
    !activeProposalIdentityIsValid(proposalId, versionNo)
    || !proposalSummaryMatchesActiveVersion(lineageData?.proposal, proposalId, versionNo)
    || !currentIdentity
    || !Array.isArray(memos)
    || !isNonNegativeSafeInteger(memoCount)
    || memoCount !== memos.length
    || (lineageProposalId !== undefined
      && (!isExactNonBlankString(lineageProposalId)
        || lineageProposalId !== proposalId))
  ) {
    return undefined;
  }
  const identities = memos.map((memo) => lineageItemIdentity(memo, proposalId));
  if (
    identities.some((identity) => !identity)
    || new Set(identities.map((identity) => identity?.memoId)).size !== memos.length
  ) {
    return undefined;
  }
  const matchingIndex = identities.findIndex((identity) =>
    memoIdentitiesEqual(identity, currentIdentity),
  );
  return matchingIndex >= 0
    && currentIdentity.memoId === lineageData?.latest_memo_id
    ? memos[matchingIndex]
    : undefined;
}

export function lineageItemIdentity(
  memo: ProposalMemoLineageItem | null | undefined,
  proposalId: string,
): ProposalMemoIdentity | null {
  const memoId = exactString(memo, "memo_id");
  const memoHash = exactString(memo, "memo_hash");
  const versionNo = memo?.proposal_version_no;
  return memoId && memoHash && isPositiveSafeInteger(versionNo)
    ? { memoHash, memoId, proposalId, versionNo }
    : null;
}

export function memoIdentitiesEqual(
  left: ProposalMemoIdentity | null,
  right: ProposalMemoIdentity | null,
): boolean {
  return Boolean(
    left
      && right
      && left.memoHash === right.memoHash
      && left.memoId === right.memoId
      && left.proposalId === right.proposalId
      && left.versionNo === right.versionNo,
  );
}

export function isCurrentVersionNoMemoEvidence({
  lineageData,
  memoData,
  projectionData,
  proposalId,
  replayData,
  versionNo,
}: {
  lineageData: ProposalMemoLineageData | null | undefined;
  memoData: ProposalMemoData | null | undefined;
  projectionData: ProposalMemoProjectionData | null | undefined;
  proposalId: string;
  replayData: ProposalMemoReplayEvidenceData | null | undefined;
  versionNo: number | null;
}): boolean {
  if (
    !activeProposalIdentityIsValid(proposalId, versionNo)
    || lineageData?.proposal_id !== proposalId
    || !proposalSummaryMatchesActiveVersion(
      lineageData.proposal,
      proposalId,
      versionNo,
    )
    || !optionalProposalSummaryMatchesActiveVersion(
      memoData?.proposal,
      proposalId,
      versionNo,
    )
    || !optionalProposalSummaryMatchesActiveVersion(
      projectionData?.proposal,
      proposalId,
      versionNo,
    )
    || !optionalProposalSummaryMatchesActiveVersion(
      lineageData?.proposal,
      proposalId,
      versionNo,
    )
    || !optionalExactValueMatches(memoData?.proposal_version_no, versionNo)
    || !optionalExactValueMatches(
      projectionData?.proposal_version_no,
      versionNo,
    )
    || !optionalExactValueMatches(lineageData?.proposal_id, proposalId)
    || !optionalExactValueMatches(replayData?.subject?.proposal_id, proposalId)
    || !optionalExactValueMatches(
      replayData?.subject?.proposal_version_no,
      versionNo,
    )
  ) {
    return false;
  }

  return Boolean(
    identityMarkersAreEmpty(memoData, ["memo_id", "memo_hash"])
      && identityMarkersAreEmpty(memoData?.memo, [
        "memo_id",
        "memo_hash",
        "proposal_id",
        "proposal_version_no",
      ])
      && identityMarkersAreEmpty(projectionData, ["memo_id", "memo_hash"])
      && identityMarkersAreEmpty(replayData?.subject, ["memo_id"])
      && identityMarkersAreEmpty(replayData?.hashes, ["memo_hash"])
      && isCurrentVersionNoMemoLineage(
        lineageData,
        proposalId,
        versionNo,
      ),
  );
}

export function isCurrentVersionNoMemoLineage(
  lineageData: ProposalMemoLineageData,
  proposalId: string,
  versionNo: number,
): boolean {
  if (
    !activeProposalIdentityIsValid(proposalId, versionNo)
    || lineageData.proposal_id !== proposalId
    || !proposalSummaryMatchesActiveVersion(
      lineageData.proposal,
      proposalId,
      versionNo,
    )
  ) {
    return false;
  }
  const memos = lineageData.memos;
  if (
    lineageData.lineage_complete !== true
    || !Array.isArray(memos)
    || !isNonNegativeSafeInteger(lineageData.memo_count)
    || lineageData.memo_count !== memos.length
  ) {
    return false;
  }
  const identities = memos.map((memo) => lineageItemIdentity(memo, proposalId));
  if (
    identities.some((identity) => !identity || identity.versionNo >= versionNo)
    || new Set(identities.map((identity) => identity?.memoId)).size !== memos.length
  ) {
    return false;
  }
  if (memos.length === 0) {
    return lineageData.latest_memo_id == null;
  }
  const latestMemoId = exactString(lineageData, "latest_memo_id");
  return Boolean(
    latestMemoId
      && identities.some((identity) => identity?.memoId === latestMemoId),
  );
}

function proposalSummaryMatchesActiveVersion(
  proposal: ProposalSummary | null | undefined,
  proposalId: string,
  versionNo: number | null,
): boolean {
  return Boolean(
    proposal?.proposal_id === proposalId
      && proposal.current_version_no === versionNo,
  );
}

function optionalProposalSummaryMatchesActiveVersion(
  proposal: ProposalSummary | null | undefined,
  proposalId: string,
  versionNo: number,
): boolean {
  return !proposal || proposalSummaryMatchesActiveVersion(
    proposal,
    proposalId,
    versionNo,
  );
}

function optionalExactValueMatches<T>(
  value: T | null | undefined,
  expected: T,
): boolean {
  return value == null || value === expected;
}

function identityMarkersAreEmpty(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): boolean {
  return keys.every((key) => source?.[key] == null);
}

function activeProposalIdentityIsValid(
  proposalId: string,
  versionNo: number | null,
): versionNo is number {
  return isExactNonBlankString(proposalId) && isPositiveSafeInteger(versionNo);
}

function isExactNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function exactString(
  source: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  return isExactNonBlankString(value) ? value : null;
}
