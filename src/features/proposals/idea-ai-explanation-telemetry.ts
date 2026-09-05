import { recordAnalyticsUiPanelState } from "@/features/analytics-observability/metrics";

import { ADVISOR_RATIONALE_DRAFT_PURPOSE } from "./idea-ai-explanation-contract";

const CONTEXT = {
  route: "workbench.recommendations",
  panel: "idea-candidate-explanation",
  operation: `idea.candidate.ai-explanation.${ADVISOR_RATIONALE_DRAFT_PURPOSE}`,
} as const;

export function recordIdeaExplanationOpened() {
  return recordAnalyticsUiPanelState({
    context: CONTEXT,
    state: "loading",
    reason: "none",
  });
}

export function recordIdeaExplanationServed(disposition: string) {
  return recordAnalyticsUiPanelState({
    context: CONTEXT,
    state: "ready",
    reason: disposition,
  });
}

export function recordIdeaExplanationUnavailable(disposition: string) {
  return recordAnalyticsUiPanelState({
    context: CONTEXT,
    state: "partial",
    reason: disposition,
  });
}

export function recordIdeaExplanationFailed() {
  return recordAnalyticsUiPanelState({
    context: CONTEXT,
    state: "error",
    reason: "request_failed",
  });
}
