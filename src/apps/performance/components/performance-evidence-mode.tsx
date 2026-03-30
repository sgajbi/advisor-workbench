import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { isSupportedCapability } from "@/shell/workspace-capabilities";
import { Panel } from "@/design-system";

import PerformanceCapabilityNotice from "./performance-capability-notice";

export default function PerformanceEvidenceMode({
  capability,
}: {
  capability: WorkspaceCapability;
}) {
  if (!isSupportedCapability(capability)) {
    return (
      <PerformanceCapabilityNotice
        capability={capability}
        partialTitle="Evidence partially available"
        unavailableTitle="Evidence unavailable"
        body="Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract."
        hint={capability.reason}
      />
    );
  }

  return (
    <Panel className="performance-detail-panel-wide">
      <div className="performance-section-heading">
        <h3>Evidence and Calculation Context</h3>
      </div>
      <p className="muted">
        This mode will hold execution status, lineage artifacts, and calculation evidence for the
        selected performance view.
      </p>
      {capability.reason ? <p className="muted">{capability.reason}</p> : null}
    </Panel>
  );
}
