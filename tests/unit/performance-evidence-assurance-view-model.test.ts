import { describe, expect, it } from "vitest";

import { buildPerformanceEvidenceAssuranceViewModel } from "../../src/apps/performance/evidence/performance-evidence-assurance-view-model";
import type { PerformanceEvidenceView } from "../../src/features/workbench/types";
import type { WorkspaceCapability } from "../../src/shell/workspace-capabilities";

const supportedCapability: WorkspaceCapability = {
  state: "supported",
  reason: "Source evidence can be reviewed.",
};

function evidence(overrides: Partial<PerformanceEvidenceView> = {}): PerformanceEvidenceView {
  return {
    state: "supported",
    as_of_date: "2026-08-14",
    period: "YTD",
    basis: "NET",
    benchmark_code: "BMK_PB_GLOBAL_BALANCED_60_40",
    calculation_scope: "performance_workspace",
    source_services: ["lotus-performance"],
    input_freshness: { performance: "fresh", benchmark: "fresh" },
    methodology_references: ["lotus-performance/docs/methodologies"],
    calculation_versions: { gateway_contract: "v1" },
    coverage: { supported_dimensions: ["asset_class"], unsupported_dimensions: [] },
    fallbacks: [],
    limitations: [],
    calculations: [
      {
        calculation_role: "workspace_summary",
        calculation_id: "calc-1",
        analytics_type: "WORKSPACE_SUMMARY",
        execution_status: "complete",
        lineage_status: "complete",
        stage_statuses: [],
        upstream_snapshots: [],
        artifacts: [{ artifact_name: "request.json", url: "/api/v1/evidence/request.json" }],
      },
    ],
    source_supportability: [
      {
        key: "source_calculation",
        state: "supported",
        freshness_bucket: "fresh",
        source_service: "lotus-performance",
      },
    ],
    ...overrides,
  };
}

