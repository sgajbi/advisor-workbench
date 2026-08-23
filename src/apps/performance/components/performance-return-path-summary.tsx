import Tooltip from "@mui/material/Tooltip";

import styles from "./performance-return-path-summary.module.css";

type PerformanceReturnPathSummaryItem = {
  key: string;
  label: string;
  value: string;
  definition?: string;
};

export default function PerformanceReturnPathSummary({
  items,
}: {
  items: PerformanceReturnPathSummaryItem[];
}) {
  return (
    <section
      className={styles.summary}
      aria-label="Return decision readout"
    >
      {items.map((item) => {
        const card = (
          <div
            key={item.key}
            className={styles.item}
            title={item.definition}
            data-return-metric={item.key}
          >
            <span className={styles.label}>{item.label}</span>
            <strong className={styles.value}>{item.value}</strong>
          </div>
        );

        if (!item.definition) {
          return card;
        }

        return (
          <Tooltip key={item.key} title={item.definition} arrow>
            <span className={styles.tooltipItem}>{card}</span>
          </Tooltip>
        );
      })}
    </section>
  );
}
