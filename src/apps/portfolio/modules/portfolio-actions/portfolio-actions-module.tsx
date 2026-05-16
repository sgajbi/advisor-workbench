"use client";

import { ActionListCard, WorkbenchRailCard } from "@/design-system";

import type { PortfolioWorkflowAction } from "../../types";

export default function PortfolioActionsModule({
  actions,
}: {
  actions: PortfolioWorkflowAction[];
}) {
  if (!actions.length) {
    return null;
  }

  return (
    <WorkbenchRailCard className="portfolio-side-card portfolio-actions-card">
      <ActionListCard
        title="Recommended Actions"
        subtitle="The next front-office checks before client use."
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
    </WorkbenchRailCard>
  );
}

function toCompactReason(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const firstSentence = value.split(".")[0]?.trim();
  return firstSentence ? `${firstSentence}.` : value;
}
