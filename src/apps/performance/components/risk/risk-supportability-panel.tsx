import { Panel, SemanticBadge } from "@/design-system";

import type { PerformanceRiskViewModel } from "../../risk-workspace-view-model";
import {
  isDeferredRiskReviewNote,
  partitionRiskSupportability,
} from "../../risk-supportability";
import PerformanceSectionHeading from "../performance-section-heading";
import PerformanceSupportabilitySummary from "../performance-supportability-summary";

function toBadgeTone(state: PerformanceRiskViewModel["supportability"][number]["state"]) {
  if (state === "ready") {
    return "success";
  }
  if (state === "partial" || state === "blocked") {
    return "warn";
  }
  return "danger";
}

function getSupportabilityLabel(
  item: PerformanceRiskViewModel["supportability"][number]
) {
  if (item.label !== "Risk Service") {
    return item.label;
  }

  if (item.key.startsWith("summary:")) {
    return "Risk Summary";
  }
  if (item.key.startsWith("drawdown:")) {
    return "Drawdown";
  }
  if (item.key.startsWith("rolling:")) {
    return "Rolling Stability";
  }
  if (item.key.startsWith("concentration:")) {
    return "Concentration";
  }
  if (item.key.startsWith("attribution:")) {
    return "Risk Attribution";
  }

  return item.label;
}

export default function RiskSupportabilityPanel({
  viewModel,
}: {
  viewModel: PerformanceRiskViewModel;
}) {
  const { readyItems, deferredItems, reviewItems } = partitionRiskSupportability(
    viewModel.supportability
  );
  const reviewNotes = Array.from(
    new Set([
      ...viewModel.partialFailures,
      ...viewModel.warnings.filter((warning) => !isDeferredRiskReviewNote(warning)),
    ])
  ).slice(0, 4);

  return (
    <section aria-label="Risk coverage and review notes">
      <Panel className="performance-risk-supportability-panel">
        <PerformanceSectionHeading
          className="performance-risk-supportability-panel-heading"
          kicker="Review posture"
          title="Coverage and review notes"
          description="Check what remains partial before treating the risk surface as decision-complete."
        />

        <PerformanceSupportabilitySummary
          className="performance-risk-supportability-summary"
          items={[
            { label: "Ready modules", value: readyItems.length },
            { label: "Deferred detail", value: deferredItems.length },
            { label: "Review items", value: reviewItems.length + reviewNotes.length },
          ]}
        />

        {reviewItems.length ? (
          <div className="performance-risk-supportability-grid">
            {reviewItems.map((item) => (
              <div key={item.key} className="performance-risk-supportability-row">
                <span className="performance-risk-supportability-label">
                  {getSupportabilityLabel(item)}
                </span>
                <SemanticBadge tone={toBadgeTone(item.state)}>{item.state}</SemanticBadge>
                <span className="performance-risk-supportability-detail">
                  {item.reason ?? "Review before relying on this module."}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="performance-risk-supportability-all-ready">
            All governed risk modules are ready for the selected context.
          </div>
        )}

        {deferredItems.length ? (
          <div className="performance-risk-supportability-notes">
            {deferredItems.map((item) => (
              <div key={item.key} className="performance-risk-supportability-note">
                {getSupportabilityLabel(item)} loads on demand. {item.reason ?? ""}
              </div>
            ))}
          </div>
        ) : null}

        {reviewNotes.length ? (
          <div className="performance-risk-supportability-notes">
            {reviewNotes.map((note) => (
              <div key={note} className="performance-risk-supportability-note">
                {note}
              </div>
            ))}
          </div>
        ) : null}
      </Panel>
    </section>
  );
}
