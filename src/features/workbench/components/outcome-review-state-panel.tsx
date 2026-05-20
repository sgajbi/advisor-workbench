"use client";

import { ScreenStatePanel } from "@/design-system";
import {
  buildOutcomeReviewStatePanelCopy,
  shouldShowOutcomeReviewStatePanel,
} from "@/features/workbench/outcome-review-panel-helpers";
import type { OutcomeReviewPanelState } from "@/features/workbench/outcome-review-view-model";

type Props = {
  portfolioId: string;
  state: OutcomeReviewPanelState;
  errorMessage?: string | null;
};

export default function OutcomeReviewStatePanel({
  portfolioId,
  state,
  errorMessage,
}: Props) {
  if (!shouldShowOutcomeReviewStatePanel(state, errorMessage ?? null)) {
    return null;
  }

  const stateCopy = buildOutcomeReviewStatePanelCopy(state, portfolioId);

  return (
    <ScreenStatePanel
      kind={errorMessage ? "partial" : stateCopy.kind}
      surface="portfolio"
      title={errorMessage ? "Outcome review is unavailable" : stateCopy.title}
      body={errorMessage ?? stateCopy.body}
    />
  );
}
