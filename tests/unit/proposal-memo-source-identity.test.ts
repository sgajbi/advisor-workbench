import { describe, expect, it } from "vitest";

import {
  memoIdentitiesEqual,
  resolveHistoricalMemoLineageSource,
  resolveHistoricalMemoSourceIdentity,
  resolveHistoricalProjectionSourceIdentity,
  resolveMemoSourceIdentity,
  resolveProjectionSourceIdentity,
  resolveReplaySourceIdentity,
  selectCurrentMemoLineageItem,
} from "../../src/features/proposals/proposal-memo-source-identity";
import type {
  ProposalMemoData,
  ProposalMemoLineageData,
} from "../../src/features/proposals/types";

const PROPOSAL_ID = "pp_1";
const VERSION_NO = 2;
const MEMO_ID = "memo_2";
const MEMO_HASH = "sha256:memo-2";

function proposalSummary() {
  return {
    proposal_id: PROPOSAL_ID,
    current_state: "DRAFT",
    current_version_no: VERSION_NO,
  };
}

function memoSource(): ProposalMemoData {
  return {
    proposal: proposalSummary(),
    proposal_version_no: VERSION_NO,
    memo_id: MEMO_ID,
    memo_hash: MEMO_HASH,
    memo: {
      proposal_id: PROPOSAL_ID,
      proposal_version_no: VERSION_NO,
      memo_id: MEMO_ID,
      memo_hash: MEMO_HASH,
    },
  };
}

