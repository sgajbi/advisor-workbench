import {
  type AnalyticsUiAttentionEventType,
  type AnalyticsUiAllowedLabel,
  type AnalyticsUiSeverity,
  type AnalyticsUiState,
  type WorkbenchAnalyticsUiBrowserEvent,
  type WorkbenchAnalyticsUiMetricFamily,
  ANALYTICS_UI_ATTENTION_EVENT_TYPES,
  ANALYTICS_UI_SEVERITY_LEVELS,
  WORKBENCH_ANALYTICS_UI_BROWSER_EVENTS,
  WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES,
  assertAnalyticsUiLabels,
  buildAnalyticsUiLabels,
  isAnalyticsUiState,
} from "./contract";
import {
  ANALYTICS_UI_HISTOGRAM_BUCKETS,
  MAX_ANALYTICS_UI_DURATION_SECONDS,
  appendAnalyticsUiMetricEvent,
  clearAnalyticsUiPanelFailure,
  getAnalyticsUiDroppedSeriesCount,
  getAnalyticsUiMetricSamples,
  incrementAnalyticsUiPanelFailure,
  rememberAnalyticsUiAttentionKey,
  type WorkbenchAnalyticsUiMetricEvent,
  type WorkbenchAnalyticsUiMetricSample,
} from "./metric-store";
import { WorkbenchResponseEvidenceError } from "./response-evidence-error";

export {
  getAnalyticsUiMetricEvents,
  getAnalyticsUiMetricSamples,
  resetAnalyticsUiMetricEvents,
} from "./metric-store";
export type {
  WorkbenchAnalyticsUiMetricEvent,
  WorkbenchAnalyticsUiMetricSample,
} from "./metric-store";

export type AnalyticsUiFreshnessBucket = "fresh" | "stale" | "unknown";
export type AnalyticsUiStatusClass = "2xx" | "3xx" | "4xx" | "5xx" | "network";

