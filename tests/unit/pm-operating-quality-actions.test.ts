import { describe, expect, it } from "vitest";

import {
  buildPmQualityActionError,
  buildPmQualityBlockedActionError,
  buildPmQualityFairnessCreateEvidence,
  readPmQualityFairnessAnalysisId,
} from "../../src/features/workbench/pm-operating-quality-actions";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const response: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-pmq-fairness-create",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    blocked_actions: [],
    fairness_analysis_id: "pmq_fair_supportability",
  },
  data: {
    fairness_analysis: {
      fairness_analysis_id: "pmq_fair_payload",
      content_hash: "sha256:pm-quality",
    },
  },
};

describe("PM operating quality action helpers", () => {
  it("classifies Gateway action failures into product-safe status classes", () => {
    expect(
      buildPmQualityActionError(
        new Error("Failed to fetch PM operating quality route (403)"),
        "fallback"
      )
    ).toEqual({
      body: "Failed to fetch PM operating quality route (403)",
      status: "403",
      statusClass: "permission blocked",
      source: "Gateway PM operating quality route",
    });

    expect(
      buildPmQualityActionError(
        new Error("Failed to fetch PM operating quality route (409)"),
        "fallback"
      ).statusClass
    ).toBe("business blocked");
    expect(
      buildPmQualityActionError(
        new Error("Failed to fetch PM operating quality route (503)"),
        "fallback"
      ).statusClass
    ).toBe("upstream unavailable");
  });

  it("builds blocked action posture from Manage supportability", () => {
    expect(buildPmQualityBlockedActionError("Blocked by Manage action register")).toEqual({
      body: "Blocked by Manage action register",
      status: "N/A",
      statusClass: "blocked",
      source: "Manage action register via Gateway supportability",
    });
  });

  it("prefers supportability fairness-analysis id and falls back to payload id", () => {
    expect(readPmQualityFairnessAnalysisId(response)).toBe("pmq_fair_supportability");
    expect(
      readPmQualityFairnessAnalysisId({
        ...response,
        supportability: {
          ...response.supportability,
          fairness_analysis_id: null,
        },
      })
    ).toBe("pmq_fair_payload");
  });

  it("builds persisted fairness create evidence without exposing payload hashes", () => {
    const evidence = buildPmQualityFairnessCreateEvidence(response);

    expect(evidence).toEqual({
      fairnessAnalysisId: "pmq_fair_supportability",
      correlationId: "corr-pmq-fairness-create",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(JSON.stringify(evidence)).not.toContain("sha256:pm-quality");
  });
});
