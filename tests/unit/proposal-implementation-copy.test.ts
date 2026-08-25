import { describe, expect, it } from "vitest";

import {
  PROPOSAL_IMPLEMENTATION_COPY,
  proposalImplementationEvidenceCopy,
  proposalImplementationEventLabel,
  proposalImplementationNextActionCopy,
  proposalImplementationStatusCopy,
  proposalImplementationVersionCopy,
} from "../../src/copy/proposal-implementation-copy";
import type {
  ProposalImplementationEventType,
  ProposalImplementationHandoffStatus,
  ProposalImplementationNextAction,
  ProposalImplementationVersionPosture,
} from "../../src/features/proposals/proposal-implementation-status-contract";

describe("proposal implementation copy", () => {
  it.each<
    [ProposalImplementationHandoffStatus, string, string]
  >([
    ["NOT_REQUESTED", "Handoff not requested", "No implementation handoff"],
    ["REQUESTED", "Handoff requested", "awaiting acceptance"],
    ["ACCEPTED", "Accepted for implementation", "material difficulty"],
    ["PARTIALLY_EXECUTED", "Partially implemented", "outstanding position"],
    ["EXECUTED", "Implementation reported complete", "boundary below"],
    ["REJECTED", "Handoff rejected", "review the rejection"],
    ["CANCELLED", "Handoff cancelled", "client's current instruction"],
    ["EXPIRED", "Handoff expired", "no longer active"],
  ])("maps %s to business status copy", (status, label, summary) => {
    const copy = proposalImplementationStatusCopy(status);

    expect(copy.label).toBe(label);
    expect(copy.summary.toLowerCase()).toContain(summary.toLowerCase());
  });

  it.each<ProposalImplementationNextAction>([
    "REQUEST_HANDOFF",
    "MONITOR_HANDOFF",
    "MONITOR_IMPLEMENTATION",
    "REVIEW_PARTIAL_EXECUTION",
    "NO_ACTION",
    "INVESTIGATE_REJECTION",
    "REVIEW_CANCELLATION",
    "REVALIDATE_HANDOFF",
  ])("maps the %s action without exposing its source code", (action) => {
    const label = proposalImplementationNextActionCopy(action);

    expect(label).not.toContain(action);
    expect(label).not.toMatch(/\b[A-Z]+_[A-Z_]+\b/);
  });

  it.each<[ProposalImplementationVersionPosture, string]>([
    ["not_correlated", "Not linked"],
    ["current_version", "Current version"],
    ["historical_version", "Earlier version"],
  ])("maps %s version evidence explicitly", (version, label) => {
    expect(proposalImplementationVersionCopy(version).label).toBe(label);
  });

  it.each<[ProposalImplementationEventType, string]>([
    ["EXECUTION_REQUESTED", "Implementation requested"],
    ["EXECUTION_ACCEPTED", "Implementation accepted"],
    ["EXECUTION_PARTIALLY_EXECUTED", "Partial implementation reported"],
    ["EXECUTION_REJECTED", "Implementation rejected"],
    ["EXECUTION_CANCELLED", "Implementation cancelled"],
    ["EXECUTION_EXPIRED", "Implementation request expired"],
    ["EXECUTED", "Implementation reported complete"],
  ])("maps %s event explicitly", (event, label) => {
    expect(proposalImplementationEventLabel(event)).toBe(label);
  });

  it("distinguishes complete and incomplete handoff information", () => {
    expect(proposalImplementationEvidenceCopy(false)).toMatchObject({
      label: "Handoff information complete",
      tone: "success",
    });
    expect(proposalImplementationEvidenceCopy(true)).toMatchObject({
      label: "Handoff information incomplete",
      tone: "warn",
    });
  });

  it("keeps implementation authority narrower than execution and settlement", () => {
    expect(PROPOSAL_IMPLEMENTATION_COPY.boundary).toContain(
      "advisory implementation handoff only",
    );
    expect(PROPOSAL_IMPLEMENTATION_COPY.boundary).toContain("settlement");
    expect(PROPOSAL_IMPLEMENTATION_COPY.footer).toContain(
      "full proposal record",
    );
  });
});