export type AnalyticsUiSupportabilityState =
  "ready" | "partial" | "action_required" | "unsupported" | "unknown";

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
    route: "workbench.advisor-book",
    panel: "advisor-book-portfolios",
    operation: "advisor-book.portfolios",
  },
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
    panel: "report-ordering-catalogue",
    operation: "reporting.ordering.options",
  },
  {
    route: "workbench.reporting",
    panel: "portfolio-review-order",
    operation: "reporting.portfolio-review.submit",
  },
  {
    route: "workbench.reporting",
    panel: "portfolio-review-history",
    operation: "reporting.portfolio-review.history",
  },
  {
    route: "workbench.reporting",
    panel: "portfolio-review-batch",
    operation: "reporting.portfolio-review.batch.submit",
  },
  {
    route: "workbench.reporting",
    panel: "portfolio-review-batch",
    operation: "reporting.portfolio-review.batch.status",
  },
  {
    route: "workbench.recommendations",
    panel: "idea-candidate-detail",
    operation: "idea.candidate.ai-explanation",
  },
  {
    route: "workbench.recommendations",
    panel: "idea-candidate-detail",
    operation: "idea.candidate.review-action",
  },
  {
    route: "workbench.recommendations",
    panel: "idea-candidate-detail",
    operation: "idea.candidate.feedback",
  },
  {
    route: "workbench.recommendations",
    panel: "idea-candidate-queue",
    operation: "idea.candidate.presentation-receipt",
  },
  {
    route: "workbench.recommendations",
    panel: "idea-candidate-detail",
    operation: "idea.candidate.conversion-intent",
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
    panel: "portfolio-memory",
    operation: "dpm.portfolio-memory.search",
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
    panel: "execution-acknowledgement-supportability",
    operation: "source-products.external-order-execution-acknowledgement.get",
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
    panel: "wave-campaign-definitions",
    operation: "dpm.waves.campaign-definitions.get",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-discovery",
    operation: "dpm.waves.campaign-discovery.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-operating-queue",
    operation: "dpm.waves.campaign-operating-queue.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-approval-inbox",
    operation: "dpm.waves.campaign-approval-inbox.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-workflow-board",
    operation: "dpm.waves.campaign-workflow-board.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-assignment-plan",
    operation: "dpm.waves.campaign-assignment-plan.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-workflow-automation",
    operation: "dpm.waves.campaign-workflow-automation.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-approval-decisions",
    operation: "dpm.waves.campaign-approval-decisions.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-approval-decisions-create",
    operation: "dpm.waves.campaign-approval-decisions.create",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-assignment-actions",
    operation: "dpm.waves.campaign-assignment-actions.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-assignment-actions-create",
    operation: "dpm.waves.campaign-assignment-actions.create",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-assignment-tasks",
    operation: "dpm.waves.campaign-assignment-tasks.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-assignment-tasks-create",
    operation: "dpm.waves.campaign-assignment-tasks.create",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-assignment-task-transitions-create",
    operation: "dpm.waves.campaign-assignment-task-transitions.create",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-maker-checker-controls",
    operation: "dpm.waves.campaign-maker-checker-controls.list",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-maker-checker-controls-create",
    operation: "dpm.waves.campaign-maker-checker-controls.create",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-lifecycle",
    operation: "dpm.waves.campaign-definitions.lifecycle-events",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-preview-readiness",
    operation: "dpm.waves.campaign-definitions.preview-readiness",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-launch-history",
    operation: "dpm.waves.campaign-definitions.launch-history",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-launch-package",
    operation: "dpm.waves.campaign-definitions.launch-package",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-launch",
    operation: "dpm.waves.campaign-definitions.launch",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-retire",
    operation: "dpm.waves.campaign-definitions.retire",
  },
  {
    route: "workbench.manage",
    panel: "wave-campaign-supersede",
    operation: "dpm.waves.campaign-definitions.supersede",
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
    route: "workbench.manage",
    panel: "pm-operating-quality-score-run-ai-summary",
    operation: "dpm.pm-operating-quality.score-runs.ai-summary",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-fairness-preview",
    operation: "dpm.pm-operating-quality.fairness-analyses.preview",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-fairness-analysis-create",
    operation: "dpm.pm-operating-quality.fairness-analyses.create",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-fairness-analysis-list",
    operation: "dpm.pm-operating-quality.fairness-analyses.list",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-fairness-analysis-detail",
    operation: "dpm.pm-operating-quality.fairness-analyses.get",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-review-action-list",
    operation: "dpm.pm-operating-quality.review-actions.list",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-review-action-detail",
    operation: "dpm.pm-operating-quality.review-actions.get",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-review-action-preview",
    operation: "dpm.pm-operating-quality.review-actions.preview",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-review-action-create",
    operation: "dpm.pm-operating-quality.review-actions.create",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-summary-invocation-preview",
    operation: "dpm.pm-operating-quality.summary-invocations.preview",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-summary-invocation-create",
    operation: "dpm.pm-operating-quality.summary-invocations.create",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-summary-invocation-list",
    operation: "dpm.pm-operating-quality.summary-invocations.list",
  },
  {
    route: "workbench.manage",
    panel: "pm-operating-quality-summary-invocation-detail",
    operation: "dpm.pm-operating-quality.summary-invocations.get",
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
    panel: "portfolio-workspace-shell-recovery",
    operation: "portfolio.workspace.shell.recovery",
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

const METRIC_BY_EVENT = {
  "workbench.analytics.panel_hydration":
    "lotus_workbench_panel_hydration_duration_seconds",
  "workbench.analytics.panel_state": "lotus_workbench_panel_state_total",
  "workbench.analytics.api_request":
    "lotus_workbench_api_request_duration_seconds",
  "workbench.analytics.attention": "lotus_analytics_ui_attention_events_total",
} as const satisfies Record<
  WorkbenchAnalyticsUiBrowserEvent,
  WorkbenchAnalyticsUiMetricFamily
>;

export function classifyAnalyticsUiPanelState(
  input: AnalyticsUiPanelClassificationInput,
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

export function deriveAnalyticsUiFreshnessBucket(
  response: unknown,
): AnalyticsUiFreshnessBucket {
  const direct = readStringProperty(response, "freshness_bucket");
  if (direct) {
    return normalizeFreshnessBucket(direct);
  }

  const sourceSupportabilityFreshness =
    deriveSourceSupportabilityFreshnessBucket(response);
  if (sourceSupportabilityFreshness !== "unknown") {
    return sourceSupportabilityFreshness;
  }

  const nestedSourceSupportabilityFreshness =
    deriveNestedSourceSupportabilityFreshnessBucket(response);
  if (nestedSourceSupportabilityFreshness !== "unknown") {
    return nestedSourceSupportabilityFreshness;
  }

  const supportability = readObjectProperty(response, "supportability");
  const supportabilityFreshness = readStringProperty(
    supportability,
    "freshness_bucket",
  );
  if (supportabilityFreshness) {
    return normalizeFreshnessBucket(supportabilityFreshness);
  }

  return classifyAnalyticsUiFreshnessBucket({
    asOfDate: readStringProperty(response, "as_of_date"),
  });
}

export function deriveAnalyticsUiSupportabilityState(
  response: unknown,
): AnalyticsUiSupportabilityState {
  const direct = readStringProperty(response, "supportability_state");
  if (direct) {
    return normalizeSupportabilityState(direct);
  }
  const supportabilityStatus = readStringProperty(
    response,
    "supportability_status",
  );
  if (supportabilityStatus) {
    return normalizeSupportabilityState(supportabilityStatus);
  }
  const sourceSupportabilityState = deriveArraySupportabilityState(
    readArrayProperty(response, "source_supportability"),
  );
  if (sourceSupportabilityState !== "unknown") {
    return sourceSupportabilityState;
  }
  const nestedSourceSupportabilityState =
    deriveNestedSourceSupportabilityState(response);
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
    readArrayProperty(response, "supportability"),
  );
  if (supportabilityItemsState !== "unknown") {
    return supportabilityItemsState;
  }
  if (hasNonEmptyArrayProperty(response, "partial_failures")) {
    return "partial";
  }
  return "unknown";
}

function deriveSourceSupportabilityFreshnessBucket(
  response: unknown,
): AnalyticsUiFreshnessBucket {
  return deriveSupportabilityFreshnessBucket(
    readArrayProperty(response, "source_supportability"),
  );
}

function deriveNestedSourceSupportabilityFreshnessBucket(
  response: unknown,
): AnalyticsUiFreshnessBucket {
  return deriveSupportabilityFreshnessBucket(
    readNestedSupportabilityObjects(response),
  );
}

function deriveSupportabilityFreshnessBucket(
  items: unknown[],
): AnalyticsUiFreshnessBucket {
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

function deriveNestedSourceSupportabilityState(
  response: unknown,
): AnalyticsUiSupportabilityState {
  return deriveArraySupportabilityState(
    readNestedSupportabilityObjects(response),
  );
}

function readNestedSupportabilityObjects(
  response: unknown,
): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const rebalance = readObjectProperty(response, "rebalance");
  const rebalanceSupportability = readObjectProperty(
    rebalance,
    "supportability",
  );
  if (rebalanceSupportability) {
    items.push(rebalanceSupportability);
  }
  const aiSurfaceSupportability = readObjectProperty(
    response,
    "ai_surface_supportability",
  );
  if (aiSurfaceSupportability) {
    items.push(aiSurfaceSupportability);
  }
  const advisorySupportability = readObjectProperty(
    response,
    "advisory_supportability",
  );
  if (advisorySupportability) {
    items.push(advisorySupportability);
  }
  const renderSupportability = readObjectProperty(
    response,
    "render_supportability",
  );
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
  if (!rememberAnalyticsUiAttentionKey(dedupeKey)) {
    return undefined;
  }
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
  options: WorkbenchAnalyticsUiObservationOptions = {},
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
      errorCategory: errorCategoryFromStatusClass(statusClass, error),
    });
    recordAnalyticsUiPanelState({
      context,
      state:
        statusClass === "4xx"
          ? classifyAnalyticsUiPanelState({ status: statusFromError(error) })
          : "error",
      reason: errorCategoryFromStatusClass(statusClass, error),
    });
    recordAttentionForObservation({
      context,
      state:
        statusClass === "4xx"
          ? classifyAnalyticsUiPanelState({ status: statusFromError(error) })
          : "error",
      reason: errorCategoryFromStatusClass(statusClass, error),
      supportabilityState: "unknown",
      freshnessBucket: "unknown",
    });
    throw error;
  }
}

