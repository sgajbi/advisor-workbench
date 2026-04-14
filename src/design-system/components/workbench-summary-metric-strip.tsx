import { cx } from "../utils/cx";
import Tooltip from "@mui/material/Tooltip";
import Text from "./text";

export type WorkbenchSummaryMetricStripItem = {
  key?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  support?: React.ReactNode;
  definition?: React.ReactNode;
  unavailable?: boolean;
  className?: string;
};

export default function WorkbenchSummaryMetricStrip({
  items,
  className,
  itemClassName,
  ariaLabel,
}: {
  items: WorkbenchSummaryMetricStripItem[];
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cx("workbench-summary-metric-strip", className)}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const card = (
          <div
            key={item.key ?? `${String(item.label)}-${index}`}
            className={cx(
              "workbench-summary-metric-card",
              item.unavailable && "workbench-summary-metric-card-unavailable",
              itemClassName,
              item.className
            )}
            title={typeof item.definition === "string" ? item.definition : undefined}
          >
            <Text variant="dataLabel" className="workbench-summary-metric-label">
              {item.label}
            </Text>
            <Text variant="metricValueM" className="workbench-summary-metric-value">
              {item.value}
            </Text>
            {item.support ? (
              <Text variant="bodySmall" className="workbench-summary-metric-support">
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
            <span>{card}</span>
          </Tooltip>
        );
      })}
    </div>
  );
}
