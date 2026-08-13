import { WorkbenchChoiceGroup, WorkbenchSummaryToolbar } from "@/design-system";

import type {
  PerformanceHorizonBasisView,
  PerformanceHorizonTableView,
  PerformanceHorizonVisualMode,
} from "./performance-analytics-table-models";
import choiceStyles from "./performance-choice-groups.module.css";

type PerformanceHorizonComparisonToolbarProps = {
  tableView: PerformanceHorizonTableView;
  basisView: PerformanceHorizonBasisView;
  visualMode: PerformanceHorizonVisualMode;
  hasRelativeVisual: boolean;
  showVisualMode?: boolean;
  onTableViewChange: (value: PerformanceHorizonTableView) => void;
  onBasisViewChange: (value: PerformanceHorizonBasisView) => void;
  onVisualModeChange: (value: PerformanceHorizonVisualMode) => void;
};

export default function PerformanceHorizonComparisonToolbar({
  tableView,
  basisView,
  visualMode,
  hasRelativeVisual,
  showVisualMode = true,
  onTableViewChange,
  onBasisViewChange,
  onVisualModeChange,
}: PerformanceHorizonComparisonToolbarProps) {
  return (
    <WorkbenchSummaryToolbar className="performance-horizon-toolbar">
      <WorkbenchChoiceGroup
        ariaLabel="Horizon table view"
        className={choiceStyles.horizon}
        density="compact"
        value={tableView}
        onChange={onTableViewChange}
        options={[
          { key: "combined", label: "Combined" },
          { key: "returns", label: "Returns" },
          { key: "economics", label: "Economics" },
        ]}
      />
      <WorkbenchChoiceGroup
        ariaLabel="Horizon basis view"
        className={choiceStyles.horizon}
        density="compact"
        value={basisView}
        onChange={onBasisViewChange}
        options={[
          { key: "both", label: "Both" },
          { key: "net", label: "Net" },
          { key: "gross", label: "Gross" },
        ]}
      />
      {showVisualMode ? (
        <WorkbenchChoiceGroup
          ariaLabel="Horizon visual mode"
          className={choiceStyles.horizon}
          density="compact"
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
      ) : null}
    </WorkbenchSummaryToolbar>
  );
}