export function recordAnalyticsUiExternalMetricEvent(
  input: unknown,
): WorkbenchAnalyticsUiMetricEvent {
  const event = parseExternalMetricEvent(input);
  appendAnalyticsUiMetricEvent(event);
  return event;
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
    "# HELP lotus_workbench_metrics_dropped_series_total Metric series rejected after the per-instance series budget was exhausted.",
    "# TYPE lotus_workbench_metrics_dropped_series_total counter",
  ];
  for (const sample of samples) {
    if (sample.metric_type === "counter") {
      lines.push(
        `${sample.metric_name}${formatPrometheusLabels(sample.labels)} ${sample.value}`,
      );
    } else {
      lines.push(...renderHistogramBucketLines(sample));
      lines.push(
        `${sample.metric_name}_sum${formatPrometheusLabels(sample.labels)} ${sample.value}`,
      );
      lines.push(
        `${sample.metric_name}_count${formatPrometheusLabels(sample.labels)} ${sample.sample_count}`,
      );
    }
  }
  lines.push(
    `lotus_workbench_metrics_dropped_series_total ${getAnalyticsUiDroppedSeriesCount()}`,
  );
  return `${lines.join("\n")}\n`;
}

function assertObservedSurface(
  context: WorkbenchAnalyticsUiObservationContext,
): void {
  const supported = WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES.some(
    (surface) =>
      surface.route === context.route &&
      surface.panel === context.panel &&
      surface.operation === context.operation,
  );
  if (!supported) {
    throw new Error(
      `Analytics UI metric context is not registered: ${context.route}/${context.panel}/${context.operation}.`,
    );
  }
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
    const nextFailureCount = incrementAnalyticsUiPanelFailure(panelKey);
    if (nextFailureCount >= 3) {
      recordAnalyticsUiAttentionEvent({
        context: params.context,
        attentionType: "panel_repeated_failure",
        severity: "action_required",
        state: params.state,
        reason: normalizeAttentionReason(params.reason ?? "repeated_failure"),
        freshnessBucket: params.freshnessBucket,
        supportabilityState: params.supportabilityState,
      });
    }
    return;
  }

  clearAnalyticsUiPanelFailure(panelKey);
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
        params.supportabilityState === "action_required"
          ? "action_required"
          : "warning",
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
    reason: normalizeAttentionReason(params.reason),
    freshness_bucket: params.freshnessBucket ?? "unknown",
    supportability_state: params.supportabilityState ?? "unknown",
  });
}

