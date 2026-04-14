import { DeferredModulePlaceholder } from "@/design-system";

import PerformanceWorkspaceStageSurface from "./performance-workspace-stage-surface";

export default function PerformanceAnalysisModePlaceholder() {
  return (
    <PerformanceWorkspaceStageSurface
      intro={null}
      shellClassName="performance-analysis-shell"
    >
      <DeferredModulePlaceholder
        title="Loading analysis summary"
        message="Benchmark-relative attribution and contribution context are loading."
        className="performance-analysis-loading-summary"
      />
      <section className="performance-analysis-stage performance-lotus-stage performance-lotus-stage-analysis">
        <DeferredModulePlaceholder
          title="Loading attribution trend"
          message="Attribution path analysis is loading for the selected segment."
          className="performance-analysis-loading-panel"
        />
        <DeferredModulePlaceholder
          title="Loading attribution detail"
          message="Segment attribution detail is loading for the selected benchmark and horizon."
          className="performance-analysis-loading-panel"
        />
        <DeferredModulePlaceholder
          title="Loading contribution detail"
          message="Position and segment contribution detail are loading."
          className="performance-analysis-loading-panel"
        />
      </section>
    </PerformanceWorkspaceStageSurface>
  );
}
