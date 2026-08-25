import { describe, expect, it } from "vitest";

import { buildProposalImplementationStatusModel } from "../../src/features/proposals/proposal-implementation-status-view-model";
import { proposalImplementationStatusFixture } from "../fixtures/proposal-implementation-status";

describe("proposal implementation status view model", () => {
  it("translates source codes into concise advisor decision language", () => {
    const model = buildProposalImplementationStatusModel(
      proposalImplementationStatusFixture(),
    );

    expect(model.handoff.label).toBe("Accepted for implementation");
    expect(model.handoff.summary).toContain("material difficulty");
    expect(model.handoff.nextAction).toContain("Monitor for completion");
    expect(model.version.label).toBe("Current version");
    expect(model.event?.type).toBe("Implementation accepted");
    expect(model.event?.occurredAt).toBe("20 Aug 2026, 09:05 UTC");
    expect(model.facts).toContainEqual({
      label: "Last update",
      value: "20 Aug 2026, 09:05 UTC",
    });
    expect(model.boundary).toContain("settlement");
  });

  it("normalizes offset-bearing implementation evidence to the disclosed UTC clock", () => {
    const envelope = proposalImplementationStatusFixture();
    envelope.data.latest_workflow_event!.occurred_at = "2026-08-20T17:05:00+08:00";
    envelope.data.freshness.observed_at = "2026-08-20T17:05:00+08:00";

    const model = buildProposalImplementationStatusModel(envelope);

    expect(model.event?.occurredAt).toBe("20 Aug 2026, 09:05 UTC");
    expect(model.facts).toContainEqual({
      label: "Last update",
      value: "20 Aug 2026, 09:05 UTC",
    });
    expect(JSON.stringify(model)).not.toContain("2026-08-20T17:05:00+08:00");
  });

  it("keeps historical-version handoff evidence visibly distinct", () => {
    const envelope = proposalImplementationStatusFixture();
    envelope.data.related_version_no = 2;
    envelope.data.version_posture = "historical_version";
    envelope.data.latest_workflow_event!.related_version_no = 2;
    envelope.data.lineage.related_version_no = 2;

    const model = buildProposalImplementationStatusModel(envelope);

    expect(model.version.label).toBe("Earlier version");
    expect(model.version.tone).toBe("warn");
    expect(model.version.summary).toContain("must not be treated");
  });

  it("surfaces partial evidence without hiding supported status", () => {
    const envelope = proposalImplementationStatusFixture();
    envelope.data.evidence_state = "partial";

    const model = buildProposalImplementationStatusModel(envelope);

    expect(model.evidence.label).toBe("Handoff information incomplete");
    expect(model.evidence.tone).toBe("warn");
    expect(model.evidence.summary).toContain("references are missing");
  });

  it("keeps exact provider and contract values out of primary decision facts", () => {
    const model = buildProposalImplementationStatusModel(
      proposalImplementationStatusFixture(),
    );

    expect(model.facts.map((fact) => fact.label)).toEqual([
      "Implementation requested",
      "Last update",
      "Update basis",
    ]);
    expect(model.supportDetails).toContainEqual({
      label: "Source system",
      value: "lotus-advise",
    });
    expect(model.supportDetails).toContainEqual({
      label: "Handoff status code",
      value: "ACCEPTED",
    });
  });
});