function resolveAttentionReason(response: unknown, fallback?: string): string {
  const warning = readFirstString(response, "warnings");
  if (warning) {
    return "source_warning";
  }
  const partialFailureReason = readFirstObjectString(
    response,
    "partial_failures",
    ["error_code", "reason", "source_service"],
  );
  if (partialFailureReason) {
    return "source_partial_failure";
  }
  return normalizeAttentionReason(fallback ?? "source_state");
}

function normalizeAttentionReason(reason: string): string {
  const normalized = reason.trim().toLowerCase();
  return [
    "client",
    "server",
    "network",
    "evidence",
    "none",
    "repeated_failure",
    "source_warning",
    "source_partial_failure",
    "source_state",
  ].includes(normalized)
    ? normalized
    : "other";
}

function normalizeErrorCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  return ["client", "server", "network", "evidence", "none"].includes(normalized)
    ? normalized
    : "other";
}

function assertMetricLabelVocabulary(
  labels: Partial<Record<AnalyticsUiAllowedLabel, string>>,
): void {
  const allowedValues: Partial<Record<AnalyticsUiAllowedLabel, readonly string[]>> = {
    service: ["lotus-gateway"],
    state: [
      "loading",
      "ready",
      "empty",
      "partial",
      "stale",
      "degraded",
      "error",
      "permission_blocked",
      "unsupported",
    ],
    reason: [
      "client",
      "server",
      "network",
      "evidence",
      "none",
      "repeated_failure",
      "source_warning",
      "source_partial_failure",
      "source_state",
      "other",
    ],
    freshness_bucket: ["fresh", "stale", "unknown"],
    supportability_state: [
      "ready",
      "partial",
      "action_required",
      "unsupported",
      "unknown",
    ],
    attention_type: ANALYTICS_UI_ATTENTION_EVENT_TYPES,
    severity: ANALYTICS_UI_SEVERITY_LEVELS,
    status_class: ["2xx", "3xx", "4xx", "5xx", "network"],
    error_category: ["client", "server", "network", "evidence", "none", "other"],
    region: ["APAC", "EMEA", "AMERICAS", "GLOBAL"],
    environment: ["dev", "test", "uat", "prod", "production"],
  };
  for (const [label, allowed] of Object.entries(allowedValues)) {
    const value = labels[label as AnalyticsUiAllowedLabel];
    if (value !== undefined && !allowed?.includes(value)) {
      throw new Error(`Analytics UI metric label ${label} has unsupported value.`);
    }
  }
}

