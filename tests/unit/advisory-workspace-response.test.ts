import { describe, expect, it } from "vitest";

import {
  extractAdvisoryWorkspace,
  extractAdvisoryWorkspaceId,
  extractEvaluationSummary,
  extractHandoffProposalId,
  extractLatestProposalResult,
  recordValue,
} from "../../src/features/proposals/advisory-workspace-response";
import type { AdvisoryWorkspaceEnvelopeResponse } from "../../src/features/proposals/types";

function envelope(data: Record<string, unknown>): AdvisoryWorkspaceEnvelopeResponse {
  return {
    correlation_id: "corr-1",
    contract_version: "v1",
    data,
  };
}

describe("advisory workspace response adapter", () => {
  it("extracts workspace posture from nested Gateway envelopes", () => {
    const response = envelope({
      workspace: {
        workspace_id: "aws_1",
        latest_proposal_result: {
          status: "evaluated",
        },
        evaluation_summary: {
          review_issue_count: 2,
          impact_summary: {
            trade_count: 3,
          },
        },
      },
    });

    expect(extractAdvisoryWorkspace(response)).toMatchObject({ workspace_id: "aws_1" });
    expect(extractAdvisoryWorkspaceId(response)).toBe("aws_1");
    expect(extractLatestProposalResult(response)).toEqual({ status: "evaluated" });
    expect(extractEvaluationSummary(response)).toMatchObject({
      review_issue_count: 2,
    });
  });

  it("extracts handoff proposal id without leaking envelope shape into UI code", () => {
    expect(
      extractHandoffProposalId(
        envelope({
          proposal: {
            proposal: {
              proposal_id: "PRP-1",
            },
          },
        })
      )
    ).toBe("PRP-1");

    expect(
      extractHandoffProposalId(
        envelope({
          proposal: {
            data: {
              proposal: {
                proposal_id: "PRP-2",
              },
            },
          },
        })
      )
    ).toBe("PRP-2");
  });

  it("rejects arrays and nulls as record values", () => {
    expect(recordValue(null)).toBeNull();
    expect(recordValue([])).toBeNull();
    expect(recordValue({ ok: true })).toEqual({ ok: true });
  });
});