describe("buildPerformanceEvidenceAssuranceViewModel", () => {
  it("admits source-confirmed evidence only for internal review", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(supportedCapability, evidence());

    expect(view.state).toBe("ready");
    expect(view.posture).toBe("Ready for internal review");
    expect(view.summary).toContain("does not constitute client-release or regulatory approval");
    expect(view.metrics).toEqual([
      expect.objectContaining({ label: "Calculation coverage", value: "1 of 1" }),
      expect.objectContaining({ label: "Review items", value: "0" }),
      expect.objectContaining({ label: "Supporting records", value: "1" }),
    ]);
    expect(view.calculations[0]).toMatchObject({
      title: "Portfolio performance summary",
      calculationStatus: "Confirmed",
      evidenceStatus: "Confirmed",
      evidenceCount: 1,
    });
    expect(view.calculations[0].records[0]).toMatchObject({
      label: "Calculation input record",
      href: "/api/bff/api/v1/evidence/request.json",
    });
  });

  it("fails closed when the source publishes no calculations", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ calculations: [] })
    );

    expect(view.state).toBe("incomplete");
    expect(view.posture).toBe("Incomplete evidence");
    expect(view.metrics[0].value).toBe("0 of 0");
  });

  it("makes pending calculation and lineage states explicit", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      { state: "partial", reason: "Evidence is pending." },
      evidence({
        state: "partial",
        calculations: [
          {
            ...evidence().calculations[0],
            execution_status: "running",
            lineage_status: "pending",
            artifacts: [],
          },
        ],
      })
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Evidence package incomplete",
        "Calculation still in progress",
        "Supporting evidence still being prepared",
      ])
    );
    expect(view.calculations[0]).toMatchObject({
      calculationStatus: "In progress",
      evidenceStatus: "In progress",
    });
  });

  it("escalates failed calculations and stale inputs as attention required", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        input_freshness: { performance: "stale" },
        calculations: [
          {
            ...evidence().calculations[0],
            execution_status: "failed",
            lineage_status: "unavailable",
          },
        ],
      })
    );

    expect(view.state).toBe("attention");
    expect(view.posture).toBe("Attention required");
    expect(view.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Calculation did not complete", tone: "danger" }),
        expect.objectContaining({ title: "Supporting evidence unavailable", tone: "danger" }),
        expect.objectContaining({ title: "Required input evidence is not current", tone: "danger" }),
      ])
    );
  });

  it("qualifies fallbacks, limitations, unsupported coverage, and partial source supportability", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        fallbacks: ["fallback_internal_code"],
        limitations: ["Source data window limited"],
        coverage: { supported_dimensions: ["asset_class"], unsupported_dimensions: ["issuer"] },
        source_supportability: [
          { key: "source_calculation", state: "partial", reason: "source_internal_reason" },
        ],
      })
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Alternate calculation path applied",
        "Source limitation applies",
        "Evidence coverage is limited",
        "Source assurance qualified",
      ])
    );
    expect(view.exceptions.map((item) => item.detail).join(" ")).not.toContain(
      "fallback_internal_code"
    );
    expect(view.supportGroups.flatMap((group) => group.rows).map((row) => row.value)).toEqual(
      expect.arrayContaining(["fallback_internal_code", "Source data window limited"])
    );
  });

  it("maps malformed and unknown source states to neutral incomplete posture", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        state: "mystery_state",
        input_freshness: { performance: "mystery_freshness" },
        calculations: [
          {
            ...evidence().calculations[0],
            calculation_role: "new_unmapped_role",
            execution_status: "mystery_execution",
            lineage_status: null,
          },
        ],
      })
    );

    expect(view.state).toBe("incomplete");
    expect(view.posture).toBe("Incomplete evidence");
    expect(view.calculations[0]).toMatchObject({
      title: "Additional performance calculation 1",
      calculationStatus: "Not reported",
      evidenceStatus: "Not confirmed",
    });
    expect(view.exceptions.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Assurance status not reported",
        "Required input freshness not confirmed",
        "Calculation status not reported",
        "Supporting evidence not confirmed",
      ])
    );
  });

  it("keeps raw identifiers and technical vocabulary in support groups only", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(supportedCapability, evidence());
    const primaryText = JSON.stringify({
      posture: view.posture,
      summary: view.summary,
      exceptions: view.exceptions,
      calculations: view.calculations.map((calculation) => ({
        title: calculation.title,
        purpose: calculation.purpose,
        calculationStatus: calculation.calculationStatus,
        evidenceStatus: calculation.evidenceStatus,
        records: calculation.records.map((record) => ({
          label: record.label,
          support: record.support,
        })),
      })),
    });
    const supportText = JSON.stringify(view.supportGroups);

    expect(primaryText).not.toContain("lotus-performance");
    expect(primaryText).not.toContain("calc-1");
    expect(primaryText).not.toContain("WORKSPACE_SUMMARY");
    expect(primaryText).not.toContain("gateway_contract");
    expect(supportText).toContain("lotus-performance");
    expect(supportText).toContain("calc-1");
    expect(supportText).toContain("WORKSPACE_SUMMARY");
    expect(supportText).toContain("gateway_contract");
  });

  it("preserves the governed archived-document download route", () => {
    const source = evidence();
    source.calculations[0].artifacts = [
      {
        artifact_name: "portfolio-review.pdf",
        url: "/api/v1/documents/doc-1/download",
        archive_document_id: "doc-1",
        archive_document_download_url: "/api/bff/api/v1/documents/doc-1/download",
      },
    ];

    const view = buildPerformanceEvidenceAssuranceViewModel(supportedCapability, source);
    expect(view.calculations[0].records[0]).toMatchObject({
      label: "Archived evidence document",
      href: "/api/bff/api/v1/documents/doc-1/download",
    });
  });

  it("fails closed when a supporting record is outside the governed Workbench boundary", () => {
    const source = evidence();
    source.calculations[0].artifacts = [
      {
        artifact_name: "request.json",
        url: "javascript:alert('unsafe')",
      },
    ];

    const view = buildPerformanceEvidenceAssuranceViewModel(supportedCapability, source);

    expect(view.state).toBe("attention");
    expect(view.calculations[0].records[0]).toMatchObject({
      label: "Calculation input record",
      href: null,
    });
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title: "Supporting record route unavailable", tone: "danger" })
    );
  });
});