function recordMetricEvent(params: {
  eventName: WorkbenchAnalyticsUiBrowserEvent;
  metricName: WorkbenchAnalyticsUiMetricFamily;
  value: number;
  context: WorkbenchAnalyticsUiObservationContext;
  labels: Partial<Record<AnalyticsUiAllowedLabel, string | undefined>>;
}): WorkbenchAnalyticsUiMetricEvent {
  assertObservedSurface(params.context);
  const labels = buildAnalyticsUiLabels({
    route: params.context.route,
    panel: params.context.panel,
    service: params.context.service ?? "lotus-gateway",
    operation: params.context.operation,
    ...params.labels,
    reason: params.labels.reason
      ? normalizeAttentionReason(params.labels.reason)
      : undefined,
    error_category: params.labels.error_category
      ? normalizeErrorCategory(params.labels.error_category)
      : undefined,
  });
  assertAnalyticsUiLabels(labels);
  assertMetricLabelVocabulary(labels);
  const event: WorkbenchAnalyticsUiMetricEvent = {
    event_name: params.eventName,
    metric_name: params.metricName,
    value:
      params.metricName === "lotus_workbench_panel_state_total" ||
      params.metricName === "lotus_analytics_ui_attention_events_total"
        ? 1
        : Math.min(
            MAX_ANALYTICS_UI_DURATION_SECONDS,
            Math.max(0, params.value),
          ),
    labels,
    recorded_at: new Date().toISOString(),
  };
  appendAnalyticsUiMetricEvent(event);
  publishBrowserMetricEvent(event);
  return event;
}

