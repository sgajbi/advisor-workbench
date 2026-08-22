import {
  DefinitionList,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
  buildManageExceptionRows,
  filterManageExceptionRowsForMandate,
  formatBusinessBook,
  formatBusinessMandateType,
  getManageExceptionEvidencePosture,
  readStringFromResponse,
} from "@/features/workbench/manage-workspace-view-model";
import {
  buildManageModeHref,
  getManageModeDefinition,
  type ManageMode,
} from "@/features/workbench/manage-workspace-navigation";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { buildOutcomeReviewPanelModel } from "@/features/workbench/outcome-review-view-model";

export default function ManageContextRail({
  data,
  activeMode,
}: {
  data: ManageWorkspaceData;
  activeMode: ManageMode;
}) {
  const portfolio = data.portfolio.portfolio;
  const modeDefinition = getManageModeDefinition(activeMode);
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
  const nextActions =
    activeMode === "mandate"
      ? [
          ["Review Attention Items", "#mandate-attention-review"],
          ["Open Rebalance", buildManageModeHref(portfolio.portfolio_id, "waves")],
          ["Return to Manage Overview", buildManageModeHref(portfolio.portfolio_id, "overview")],
        ]
      : [
          ["Open Mandate Health", buildManageModeHref(portfolio.portfolio_id, "mandate")],
          ["Open Rebalance", buildManageModeHref(portfolio.portfolio_id, "waves")],
          ["Open Construction", buildManageModeHref(portfolio.portfolio_id, "construction")],
          ["Open Portfolio Memory", buildManageModeHref(portfolio.portfolio_id, "memory")],
          ["Open PM Quality", buildManageModeHref(portfolio.portfolio_id, "quality")],
          ["Open Outcome Reviews", buildManageModeHref(portfolio.portfolio_id, "reviews")],
          ["Open Evidence Pack", buildManageModeHref(portfolio.portfolio_id, "proof")],
        ];

  return (
    <div className="manage-context-rail">
      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Decision Support</Text>
          <strong>{modeDefinition.title}</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage portfolio context"
          items={[
            { label: "Client", value: portfolio.client_id },
            { label: "Booking Centre", value: portfolio.booking_center_code },
            {
              label: "Mandate Type",
              value: formatBusinessMandateType(
                readStringFromResponse(data.mandate, "mandate_type")
              ),
            },
            {
              label: "Portfolio Manager Book",
              value: formatBusinessBook(readStringFromResponse(data.mandate, "pm_book_id")),
            },
            {
              label: "Business Date",
              value: formatBusinessDateValue(data.portfolio.as_of_date, {
                nullDisplay: "Not confirmed",
              }),
            },
          ]}
        />
      </WorkbenchRailCard>

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
          <a href={`/portfolio?portfolioId=${encodeURIComponent(portfolio.portfolio_id)}`}>
            Return to Portfolio
          </a>
        </div>
      </WorkbenchRailCard>
    </div>
  );
}
