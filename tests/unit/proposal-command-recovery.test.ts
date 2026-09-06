import { beforeEach, describe, expect, it } from "vitest";

import {
  clearProposalCommandRecovery,
  readProposalCommandRecovery,
  writeProposalCommandRecovery,
  type ProposalLifecycleCommandIntent,
  type ProposalVersionCommandIntent,
} from "../../src/features/proposals/use-proposal-command-recovery";

describe("proposal command recovery", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("round-trips the exact lifecycle request and idempotency identity", () => {
    const intent: ProposalLifecycleCommandIntent = {
      action: "submit",
      expectedState: "RISK_REVIEW",
      idempotencyKey: "ui-submit-risk-001",
      kind: "lifecycle",
      previousState: "DRAFT",
      proposalId: "pp-1",
      request: {
        actor_id: "advisor_1",
        expected_state: "DRAFT",
        review_type: "RISK",
        reason: { source: "ui" },
      },
    };

    expect(writeProposalCommandRecovery(intent)).toBe(true);
    expect(readProposalCommandRecovery("pp-1")).toEqual({
      intent,
      state: "recoverable",
    });
    expect(clearProposalCommandRecovery("pp-1")).toBe(true);
    expect(readProposalCommandRecovery("pp-1")).toBeNull();
  });

  it("round-trips the exact version request without crossing proposal scope", () => {
    const intent: ProposalVersionCommandIntent = {
      idempotencyKey: "ui-create-version-001",
      kind: "create-version",
      previousVersionNo: 3,
      proposalId: "pp-1",
      simulateRequest: { body: { proposed_trades: [{ instrument_id: "VTI" }] } },
    };

    expect(writeProposalCommandRecovery(intent)).toBe(true);
    expect(readProposalCommandRecovery("pp-1")).toEqual({
      intent,
      state: "recoverable",
    });
    expect(readProposalCommandRecovery("pp-2")).toBeNull();
  });

  it("fails closed when stored action authority does not match the visible workflow", () => {
    window.sessionStorage.setItem("lotus:proposal-command-recovery:pp-1", JSON.stringify({
      action: "approve-risk",
      expectedState: "EXECUTION_READY",
      idempotencyKey: "ui-corrupt-001",
      kind: "lifecycle",
      previousState: "RISK_REVIEW",
      proposalId: "pp-1",
      request: {
        actor_id: "advisor_1",
        expected_state: "RISK_REVIEW",
      },
      storageVersion: 1,
    }));

    expect(readProposalCommandRecovery("pp-1")).toEqual({ state: "invalid" });
  });

  it.each([
    ["submit", "RISK_REVIEW", "RISK_REVIEW", "RISK_REVIEW", "advisor_1", { review_type: "RISK" }],
    ["approve-risk", "DRAFT", "DRAFT", "AWAITING_CLIENT_CONSENT", "risk_officer_1", {}],
    ["approve-compliance", "RISK_REVIEW", "RISK_REVIEW", "AWAITING_CLIENT_CONSENT", "compliance_officer_1", {}],
    ["record-client-consent", "COMPLIANCE_REVIEW", "COMPLIANCE_REVIEW", "EXECUTION_READY", "advisor_1", {}],
  ])("rejects impossible persisted prior state for %s", (
    action,
    previousState,
    requestState,
    expectedState,
    actorId,
    requestFields,
  ) => {
    window.sessionStorage.setItem("lotus:proposal-command-recovery:pp-1", JSON.stringify({
      action,
      expectedState,
      idempotencyKey: `ui-${action}-invalid-prior`,
      kind: "lifecycle",
      previousState,
      proposalId: "pp-1",
      request: {
        actor_id: actorId,
        expected_state: requestState,
        ...requestFields,
      },
      storageVersion: 1,
    }));

    expect(readProposalCommandRecovery("pp-1")).toEqual({ state: "invalid" });
  });
});
