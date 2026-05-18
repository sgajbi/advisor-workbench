import {
  DefinitionList,
  Text,
  WorkbenchRailCard,
} from "@/design-system";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessLastReviewed,
  businessStateLabel,
  buildManageExceptionRows,
  formatBusinessBook,
  formatBusinessMandateType,
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
  const attentionRows = buildManageExceptionRows(data.commandCenterExceptions);
  const attentionCount = attentionRows.length || commandModel.activeExceptionCount;
  const waveModel = buildDpmWaveCommandCenterModel({ waveList: data.waves });
  const reviewModel = buildOutcomeReviewPanelModel(data.outcomeReviews);
  const hasEvidence = reviewModel.items.some((item) => item.proofPackId !== "N/A");
  const nextActions =
    activeMode === "mandate"
      ? [
          ["Review Recommended Actions", "#mandate-recommended-actions"],
          ["Review Attention Items", buildManageModeHref(portfolio.portfolio_id, "mandate")],
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
            { label: "As Of", value: data.portfolio.as_of_date },
          ]}
        />
      </WorkbenchRailCard>

      <WorkbenchRailCard>
        <div className="manage-context-rail-header">
          <Text variant="label">Review Posture</Text>
          <strong>{attentionCount ? "Needs advisor attention" : "Ready for review"}</strong>
        </div>
        <DefinitionList
          ariaLabel="Manage review posture"
          items={[
            { label: "Attention Items", value: `${attentionCount} open` },
            {
              label: "Data Readiness",
              value: businessStateLabel(commandModel.dataCompletenessState),
            },
            { label: "Rebalance", value: businessStateLabel(waveModel.selectedWaveState) },
            { label: "Evidence", value: hasEvidence ? "Available" : "Not requested" },
            { label: "Audit Trail", value: "Available" },
            {
              label: "Last Refreshed",
              value: businessLastReviewed(commandModel.latestMonitoringRunStatus),
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
