import { WorkbenchSegmentedControl, WorkbenchSummaryToolbar } from "@/design-system";

import type {
  PerformanceHorizonBasisView,
  PerformanceHorizonTableView,
  PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";

type PerformanceHorizonComparisonToolbarProps = {
  tableView: PerformanceHorizonTableView;
  basisView: PerformanceHorizonBasisView;
  visualMode: PerformanceHorizonVisualMode;
  hasRelativeVisual: boolean;
  onTableViewChange: (value: PerformanceHorizonTableView) => void;
  onBasisViewChange: (value: PerformanceHorizonBasisView) => void;
  onVisualModeChange: (value: PerformanceHorizonVisualMode) => void;
};

export default function PerformanceHorizonComparisonToolbar({
  tableView,
  basisView,
  visualMode,
  hasRelativeVisual,
  onTableViewChange,
  onBasisViewChange,
  onVisualModeChange,
}: PerformanceHorizonComparisonToolbarProps) {
  return (
    <WorkbenchSummaryToolbar className="performance-horizon-toolbar">
      <WorkbenchSegmentedControl
        ariaLabel="Horizon table view"
        className="performance-horizon-table-view"
        value={tableView}
        onChange={onTableViewChange}
        options={[
          { key: "combined", label: "Combined" },
          { key: "returns", label: "Returns" },
          { key: "economics", label: "Economics" },
        ]}
      />
      <WorkbenchSegmentedControl
        ariaLabel="Horizon basis view"
        className="performance-horizon-basis-view"
        value={basisView}
        onChange={onBasisViewChange}
        options={[
          { key: "both", label: "Both" },
          { key: "net", label: "Net" },
          { key: "gross", label: "Gross" },
        ]}
      />
      <WorkbenchSegmentedControl
        ariaLabel="Horizon visual mode"
        className="performance-horizon-visual-mode"
        value={visualMode}
        onChange={onVisualModeChange}
        options={[
          { key: "absolute", label: "Absolute" },
          {
            key: "relative",
            label: "Relative",
            disabled: !hasRelativeVisual,
            title: hasRelativeVisual
              ? undefined
              : "Relative view requires active return observations.",
          },
          { key: "basis", label: "Basis" },
        ]}
      />
    </WorkbenchSummaryToolbar>
  );
}
