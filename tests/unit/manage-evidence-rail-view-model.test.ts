import { describe, expect, it } from "vitest";

import { buildManageEvidenceRailModel } from "../../src/features/workbench/manage-evidence-rail-view-model";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

describe("Manage evidence rail view model", () => {
  it("publishes only source-evidence facts that are distinct from overview posture", () => {
    const data = buildManageWorkspaceData();
    data.proofPack = {
      correlation_id: "corr_proof_pack",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:proof-pack",
        state: "SUPPORTED",
        proof_pack_id: "ppack_1",
        reason_codes: ["PROOF_PACK_READY"],
        markdown_available: true,
        report_input_available: true,
        ai_evidence_input_available: true,
      },
      data: { proof_pack_id: "ppack_1" },
    };
    const model = buildManageEvidenceRailModel(data);

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

  it("does not claim that a referenced evidence pack is available when retrieval fails", () => {
    const data = buildManageWorkspaceData({
      commandCenter: null,
      mandateHealth: null,
      proofPack: null,
      proofPackError: "Evidence pack preload is temporarily unavailable.",
    });

    expect(buildManageEvidenceRailModel(data)).toEqual({
      headline: "Source evidence needs confirmation",
      items: [
        { label: "Evidence pack", value: "Temporarily unavailable" },
        { label: "Monitoring record", value: "Not available" },
        { label: "Traceability", value: "Not available" },
      ],
    });
  });

  it("distinguishes a historical pack reference from a retrieved pack", () => {
    const data = buildManageWorkspaceData({
      commandCenter: null,
      mandateHealth: null,
      proofPack: null,
      proofPackError: null,
    });

    expect(buildManageEvidenceRailModel(data)).toEqual({
      headline: "Source evidence needs confirmation",
      items: [
        { label: "Evidence pack", value: "Referenced; not retrieved" },
        { label: "Monitoring record", value: "Not available" },
        { label: "Traceability", value: "Not available" },
      ],
    });
  });

  it("preserves a top-level pack reference when the detail response is not found", () => {
    const data = buildManageWorkspaceData({
      commandCenter: null,
      mandateHealth: null,
      outcomeReviews: {
        ...buildManageWorkspaceData().outcomeReviews!,
        data: { proof_pack_id: "ppack_top_level" },
      },
      proofPack: null,
      proofPackError: null,
    });

    expect(buildManageEvidenceRailModel(data).items[0]).toEqual({
      label: "Evidence pack",
      value: "Referenced; not retrieved",
    });
  });
});
