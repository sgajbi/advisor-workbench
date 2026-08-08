import { describe, expect, it } from "vitest";

import {
  buildManageExceptionRows,
  formatBusinessBook,
  formatBusinessExceptionTitle,
  formatBusinessMandateType,
  formatBusinessOwner,
  formatBusinessReason,
} from "../../src/features/workbench/manage-workspace-view-model";

describe("manage workspace business presentation", () => {
  it("translates known source codes without exposing technical vocabulary", () => {
    expect(formatBusinessExceptionTitle("DPM_SOURCE_STALE")).toBe(
      "Mandate data requires refresh",
    );
    expect(formatBusinessExceptionTitle("SOURCE_RISK_HEALTH_ATTENTION")).toBe(
      "Risk posture requires review",
    );
    expect(formatBusinessReason("TAX_LOT_SOURCE_PARTIAL")).toBe(
      "Tax-lot data is incomplete",
    );
    expect(formatBusinessReason("SOURCE_RISK_HEALTH_ATTENTION")).toBe(
      "Risk posture requires review",
    );
  });

  it("does not invent mandate, book, or ownership defaults", () => {
    expect(formatBusinessMandateType(undefined)).toBe("Not available");
    expect(formatBusinessBook(null)).toBe("Not available");
    expect(formatBusinessOwner("Not assigned")).toBe("Not assigned");
  });

  it("keeps missing exception actions and owners visibly unassigned", () => {
    const rows = buildManageExceptionRows({
      correlation_id: "corr-exceptions",
      contract_version: "v1",
      source_service: "lotus-manage",
      upstream_status: 200,
      supportability: {
        source_service: "lotus-manage",
        authority: "lotus-manage:exceptions",
        state: "SUPPORTED",
        partial_readiness_reasons: [],
      },
      data: { items: [{ exception_id: "exception-1", severity: "HIGH" }] },
    });

    expect(rows[0]).toMatchObject({
      owner: "Not assigned",
      nextAction: "N/A",
      title: "Mandate exception details unavailable",
    });
  });
});
