import {
  type AnalyticsUiAttentionEventType,
  type AnalyticsUiAllowedLabel,
  type AnalyticsUiSeverity,
  type AnalyticsUiState,
  type WorkbenchAnalyticsUiBrowserEvent,
  type WorkbenchAnalyticsUiMetricFamily,
  WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS,
  WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES,
  assertAnalyticsUiLabels,
  buildAnalyticsUiLabels,
  isAnalyticsUiState,
} from "./contract";

export type AnalyticsUiFreshnessBucket = "fresh" | "stale" | "unknown";
export type AnalyticsUiStatusClass = "2xx" | "3xx" | "4xx" | "5xx" | "network";

export type AnalyticsUiSupportabilityState =
  | "ready"
  | "partial"
  | "action_required"
  | "unsupported"
  | "unknown";

export interface AnalyticsUiPanelClassificationInput {
  loading?: boolean;
  permissionBlocked?: boolean;
  unsupported?: boolean;
  error?: unknown;
  status?: number;
  response?: unknown;
  freshnessBucket?: AnalyticsUiFreshnessBucket;
  supportabilityState?: AnalyticsUiSupportabilityState;
  empty?: boolean;
  partial?: boolean;
  degraded?: boolean;
}

export interface WorkbenchAnalyticsUiMetricEvent {
  event_name: WorkbenchAnalyticsUiBrowserEvent;
  metric_name: WorkbenchAnalyticsUiMetricFamily;
  value: number;
  labels: Partial<Record<AnalyticsUiAllowedLabel, string>>;
  recorded_at: string;
}

export interface WorkbenchAnalyticsUiMetricSample {
  metric_name: WorkbenchAnalyticsUiMetricFamily;
  metric_type: "counter" | "histogram";
  labels: Partial<Record<AnalyticsUiAllowedLabel, string>>;
  value: number;
  sample_count: number;
}

export interface WorkbenchAnalyticsUiObservationContext {
  route: string;
  panel: string;
  operation: string;
  service?: string;
}

export interface WorkbenchAnalyticsUiObservationOptions {
  recordPanelHydration?: boolean;
}

