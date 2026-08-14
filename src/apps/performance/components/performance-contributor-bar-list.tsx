import type { PerformanceContributorRankedItem } from "./performance-summary-driver-helpers";
import { cx } from "@/design-system/utils/cx";

import styles from "./performance-contributor-bar-list.module.css";

export default function PerformanceContributorBarList({
  title,
  ariaLabel,
  items,
  emptyBody,
}: {
  title: string;
  ariaLabel: string;
  items: PerformanceContributorRankedItem[];
  emptyBody: string;
}) {
  return (
    <section className={styles.root} aria-label={ariaLabel}>
      <div className={styles.header}>
        <strong className={styles.title}>{title}</strong>
      </div>
      {items.length ? (
        <div className={styles.bars}>
          {items.map((item) => (
            <div key={item.key} className={styles.row}>
              <div className={styles.copy}>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </div>
              <div className={styles.measure}>
                <span>{item.value}</span>
                <div className={styles.track} aria-hidden="true">
                  <div
                    className={cx(
                      styles.fill,
                      item.tone === "positive" ? styles.fillPositive : styles.fillNegative,
                    )}
                    style={{ width: `${Math.max(item.magnitudePct, 4)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{emptyBody}</p>
      )}
    </section>
  );
}
