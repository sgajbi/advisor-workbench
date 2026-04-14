import { WorkbenchSummaryMetricStrip } from "@/design-system";

export type PerformanceOutcomeStripItem = {
  key: string;
  label: string;
  value: string | number;
  support?: string;
  definition?: string;
  unavailable?: boolean;
};

export default function PerformanceOutcomeStrip({
  items,
  className,
}: {
  items: PerformanceOutcomeStripItem[];
  className?: string;
}) {
  return (
    <WorkbenchSummaryMetricStrip
      ariaLabel="Executive return strip"
      className={["performance-outcome-strip", className].filter(Boolean).join(" ")}
      itemClassName="performance-outcome-strip-item"
      items={items}
    />
  );
}