export const WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES = [
  {
    route: "workbench.performance",
    panel: "performance-summary",
    operation: "performance.workspace.summary",
  },
  {
    route: "workbench.performance",
    panel: "performance-details",
    operation: "performance.workspace.details",
  },
  {
    route: "workbench.performance",
    panel: "performance-horizon-comparison",
    operation: "performance.workspace.horizon-comparison",
  },
  {
    route: "workbench.performance",
    panel: "performance-attribution-trend",
    operation: "performance.workspace.attribution-trend",
  },
  {
    route: "workbench.performance",
    panel: "performance-advisor-brief",
    operation: "performance.workspace.advisor-brief",
  },
  {
    route: "workbench.performance",
    panel: "performance-advisor-brief-review-action",
    operation: "performance.workspace.advisor-brief.review-action",
  },
  {
    route: "workbench.performance",
    panel: "performance-composite-twr",
    operation: "performance.composites.twr",
  },
  {
    route: "workbench.performance",
    panel: "performance-composite-inspection",
    operation: "performance.composites.inspect",
  },
  {
    route: "workbench.risk",
    panel: "risk-summary",
    operation: "risk.summary",
  },
  {
    route: "workbench.risk",
    panel: "risk-concentration",
    operation: "risk.concentration",
  },
  {
    route: "workbench.risk",
    panel: "risk-drawdown",
    operation: "risk.drawdown",
  },
  {
    route: "workbench.risk",
    panel: "risk-rolling",
    operation: "risk.rolling",
  },
  {
    route: "workbench.risk",
    panel: "risk-attribution",
    operation: "risk.attribution",
  },
  {
    route: "workbench.reporting",
    panel: "report-batch-create",
    operation: "reporting.report-batch.create",
  },
  {
    route: "workbench.reporting",
    panel: "report-batch-status",
    operation: "reporting.report-batch.status",
  },
  {
    route: "workbench.reporting",
    panel: "report-batch-run-once",
    operation: "reporting.report-batch.run-once",
  },
  {
    route: "workbench.reporting",
    panel: "archive-document-metadata",
    operation: "reporting.archive-document.metadata",
  },
  {
    route: "workbench.manage",
    panel: "mandate-command-center",
    operation: "dpm.command-center.summary",
  },
  {
    route: "workbench.manage",
    panel: "mandate-command-center-monitoring",
    operation: "dpm.command-center.monitoring.run-once",
  },
  {
    route: "workbench.manage",
    panel: "mandate-command-center-exceptions",
    operation: "dpm.command-center.exceptions.list",
  },
  {
    route: "workbench.manage",
    panel: "mandate-command-center-exception-ai-summary",
    operation: "dpm.command-center.exceptions.ai-summary",
  },
  {
    route: "workbench.manage",
    panel: "mandate-command-center-mandate",
    operation: "dpm.command-center.mandate.by-portfolio",
  },
  {
    route: "workbench.manage",
    panel: "mandate-command-center-health",
    operation: "dpm.command-center.mandate.health",
  },
  {
    route: "workbench.manage",
    panel: "portfolio-memory",
    operation: "dpm.portfolio-memory.get",
  },
  {
    route: "workbench.manage",
    panel: "outcome-review-list",
    operation: "dpm.outcome-reviews.list",
  },
  {
    route: "workbench.manage",
    panel: "outcome-review-report-input",
    operation: "dpm.outcome-review.report-input",
  },
  {
    route: "workbench.manage",
    panel: "outcome-review-report-job",
    operation: "dpm.outcome-review.report-job.submit",
  },
  {
    route: "workbench.manage",
    panel: "outcome-review-ai-evidence",
    operation: "dpm.outcome-review.ai-evidence",
  },
  {
    route: "workbench.manage",
    panel: "outcome-review-ai-narrative",
    operation: "dpm.outcome-review.ai-narrative",
  },
  {
    route: "workbench.manage",
    panel: "construction-alternatives",
    operation: "dpm.construction.alternatives.generate",
  },
  {
    route: "workbench.manage",
    panel: "construction-alternative-set",
    operation: "dpm.construction.alternative-set.get",
  },
  {
    route: "workbench.manage",
    panel: "construction-selection",
    operation: "dpm.construction.alternative.select",
  },
  {
    route: "workbench.manage",
    panel: "proof-pack-generate",
    operation: "dpm.proof-pack.generate",
  },
  {
    route: "workbench.manage",
    panel: "proof-pack-detail",
    operation: "dpm.proof-pack.get",
  },
  {
    route: "workbench.manage",
    panel: "proof-pack-markdown",
    operation: "dpm.proof-pack.markdown",
  },
  {
    route: "workbench.manage",
    panel: "proof-pack-report-input",
    operation: "dpm.proof-pack.report-input",
  },
  {
    route: "workbench.manage",
    panel: "proof-pack-ai-evidence",
    operation: "dpm.proof-pack.ai-evidence",
  },
  {
    route: "workbench.manage",
    panel: "proof-pack-ai-pm-memo",
    operation: "dpm.proof-pack.ai-pm-memo",
  },
  {
    route: "workbench.manage",
    panel: "wave-list",
    operation: "dpm.waves.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-definitions",
    operation: "dpm.waves.campaign-definitions.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-preview",
    operation: "dpm.waves.preview",
  },
  {
    route: "workbench.manage",
    panel: "wave-create",
    operation: "dpm.waves.create",
  },
  {
    route: "workbench.manage",
    panel: "wave-detail",
    operation: "dpm.waves.get",
  },
  {
    route: "workbench.manage",
    panel: "wave-items",
    operation: "dpm.waves.items",
  },
  {
    route: "workbench.manage",
    panel: "wave-source-check",
    operation: "dpm.waves.source-check",
  },
  {
    route: "workbench.manage",
    panel: "wave-simulate",
    operation: "dpm.waves.simulate",
  },
  {
    route: "workbench.manage",
    panel: "wave-approve",
    operation: "dpm.waves.approve",
  },
  {
    route: "workbench.manage",
    panel: "wave-stage",
    operation: "dpm.waves.stage",
  },
  {
    route: "workbench.manage",
    panel: "wave-handoff",
    operation: "dpm.waves.handoff",
  },
  {
    route: "workbench.manage",
    panel: "wave-proof-pack",
    operation: "dpm.waves.proof-pack",
  },
  {
    route: "workbench.manage",
    panel: "wave-supportability",
    operation: "dpm.waves.supportability",
  },
  {
    route: "workbench.manage",
    panel: "wave-report-input",
    operation: "dpm.waves.report-input",
  },
  {
    route: "workbench.manage",
    panel: "wave-ai-pm-memo",
    operation: "dpm.waves.ai-pm-memo",
  },
  {
    route: "workbench.manage",
    panel: "wave-operations-handoff-summary",
    operation: "dpm.waves.operations-handoff-summary",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-policy-list",
    operation: "dpm.pm-operating-quality.policies.list",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-policy-detail",
    operation: "dpm.pm-operating-quality.policies.get",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-policy-upsert",
    operation: "dpm.pm-operating-quality.policies.put",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-score-run-list",
    operation: "dpm.pm-operating-quality.score-runs.list",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-score-run-detail",
    operation: "dpm.pm-operating-quality.score-runs.get",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-score-run-preview",
    operation: "dpm.pm-operating-quality.score-runs.preview",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-score-run-create",
    operation: "dpm.pm-operating-quality.score-runs.create",
  },
  {
    route: "workbench.legacy-advisor",
    panel: "advisor-overview",
    operation: "workbench.overview",
  },
  {
    route: "workbench.legacy-advisor",
    panel: "portfolio-360",
    operation: "workbench.portfolio-360",
  },
  {
    route: "workbench.legacy-advisor",
    panel: "portfolio-analytics",
    operation: "workbench.analytics",
  },
  {
    route: "workbench.legacy-advisor",
    panel: "reporting-snapshot",
    operation: "workbench.reporting-snapshot",
  },
  {
    route: "workbench.legacy-advisor",
    panel: "sandbox-session-create",
    operation: "workbench.sandbox-session.create",
  },
  {
    route: "workbench.legacy-advisor",
    panel: "sandbox-session-apply",
    operation: "workbench.sandbox-session.apply",
  },
  {
    route: "workbench.data-products",
    panel: "domain-product-catalog",
    operation: "domain-products.catalog",
  },
  {
    route: "workbench.data-products",
    panel: "domain-product-dependency-graph",
    operation: "domain-products.dependency-graph",
  },
  {
    route: "workbench.data-products",
    panel: "domain-product-trust-certification",
    operation: "domain-products.trust-certification",
  },
  {
    route: "workbench.intake",
    panel: "portfolio-intake-bundle",
    operation: "intake.portfolio-bundle.ingest",
  },
  {
    route: "workbench.intake",
    panel: "portfolio-intake-portfolio-lookups",
    operation: "intake.lookups.portfolios",
  },
  {
    route: "workbench.intake",
    panel: "portfolio-intake-instrument-lookups",
    operation: "intake.lookups.instruments",
  },
  {
    route: "workbench.intake",
    panel: "portfolio-intake-currency-lookups",
    operation: "intake.lookups.currencies",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-catalog",
    operation: "portfolio.catalog",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-workspace-shell",
    operation: "portfolio.workspace.shell",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-book",
    operation: "portfolio.book",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-income-summary",
    operation: "portfolio.income-summary",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-activity-summary",
    operation: "portfolio.activity-summary",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-performance-snapshot",
    operation: "portfolio.performance-snapshot",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-liquidity",
    operation: "portfolio.liquidity",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-transaction-ledger",
    operation: "portfolio.transactions",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-readiness",
    operation: "portfolio.readiness",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-insights",
    operation: "portfolio.insights",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-workflow",
    operation: "portfolio.workflow",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-allocation-views",
    operation: "portfolio.allocations",
  },
  {
    route: "workbench.portfolio",
    panel: "portfolio-projected-cashflow",
    operation: "portfolio.projected-cashflow",
  },
] as const satisfies readonly WorkbenchAnalyticsUiObservationContext[];

