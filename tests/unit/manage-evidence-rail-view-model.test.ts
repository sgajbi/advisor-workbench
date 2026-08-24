import { describe, expect, it } from "vitest";

import { buildManageEvidenceRailModel } from "../../src/features/workbench/manage-evidence-rail-view-model";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

describe("Manage evidence rail view model", () => {
  it("publishes only source-evidence facts that are distinct from overview posture", () => {
    const model = buildManageEvidenceRailModel(buildManageWorkspaceData());

    expect(model).toEqual({
      headline: "Source evidence available",
      items: [
        { label: "Evidence pack", value: "Available" },
        { label: "Monitoring record", value: "Ready" },
        { label: "Traceability", value: "Available" },
      ],
    });
    expect(model.items.map((item) => item.label)).not.toEqual(
      expect.arrayContaining([
        "Attention items",
        "Data readiness",
        "Mandate health",
        "Rebalance status",
      ]),
    );
  });

  it("fails closed when no evidence pack or monitoring identity is available", () => {
    const data = buildManageWorkspaceData({
      commandCenter: null,
      mandateHealth: null,
    });
    data.outcomeReviews = null;

    expect(buildManageEvidenceRailModel(data)).toEqual({
      headline: "Source evidence needs confirmation",
      items: [
        { label: "Evidence pack", value: "Not requested" },
        { label: "Monitoring record", value: "Not available" },
        { label: "Traceability", value: "Not available" },
      ],
    });
  });
});
