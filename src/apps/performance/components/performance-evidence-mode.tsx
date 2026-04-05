import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { isSupportedCapability } from "@/shell/workspace-capabilities";
import { ScreenStatePanel, WorkbenchDataGridFrame, WorkbenchStatusStrip } from "@/design-system";

export default function PerformanceEvidenceMode({
  capability,
}: {
  capability: WorkspaceCapability;
}) {
  const title = "Evidence and Calculation Context";
  const subtitle =
    "Execution status, lineage artifacts, and calculation evidence for the selected performance view.";

  if (!isSupportedCapability(capability)) {
    return (
      <WorkbenchDataGridFrame
        id="performance-evidence"
        title={title}
        subtitle={subtitle}
        className="performance-detail-panel-wide performance-analysis-module performance-evidence-module performance-lotus-stage performance-lotus-stage-evidence"
      >
        <ScreenStatePanel
          kind={capability.state === "partial" ? "partial" : "unavailable"}
          title={capability.state === "partial" ? "Evidence partially available" : "Evidence unavailable"}
          body="Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract."
          hint={capability.reason}
          surface="analysis"
        />
      </WorkbenchDataGridFrame>
    );
  }

  return (
    <WorkbenchDataGridFrame
      id="performance-evidence"
      title={title}
      subtitle={subtitle}
      className="performance-detail-panel-wide performance-analysis-module performance-evidence-module performance-lotus-stage performance-lotus-stage-evidence"
    >
      <WorkbenchStatusStrip
        label="Evidence support status"
        className="performance-evidence-status-strip"
        gridClassName="performance-evidence-status-grid"
        itemClassName="performance-evidence-status-item"
        itemLabelClassName="performance-evidence-status-label"
        itemBodyClassName="performance-evidence-status-body"
        itemChipClassName="performance-evidence-status-chip"
        itemSupportClassName="performance-evidence-status-support"
        items={[
          {
            label: "Execution status",
            value: "Exposed",
            support: "Execution evidence is available through the current contract.",
          },
          {
            label: "Lineage artifacts",
            value: "Exposed",
            support: "Lineage context is available through the current contract.",
          },
          {
            label: "Calculation evidence",
            value: "Exposed",
            support: "Calculation evidence is available through the current contract.",
          },
        ]}
      />
      <p className="muted performance-evidence-copy">
        Evidence review is contract-backed for this portfolio and can be extended on this shared shell
        without changing the workspace mode structure.
      </p>
      {capability.reason ? <p className="muted performance-evidence-copy">{capability.reason}</p> : null}
    </WorkbenchDataGridFrame>
  );
}