const analyticsUiMetricStore = globalThis as typeof globalThis & {
  __lotusAnalyticsUiMetricEvents?: WorkbenchAnalyticsUiMetricEvent[];
  __lotusAnalyticsUiAttentionDedupeKeys?: Set<string>;
  __lotusAnalyticsUiPanelFailureCounts?: Map<string, number>;
};

const metricEvents =
  analyticsUiMetricStore.__lotusAnalyticsUiMetricEvents ??= [];
const attentionDedupeKeys =
  analyticsUiMetricStore.__lotusAnalyticsUiAttentionDedupeKeys ??= new Set<string>();
const panelFailureCounts =
  analyticsUiMetricStore.__lotusAnalyticsUiPanelFailureCounts ??= new Map<
    string,
    number
  >();

export function classifyAnalyticsUiPanelState(
  input: AnalyticsUiPanelClassificationInput
): AnalyticsUiState {
  const responseState = readStringProperty(input.response, "state");
  if (responseState && isAnalyticsUiState(responseState)) {
    return responseState;
  }

  if (input.loading) {
    return "loading";
  }
  if (input.permissionBlocked || input.status === 401 || input.status === 403) {
    return "permission_blocked";
  }
  if (input.unsupported) {
    return "unsupported";
  }
  if (input.error || (input.status !== undefined && input.status >= 400)) {
    return "error";
  }
  if (input.freshnessBucket === "stale") {
    return "stale";
  }
  if (input.degraded || input.supportabilityState === "action_required") {
    return "degraded";
  }
  if (
    input.partial ||
    input.supportabilityState === "partial" ||
    hasNonEmptyArrayProperty(input.response, "partial_failures")
  ) {
    return "partial";
  }
  if (input.empty === true) {
    return "empty";
  }
  return "ready";
}

