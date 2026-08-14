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
    expect(view.context).toContainEqual({ label: "Benchmark", value: "Assigned" });
  });

  it("fails closed when the source publishes no calculations", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ calculations: [] })
    );

    expect(view.state).toBe("incomplete");
    expect(view.posture).toBe("Incomplete evidence");
    expect(view.metrics[0].value).toBe("0 of 0");
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title: "Calculation evidence not reported", tone: "warn" })
    );
    expect(view.metrics).toContainEqual(
      expect.objectContaining({ label: "Review items", value: "1" })
    );
  });

  it("preserves attention precedence when calculations are absent", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ calculations: [], input_freshness: { performance: "stale" } })
    );

    expect(view.state).toBe("attention");
    expect(view.posture).toBe("Attention required");
    expect(view.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Calculation evidence not reported", tone: "warn" }),
        expect.objectContaining({ title: "Performance input evidence is not current", tone: "danger" }),
      ])
    );
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
        "Portfolio performance summary still in progress",
        "Portfolio performance summary evidence still being prepared",
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
        expect.objectContaining({ title: "Portfolio performance summary did not complete", tone: "danger" }),
        expect.objectContaining({ title: "Portfolio performance summary evidence unavailable", tone: "danger" }),
        expect.objectContaining({ title: "Performance input evidence is not current", tone: "danger" }),
      ])
    );
  });

  it.each([
    ["failed", "attention", "Portfolio performance summary stage did not complete", "danger", "Attention required", "danger"],
    ["running", "incomplete", "Portfolio performance summary stage still in progress", "warn", "In progress", "warn"],
    ["unexpected", "incomplete", "Portfolio performance summary stage status not reported", "warn", "Not confirmed", "default"],
  ] as const)(
    "fails closed when a published calculation stage is %s",
    (
      stageStatus,
      expectedState,
      expectedTitle,
      expectedTone,
      expectedCalculationStatus,
      expectedCalculationTone
    ) => {
      const source = evidence();
      source.calculations[0].stage_statuses = [
        {
          stage_name: "internal_stage_code",
          status: stageStatus,
        },
      ];

      const view = buildPerformanceEvidenceAssuranceViewModel(supportedCapability, source);

      expect(view.state).toBe(expectedState);
      expect(view.exceptions).toContainEqual(
        expect.objectContaining({ title: expectedTitle, tone: expectedTone })
      );
      expect(view.calculations[0]).toMatchObject({
        calculationStatus: expectedCalculationStatus,
        calculationTone: expectedCalculationTone,
      });
      expect(view.metrics).toContainEqual(
        expect.objectContaining({ label: "Calculation coverage", value: "0 of 1" })
      );
      expect(JSON.stringify(view.exceptions)).not.toContain("internal_stage_code");
      expect(JSON.stringify(view.supportGroups)).toContain("internal_stage_code");
    }
  );

  it("identifies each affected calculation in lifecycle review items", () => {
    const summaryCalculation = {
      ...evidence().calculations[0],
      calculation_id: "calc-summary",
      calculation_role: "workspace_summary",
      execution_status: "failed",
    };
    const detailCalculation = {
      ...evidence().calculations[0],
      calculation_id: "calc-details",
      calculation_role: "workspace_details",
      execution_status: "failed",
    };

    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ calculations: [summaryCalculation, detailCalculation] })
    );

    expect(view.exceptions.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        "Portfolio performance summary did not complete",
        "Performance analysis detail did not complete",
      ])
    );
    expect(JSON.stringify(view.exceptions)).not.toContain("calc-summary");
    expect(JSON.stringify(view.exceptions)).not.toContain("calc-details");
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
      expect.arrayContaining([
        "fallback_internal_code",
        "Source data window limited",
        "source_internal_reason",
      ])
    );
  });

  it("accepts ready source aliases but gives stale freshness precedence", () => {
    const ready = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        source_supportability: [
          {
            key: "source_calculation",
            state: "ready",
            freshness_bucket: "fresh",
            source_service: "lotus-performance",
          },
        ],
      })
    );
    const stale = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        source_supportability: [
          {
            operation: "performance.attribution",
            state: "supported",
            freshness_bucket: "stale",
            source_service: "lotus-performance",
            reason: "Source data window is stale.",
          },
        ],
      })
    );

    expect(ready.state).toBe("ready");
    expect(stale.state).toBe("attention");
    expect(stale.exceptions).toContainEqual(
      expect.objectContaining({
        title: "Source calculation evidence is not current",
        tone: "danger",
      })
    );
    const supportRows = stale.supportGroups.flatMap((group) => group.rows);
    expect(supportRows).toEqual(
      expect.arrayContaining([
        { label: "Source 1", value: "lotus-performance" },
        { label: "Source 1 freshness", value: "stale" },
        { label: "Source 1 reason", value: "Source data window is stale." },
        { label: "Source 1 reference", value: "performance.attribution" },
      ])
    );
  });

  it.each([
    ["missing", undefined],
    ["unknown", "unknown"],
  ] as const)("fails closed when ready source freshness is %s", (_label, freshnessBucket) => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        source_supportability: [
          {
            key: "source_calculation",
            state: "supported",
            freshness_bucket: freshnessBucket,
            source_service: "lotus-performance",
          },
        ],
      })
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({
        title: "Source calculation freshness not confirmed",
        tone: "warn",
      })
    );
  });

  it("reports an explicit exception when the evidence package is unavailable", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ state: "unavailable", reason: "Evidence source unavailable." })
    );

    expect(view.state).toBe("unavailable");
    expect(view.metrics).toContainEqual(
      expect.objectContaining({ label: "Review items", value: "1" })
    );
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title: "Evidence package unavailable", tone: "danger" })
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
        "Performance input freshness not confirmed",
        "Additional performance calculation 1 status not reported",
        "Additional performance calculation 1 evidence not confirmed",
      ])
    );
  });

  it.each([
    ["reporting date", { as_of_date: null }, "Reporting date not confirmed"],
    ["review period", { period: null }, "Review period not confirmed"],
    ["return basis", { basis: "unrecognised" }, "Return basis not confirmed"],
  ] as const)("fails closed when %s is not confirmed", (_label, overrides, title) => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence(overrides)
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions).toContainEqual(expect.objectContaining({ title, tone: "warn" }));
  });

  it("fails closed when the source omits input freshness evidence", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ input_freshness: null })
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title: "Input freshness not confirmed", tone: "warn" })
    );
  });

  it("requires freshness for an assigned benchmark", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ input_freshness: { performance: "fresh" } })
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title: "Benchmark input freshness not confirmed", tone: "warn" })
    );
  });

  it("identifies each selected input with qualified freshness", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ input_freshness: { performance: "stale", benchmark: "unknown" } })
    );

    expect(view.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Performance input evidence is not current" }),
        expect.objectContaining({ title: "Benchmark input freshness not confirmed" }),
      ])
    );
  });

  it("escalates an explicitly unavailable selected input", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({ input_freshness: { performance: "fresh", benchmark: "unavailable" } })
    );

    expect(view.state).toBe("attention");
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title: "Benchmark input unavailable", tone: "danger" })
    );
  });

  it("does not require benchmark freshness when no benchmark is assigned", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        benchmark_code: null,
        input_freshness: { performance: "fresh", benchmark: "unavailable" },
      })
    );

    expect(view.state).toBe("ready");
    expect(view.context).toContainEqual({ label: "Benchmark", value: "Not assigned" });
  });

  it("preserves danger severity for duplicate source operations", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence({
        source_supportability: [
          {
            operation: "performance.attribution",
            source_service: "lotus-performance",
            state: "partial",
            freshness_bucket: "fresh",
          },
          {
            operation: "performance.attribution",
            source_service: "lotus-performance",
            state: "blocked",
            freshness_bucket: "fresh",
          },
        ],
      })
    );

    expect(view.state).toBe("attention");
    expect(view.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Source assurance qualified", tone: "warn" }),
        expect.objectContaining({ title: "Source calculation unavailable", tone: "danger" }),
      ])
    );
  });

  it.each([
    ["coverage", { coverage: null }, "Evidence coverage not confirmed"],
    [
      "source supportability",
      { source_supportability: [] as NonNullable<PerformanceEvidenceView["source_supportability"]> },
      "Source supportability not confirmed",
    ],
    [
      "methodology",
      { methodology_references: [] as string[] },
      "Methodology reference not confirmed",
    ],
    [
      "supporting records",
      {
        calculations: [
          { ...evidence().calculations[0], artifacts: [] },
        ] as PerformanceEvidenceView["calculations"],
      },
      "Supporting records not published",
    ],
  ] as const)("fails closed when %s evidence is absent", (_label, overrides, title) => {
    const view = buildPerformanceEvidenceAssuranceViewModel(
      supportedCapability,
      evidence(overrides)
    );

    expect(view.state).toBe("incomplete");
    expect(view.exceptions).toContainEqual(
      expect.objectContaining({ title, tone: "warn" })
    );
  });

  it("keeps raw identifiers and technical vocabulary in support groups only", () => {
    const view = buildPerformanceEvidenceAssuranceViewModel(supportedCapability, evidence());
    const primaryText = JSON.stringify({
      posture: view.posture,
      summary: view.summary,
      context: view.context,
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
    expect(primaryText).not.toContain("BMK_PB_GLOBAL_BALANCED_60_40");
    expect(supportText).toContain("lotus-performance");
    expect(supportText).toContain("calc-1");
    expect(supportText).toContain("WORKSPACE_SUMMARY");
    expect(supportText).toContain("gateway_contract");
    expect(supportText).toContain("BMK_PB_GLOBAL_BALANCED_60_40");
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
