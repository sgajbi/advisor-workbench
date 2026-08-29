import { formatBusinessReason } from "@/copy/business-state-copy";
import { describe, expect, it } from "vitest";

import { formatBusinessOwner } from "../../src/features/workbench/manage-actor-presentation";
import {
  buildManageExceptionRows,
  buildManageExceptionRowsResult,
  buildManageReviewContextStrip,
  filterManageExceptionRowsForMandate,
  formatBusinessBoundary,
  formatBusinessBook,
  formatBusinessExceptionTitle,
  formatBusinessMandateType,
  getManageExceptionEvidencePosture,
  getManageExceptionNextCursor,
  toneForState,
} from "../../src/features/workbench/manage-workspace-view-model";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

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
    expect(formatBusinessBoundary("NO_CAMPAIGN_MEMBERSHIP_CALCULATION")).toBe(
      "Campaign membership remains source-owned",
    );
    expect(formatBusinessBoundary("NO_OMS_EXECUTION_CLAIM")).toBe(
      "No execution claim",
    );
  });

  it("does not invent mandate, book, or ownership defaults", () => {
    expect(formatBusinessMandateType(undefined)).toBe("Not available");
    expect(formatBusinessBook(null)).toBe("Not available");
    expect(formatBusinessOwner("Not assigned")).toBe("Not assigned");
  });

  it("maps Gateway-backed mandate identity into the shared review context", () => {
    expect(buildManageReviewContextStrip(buildManageWorkspaceData())).toEqual({
      portfolioName: "PF_1001",
      portfolioId: "PF_1001",
      clientId: "CL_1001",
      mandateType: "Discretionary Balanced",
      bookingCenter: "Singapore",
      businessDate: "13 May 2026",
      currency: { kind: "base", value: "USD" },
      sourceState: "confirmed",
    });
  });

  it("does not manufacture missing manage context", () => {
    const data = buildManageWorkspaceData();
    data.portfolio.portfolio.client_id = null;
    data.portfolio.portfolio.booking_center_code = null;
    data.portfolio.as_of_date = "";
    data.mandate = null;

    expect(buildManageReviewContextStrip(data)).toMatchObject({
      portfolioName: "PF_1001",
      clientId: null,
      mandateType: null,
      bookingCenter: null,
      businessDate: null,
      sourceState: "partial",
    });
  });

  it("classifies negative and stale source posture before positive substrings", () => {
    expect(toneForState("SUPPORTED")).toBe("success");
    expect(toneForState("UNSUPPORTED")).toBe("danger");
    expect(toneForState("NOT_SUPPORTED")).toBe("danger");
    expect(toneForState("STALE")).toBe("warn");
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
      mandateId: null,
      owner: "Not assigned",
      nextAction: "N/A",
      title: "Mandate exception details unavailable",
    });
  });

  it("preserves source mandate identity and scopes book exceptions to the selected mandate", () => {
    const response = {
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
      data: {
        items: [
          { exception_id: "exception-current", mandate_id: "mandate-current" },
          { exception_id: "exception-other", mandate_id: "mandate-other" },
          { exception_id: "exception-unbound" },
        ],
      },
    };
    const rows = buildManageExceptionRows(response);

    expect(rows.map((row) => row.mandateId)).toEqual([
      "mandate-current",
      "mandate-other",
      null,
    ]);
    expect(filterManageExceptionRowsForMandate(rows, "mandate-current")).toEqual([
      expect.objectContaining({ key: "exception-current", mandateId: "mandate-current" }),
    ]);
    expect(filterManageExceptionRowsForMandate(rows, "N/A")).toEqual([]);
  });

  it("rejects exception rows without a source-owned identity", () => {
    const result = buildManageExceptionRowsResult({
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
      data: {
        items: [
          { mandate_id: "mandate-current", title: "Missing identity" },
          { monitoring_exception_id: "monitoring-exception-1" },
        ],
      },
    });

    expect(result).toEqual({
      rejectedRowCount: 1,
      rows: [
      expect.objectContaining({ key: "monitoring-exception-1" }),
      ],
    });
  });

  it("does not report complete evidence when every source row lacks identity", () => {
    const response = {
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
      data: {
        items: [{ mandate_id: "mandate-current", title: "Missing identity" }],
        next_cursor: null,
      },
    };

    expect(buildManageExceptionRowsResult(response)).toEqual({
      rows: [],
      rejectedRowCount: 1,
    });
    expect(getManageExceptionEvidencePosture(response, null)).toBe("partial");
  });

  it("separates an available partial source window from complete and unavailable evidence", () => {
    const response = {
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
      data: { items: [{ exception_id: "exception-1" }], next_cursor: "window-2" },
    };

    expect(getManageExceptionEvidencePosture(response, null)).toBe("partial");
    expect(getManageExceptionNextCursor(response)).toBe("window-2");
    expect(
      getManageExceptionEvidencePosture(
        { ...response, data: { ...response.data, next_cursor: null } },
        null
      )
    ).toBe("complete");
    expect(
      getManageExceptionEvidencePosture(
        { ...response, data: { ...response.data, next_cursor: 2 } },
        null
      )
    ).toBe("unavailable");
    expect(getManageExceptionEvidencePosture(response, "Gateway timeout")).toBe(
      "unavailable"
    );
  });

  it.each([
    ["UNKNOWN", [{ exception_id: "exception-1" }], null, "partial"],
    ["DEGRADED", [{ exception_id: "exception-1" }], null, "partial"],
    ["STALE", [{ exception_id: "exception-1" }], "window-2", "partial"],
    ["UNKNOWN", [], null, "unavailable"],
    ["BLOCKED", [{ exception_id: "exception-1" }], null, "unavailable"],
    ["UNAVAILABLE", [{ exception_id: "exception-1" }], null, "unavailable"],
    ["SUPPORTED", [], null, "complete"],
    ["SUPPORTED", [{ exception_id: "exception-1" }], "window-2", "partial"],
    ["SUPPORTED", [{ exception_id: "exception-1" }], 2, "unavailable"],
  ] as const)(
    "classifies %s supportability with %s row(s) and cursor %s as %s",
    (state, items, nextCursor, expectedPosture) => {
      const response = {
        correlation_id: "corr-exceptions",
        contract_version: "v1",
        source_service: "lotus-manage",
        upstream_status: 200,
        supportability: {
          source_service: "lotus-manage",
          authority: "lotus-manage:exceptions",
          state,
          partial_readiness_reasons: [],
        },
        data: { items: [...items], next_cursor: nextCursor },
      };

      expect(getManageExceptionEvidencePosture(response, null)).toBe(
        expectedPosture,
      );
    },
  );
});