export function classifyAnalyticsUiFreshnessBucket(input: {
  asOfDate?: string | null;
  now?: Date;
  staleAfterDays?: number;
}): AnalyticsUiFreshnessBucket {
  if (!input.asOfDate) {
    return "unknown";
  }
  const asOf = new Date(`${input.asOfDate}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) {
    return "unknown";
  }
  const now = input.now ?? new Date();
  const staleAfterMs = (input.staleAfterDays ?? 3) * 24 * 60 * 60 * 1000;
  return now.getTime() - asOf.getTime() > staleAfterMs ? "stale" : "fresh";
}

export function deriveAnalyticsUiFreshnessBucket(response: unknown): AnalyticsUiFreshnessBucket {
  const direct = readStringProperty(response, "freshness_bucket");
  if (direct) {
    return normalizeFreshnessBucket(direct);
  }

  const sourceSupportabilityFreshness = deriveSourceSupportabilityFreshnessBucket(response);
  if (sourceSupportabilityFreshness !== "unknown") {
    return sourceSupportabilityFreshness;
  }

  const nestedSourceSupportabilityFreshness =
    deriveNestedSourceSupportabilityFreshnessBucket(response);
  if (nestedSourceSupportabilityFreshness !== "unknown") {
    return nestedSourceSupportabilityFreshness;
  }

  const supportability = readObjectProperty(response, "supportability");
  const supportabilityFreshness = readStringProperty(supportability, "freshness_bucket");
  if (supportabilityFreshness) {
    return normalizeFreshnessBucket(supportabilityFreshness);
  }

  return classifyAnalyticsUiFreshnessBucket({
    asOfDate: readStringProperty(response, "as_of_date"),
  });
}

export function deriveAnalyticsUiSupportabilityState(
  response: unknown
): AnalyticsUiSupportabilityState {
  const direct = readStringProperty(response, "supportability_state");
  if (direct) {
    return normalizeSupportabilityState(direct);
  }
  const supportabilityStatus = readStringProperty(response, "supportability_status");
  if (supportabilityStatus) {
    return normalizeSupportabilityState(supportabilityStatus);
  }
  const sourceSupportabilityState = deriveArraySupportabilityState(
    readArrayProperty(response, "source_supportability")
  );
  if (sourceSupportabilityState !== "unknown") {
    return sourceSupportabilityState;
  }
  const nestedSourceSupportabilityState = deriveNestedSourceSupportabilityState(response);
  if (nestedSourceSupportabilityState !== "unknown") {
    return nestedSourceSupportabilityState;
  }
  const supportability = readObjectProperty(response, "supportability");
  const nestedSupportabilityState =
    readStringProperty(supportability, "state") ??
    readStringProperty(supportability, "supportability_state") ??
    readStringProperty(supportability, "supportability_status");
  if (nestedSupportabilityState) {
    return normalizeSupportabilityState(nestedSupportabilityState);
  }
  const supportabilityItemsState = deriveArraySupportabilityState(
    readArrayProperty(response, "supportability")
  );
  if (supportabilityItemsState !== "unknown") {
    return supportabilityItemsState;
  }
  if (hasNonEmptyArrayProperty(response, "partial_failures")) {
    return "partial";
  }
  return "unknown";
}

function deriveSourceSupportabilityFreshnessBucket(response: unknown): AnalyticsUiFreshnessBucket {
  return deriveSupportabilityFreshnessBucket(readArrayProperty(response, "source_supportability"));
}

function deriveNestedSourceSupportabilityFreshnessBucket(
  response: unknown
): AnalyticsUiFreshnessBucket {
  return deriveSupportabilityFreshnessBucket(readNestedSupportabilityObjects(response));
}

function deriveSupportabilityFreshnessBucket(items: unknown[]): AnalyticsUiFreshnessBucket {
  let hasFreshSource = false;
  for (const item of items) {
    const freshnessBucket = readStringProperty(item, "freshness_bucket");
    if (!freshnessBucket) {
      continue;
    }
    const normalized = normalizeFreshnessBucket(freshnessBucket);
    if (normalized === "stale") {
      return "stale";
    }
    if (normalized === "fresh") {
      hasFreshSource = true;
    }
  }
  return hasFreshSource ? "fresh" : "unknown";
}

function deriveNestedSourceSupportabilityState(response: unknown): AnalyticsUiSupportabilityState {
  return deriveArraySupportabilityState(readNestedSupportabilityObjects(response));
}

function readNestedSupportabilityObjects(response: unknown): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const rebalance = readObjectProperty(response, "rebalance");
  const rebalanceSupportability = readObjectProperty(rebalance, "supportability");
  if (rebalanceSupportability) {
    items.push(rebalanceSupportability);
  }
  const aiSurfaceSupportability = readObjectProperty(response, "ai_surface_supportability");
  if (aiSurfaceSupportability) {
    items.push(aiSurfaceSupportability);
  }
  const advisorySupportability = readObjectProperty(response, "advisory_supportability");
  if (advisorySupportability) {
    items.push(advisorySupportability);
  }
  const renderSupportability = readObjectProperty(response, "render_supportability");
  if (renderSupportability) {
    items.push(renderSupportability);
  }
  return items;
}

export function recordAnalyticsUiPanelHydration(params: {
  context: WorkbenchAnalyticsUiObservationContext;
  durationMs: number;
  state: AnalyticsUiState;
  freshnessBucket?: AnalyticsUiFreshnessBucket;
  supportabilityState?: AnalyticsUiSupportabilityState;
}): WorkbenchAnalyticsUiMetricEvent {
  return recordMetricEvent({
    eventName: "workbench.analytics.panel_hydration",
    metricName: "lotus_workbench_panel_hydration_duration_seconds",
    value: Math.max(0, params.durationMs) / 1000,
    context: params.context,
    labels: {
      state: params.state,
      freshness_bucket: params.freshnessBucket ?? "unknown",
      supportability_state: params.supportabilityState ?? "unknown",
    },
  });
}

export function recordAnalyticsUiPanelState(params: {
  context: WorkbenchAnalyticsUiObservationContext;
  state: AnalyticsUiState;
  freshnessBucket?: AnalyticsUiFreshnessBucket;
  supportabilityState?: AnalyticsUiSupportabilityState;
  reason?: string;
}): WorkbenchAnalyticsUiMetricEvent {
  return recordMetricEvent({
    eventName: "workbench.analytics.panel_state",
    metricName: "lotus_workbench_panel_state_total",
    value: 1,
    context: params.context,
    labels: {
      state: params.state,
      freshness_bucket: params.freshnessBucket ?? "unknown",
      supportability_state: params.supportabilityState ?? "unknown",
      reason: params.reason,
    },
  });
}

export function recordAnalyticsUiApiRequest(params: {
  context: WorkbenchAnalyticsUiObservationContext;
  durationMs: number;
  statusClass: AnalyticsUiStatusClass;
  state: AnalyticsUiState;
  errorCategory?: string;
}): WorkbenchAnalyticsUiMetricEvent {
  return recordMetricEvent({
    eventName: "workbench.analytics.api_request",
    metricName: "lotus_workbench_api_request_duration_seconds",
    value: Math.max(0, params.durationMs) / 1000,
    context: params.context,
    labels: {
      status_class: params.statusClass,
      state: params.state,
      error_category: params.errorCategory,
    },
  });
}

export function recordAnalyticsUiAttentionEvent(params: {
  context: WorkbenchAnalyticsUiObservationContext;
  attentionType: AnalyticsUiAttentionEventType;
  severity: AnalyticsUiSeverity;
  state: AnalyticsUiState;
  reason: string;
  freshnessBucket?: AnalyticsUiFreshnessBucket;
  supportabilityState?: AnalyticsUiSupportabilityState;
}): WorkbenchAnalyticsUiMetricEvent | undefined {
  const labels = buildAttentionLabels(params);
  const dedupeKey = JSON.stringify(labels);
  if (attentionDedupeKeys.has(dedupeKey)) {
    return undefined;
  }
  attentionDedupeKeys.add(dedupeKey);
  return recordMetricEvent({
    eventName: "workbench.analytics.attention",
    metricName: "lotus_analytics_ui_attention_events_total",
    value: 1,
    context: params.context,
    labels,
  });
}

export async function observeWorkbenchAnalyticsRequest<T>(
  context: WorkbenchAnalyticsUiObservationContext,
  request: () => Promise<T>,
  options: WorkbenchAnalyticsUiObservationOptions = {}
): Promise<T> {
  const startedAt = nowMs();
  const recordPanelHydration = options.recordPanelHydration ?? true;
  try {
    const response = await request();
    const durationMs = nowMs() - startedAt;
    const freshnessBucket = deriveAnalyticsUiFreshnessBucket(response);
    const supportabilityState = deriveAnalyticsUiSupportabilityState(response);
    const state = classifyAnalyticsUiPanelState({
      response,
      freshnessBucket,
      supportabilityState,
    });
    recordAnalyticsUiApiRequest({
      context,
      durationMs,
      statusClass: "2xx",
      state,
    });
    recordAnalyticsUiPanelState({
      context,
      state,
      freshnessBucket,
      supportabilityState,
    });
    if (recordPanelHydration) {
      recordAnalyticsUiPanelHydration({
        context,
        durationMs,
        state,
        freshnessBucket,
        supportabilityState,
      });
    }
    recordAttentionForObservation({
      context,
      state,
      response,
      freshnessBucket,
      supportabilityState,
    });
    return response;
  } catch (error) {
    const durationMs = nowMs() - startedAt;
    const statusClass = statusClassFromError(error);
    recordAnalyticsUiApiRequest({
      context,
      durationMs,
      statusClass,
      state:
        statusClass === "4xx"
          ? classifyAnalyticsUiPanelState({ status: statusFromError(error) })
          : "error",
      errorCategory: errorCategoryFromStatusClass(statusClass),
    });
    recordAnalyticsUiPanelState({
      context,
      state:
        statusClass === "4xx"
          ? classifyAnalyticsUiPanelState({ status: statusFromError(error) })
          : "error",
      reason: errorCategoryFromStatusClass(statusClass),
    });
    recordAttentionForObservation({
      context,
      state:
        statusClass === "4xx"
          ? classifyAnalyticsUiPanelState({ status: statusFromError(error) })
          : "error",
      reason: errorCategoryFromStatusClass(statusClass),
      supportabilityState: "unknown",
      freshnessBucket: "unknown",
    });
    throw error;
  }
}

export function getAnalyticsUiMetricEvents(): readonly WorkbenchAnalyticsUiMetricEvent[] {
  return metricEvents;
}

export function recordAnalyticsUiExternalMetricEvent(
  input: unknown
): WorkbenchAnalyticsUiMetricEvent {
  const event = parseExternalMetricEvent(input);
  metricEvents.push(event);
  return event;
}

export function getAnalyticsUiMetricSamples(): WorkbenchAnalyticsUiMetricSample[] {
  const samples = new Map<string, WorkbenchAnalyticsUiMetricSample>();
  for (const event of metricEvents) {
    const sampleKey = JSON.stringify({
      metric_name: event.metric_name,
      labels: event.labels,
    });
    const existing = samples.get(sampleKey);
    if (existing) {
      existing.value += event.value;
      existing.sample_count += 1;
    } else {
      samples.set(sampleKey, {
        metric_name: event.metric_name,
        metric_type:
          event.metric_name === "lotus_workbench_panel_state_total" ||
          event.metric_name === "lotus_analytics_ui_attention_events_total"
            ? "counter"
            : "histogram",
        labels: event.labels,
        value: event.value,
        sample_count: 1,
      });
    }
  }
  return [...samples.values()];
}

export function renderAnalyticsUiPrometheusMetrics(): string {
  const samples = getAnalyticsUiMetricSamples();
  const lines = [
    "# HELP lotus_workbench_panel_hydration_duration_seconds Selected Workbench analytics panel hydration duration.",
    "# TYPE lotus_workbench_panel_hydration_duration_seconds histogram",
    "# HELP lotus_workbench_panel_state_total Selected Workbench analytics panel state transitions.",
    "# TYPE lotus_workbench_panel_state_total counter",
    "# HELP lotus_workbench_api_request_duration_seconds Selected Workbench analytics API request duration.",
    "# TYPE lotus_workbench_api_request_duration_seconds histogram",
    "# HELP lotus_analytics_ui_attention_events_total Bounded analytics UI attention events for selected Workbench panels.",
    "# TYPE lotus_analytics_ui_attention_events_total counter",
  ];
  for (const sample of samples) {
    lines.push(
      `${sample.metric_name}${formatPrometheusLabels(sample.labels)} ${sample.value}`
    );
    if (sample.metric_type === "histogram") {
      lines.push(...renderHistogramBucketLines(sample));
      lines.push(
        `${sample.metric_name}_sum${formatPrometheusLabels(sample.labels)} ${sample.value}`
      );
      lines.push(
        `${sample.metric_name}_count${formatPrometheusLabels(sample.labels)} ${sample.sample_count}`
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export function resetAnalyticsUiMetricEvents(): void {
  metricEvents.length = 0;
  attentionDedupeKeys.clear();
  panelFailureCounts.clear();
}

function recordAttentionForObservation(params: {
  context: WorkbenchAnalyticsUiObservationContext;
  state: AnalyticsUiState;
  response?: unknown;
  reason?: string;
  freshnessBucket?: AnalyticsUiFreshnessBucket;
  supportabilityState?: AnalyticsUiSupportabilityState;
}): void {
  const panelKey = `${params.context.route}:${params.context.panel}`;
  if (params.state === "error") {
    const nextFailureCount = (panelFailureCounts.get(panelKey) ?? 0) + 1;
    panelFailureCounts.set(panelKey, nextFailureCount);
    if (nextFailureCount >= 3) {
      recordAnalyticsUiAttentionEvent({
        context: params.context,
        attentionType: "panel_repeated_failure",
        severity: "action_required",
        state: params.state,
        reason: sanitizeAttentionReason(params.reason ?? "repeated_failure"),
        freshnessBucket: params.freshnessBucket,
        supportabilityState: params.supportabilityState,
      });
    }
    return;
  }

  panelFailureCounts.delete(panelKey);
  const reason = resolveAttentionReason(params.response, params.reason);
  if (params.state === "stale") {
    recordAnalyticsUiAttentionEvent({
      context: params.context,
      attentionType: "panel_stale",
      severity: "warning",
      state: params.state,
      reason,
      freshnessBucket: params.freshnessBucket,
      supportabilityState: params.supportabilityState,
    });
    return;
  }
  if (params.state === "degraded") {
    recordAnalyticsUiAttentionEvent({
      context: params.context,
      attentionType: "panel_degraded",
      severity:
        params.supportabilityState === "action_required" ? "action_required" : "warning",
      state: params.state,
      reason,
      freshnessBucket: params.freshnessBucket,
      supportabilityState: params.supportabilityState,
    });
    return;
  }
  if (params.state === "partial") {
    recordAnalyticsUiAttentionEvent({
      context: params.context,
      attentionType: "source_partial",
      severity: "warning",
      state: params.state,
      reason,
      freshnessBucket: params.freshnessBucket,
      supportabilityState: params.supportabilityState,
    });
  }
}

function buildAttentionLabels(params: {
  attentionType: AnalyticsUiAttentionEventType;
  severity: AnalyticsUiSeverity;
  state: AnalyticsUiState;
  reason: string;
  freshnessBucket?: AnalyticsUiFreshnessBucket;
  supportabilityState?: AnalyticsUiSupportabilityState;
}): Partial<Record<AnalyticsUiAllowedLabel, string>> {
  return buildAnalyticsUiLabels({
    attention_type: params.attentionType,
    severity: params.severity,
    state: params.state,
    reason: sanitizeAttentionReason(params.reason),
    freshness_bucket: params.freshnessBucket ?? "unknown",
    supportability_state: params.supportabilityState ?? "unknown",
  });
}

function resolveAttentionReason(response: unknown, fallback?: string): string {
  const warning = readFirstString(response, "warnings");
  if (warning) {
    return sanitizeAttentionReason(warning);
  }
  const partialFailureReason = readFirstObjectString(response, "partial_failures", [
    "error_code",
    "reason",
    "source_service",
  ]);
  if (partialFailureReason) {
    return sanitizeAttentionReason(partialFailureReason);
  }
  return sanitizeAttentionReason(fallback ?? "source_state");
}

function sanitizeAttentionReason(reason: string): string {
  const normalized = reason
    .trim()
    .replace(/[^A-Za-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return normalized || "unknown";
}

function recordMetricEvent(params: {
  eventName: WorkbenchAnalyticsUiBrowserEvent;
  metricName: WorkbenchAnalyticsUiMetricFamily;
  value: number;
  context: WorkbenchAnalyticsUiObservationContext;
  labels: Partial<Record<AnalyticsUiAllowedLabel, string | undefined>>;
}): WorkbenchAnalyticsUiMetricEvent {
  const labels = buildAnalyticsUiLabels({
    route: params.context.route,
    panel: params.context.panel,
    service: params.context.service ?? "lotus-gateway",
    operation: params.context.operation,
    ...params.labels,
  });
  assertAnalyticsUiLabels(labels);
  const event: WorkbenchAnalyticsUiMetricEvent = {
    event_name: params.eventName,
    metric_name: params.metricName,
    value: params.value,
    labels,
    recorded_at: new Date().toISOString(),
  };
  metricEvents.push(event);
  publishBrowserMetricEvent(event);
  return event;
}

function publishBrowserMetricEvent(event: WorkbenchAnalyticsUiMetricEvent): void {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    return;
  }
  void fetch("/api/metrics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    cache: "no-store",
    keepalive: true,
  }).catch(() => undefined);
}

function parseExternalMetricEvent(input: unknown): WorkbenchAnalyticsUiMetricEvent {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Analytics UI metric event must be an object.");
  }
  const event = input as Record<string, unknown>;
  const eventName = event.event_name;
  const metricName = event.metric_name;
  const value = event.value;
  const labels = event.labels;
  const recordedAt = event.recorded_at;
  if (
    typeof eventName !== "string" ||
    !WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS.includes(
      eventName as WorkbenchAnalyticsUiBrowserEvent
    )
  ) {
    throw new Error("Analytics UI metric event has unsupported event_name.");
  }
  if (
    typeof metricName !== "string" ||
    !WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES.includes(
      metricName as WorkbenchAnalyticsUiMetricFamily
    )
  ) {
    throw new Error("Analytics UI metric event has unsupported metric_name.");
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Analytics UI metric event has invalid value.");
  }
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
    throw new Error("Analytics UI metric event must include labels.");
  }
  const normalizedLabels = buildAnalyticsUiLabels(
    Object.fromEntries(
      Object.entries(labels as Record<string, unknown>).filter(
        (entry): entry is [AnalyticsUiAllowedLabel, string] =>
          typeof entry[1] === "string"
      )
    ) as Partial<Record<AnalyticsUiAllowedLabel, string>>
  );
  assertAnalyticsUiLabels(normalizedLabels);
  if (
    typeof normalizedLabels.route !== "string" ||
    typeof normalizedLabels.panel !== "string" ||
    typeof normalizedLabels.operation !== "string"
  ) {
    throw new Error("Analytics UI metric event must include route, panel, and operation labels.");
  }
  return {
    event_name: eventName as WorkbenchAnalyticsUiBrowserEvent,
    metric_name: metricName as WorkbenchAnalyticsUiMetricFamily,
    value,
    labels: normalizedLabels,
    recorded_at: typeof recordedAt === "string" ? recordedAt : new Date().toISOString(),
  };
}

function readStringProperty(value: unknown, property: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  return typeof propertyValue === "string" && propertyValue ? propertyValue : undefined;
}

function readObjectProperty(value: unknown, property: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  if (!propertyValue || typeof propertyValue !== "object" || Array.isArray(propertyValue)) {
    return undefined;
  }
  return propertyValue as Record<string, unknown>;
}

function readArrayProperty(value: unknown, property: string): unknown[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  return Array.isArray(propertyValue) ? propertyValue : [];
}

function readFirstString(value: unknown, property: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  if (!Array.isArray(propertyValue)) {
    return undefined;
  }
  const firstString = propertyValue.find(
    (item): item is string => typeof item === "string" && item.length > 0
  );
  return firstString;
}

function readFirstObjectString(
  value: unknown,
  property: string,
  keys: readonly string[]
): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  if (!Array.isArray(propertyValue)) {
    return undefined;
  }
  for (const item of propertyValue) {
    if (!item || typeof item !== "object") {
      continue;
    }
    for (const key of keys) {
      const candidate = (item as Record<string, unknown>)[key];
      if (typeof candidate === "string" && candidate) {
        return candidate;
      }
    }
  }
  return undefined;
}

function hasNonEmptyArrayProperty(value: unknown, property: string): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  return Array.isArray(propertyValue) && propertyValue.length > 0;
}

function normalizeSupportabilityState(value: string): AnalyticsUiSupportabilityState {
  const normalized = value.toLowerCase();
  if (normalized === "ready") {
    return "ready";
  }
  if (normalized === "partial") {
    return "partial";
  }
  if (
    normalized === "action_required" ||
    normalized === "blocked" ||
    normalized === "degraded" ||
    normalized === "requires_action"
  ) {
    return "action_required";
  }
  if (normalized === "unsupported" || normalized === "unavailable") {
    return "unsupported";
  }
  return "unknown";
}

function normalizeFreshnessBucket(value: string): AnalyticsUiFreshnessBucket {
  const normalized = value.toLowerCase();
  if (normalized === "current" || normalized === "ready") {
    return "fresh";
  }
  if (normalized === "fresh" || normalized === "stale" || normalized === "unknown") {
    return normalized;
  }
  return "unknown";
}

function deriveArraySupportabilityState(items: unknown[]): AnalyticsUiSupportabilityState {
  if (!items.length) {
    return "unknown";
  }
  const states = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "unknown";
      }
      const state =
        readStringProperty(item, "state") ??
        readStringProperty(item, "supportability_state") ??
        readStringProperty(item, "supportability_status");
      return state ? normalizeSupportabilityState(state) : "unknown";
    })
    .filter((state) => state !== "unknown");

  if (!states.length) {
    return "ready";
  }
  if (states.includes("action_required")) {
    return "action_required";
  }
  if (states.includes("partial")) {
    return "partial";
  }
  if (states.includes("unsupported")) {
    return "unsupported";
  }
  return "ready";
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function statusFromError(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const match = error.message.match(/\((\d{3})\)/);
  return match ? Number(match[1]) : undefined;
}

function statusClassFromError(error: unknown): AnalyticsUiStatusClass {
  const status = statusFromError(error);
  if (status === undefined) {
    return "network";
  }
  if (status >= 500) {
    return "5xx";
  }
  if (status >= 400) {
    return "4xx";
  }
  if (status >= 300) {
    return "3xx";
  }
  return "2xx";
}

function errorCategoryFromStatusClass(statusClass: AnalyticsUiStatusClass): string {
  if (statusClass === "4xx") {
    return "client";
  }
  if (statusClass === "5xx") {
    return "server";
  }
  if (statusClass === "network") {
    return "network";
  }
  return "none";
}

function formatPrometheusLabels(
  labels: Partial<Record<AnalyticsUiAllowedLabel, string>>
): string {
  const entries = Object.entries(labels).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "";
  }
  return `{${entries
    .map(([key, value]) => `${key}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;
}

function renderHistogramBucketLines(
  sample: WorkbenchAnalyticsUiMetricSample
): string[] {
  const buckets = [0.1, 0.5, 1, 3, 5, 10];
  const sourceEvents = metricEvents.filter(
    (event) =>
      event.metric_name === sample.metric_name &&
      JSON.stringify(event.labels) === JSON.stringify(sample.labels)
  );
  const lines = buckets.map((bucket) => {
    const count = sourceEvents.filter((event) => event.value <= bucket).length;
    return `${sample.metric_name}_bucket${formatPrometheusLabels({
      ...sample.labels,
      // Prometheus requires le on histogram buckets; the contract validator keeps
      // service-owned labels bounded and dashboard tests normalize bucket suffixes.
      le: String(bucket),
    } as Partial<Record<AnalyticsUiAllowedLabel, string>>)} ${count}`;
  });
  lines.push(
    `${sample.metric_name}_bucket${formatPrometheusLabels({
      ...sample.labels,
      le: "+Inf",
    } as Partial<Record<AnalyticsUiAllowedLabel, string>>)} ${sample.sample_count}`
  );
  return lines;
}
