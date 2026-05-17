import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PmOperatingQualityPanel from "../../src/features/workbench/components/pm-operating-quality-panel";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const policies: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-policy",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    policies: [
      {
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        enabled: true,
        state: "READY",
        as_of_date: "2026-05-13",
      },
    ],
  },
};

const scoreRuns: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-score",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    score_runs: [
      {
        score_run_id: "pmq_run_001",
        pm_id: "PM_SG_001",
        book_id: "PM_BOOK_SG_BALANCED",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        state: "READY",
        score: "90.00",
        as_of_date: "2026-05-13",
        content_hash: "sha256:pm-quality",
        reason_codes: ["PM_QUALITY_READY"],
        forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
      },
    ],
    fairness_segments: [
      {
        segment_id: "mandate_balanced",
        segment_type: "MANDATE_TYPE",
        display_name: "Balanced DPM Mandates",
        score_run_ids: ["pmq_run_001"],
      },
      {
        segment_id: "mandate_income",
        segment_type: "MANDATE_TYPE",
        display_name: "Income DPM Mandates",
        score_run_ids: ["pmq_run_002"],
      },
    ],
  },
};

const fairnessDetail: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-fairness-detail",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    fairness_analysis_id: "pmq_fair_created",
  },
  data: {
    fairness_analysis: {
      product_name: "PmOperatingQualityFairnessAnalysis",
      product_version: "v1",
      fairness_analysis_id: "pmq_fair_created",
      state: "PENDING_REVIEW",
      as_of_date: "2026-05-13",
      minimum_segment_score_run_count: 2,
      maximum_average_score_spread: "15.00",
      observed_average_score_spread: "22.00",
      generated_at: "2026-05-13T10:40:00Z",
      generated_by: "lotus-manage",
      forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
      reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityScoreRun",
          source_id: "pmq_run_001",
        },
      ],
      segment_results: [],
    },
  },
};

describe("PM operating quality fairness-analysis create integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetAnalyticsUiMetricEvents();
  });

  it("creates through the Gateway BFF and renders the persisted analysis evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.endsWith("/pm-operating-quality/fairness-analyses")) {
          return new Response(JSON.stringify(fairnessDetail), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/pm-operating-quality/fairness-analyses/pmq_fair_created")) {
          return new Response(JSON.stringify(fairnessDetail), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("unexpected route", { status: 500 });
      })
    );

    render(<PmOperatingQualityPanel policies={policies} scoreRuns={scoreRuns} />);
    fireEvent.click(screen.getByRole("button", { name: "Persist Fairness" }));

    await waitFor(() => {
      expect(screen.getByText("Persisted fairness analysis returned Manage evidence.")).toBeInTheDocument();
    });
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/bff/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses"
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/bff/api/v1/dpm/command-center/pm-operating-quality/fairness-analyses/pmq_fair_created"
    );
    const createOptions = fetchMock.mock.calls[0][1];
    expect(createOptions.method).toBe("POST");
    expect(createOptions.headers["X-Caller-Application"]).toBe("lotus-workbench");
    const createBody = JSON.parse(createOptions.body);
    expect(createBody.body.policy_id).toBe("pmq_sg_dpm");
    expect(createBody.body.policy_version).toBe("2026.05");
    expect(createBody.body.segments).toHaveLength(2);
    expect(screen.getAllByText("pmq_fair_created").length).toBeGreaterThan(0);
    expect(screen.getAllByText("22.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Create Correlation")).toBeInTheDocument();
    expect(screen.getAllByText("corr-fairness-detail").length).toBeGreaterThan(0);
    expect(screen.queryByText("sha256:pm-quality")).not.toBeInTheDocument();

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("pm-operating-quality-fairness-analysis-create");
    expect(metricEventsJson).toContain("pm-operating-quality-fairness-analysis-detail");
    expect(metricEventsJson).not.toContain("pmq_fair_created");
    expect(metricEventsJson).not.toContain("pmq_run_001");
  });
});
