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
}: {
  items: PerformanceOutcomeStripItem[];
}) {
  return (
    <WorkbenchSummaryMetricStrip
      ariaLabel="Executive return strip"
      className="performance-outcome-strip"
      itemClassName="performance-outcome-strip-item"
      items={items}
    />
  );
}
