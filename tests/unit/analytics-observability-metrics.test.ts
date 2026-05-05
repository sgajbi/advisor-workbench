import { afterEach, describe, expect, it } from "vitest";

import {
  deriveAnalyticsUiFreshnessBucket,
  classifyAnalyticsUiFreshnessBucket,
  classifyAnalyticsUiPanelState,
  deriveAnalyticsUiSupportabilityState,
  getAnalyticsUiMetricEvents,
  renderAnalyticsUiPrometheusMetrics,
  observeWorkbenchAnalyticsRequest,
  recordAnalyticsUiAttentionEvent,
  recordAnalyticsUiPanelState,
  resetAnalyticsUiMetricEvents,
  WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES,
} from "../../src/features/analytics-observability/metrics";

const context = {
  route: "workbench.performance",
  panel: "performance-summary",
  operation: "performance.workspace.summary",
};

describe("analytics UI observability metrics", () => {
  afterEach(() => {
    resetAnalyticsUiMetricEvents();
  });

  it("classifies governed panel states without ambiguous aliases", () => {
    expect(classifyAnalyticsUiPanelState({ response: { state: "ready" } })).toBe(
      "ready"
    );
    expect(classifyAnalyticsUiPanelState({ empty: true })).toBe("empty");
    expect(classifyAnalyticsUiPanelState({ freshnessBucket: "stale" })).toBe("stale");
    expect(
      classifyAnalyticsUiPanelState({ supportabilityState: "action_required" })
    ).toBe("degraded");
    expect(classifyAnalyticsUiPanelState({ error: new Error("failed") })).toBe(
      "error"
    );
    expect(classifyAnalyticsUiPanelState({ status: 403 })).toBe(
      "permission_blocked"
    );
    expect(classifyAnalyticsUiPanelState({ unsupported: true })).toBe(
      "unsupported"
    );
  });

  it("classifies freshness buckets deterministically", () => {
    const now = new Date("2026-04-29T12:00:00Z");

    expect(
      classifyAnalyticsUiFreshnessBucket({
        asOfDate: "2026-04-28",
        now,
        staleAfterDays: 3,
      })
    ).toBe("fresh");
    expect(
      classifyAnalyticsUiFreshnessBucket({
        asOfDate: "2026-04-20",
        now,
        staleAfterDays: 3,
      })
    ).toBe("stale");
    expect(classifyAnalyticsUiFreshnessBucket({ now })).toBe("unknown");
  });

  it("derives supportability posture from bounded response metadata", () => {
    expect(deriveAnalyticsUiSupportabilityState({ supportability_status: "READY" })).toBe(
      "ready"
    );
    expect(
      deriveAnalyticsUiSupportabilityState({ partial_failures: [{ reason: "source" }] })
    ).toBe("partial");
    expect(deriveAnalyticsUiSupportabilityState({ supportability_state: "unsupported" })).toBe(
      "unsupported"
    );
    expect(
      deriveAnalyticsUiSupportabilityState({
        supportability: { state: "ready", reason: "portfolio_supportability_ready" },
      })
    ).toBe("ready");
    expect(
      deriveAnalyticsUiSupportabilityState({
        supportability: [
          { label: "TWR", state: "ready" },
          { label: "Attribution", state: "partial" },
        ],
      })
    ).toBe("partial");
    expect(
      deriveAnalyticsUiSupportabilityState({
        supportability: [
          { label: "TWR", state: "ready" },
          { label: "Risk", state: "blocked" },
        ],
      })
    ).toBe("action_required");
  });

  it("derives freshness posture from source-owned supportability metadata", () => {
    expect(
      deriveAnalyticsUiFreshnessBucket({
        supportability: {
          state: "ready",
          freshness_bucket: "stale",
        },
        as_of_date: new Date().toISOString().slice(0, 10),
      })
    ).toBe("stale");
    expect(deriveAnalyticsUiFreshnessBucket({ freshness_bucket: "fresh" })).toBe("fresh");
    expect(
      deriveAnalyticsUiFreshnessBucket({
        supportability: { state: "ready", freshness_bucket: "current" },
      })
    ).toBe("fresh");
    expect(
      deriveAnalyticsUiFreshnessBucket({
        ai_surface_supportability: {
          state: "action_required",
          freshness_bucket: "current",
        },
      })
    ).toBe("fresh");
    expect(
      deriveAnalyticsUiFreshnessBucket({
        advisory_supportability: {
          feature_key: "advise.observability.advisory_supportability",
          state: "ready",
          freshness_bucket: "current",
        },
      })
    ).toBe("fresh");
    expect(
      deriveAnalyticsUiFreshnessBucket({
        render_supportability: {
          state: "ready",
          freshness_bucket: "current",
        },
      })
    ).toBe("fresh");
    expect(deriveAnalyticsUiFreshnessBucket({ freshness_bucket: "unexpected" })).toBe(
      "unknown"
    );
  });

  it("records only allowed product-safe metric labels", () => {
    const event = recordAnalyticsUiPanelState({
      context,
      state: "ready",
      freshnessBucket: "fresh",
      supportabilityState: "ready",
    });

    expect(event).toEqual(
      expect.objectContaining({
        event_name: "workbench.analytics.panel_state",
        metric_name: "lotus_workbench_panel_state_total",
        value: 1,
      })
    );
    expect(event.labels).toEqual({
      route: "workbench.performance",
      panel: "performance-summary",
      service: "lotus-gateway",
      operation: "performance.workspace.summary",
      state: "ready",
      freshness_bucket: "fresh",
      supportability_state: "ready",
    });
    expect(Object.keys(event.labels)).not.toContain("portfolio_id");
    expect(Object.keys(event.labels)).not.toContain("client_name");
    expect(Object.keys(event.labels)).not.toContain("correlation_id");
  });

  it("records API duration, panel state, and hydration for successful observations", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      as_of_date: new Date().toISOString().slice(0, 10),
      supportability_status: "READY",
      state: "ready",
      portfolio_id: "PF_1001",
      client_name: "Sensitive Client",
    }));

    const events = getAnalyticsUiMetricEvents();
    expect(events.map((event) => event.metric_name)).toEqual([
      "lotus_workbench_api_request_duration_seconds",
      "lotus_workbench_panel_state_total",
      "lotus_workbench_panel_hydration_duration_seconds",
    ]);
    expect(events.every((event) => event.labels.panel === "performance-summary")).toBe(
      true
    );
    expect(events.every((event) => !("portfolio_id" in event.labels))).toBe(true);
    expect(events.every((event) => !("client_name" in event.labels))).toBe(true);

    const renderedMetrics = renderAnalyticsUiPrometheusMetrics();
    expect(renderedMetrics).toContain(
      "lotus_workbench_panel_state_total{route=\"workbench.performance\""
    );
    expect(renderedMetrics).toContain(
      "lotus_workbench_api_request_duration_seconds_sum"
    );
    expect(renderedMetrics).toContain(
      "lotus_workbench_api_request_duration_seconds_bucket"
    );
    expect(renderedMetrics).not.toContain("portfolio_id");
    expect(renderedMetrics).not.toContain("Sensitive Client");
  });

  it("can record mutation observations without panel hydration metrics", async () => {
    await observeWorkbenchAnalyticsRequest(
      {
        route: "workbench.performance",
        panel: "performance-advisor-brief-review-action",
        operation: "performance.workspace.advisor-brief.review-action",
      },
      async () => ({
        state: "ready",
        supportability_status: "READY",
        reviewed_by: "advisor_1",
        reason: "Free-form review reason must not become metric content.",
      }),
      { recordPanelHydration: false }
    );

    const events = getAnalyticsUiMetricEvents();
    expect(events.map((event) => event.metric_name)).toEqual([
      "lotus_workbench_api_request_duration_seconds",
      "lotus_workbench_panel_state_total",
    ]);
    expect(JSON.stringify(events)).toContain("performance-advisor-brief-review-action");
    expect(JSON.stringify(events)).not.toContain("advisor_1");
    expect(JSON.stringify(events)).not.toContain("Free-form review reason");
  });

  it("keeps the supported Workbench observed-surface registry explicit", () => {
    expect(
      WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES.map((surface) => [
        surface.route,
        surface.panel,
        surface.operation,
      ])
    ).toEqual([
      [
        "workbench.performance",
        "performance-summary",
        "performance.workspace.summary",
      ],
      [
        "workbench.performance",
        "performance-details",
        "performance.workspace.details",
      ],
      [
        "workbench.performance",
        "performance-horizon-comparison",
        "performance.workspace.horizon-comparison",
      ],
      [
        "workbench.performance",
        "performance-attribution-trend",
        "performance.workspace.attribution-trend",
      ],
      [
        "workbench.performance",
        "performance-advisor-brief",
        "performance.workspace.advisor-brief",
      ],
      [
        "workbench.performance",
        "performance-advisor-brief-review-action",
        "performance.workspace.advisor-brief.review-action",
      ],
      ["workbench.risk", "risk-summary", "risk.summary"],
      ["workbench.risk", "risk-concentration", "risk.concentration"],
      ["workbench.risk", "risk-drawdown", "risk.drawdown"],
      ["workbench.risk", "risk-rolling", "risk.rolling"],
      ["workbench.risk", "risk-attribution", "risk.attribution"],
      ["workbench.reporting", "report-batch-create", "reporting.report-batch.create"],
      ["workbench.reporting", "report-batch-status", "reporting.report-batch.status"],
      [
        "workbench.reporting",
        "report-batch-run-once",
        "reporting.report-batch.run-once",
      ],
      [
        "workbench.reporting",
        "archive-document-metadata",
        "reporting.archive-document.metadata",
      ],
      [
        "workbench.dpm-command-center",
        "outcome-review-list",
        "dpm.outcome-reviews.list",
      ],
      [
        "workbench.dpm-command-center",
        "outcome-review-report-input",
        "dpm.outcome-review.report-input",
      ],
      [
        "workbench.dpm-command-center",
        "outcome-review-report-job",
        "dpm.outcome-review.report-job.submit",
      ],
      [
        "workbench.dpm-command-center",
        "outcome-review-ai-evidence",
        "dpm.outcome-review.ai-evidence",
      ],
      ["workbench.legacy-advisor", "advisor-overview", "workbench.overview"],
      ["workbench.legacy-advisor", "portfolio-360", "workbench.portfolio-360"],
      ["workbench.legacy-advisor", "portfolio-analytics", "workbench.analytics"],
      [
        "workbench.legacy-advisor",
        "reporting-snapshot",
        "workbench.reporting-snapshot",
      ],
      [
        "workbench.legacy-advisor",
        "sandbox-session-create",
        "workbench.sandbox-session.create",
      ],
      [
        "workbench.legacy-advisor",
        "sandbox-session-apply",
        "workbench.sandbox-session.apply",
      ],
      [
        "workbench.data-products",
        "domain-product-catalog",
        "domain-products.catalog",
      ],
      [
        "workbench.data-products",
        "domain-product-dependency-graph",
        "domain-products.dependency-graph",
      ],
      [
        "workbench.data-products",
        "domain-product-trust-certification",
        "domain-products.trust-certification",
      ],
      [
        "workbench.intake",
        "portfolio-intake-bundle",
        "intake.portfolio-bundle.ingest",
      ],
      [
        "workbench.intake",
        "portfolio-intake-portfolio-lookups",
        "intake.lookups.portfolios",
      ],
      [
        "workbench.intake",
        "portfolio-intake-instrument-lookups",
        "intake.lookups.instruments",
      ],
      [
        "workbench.intake",
        "portfolio-intake-currency-lookups",
        "intake.lookups.currencies",
      ],
      ["workbench.portfolio", "portfolio-catalog", "portfolio.catalog"],
      ["workbench.portfolio", "portfolio-workspace-shell", "portfolio.workspace.shell"],
      ["workbench.portfolio", "portfolio-book", "portfolio.book"],
      ["workbench.portfolio", "portfolio-income-summary", "portfolio.income-summary"],
      ["workbench.portfolio", "portfolio-activity-summary", "portfolio.activity-summary"],
      [
        "workbench.portfolio",
        "portfolio-performance-snapshot",
        "portfolio.performance-snapshot",
      ],
      ["workbench.portfolio", "portfolio-liquidity", "portfolio.liquidity"],
      ["workbench.portfolio", "portfolio-transaction-ledger", "portfolio.transactions"],
      ["workbench.portfolio", "portfolio-readiness", "portfolio.readiness"],
      ["workbench.portfolio", "portfolio-insights", "portfolio.insights"],
      ["workbench.portfolio", "portfolio-workflow", "portfolio.workflow"],
      ["workbench.portfolio", "portfolio-allocation-views", "portfolio.allocations"],
      [
        "workbench.portfolio",
        "portfolio-projected-cashflow",
        "portfolio.projected-cashflow",
      ],
    ]);
  });

  it("emits one bounded attention event for stale source-backed panel state", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      as_of_date: "2026-04-01",
      state: "stale",
      warnings: ["PERFORMANCE_STALE_SOURCE"],
      portfolio_id: "PF_SENSITIVE",
      client_name: "Sensitive Client",
    }));

    const attentionEvents = getAnalyticsUiMetricEvents().filter(
      (event) => event.metric_name === "lotus_analytics_ui_attention_events_total"
    );
    expect(attentionEvents).toEqual([
      expect.objectContaining({
        event_name: "workbench.analytics.attention",
        labels: expect.objectContaining({
          route: "workbench.performance",
          panel: "performance-summary",
          attention_type: "panel_stale",
          severity: "warning",
          state: "stale",
          reason: "PERFORMANCE_STALE_SOURCE",
          freshness_bucket: "stale",
        }),
      }),
    ]);
    expect(JSON.stringify(attentionEvents)).not.toContain("PF_SENSITIVE");
    expect(JSON.stringify(attentionEvents)).not.toContain("Sensitive Client");
  });

  it("records nested source supportability state without sensitive labels", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      as_of_date: new Date().toISOString().slice(0, 10),
      supportability: {
        state: "action_required",
        reason: "portfolio_supportability_action_required",
        freshness_bucket: "fresh",
      },
      portfolio_id: "PF_SENSITIVE",
      client_id: "CIF_SENSITIVE",
    }));

    const events = getAnalyticsUiMetricEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            state: "degraded",
            freshness_bucket: "fresh",
            supportability_state: "action_required",
          }),
        }),
        expect.objectContaining({
          metric_name: "lotus_analytics_ui_attention_events_total",
          labels: expect.objectContaining({
            attention_type: "panel_degraded",
            severity: "action_required",
            state: "degraded",
            supportability_state: "action_required",
          }),
        }),
      ])
    );
    expect(JSON.stringify(events)).not.toContain("PF_SENSITIVE");
    expect(JSON.stringify(events)).not.toContain("CIF_SENSITIVE");
  });

  it("records rebalance source supportability state without sensitive labels", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      as_of_date: new Date().toISOString().slice(0, 10),
      rebalance: {
        status: "PENDING_REVIEW",
        supportability: {
          feature_key: "manage.observability.action_register_supportability",
          state: "degraded",
          reason: "action_register_stale",
          freshness_bucket: "stale",
          run_count: 4,
          operation_count: 12,
          workflow_decision_count: 3,
        },
      },
      portfolio_id: "PF_SENSITIVE",
      client_id: "CIF_SENSITIVE",
    }));

    const events = getAnalyticsUiMetricEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            state: "stale",
            freshness_bucket: "stale",
            supportability_state: "action_required",
          }),
        }),
        expect.objectContaining({
          metric_name: "lotus_analytics_ui_attention_events_total",
          labels: expect.objectContaining({
            attention_type: "panel_stale",
            severity: "warning",
            state: "stale",
            supportability_state: "action_required",
          }),
        }),
      ])
    );
    expect(JSON.stringify(events)).not.toContain("PF_SENSITIVE");
    expect(JSON.stringify(events)).not.toContain("CIF_SENSITIVE");
  });

  it("records advisory source supportability state without sensitive labels", async () => {
    await observeWorkbenchAnalyticsRequest(
      {
        route: "workbench.performance",
        panel: "performance-advisor-brief",
        operation: "performance.workspace.advisor-brief",
      },
      async () => ({
        advisory_supportability: {
          feature_key: "advise.observability.advisory_supportability",
          state: "degraded",
          reason: "dependency_degraded",
          freshness_bucket: "unknown",
          dependency_count: 5,
          ready_dependency_count: 2,
          degraded_dependency_count: 3,
          enabled_feature_count: 9,
          ready_feature_count: 7,
          metric_name: "lotus_advise_advisory_supportability_total",
        },
        portfolio_id: "PF_SENSITIVE",
        client_id: "CIF_SENSITIVE",
      })
    );

    const events = getAnalyticsUiMetricEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            panel: "performance-advisor-brief",
            state: "degraded",
            freshness_bucket: "unknown",
            supportability_state: "action_required",
          }),
        }),
        expect.objectContaining({
          metric_name: "lotus_analytics_ui_attention_events_total",
          labels: expect.objectContaining({
            panel: "performance-advisor-brief",
            attention_type: "panel_degraded",
            severity: "action_required",
            supportability_state: "action_required",
          }),
        }),
      ])
    );
    expect(JSON.stringify(events)).not.toContain("PF_SENSITIVE");
    expect(JSON.stringify(events)).not.toContain("CIF_SENSITIVE");
  });

  it("derives stale and partial posture from Gateway source supportability", async () => {
    await observeWorkbenchAnalyticsRequest(context, async () => ({
      source_supportability: [
        {
          source_service: "lotus-performance",
          operation: "performance.twr",
          state: "ready",
          freshness_bucket: "fresh",
        },
        {
          source_service: "lotus-performance",
          operation: "performance.attribution",
          state: "partial",
          freshness_bucket: "stale",
          reason: "attribution_fallback_available",
        },
      ],
      portfolio_id: "PF_SENSITIVE",
      trace_id: "TRACE_SENSITIVE",
    }));

    const events = getAnalyticsUiMetricEvents();
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_name: "lotus_workbench_panel_state_total",
          labels: expect.objectContaining({
            state: "stale",
            freshness_bucket: "stale",
            supportability_state: "partial",
          }),
        }),
        expect.objectContaining({
          metric_name: "lotus_analytics_ui_attention_events_total",
          labels: expect.objectContaining({
            attention_type: "panel_stale",
            severity: "warning",
            state: "stale",
            supportability_state: "partial",
          }),
        }),
      ])
    );
    expect(JSON.stringify(events)).not.toContain("PF_SENSITIVE");
    expect(JSON.stringify(events)).not.toContain("TRACE_SENSITIVE");
  });

  it("deduplicates attention events by bounded label identity", () => {
    const first = recordAnalyticsUiAttentionEvent({
      context,
      attentionType: "panel_degraded",
      severity: "action_required",
      state: "degraded",
      reason: "Performance source unavailable for private client",
      freshnessBucket: "unknown",
      supportabilityState: "action_required",
    });
    const duplicate = recordAnalyticsUiAttentionEvent({
      context,
      attentionType: "panel_degraded",
      severity: "action_required",
      state: "degraded",
      reason: "Performance source unavailable for private client",
      freshnessBucket: "unknown",
      supportabilityState: "action_required",
    });

    expect(first).toBeDefined();
    expect(duplicate).toBeUndefined();
    expect(getAnalyticsUiMetricEvents()).toHaveLength(1);
    expect(getAnalyticsUiMetricEvents()[0].labels.reason).toBe(
      "Performance_source_unavailable_for_private_client"
    );
  });

  it("emits repeated-failure attention only after repeated selected panel failures", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        observeWorkbenchAnalyticsRequest(context, async () => {
          throw new Error("Failed to fetch performance workspace summary (503)");
        })
      ).rejects.toThrow("503");
    }

    const attentionEvents = getAnalyticsUiMetricEvents().filter(
      (event) => event.metric_name === "lotus_analytics_ui_attention_events_total"
    );
    expect(attentionEvents).toEqual([
      expect.objectContaining({
        labels: expect.objectContaining({
          attention_type: "panel_repeated_failure",
          severity: "action_required",
          state: "error",
          reason: "server",
        }),
      }),
    ]);
  });

  it("records a bounded error state when a selected analytics request fails", async () => {
    await expect(
      observeWorkbenchAnalyticsRequest(context, async () => {
        throw new Error("Failed to fetch performance workspace summary (503)");
      })
    ).rejects.toThrow("503");

    expect(getAnalyticsUiMetricEvents()).toEqual([
      expect.objectContaining({
        metric_name: "lotus_workbench_api_request_duration_seconds",
        labels: expect.objectContaining({
          status_class: "5xx",
          state: "error",
          error_category: "server",
        }),
      }),
      expect.objectContaining({
        metric_name: "lotus_workbench_panel_state_total",
        labels: expect.objectContaining({ state: "error", reason: "server" }),
      }),
    ]);
  });
});
