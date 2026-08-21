import { describe, expect, it } from "vitest";

import { parseProposalImplementationStatusEnvelope } from "../../src/features/proposals/proposal-implementation-status-contract";
import { proposalImplementationStatusFixture } from "../fixtures/proposal-implementation-status";

const SELECTED_IDENTITY = [
  "PRP-IMPLEMENT",
  "PB_SG_GLOBAL_BAL_001",
  3,
  "EXECUTION_READY",
] as const;

describe("proposal implementation status contract", () => {
  it("accepts source-confirmed handoff evidence for the selected proposal version", () => {
    const envelope = parseProposalImplementationStatusEnvelope(
      proposalImplementationStatusFixture(),
      ...SELECTED_IDENTITY,
    );

    expect(envelope.data.handoff_status).toBe("ACCEPTED");
    expect(envelope.data.version_posture).toBe("current_version");
    expect(envelope.data.capabilities).toHaveLength(5);
  });

  it("accepts a truthful not-requested posture without downstream references", () => {
    const payload = proposalImplementationStatusFixture();
    Object.assign(payload.data, {
      handoff_status: "NOT_REQUESTED",
      status_family: "not_started",
      next_action: "REQUEST_HANDOFF",
      reason_code: "implementation_handoff_not_requested",
      execution_request_id: null,
      execution_provider: null,
      external_execution_id: null,
      related_version_no: null,
      version_posture: "not_correlated",
      handoff_requested_at: null,
      executed_at: null,
      latest_workflow_event: null,
    });
    payload.data.freshness = {
      observed_at: "2026-08-20T08:55:00Z",
      basis: "PROPOSAL_LAST_EVENT",
    };
    payload.data.lineage.related_version_no = null;
    payload.data.lineage.latest_event_id = null;
    payload.data.capabilities = payload.data.capabilities.map((capability) =>
      capability.key === "provider_reference" ||
      capability.key === "event_lineage"
        ? { ...capability, state: "not_available", source_service: null }
        : capability,
    );

    expect(
      parseProposalImplementationStatusEnvelope(payload, ...SELECTED_IDENTITY)
        .data.evidence_state,
    ).toBe("supported");
  });

  it("rejects a not-requested posture with downstream request evidence", () => {
    const payload = proposalImplementationStatusFixture();
    Object.assign(payload.data, {
      handoff_status: "NOT_REQUESTED",
      status_family: "not_started",
      next_action: "REQUEST_HANDOFF",
      reason_code: "implementation_handoff_not_requested",
      latest_workflow_event: null,
    });
    payload.data.lineage.latest_event_id = null;
    payload.data.freshness = {
      observed_at: "2026-08-20T08:55:00Z",
      basis: "PROPOSAL_LAST_EVENT",
    };
    payload.data.capabilities = payload.data.capabilities.map((capability) =>
      capability.key === "event_lineage"
        ? { ...capability, state: "not_available", source_service: null }
        : capability,
    );

    expect(() =>
      parseProposalImplementationStatusEnvelope(payload, ...SELECTED_IDENTITY),
    ).toThrow(/not-requested handoff contains downstream request evidence/i);
  });

  it("accepts partial handoff evidence without upgrading unavailable references", () => {
    const payload = proposalImplementationStatusFixture();
    payload.data.evidence_state = "partial";
    payload.data.reason_code = "implementation_evidence_partial";
    payload.data.execution_provider = null;
    payload.data.capabilities = payload.data.capabilities.map((capability) =>
      capability.key === "provider_reference"
        ? { ...capability, state: "not_available", source_service: null }
        : capability,
    );

    expect(
      parseProposalImplementationStatusEnvelope(payload, ...SELECTED_IDENTITY)
        .data.evidence_state,
    ).toBe("partial");
  });

  it("rejects supported post-request evidence without a handoff timestamp", () => {
    const payload = proposalImplementationStatusFixture();
    payload.data.handoff_requested_at = null;

    expect(() =>
      parseProposalImplementationStatusEnvelope(payload, ...SELECTED_IDENTITY),
    ).toThrow(/evidence state does not match/i);
  });

  it.each([
    [
      "proposal identity drift",
      (payload: ReturnType<typeof proposalImplementationStatusFixture>) => {
        payload.data.proposal_id = "PRP-OTHER";
      },
    ],
    [
      "portfolio identity drift",
      (payload: ReturnType<typeof proposalImplementationStatusFixture>) => {
        payload.data.portfolio_id = "PB-OTHER";
      },
    ],
    [
      "future proposal version",
      (payload: ReturnType<typeof proposalImplementationStatusFixture>) => {
        payload.data.related_version_no = 4;
        payload.data.latest_workflow_event!.related_version_no = 4;
        payload.data.lineage.related_version_no = 4;
      },
    ],
    [
      "status semantics drift",
      (payload: ReturnType<typeof proposalImplementationStatusFixture>) => {
        payload.data.next_action = "NO_ACTION";
      },
    ],
    [
      "event lineage drift",
      (payload: ReturnType<typeof proposalImplementationStatusFixture>) => {
        payload.data.lineage.latest_event_id = "pwe_other";
      },
    ],
    [
      "capability overclaim",
      (payload: ReturnType<typeof proposalImplementationStatusFixture>) => {
        payload.data.capabilities.find(
          ({ key }) => key === "order_fill_settlement_detail",
        )!.state = "supported";
      },
    ],
  ])("fails closed on %s", (_case, mutate) => {
    const payload = proposalImplementationStatusFixture();
    mutate(payload);

    expect(() =>
      parseProposalImplementationStatusEnvelope(payload, ...SELECTED_IDENTITY),
    ).toThrow(/proposal implementation status contract is invalid/i);
  });
});
