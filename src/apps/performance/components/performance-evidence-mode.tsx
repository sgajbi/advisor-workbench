import type { PerformanceEvidenceView } from "@/features/workbench/types";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { ScreenStatePanel, WorkbenchDataGridFrame, WorkbenchStatusStrip } from "@/design-system";

export default function PerformanceEvidenceMode({
  capability,
  evidenceView,
}: {
  capability: WorkspaceCapability;
  evidenceView?: PerformanceEvidenceView | null;
}) {
  const title = "Evidence and Calculation Context";
  const subtitle =
    "Execution status, lineage artifacts, and calculation evidence for the selected performance view.";

  if (capability.state === "unavailable" || !evidenceView) {
    return (
      <WorkbenchDataGridFrame
        id="performance-evidence"
        title={title}
        subtitle={subtitle}
        className="performance-detail-panel-wide performance-analysis-module performance-evidence-module performance-evidence-module-unavailable performance-lotus-stage performance-lotus-stage-evidence"
      >
        <ScreenStatePanel
          kind={capability.state === "partial" ? "partial" : "unavailable"}
          title={capability.state === "partial" ? "Evidence partially available" : "Evidence unavailable"}
          body="Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract."
          hint={capability.reason}
          className="performance-evidence-state-panel"
          centered
        />
      </WorkbenchDataGridFrame>
    );
  }

  const calculations = evidenceView.calculations;
  const artifactCount = calculations.reduce(
    (total, calculation) => total + calculation.artifacts.length,
    0
  );
  const completedCalculationCount = calculations.filter(
    (calculation) =>
      calculation.execution_status === "complete" && calculation.lineage_status === "complete"
  ).length;
  const postureLabel =
    capability.state === "supported"
      ? "Supported"
      : capability.state === "partial"
        ? "Partial"
        : "Unavailable";

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
            label: "Evidence posture",
            value: postureLabel,
            support:
              evidenceView.reason ??
              capability.reason ??
              "Execution and lineage evidence can be reviewed for this portfolio.",
          },
          {
            label: "Calculations",
            value: String(calculations.length),
            support: `${completedCalculationCount} calculation(s) have complete execution and lineage evidence.`,
          },
          {
            label: "Lineage artifacts",
            value: String(artifactCount),
            support: "Gateway-owned artifact links are preserved from the certified evidence contract.",
          },
        ]}
      />
      <p className="muted performance-evidence-copy">
        Evidence review is contract-backed for this portfolio and retains execution, lineage, and
        artifact context without bypassing the gateway boundary.
      </p>
      {capability.reason ? <p className="muted performance-evidence-copy">{capability.reason}</p> : null}
      {calculations.length === 0 ? (
        <p className="muted performance-evidence-copy">
          No calculation evidence was returned for the current selection.
        </p>
      ) : (
        <div className="performance-evidence-calculation-list">
          {calculations.map((calculation) => (
            <section
              key={calculation.calculation_id}
              className="performance-evidence-calculation"
              aria-label={`Evidence for ${calculation.calculation_role}`}
            >
              <h3 className="ui-text-label">{calculation.calculation_role}</h3>
              <p className="muted performance-evidence-copy">
                Calculation ID: {calculation.calculation_id}
              </p>
              <p className="muted performance-evidence-copy">
                Execution {calculation.execution_status}, lineage {calculation.lineage_status}.
              </p>
              {calculation.stage_statuses.length > 0 ? (
                <ul className="performance-evidence-detail-list" aria-label="Evidence stages">
                  {calculation.stage_statuses.map((stage) => (
                    <li key={`${calculation.calculation_id}-${stage.stage_name}`}>
                      {stage.stage_name}: {stage.status}
                    </li>
                  ))}
                </ul>
              ) : null}
              {calculation.upstream_snapshots.length > 0 ? (
                <ul className="performance-evidence-detail-list" aria-label="Evidence sources">
                  {calculation.upstream_snapshots.map((snapshot) => (
                    <li
                      key={`${calculation.calculation_id}-${snapshot.upstream_endpoint}-${snapshot.source_identifier}`}
                    >
                      {snapshot.upstream_endpoint}: {snapshot.source_identifier} (
                      {snapshot.retrieval_status})
                    </li>
                  ))}
                </ul>
              ) : null}
              {calculation.artifacts.length > 0 ? (
                <ul className="performance-evidence-detail-list" aria-label="Evidence artifacts">
                  {calculation.artifacts.map((artifact) => (
                    <li key={`${calculation.calculation_id}-${artifact.artifact_name}`}>
                      <a href={artifact.url}>{artifact.artifact_name}</a>
                      {artifact.content_type ? ` (${artifact.content_type})` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted performance-evidence-copy">
                  No lineage artifacts are currently published for this calculation.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </WorkbenchDataGridFrame>
  );
}
