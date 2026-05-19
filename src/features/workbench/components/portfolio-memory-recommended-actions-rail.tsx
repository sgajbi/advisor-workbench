"use client";

import { ScreenStatePanel, Text } from "@/design-system";
import type { PortfolioMemoryRecommendedAction } from "@/features/workbench/portfolio-memory-view-model";

type Props = {
  actions: PortfolioMemoryRecommendedAction[];
};

export default function PortfolioMemoryRecommendedActionsRail({ actions }: Props) {
  return (
    <aside className="portfolio-memory-actions-card">
      <Text as="h3" variant="subsectionTitle">
        Recommended Actions
      </Text>
      {actions.length > 0 ? (
        <div className="portfolio-memory-action-stack" role="list">
          {actions.map((action) => (
            <div className="portfolio-memory-action-item" key={action.key} role="listitem">
              <span className="material-symbols-outlined" aria-hidden="true">
                {action.icon}
              </span>
              <strong>{action.title}</strong>
              <small>{action.body}</small>
            </div>
          ))}
        </div>
      ) : (
        <ScreenStatePanel
          kind="empty"
          surface="portfolio"
          title="No recommended review steps returned"
          body="No portfolio memory review guidance is currently available."
        />
      )}
    </aside>
  );
}
