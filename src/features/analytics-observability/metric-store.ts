import {
  type AnalyticsUiAllowedLabel,
  type WorkbenchAnalyticsUiBrowserEvent,
  type WorkbenchAnalyticsUiMetricFamily,
} from "./contract";

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
  bucket_counts?: number[];
}

const MAX_DIAGNOSTIC_EVENTS = 1_024;
const MAX_METRIC_SERIES = 4_096;
const MAX_ATTENTION_DEDUPE_KEYS = 512;
const MAX_PANEL_FAILURE_KEYS = 512;
export const ANALYTICS_UI_HISTOGRAM_BUCKETS = [0.1, 0.5, 1, 3, 5, 10] as const;
export const MAX_ANALYTICS_UI_DURATION_SECONDS = 300;

const analyticsUiMetricStore = globalThis as typeof globalThis & {
  __lotusAnalyticsUiMetricEvents?: WorkbenchAnalyticsUiMetricEvent[];
  __lotusAnalyticsUiMetricSamples?: Map<string, WorkbenchAnalyticsUiMetricSample>;
  __lotusAnalyticsUiAttentionDedupeKeys?: Set<string>;
  __lotusAnalyticsUiPanelFailureCounts?: Map<string, number>;
  __lotusAnalyticsUiDroppedSeriesCount?: number;
};
const metricEvents = (analyticsUiMetricStore.__lotusAnalyticsUiMetricEvents ??= []);
const metricSamples = (analyticsUiMetricStore.__lotusAnalyticsUiMetricSamples ??=
  new Map<string, WorkbenchAnalyticsUiMetricSample>());
const attentionDedupeKeys =
  (analyticsUiMetricStore.__lotusAnalyticsUiAttentionDedupeKeys ??= new Set<string>());
const panelFailureCounts =
  (analyticsUiMetricStore.__lotusAnalyticsUiPanelFailureCounts ??= new Map<string, number>());

export function appendAnalyticsUiMetricEvent(
  event: WorkbenchAnalyticsUiMetricEvent,
): void {
  if (metricEvents.length >= MAX_DIAGNOSTIC_EVENTS) {
    metricEvents.splice(0, metricEvents.length - MAX_DIAGNOSTIC_EVENTS + 1);
  }
  metricEvents.push(event);

  const sampleKey = JSON.stringify({
    metric_name: event.metric_name,
    labels: event.labels,
  });
  const existing = metricSamples.get(sampleKey);
  if (existing) {
    existing.value += event.value;
    existing.sample_count += 1;
    const bucketCounts = existing.bucket_counts;
    if (bucketCounts) {
      ANALYTICS_UI_HISTOGRAM_BUCKETS.forEach((bucket, index) => {
        if (event.value <= bucket) {
          bucketCounts[index] += 1;
        }
      });
    }
    return;
  }

  if (metricSamples.size >= MAX_METRIC_SERIES) {
    analyticsUiMetricStore.__lotusAnalyticsUiDroppedSeriesCount =
      (analyticsUiMetricStore.__lotusAnalyticsUiDroppedSeriesCount ?? 0) + 1;
    return;
  }

  const metricType =
    event.metric_name === "lotus_workbench_panel_state_total" ||
    event.metric_name === "lotus_analytics_ui_attention_events_total"
      ? "counter"
      : "histogram";
  metricSamples.set(sampleKey, {
    metric_name: event.metric_name,
    metric_type: metricType,
    labels: { ...event.labels },
    value: event.value,
    sample_count: 1,
    bucket_counts:
      metricType === "histogram"
        ? ANALYTICS_UI_HISTOGRAM_BUCKETS.map((bucket) =>
            event.value <= bucket ? 1 : 0,
          )
        : undefined,
  });
}

export function getAnalyticsUiMetricEvents(): readonly WorkbenchAnalyticsUiMetricEvent[] {
  return metricEvents;
}

export function getAnalyticsUiMetricSamples(): WorkbenchAnalyticsUiMetricSample[] {
  return [...metricSamples.values()].map((sample) => ({
    ...sample,
    labels: { ...sample.labels },
    bucket_counts: sample.bucket_counts ? [...sample.bucket_counts] : undefined,
  }));
}

export function getAnalyticsUiDroppedSeriesCount(): number {
  return analyticsUiMetricStore.__lotusAnalyticsUiDroppedSeriesCount ?? 0;
}

export function rememberAnalyticsUiAttentionKey(key: string): boolean {
  if (attentionDedupeKeys.has(key)) {
    return false;
  }
  if (attentionDedupeKeys.size >= MAX_ATTENTION_DEDUPE_KEYS) {
    attentionDedupeKeys.clear();
  }
  attentionDedupeKeys.add(key);
  return true;
}

export function incrementAnalyticsUiPanelFailure(key: string): number {
  if (!panelFailureCounts.has(key) && panelFailureCounts.size >= MAX_PANEL_FAILURE_KEYS) {
    panelFailureCounts.delete(panelFailureCounts.keys().next().value ?? "");
  }
  const count = (panelFailureCounts.get(key) ?? 0) + 1;
  panelFailureCounts.set(key, count);
  return count;
}

export function clearAnalyticsUiPanelFailure(key: string): void {
  panelFailureCounts.delete(key);
}

export function resetAnalyticsUiMetricEvents(): void {
  metricEvents.length = 0;
  metricSamples.clear();
  attentionDedupeKeys.clear();
  panelFailureCounts.clear();
  analyticsUiMetricStore.__lotusAnalyticsUiDroppedSeriesCount = 0;
}
