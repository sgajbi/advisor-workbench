import {
  DefinitionList,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import type { PortfolioReviewContext } from "@/apps/portfolio/portfolio-screen-navigation";
import { buildReviewContextHref } from "@/shell/review-context";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
  buildManageExceptionRows,
  filterManageExceptionRowsForMandate,
  getManageExceptionEvidencePosture,
} from "@/features/workbench/manage-workspace-view-model";
import {
  buildManageModeHref,
  type ManageMode,
} from "@/features/workbench/manage-workspace-navigation";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";

export default function ManageContextRail({
  data,
  activeMode,
  reviewContext,
}: {
  data: ManageWorkspaceData;
  activeMode: ManageMode;
  reviewContext: PortfolioReviewContext;
}) {
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const attentionRows = filterManageExceptionRowsForMandate(
    buildManageExceptionRows(data.commandCenterExceptions),
    commandModel.mandateId
  );
  const attentionCount = attentionRows.length;
  const exceptionEvidencePosture = getManageExceptionEvidencePosture(
    data.commandCenterExceptions,
    data.commandCenterExceptionsError
  );
  const waveModel = buildDpmWaveCommandCenterModel({ waveList: data.waves });
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const hasEvidence = reviewModel.items.some((item) => item.proofPackId !== "N/A");
  const hasTraceableMonitoring =
    commandModel.correlationId !== "N/A" || commandModel.sourceRunId !== "N/A";
  const portfolioReturnHref = buildReviewContextHref(
    "/portfolio",
    reviewContext,
  );
  const nextActions =
    activeMode === "mandate"
      ? [
          ["Review Attention Items", "#mandate-attention-review"],
          ["Open Rebalance", buildManageModeHref(reviewContext, "waves")],
          ["Return to Manage Overview", buildManageModeHref(reviewContext, "overview")],
        ]
      : [
          ["Open Mandate Health", buildManageModeHref(reviewContext, "mandate")],
          ["Open Rebalance", buildManageModeHref(reviewContext, "waves")],
          ["Open Construction", buildManageModeHref(reviewContext, "construction")],
          ["Open Portfolio Memory", buildManageModeHref(reviewContext, "memory")],
          ["Open PM Quality", buildManageModeHref(reviewContext, "quality")],
          ["Open Outcome Reviews", buildManageModeHref(reviewContext, "reviews")],
          ["Open Evidence Pack", buildManageModeHref(reviewContext, "proof")],
        ];

  return (
    <div className="manage-context-rail">
      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Review Posture</Text>
          <strong>
            {exceptionEvidencePosture === "unavailable"
              ? "Attention evidence unavailable"
              : exceptionEvidencePosture === "partial"
                ? "Attention review continues across source views"
              : attentionCount
              ? "Needs portfolio manager attention"
              : businessStateLabel(commandModel.mandateHealthState)}
          </strong>
        </div>
        <DefinitionList
          ariaLabel="Manage review posture"
          items={[
            {
              label: "Attention Items",
              value:
                exceptionEvidencePosture === "unavailable"
                  ? "Not available"
                  : exceptionEvidencePosture === "partial"
                    ? `${attentionCount} shown; more available`
                    : `${attentionCount} open`,
            },
            {
              label: "Data Readiness",
              value: businessStateLabel(commandModel.dataCompletenessState),
            },
            { label: "Rebalance", value: businessStateLabel(waveModel.selectedWaveState) },
            { label: "Evidence", value: hasEvidence ? "Available" : "Not requested" },
            {
              label: "Evidence Trail",
              value: hasTraceableMonitoring ? "Traceable" : "Not available",
            },
            {
              label: "Monitoring",
              value: businessStateLabel(commandModel.latestMonitoringRunStatus),
            },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Next Actions</Text>
          <strong>Advisor workflow</strong>
        </div>
        <div className="manage-rail-actions">
          {nextActions.map(([label, href]) => (
            <a href={href} key={label}>
              {label}
            </a>
          ))}
          <a href={portfolioReturnHref}>
            Return to Portfolio
          </a>
        </div>
      </WorkbenchRailCard>
    </div>
  );
}
