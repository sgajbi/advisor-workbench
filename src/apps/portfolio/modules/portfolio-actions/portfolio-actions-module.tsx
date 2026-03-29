"use client";

import { ActionListCard, Panel } from "@/design-system";

import type { PortfolioWorkflowAction } from "../../types";

export default function PortfolioActionsModule({
  actions,
}: {
  actions: PortfolioWorkflowAction[];
}) {
  return (
    <Panel className="portfolio-side-card workbench-rail-card portfolio-actions-card">
      <ActionListCard
        title="Next Actions"
        subtitle="Recommended front-office follow-up for this book."
        items={actions.map((action, index) => ({
          key: `${action.title}-${index}`,
          sequence: action.sequence || index + 1,
          title: action.title,
          impact: toCompactReason(action.impact),
          target: undefined,
          href: action.href,
          ctaLabel: action.cta_label,
          recommended: action.recommended,
        }))}
      />
    </Panel>
  );
}

function toCompactReason(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const firstSentence = value.split(".")[0]?.trim();
  return firstSentence ? `${firstSentence}.` : value;
}