describe("proposal memo source identity", () => {
  it("resolves one complete identity across memo, projection and replay views", () => {
    const expected = {
      proposalId: PROPOSAL_ID,
      versionNo: VERSION_NO,
      memoId: MEMO_ID,
      memoHash: MEMO_HASH,
    };

    expect(resolveMemoSourceIdentity(memoSource(), PROPOSAL_ID, VERSION_NO)).toEqual(
      expected,
    );
    expect(
      resolveProjectionSourceIdentity(
        {
          proposal: proposalSummary(),
          proposal_version_no: VERSION_NO,
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
        },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toEqual(expected);
    expect(
      resolveReplaySourceIdentity(
        {
          subject: {
            proposal_id: PROPOSAL_ID,
            proposal_version_no: VERSION_NO,
            memo_id: MEMO_ID,
          },
          hashes: { memo_hash: MEMO_HASH },
        },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toEqual(expected);
  });

  it("admits advanced-proposal evidence only for historical reconciliation", () => {
    const advancedProposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO + 1,
    };

    expect(
      resolveMemoSourceIdentity(
        { ...memoSource(), proposal: advancedProposal },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeNull();
    expect(
      resolveProjectionSourceIdentity(
        {
          proposal: advancedProposal,
          proposal_version_no: VERSION_NO,
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
        },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeNull();
    expect(
      resolveHistoricalMemoSourceIdentity(
        { ...memoSource(), proposal: advancedProposal },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toMatchObject({ versionNo: VERSION_NO });
    expect(
      resolveHistoricalProjectionSourceIdentity(
        {
          proposal: advancedProposal,
          proposal_version_no: VERSION_NO,
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
        },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toMatchObject({ versionNo: VERSION_NO });
  });

  it("fails closed when requested-version evidence is ahead of the proposal", () => {
    const regressedProposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO - 1,
    };

    expect(
      resolveMemoSourceIdentity(
        { ...memoSource(), proposal: regressedProposal },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeNull();
    expect(
      resolveProjectionSourceIdentity(
        {
          proposal: regressedProposal,
          proposal_version_no: VERSION_NO,
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
        },
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeNull();
  });

  it.each([
    ["nested memo id", { memo_id: "memo_stale" }],
    ["nested memo hash", { memo_hash: "sha256:stale" }],
    ["padded memo id", { memo_id: ` ${MEMO_ID}` }],
    ["padded memo hash", { memo_hash: `${MEMO_HASH} ` }],
  ])("rejects a conflicting or non-canonical %s", (_label, nestedChange) => {
    const source = memoSource();
    source.memo = { ...source.memo, ...nestedChange };

    expect(resolveMemoSourceIdentity(source, PROPOSAL_ID, VERSION_NO)).toBeNull();
  });

  it("selects lineage only when the latest item has the complete current identity", () => {
    const lineage: ProposalMemoLineageData = {
      proposal: proposalSummary(),
      memo_count: 1,
      latest_memo_id: MEMO_ID,
      lineage_complete: true,
      memos: [
        {
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
          proposal_version_no: VERSION_NO,
        },
      ],
    };
    const identity = resolveMemoSourceIdentity(
      memoSource(),
      PROPOSAL_ID,
      VERSION_NO,
    );

    expect(
      selectCurrentMemoLineageItem(lineage, identity, PROPOSAL_ID, VERSION_NO),
    ).toEqual(lineage.memos?.[0]);
    expect(
      selectCurrentMemoLineageItem(
        { ...lineage, latest_memo_id: "memo_stale" },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeUndefined();
    expect(
      selectCurrentMemoLineageItem(
        {
          ...lineage,
          memo_count: 2,
          memos: [
            ...(lineage.memos ?? []),
            {
              memo_id: MEMO_ID,
              memo_hash: "sha256:conflicting",
              proposal_version_no: VERSION_NO - 1,
            },
          ],
        },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeUndefined();
  });

  it("selects the requested historical lineage item after the proposal advances", () => {
    const historical = memoSource();
    historical.proposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO + 1,
    };
    expect(resolveMemoSourceIdentity(historical, PROPOSAL_ID, VERSION_NO)).toBeNull();
    const identity = resolveHistoricalMemoSourceIdentity(
      historical,
      PROPOSAL_ID,
      VERSION_NO,
    );
    const lineage: ProposalMemoLineageData = {
      proposal: historical.proposal,
      memo_count: 2,
      latest_memo_id: "memo_3",
      lineage_complete: true,
      memos: [
        {
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
          proposal_version_no: VERSION_NO,
        },
        {
          memo_id: "memo_3",
          memo_hash: "sha256:memo-3",
          proposal_version_no: VERSION_NO + 1,
        },
      ],
    };

    expect(
      resolveHistoricalMemoLineageSource(lineage, identity, PROPOSAL_ID, VERSION_NO),
    ).toEqual({ kind: "matched", item: lineage.memos?.[0] });
    expect(
      resolveHistoricalMemoLineageSource(
        { ...lineage, latest_memo_id: MEMO_ID },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toEqual({ kind: "invalid" });
    expect(
      resolveHistoricalMemoLineageSource(
        {
          ...lineage,
          latest_memo_id: "memo_4",
          memos: [
            lineage.memos![0],
            {
              memo_id: "memo_4",
              memo_hash: "sha256:memo-4",
              proposal_version_no: VERSION_NO + 2,
            },
          ],
        },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toEqual({ kind: "invalid" });
  });

  it("classifies a missing historical lineage item without masking invalid lineage", () => {
    const historical = memoSource();
    historical.proposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO + 1,
    };
    const identity = resolveHistoricalMemoSourceIdentity(
      historical,
      PROPOSAL_ID,
      VERSION_NO,
    );
    const lineage: ProposalMemoLineageData = {
      proposal: historical.proposal,
      memo_count: 1,
      latest_memo_id: "memo_3",
      lineage_complete: true,
      memos: [
        {
          memo_id: "memo_3",
          memo_hash: "sha256:memo-3",
          proposal_version_no: VERSION_NO + 1,
        },
      ],
    };

    expect(
      resolveHistoricalMemoLineageSource(lineage, identity, PROPOSAL_ID, VERSION_NO),
    ).toEqual({ kind: "historical-item-missing" });
    expect(
      resolveHistoricalMemoLineageSource(
        { ...lineage, latest_memo_id: "memo_missing" },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toEqual({ kind: "invalid" });
  });

  it.each([
    ["reported count differs from the list", 2],
    ["reported count is negative", -1],
    ["reported count is fractional", 1.5],
    ["reported count is unsafe", Number.MAX_SAFE_INTEGER + 1],
  ])("rejects lineage when the %s", (_label, memoCount) => {
    const identity = resolveMemoSourceIdentity(
      memoSource(),
      PROPOSAL_ID,
      VERSION_NO,
    );
    const lineage: ProposalMemoLineageData = {
      proposal: proposalSummary(),
      memo_count: memoCount,
      latest_memo_id: MEMO_ID,
      memos: [
        {
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
          proposal_version_no: VERSION_NO,
        },
      ],
    };

    expect(
      selectCurrentMemoLineageItem(lineage, identity, PROPOSAL_ID, VERSION_NO),
    ).toBeUndefined();
  });

  it("validates an optional lineage proposal marker without requiring it", () => {
    const identity = resolveMemoSourceIdentity(
      memoSource(),
      PROPOSAL_ID,
      VERSION_NO,
    );
    const lineage: ProposalMemoLineageData = {
      proposal: proposalSummary(),
      proposal_id: PROPOSAL_ID,
      memo_count: 1,
      latest_memo_id: MEMO_ID,
      memos: [
        {
          memo_id: MEMO_ID,
          memo_hash: MEMO_HASH,
          proposal_version_no: VERSION_NO,
        },
      ],
    };

    expect(
      selectCurrentMemoLineageItem(lineage, identity, PROPOSAL_ID, VERSION_NO),
    ).toEqual(lineage.memos?.[0]);
    expect(
      selectCurrentMemoLineageItem(
        { ...lineage, proposal_id: "pp_other" },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeUndefined();
    expect(
      selectCurrentMemoLineageItem(
        { ...lineage, proposal_id: ` ${PROPOSAL_ID}` },
        identity,
        PROPOSAL_ID,
        VERSION_NO,
      ),
    ).toBeUndefined();
  });

  it("requires every field when comparing canonical identities", () => {
    const current = resolveMemoSourceIdentity(memoSource(), PROPOSAL_ID, VERSION_NO);

    expect(memoIdentitiesEqual(current, current)).toBe(true);
    expect(
      memoIdentitiesEqual(current, current ? { ...current, memoId: "memo_stale" } : null),
    ).toBe(false);
    expect(
      memoIdentitiesEqual(
        current,
        current ? { ...current, memoHash: "sha256:stale" } : null,
      ),
    ).toBe(false);
  });

});