function publishBrowserMetricEvent(
  event: WorkbenchAnalyticsUiMetricEvent,
): void {
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

function parseExternalMetricEvent(
  input: unknown,
): WorkbenchAnalyticsUiMetricEvent {
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
      eventName as WorkbenchAnalyticsUiBrowserEvent,
    )
  ) {
    throw new Error("Analytics UI metric event has unsupported event_name.");
  }
  if (
    typeof metricName !== "string" ||
    !WORKBENCH_ANALYTICS_UI_METRIC_FAMILIES.includes(
      metricName as WorkbenchAnalyticsUiMetricFamily,
    )
  ) {
    throw new Error("Analytics UI metric event has unsupported metric_name.");
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Analytics UI metric event has invalid value.");
  }
  if (METRIC_BY_EVENT[eventName as WorkbenchAnalyticsUiBrowserEvent] !== metricName) {
    throw new Error("Analytics UI metric event does not match its metric family.");
  }
  const counterMetric =
    metricName === "lotus_workbench_panel_state_total" ||
    metricName === "lotus_analytics_ui_attention_events_total";
  if (
    (counterMetric && value !== 1) ||
    (!counterMetric && value > MAX_ANALYTICS_UI_DURATION_SECONDS)
  ) {
    throw new Error("Analytics UI metric event value exceeds its governed bounds.");
  }
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) {
    throw new Error("Analytics UI metric event must include labels.");
  }
  const normalizedLabels = buildAnalyticsUiLabels(
    Object.fromEntries(
      Object.entries(labels as Record<string, unknown>).filter(
        (entry): entry is [AnalyticsUiAllowedLabel, string] =>
          typeof entry[1] === "string",
      ),
    ) as Partial<Record<AnalyticsUiAllowedLabel, string>>,
  );
  assertAnalyticsUiLabels(normalizedLabels);
  if (
    typeof normalizedLabels.route !== "string" ||
    typeof normalizedLabels.panel !== "string" ||
    typeof normalizedLabels.operation !== "string"
  ) {
    throw new Error(
      "Analytics UI metric event must include route, panel, and operation labels.",
    );
  }
  assertObservedSurface({
    route: normalizedLabels.route,
    panel: normalizedLabels.panel,
    operation: normalizedLabels.operation,
    service: normalizedLabels.service,
  });
  if (normalizedLabels.service && normalizedLabels.service !== "lotus-gateway") {
    throw new Error("Analytics UI metric event has unsupported service label.");
  }
  if (normalizedLabels.reason) {
    normalizedLabels.reason = normalizeAttentionReason(normalizedLabels.reason);
  }
  if (normalizedLabels.error_category) {
    normalizedLabels.error_category = normalizeErrorCategory(
      normalizedLabels.error_category,
    );
  }
  assertMetricLabelVocabulary(normalizedLabels);
  return {
    event_name: eventName as WorkbenchAnalyticsUiBrowserEvent,
    metric_name: metricName as WorkbenchAnalyticsUiMetricFamily,
    value,
    labels: normalizedLabels,
    recorded_at:
      typeof recordedAt === "string" ? recordedAt : new Date().toISOString(),
  };
}

function readStringProperty(
  value: unknown,
  property: string,
): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  return typeof propertyValue === "string" && propertyValue
    ? propertyValue
    : undefined;
}

function readObjectProperty(
  value: unknown,
  property: string,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const propertyValue = (value as Record<string, unknown>)[property];
  if (
    !propertyValue ||
    typeof propertyValue !== "object" ||
    Array.isArray(propertyValue)
  ) {
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
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return firstString;
}

function readFirstObjectString(
  value: unknown,
  property: string,
  keys: readonly string[],
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

function normalizeSupportabilityState(
  value: string,
): AnalyticsUiSupportabilityState {
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
  if (
    normalized === "fresh" ||
    normalized === "stale" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return "unknown";
}

function deriveArraySupportabilityState(
  items: unknown[],
): AnalyticsUiSupportabilityState {
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
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
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
  if (error instanceof WorkbenchResponseEvidenceError) {
    return error.statusClass;
  }
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

function errorCategoryFromStatusClass(
  statusClass: AnalyticsUiStatusClass,
  error?: unknown,
): string {
  if (error instanceof WorkbenchResponseEvidenceError) {
    return error.errorCategory;
  }
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
  labels: Partial<Record<AnalyticsUiAllowedLabel, string>>,
): string {
  const entries = Object.entries(labels).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) {
    return "";
  }
  return `{${entries
    .map(
      ([key, value]) =>
        `${key}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    )
    .join(",")}}`;
}

function renderHistogramBucketLines(
  sample: WorkbenchAnalyticsUiMetricSample,
): string[] {
  const lines = ANALYTICS_UI_HISTOGRAM_BUCKETS.map((bucket, index) => {
    const count = sample.bucket_counts?.[index] ?? 0;
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
    } as Partial<
      Record<AnalyticsUiAllowedLabel, string>
    >)} ${sample.sample_count}`,
  );
  return lines;
}
