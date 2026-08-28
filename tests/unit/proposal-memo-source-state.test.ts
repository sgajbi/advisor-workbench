import { describe, expect, it } from "vitest";

import { resolveProposalMemoSourceState } from "../../src/features/proposals/proposal-memo-source-state";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

const PROPOSAL_ID = "pp_1";
const VERSION_NO = 2;

function notFound(label: string) {
  return new WorkbenchApiError(label, 404);
}

function completeLineage() {
  return {
    lineage_complete: true,
    latest_memo_id: null,
    memo_count: 0,
    memos: [],
    proposal: {
      current_state: "DRAFT",
      current_version_no: VERSION_NO,
      proposal_id: PROPOSAL_ID,
    },
  };
}

function sourceState(
  overrides: Partial<Parameters<typeof resolveProposalMemoSourceState>[0]> = {},
) {
  return resolveProposalMemoSourceState({
    isChecking: false,
    lineageData: completeLineage(),
    memoError: notFound("proposal memo"),
    projectionError: notFound("proposal memo projection"),
    proposalId: PROPOSAL_ID,
    replayError: notFound("proposal memo replay evidence"),
    sourceIdentityCurrent: false,
    versionNo: VERSION_NO,
    ...overrides,
  });
}

describe("proposal memo source state", () => {
  it("recognizes a source-confirmed current-version memo start state", () => {
    expect(sourceState()).toBe("not-prepared");
  });

  it("accepts a matching optional top-level lineage proposal identity", () => {
    expect(sourceState({
      lineageData: { ...completeLineage(), proposal_id: PROPOSAL_ID },
    })).toBe("not-prepared");
  });

  it("rejects successful empty envelopes as malformed rather than authorizing preparation", () => {
    expect(sourceState({
      memoData: {},
      memoError: undefined,
      projectionData: { audience: "ADVISOR", sections: [] },
      projectionError: undefined,
      replayData: { audit_events: [], hashes: {} },
      replayError: undefined,
    })).toBe("unavailable");
  });

  it("rejects retained current memo data when the latest reads report absence", () => {
    expect(sourceState({
      memoData: {
        memo: {
          memo_hash: "sha256:memo-2",
          memo_id: "memo_2",
          proposal_id: PROPOSAL_ID,
          proposal_version_no: VERSION_NO,
        },
        memo_hash: "sha256:memo-2",
        memo_id: "memo_2",
        proposal: completeLineage().proposal,
        proposal_version_no: VERSION_NO,
      },
    })).toBe("unavailable");
    expect(sourceState({
      projectionData: {
        memo_hash: "sha256:memo-2",
        memo_id: "memo_2",
        proposal: completeLineage().proposal,
        proposal_version_no: VERSION_NO,
      },
    })).toBe("unavailable");
    expect(sourceState({
      replayData: {
        hashes: { memo_hash: "sha256:memo-2" },
        subject: {
          memo_id: "memo_2",
          proposal_id: PROPOSAL_ID,
          proposal_version_no: VERSION_NO,
        },
      },
    })).toBe("unavailable");
  });

  it.each([
    ["memo transport failure", { memoError: new WorkbenchApiError("proposal memo", 503) }],
    ["projection permission failure", { projectionError: new WorkbenchApiError("projection", 403) }],
    ["replay contract failure", { replayError: new Error("unreadable response") }],
    ["lineage failure", { lineageError: new WorkbenchApiError("lineage", 502) }],
    ["incomplete lineage", { lineageData: { ...completeLineage(), lineage_complete: false } }],
    ["contradictory top-level proposal identity", {
      lineageData: { ...completeLineage(), proposal_id: "pp_other" },
    }],
    ["contradictory lineage", {
      lineageData: {
        ...completeLineage(),
        latest_memo_id: "memo_2",
        memo_count: 1,
        memos: [{
          memo_hash: "sha256:memo-2",
          memo_id: "memo_2",
          proposal_version_no: VERSION_NO,
        }],
      },
    }],
  ])("keeps %s unavailable", (_label, overrides) => {
    expect(sourceState(overrides)).toBe("unavailable");
  });

  it("keeps pending evidence in the loading state", () => {
    expect(sourceState({ isChecking: true })).toBe("loading");
  });

  it("marks aligned populated evidence ready", () => {
    expect(sourceState({
      memoData: { memo_id: "memo_2" },
      memoError: undefined,
      projectionData: { memo_id: "memo_2" },
      projectionError: undefined,
      replayData: { subject: { memo_id: "memo_2" } },
      replayError: undefined,
      sourceIdentityCurrent: true,
    })).toBe("ready");
  });
});
