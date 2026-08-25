import { describe, expect, it } from "vitest";

import { buildExecutionAcknowledgementSupportabilityModel } from "../../src/features/workbench/execution-acknowledgement-view-model";
import type { ExternalOrderExecutionAcknowledgementResponse } from "../../src/features/workbench/types";

const response: ExternalOrderExecutionAcknowledgementResponse = {
  product_name: "ExternalOrderExecutionAcknowledgement",
  product_version: "v1",
  portfolio_id: "PB_SG_GLOBAL_BAL_001",
  order_reference_ids: [],
  acknowledgements: [],
  data_quality_status: "MISSING",
  supportability: {
    state: "UNAVAILABLE",
    reason: "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
    acknowledgement_count: 0,
    missing_data_families: [
      "EXTERNAL_OMS_ORDER_EXECUTION_ACKNOWLEDGEMENT",
    ],
    blocked_capabilities: ["ORDER_GENERATION", "NEW_EXECUTION_CAPABILITY"],
  },
  lineage: {
    source_system: "external_oms",
    runtime_posture: "fail_closed",
  },
};

describe("execution acknowledgement view model", () => {
  it("separates business-facing execution posture from exact support evidence", () => {
    const model = buildExecutionAcknowledgementSupportabilityModel(response);

    expect(model).toMatchObject({
      state: "Unavailable",
      reason: "External order acknowledgement records are not connected",
      acknowledgementCount: "0",
      evidenceLabel: "Order acknowledgement evidence",
      dataQualityStatus: "Missing",
      missingDataFamilies: ["Order acknowledgement records"],
      blockedCapabilities: ["Order generation", "Review required"],
    });
    expect(model.lineageRows).toEqual(
      expect.arrayContaining([
        {
          key: "evidence_contract",
          label: "Evidence contract",
          value: "ExternalOrderExecutionAcknowledgement v1",
        },
        {
          key: "source_reason",
          label: "Source reason",
          value: "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
        },
        {
          key: "source_blocked_capabilities",
          label: "Source blocked capabilities",
          value: "ORDER_GENERATION, NEW_EXECUTION_CAPABILITY",
        },
        {
          key: "source_system",
          label: "Source system",
          value: "external_oms",
        },
      ]),
    );
  });

  it("does not invent contract or source evidence before a response arrives", () => {
    expect(buildExecutionAcknowledgementSupportabilityModel(null)).toEqual({
      state: "Unavailable",
      reason: "Order acknowledgement evidence has not loaded.",
      acknowledgementCount: "0",
      missingDataFamilies: [],
      blockedCapabilities: [],
      lineageRows: [],
      evidenceLabel: "Order acknowledgement evidence",
      dataQualityStatus: "Not available",
    });
  });
});
