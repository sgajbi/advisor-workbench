"use client";

import { ActionListCard, Panel } from "@/design-system";

import type { PortfolioWorkflowAction } from "../../types";

export default function PortfolioActionsModule({
  actions,
}: {
  actions: PortfolioWorkflowAction[];
}) {
  return (
    <Panel className="portfolio-side-card">
      <ActionListCard
        title="Next Actions"
        subtitle="Recommended front-office follow-up for this book."
        items={actions.map((action, index) => ({
          key: `${action.title}-${index}`,
          sequence: action.sequence || index + 1,
          title: action.title,
          impact: action.impact,
          target: action.target,
          href: action.href,
          ctaLabel: action.cta_label,
          recommended: action.recommended,
        }))}
      />
    </Panel>
  );
}
