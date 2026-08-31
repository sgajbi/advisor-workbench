"use client";

import { ScreenStatePanel, Text } from "@/design-system";
import type { PortfolioMemoryRecommendedAction } from "@/features/workbench/portfolio-memory-view-model";
import styles from "@/features/workbench/components/portfolio-memory-panel.module.css";

type Props = {
  actions: PortfolioMemoryRecommendedAction[];
};

export default function PortfolioMemoryRecommendedActionsRail({ actions }: Props) {
  return (
    <aside className={styles.actionsCard}>
      <Text as="h3" variant="subsectionTitle">
        Recommended Actions
      </Text>
      {actions.length > 0 ? (
        <div className={styles.actionStack} role="list">
          {actions.map((action) => (
            <div className={styles.actionItem} key={action.key} role="listitem">
              <span
                className={`material-symbols-outlined ${styles.actionIcon}`}
                aria-hidden="true"
              >
                {action.icon}
              </span>
              <strong className={styles.actionTitle}>{action.title}</strong>
              <small className={styles.actionBody}>{action.body}</small>
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
