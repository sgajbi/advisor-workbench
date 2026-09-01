import { cx } from "../utils/cx";
import Tooltip from "@mui/material/Tooltip";
import Text from "./text";
import styles from "./workbench-summary-metric-strip.module.css";

export type WorkbenchSummaryMetricStripItem = {
  key?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  support?: React.ReactNode;
  definition?: React.ReactNode;
  unavailable?: boolean;
  className?: string;
  valueClassName?: string;
};

export default function WorkbenchSummaryMetricStrip({
  items,
  className,
  itemClassName,
  ariaLabel,
  layout = "responsive",
}: {
  items: WorkbenchSummaryMetricStripItem[];
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
  layout?: "responsive" | "custom";
}) {
  return (
    <div
      className={cx(
        "workbench-summary-metric-strip",
        layout === "responsive" && styles.strip,
        className,
      )}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const card = (
          <div
            key={item.key ?? `${String(item.label)}-${index}`}
            className={cx(
              "workbench-summary-metric-card",
              styles.card,
              item.unavailable && "workbench-summary-metric-card-unavailable",
              itemClassName,
              item.className
            )}
            title={typeof item.definition === "string" ? item.definition : undefined}
          >
            <Text
              variant="dataLabel"
              className={cx("workbench-summary-metric-label", styles.label)}
            >
              {item.label}
            </Text>
            <Text
              variant="metricValueM"
              className={cx(
                "workbench-summary-metric-value",
                styles.value,
                item.valueClassName,
              )}
            >
              {item.value}
            </Text>
            {item.support ? (
              <Text
                variant="bodySmall"
                className={cx("workbench-summary-metric-support", styles.support)}
              >
                {item.support}
              </Text>
            ) : null}
          </div>
        );

        if (!item.definition) {
          return card;
        }

        return (
          <Tooltip key={item.key ?? `${String(item.label)}-${index}`} title={item.definition} arrow>
            <span className={cx("workbench-summary-metric-item", styles.item)}>{card}</span>
          </Tooltip>
        );
      })}
    </div>
  );
}
