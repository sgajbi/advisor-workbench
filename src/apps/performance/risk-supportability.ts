import type { PerformanceRiskViewModel } from "./risk-workspace-view-model";

type RiskSupportabilityItem = PerformanceRiskViewModel["supportability"][number];

export function isDeferredRiskSupportabilityItem(item: RiskSupportabilityItem) {
  return (
    item.state === "ready" &&
    typeof item.reason === "string" &&
    /on demand|drill[- ]?down|deferred/i.test(item.reason)
  );
}

export function isDeferredRiskReviewNote(note: string) {
  return /on demand|drill[- ]?down|deferred/i.test(note);
}

export function partitionRiskSupportability(items: RiskSupportabilityItem[]) {
  const readyItems: RiskSupportabilityItem[] = [];
  const deferredItems: RiskSupportabilityItem[] = [];
  const reviewItems: RiskSupportabilityItem[] = [];

  for (const item of items) {
    if (isDeferredRiskSupportabilityItem(item)) {
      deferredItems.push(item);
      continue;
    }
    if (item.state === "ready") {
      readyItems.push(item);
      continue;
    }
    reviewItems.push(item);
  }

  return { readyItems, deferredItems, reviewItems };
}
