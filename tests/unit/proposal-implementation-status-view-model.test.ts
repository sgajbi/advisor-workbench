import { describe, expect, it } from "vitest";

import { buildProposalImplementationStatusModel } from "../../src/features/proposals/proposal-implementation-status-view-model";
import { proposalImplementationStatusFixture } from "../fixtures/proposal-implementation-status";

describe("proposal implementation status view model", () => {
  it("translates source codes into concise advisor decision language", () => {
    const model = buildProposalImplementationStatusModel(
      proposalImplementationStatusFixture(),
    );

    expect(model.handoff.label).toBe("Accepted for implementation");
    expect(model.handoff.summary).toContain("remains in progress");
    expect(model.handoff.nextAction).toContain("Monitor source updates");
    expect(model.version.label).toBe("Current version");
    expect(model.event?.type).toBe("Execution Accepted");
    expect(model.boundary).toContain("settlement");
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
    expect(model.version.summary).toContain("Do not assume");
  });

  it("surfaces partial evidence without hiding supported status", () => {
    const envelope = proposalImplementationStatusFixture();
    envelope.data.evidence_state = "partial";

    const model = buildProposalImplementationStatusModel(envelope);

    expect(model.evidence.label).toBe("Partial source evidence");
    expect(model.evidence.tone).toBe("warn");
    expect(model.evidence.summary).toContain("incomplete evidence");
  });
});
