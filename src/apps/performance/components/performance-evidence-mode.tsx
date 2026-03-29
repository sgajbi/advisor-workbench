import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { Panel } from "@/design-system";

export default function PerformanceEvidenceMode({
  capability,
}: {
  capability: WorkspaceCapability;
}) {
  return (
    <Panel className="performance-detail-panel-wide">
      <div className="performance-section-heading">
        <h3>Evidence and Calculation Context</h3>
      </div>
      <p className="muted">
        This mode will hold execution status, lineage artifacts, and calculation evidence for the
        selected performance view.
      </p>
      <p className="muted">{capability.reason}</p>
    </Panel>
  );
}
