import Link from "next/link";

import {
  AnalyticsTable,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
  WorkbenchTaskDirectory,
} from "@/design-system";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { buildManageOverviewModel } from "@/features/workbench/manage-overview-model";
import { buildManageModeHref } from "@/features/workbench/manage-workspace-navigation";
import {
  businessStateLabel,
  formatBusinessExceptionTitle,
  formatBusinessOwner,
  formatBusinessTrigger,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

export default function ManageOverview({ data }: { data: ManageWorkspaceData }) {
  const model = buildManageOverviewModel(data);

  return (
    <SectionBlock
      title="Mandate Operating Posture"
      subtitle="Portfolio-manager view of mandate readiness, rebalance status, and items needing attention."
      className="manage-overview-panel"
      actions={
        <SemanticBadge tone={model.overviewPostureTone}>
          {model.overviewPostureLabel}
        </SemanticBadge>
      }
    >
      <div className="manage-decision-readiness-grid" aria-label="Operating posture">
        {model.postureCards.map((item) => (
          <div className={`manage-decision-readiness-card is-${item.tone}`} key={item.key}>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <span className="manage-status-icon" data-icon={item.icon} aria-hidden="true" />
            {item.progress === null ? null : (
              <div className="manage-readiness-meter" aria-hidden="true">
                <i style={{ width: `${item.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="manage-portfolio-value-band" aria-label="Portfolio operating summary">
        <div>
          <span>Portfolio Value ({model.portfolioSummary.currency})</span>
          <strong>{model.portfolioSummary.marketValue}</strong>
        </div>
        <dl>
          <div>
            <dt>Positions</dt>
            <dd>{model.portfolioSummary.positionCount}</dd>
          </div>
          <div>
            <dt>Cash Weight</dt>
            <dd>{model.portfolioSummary.cashWeight}</dd>
          </div>
          <div>
            <dt>Risk Profile</dt>
            <dd>{model.portfolioSummary.riskProfile}</dd>
          </div>
        </dl>
      </div>

      <div className="manage-overview-focus-grid">
        <div className="manage-overview-table-card manage-attention-card">
          <div className="manage-overview-card-header">
            <h3>Attention Required</h3>
            <span>
              {model.hasCompleteExceptionEvidence
                ? `${model.exceptionRows.length} items pending`
                : "Evidence unavailable"}
            </span>
          </div>
          <AnalyticsTable
            ariaLabel="Mandate attention items"
            scrollRegionLabel="Mandate attention worklist"
            density="compact"
            variant="observation"
            className="manage-overview-analytics-table"
            columns={[
              { key: "priority", label: "Priority" },
              { key: "observation", label: "Observation" },
              { key: "owner", label: "Owner" },
              { key: "age", label: "Age" },
              { key: "action", label: "Next step" },
            ]}
            rows={
              model.hasCompleteExceptionEvidence
                ? model.exceptionRows.slice(0, 4).map((row) => ({
                    key: row.key,
                    cells: [
                      <SemanticBadge key="priority" tone={toneForState(row.severity)}>
                        {businessStateLabel(row.severity)}
                      </SemanticBadge>,
                      formatBusinessExceptionTitle(row.title),
                      formatBusinessOwner(row.owner),
                      row.age,
                      <Link
                        key="action"
                        href={buildManageModeHref(
                          model.portfolioSummary.portfolioId,
                          "mandate"
                        )}
                      >
                        {row.nextAction}
                      </Link>,
                    ],
                  }))
                : []
            }
            emptyState={
              model.hasCompleteExceptionEvidence
                ? {
                    title: "No active attention items",
                    body: "The current source window reports no open mandate attention items.",
                  }
                : {
                    title: "Attention evidence unavailable",
                    body: "No zero-attention conclusion has been inferred. Open Mandate Health when source evidence is available.",
                  }
            }
          />
        </div>

        <div className="manage-overview-card manage-active-rebalance-card">
          <div className="manage-overview-card-header">
            <div>
              <h3>Active Rebalance</h3>
              <span>
                Wave: {model.activeRebalance.triggerType
                  ? formatBusinessTrigger(model.activeRebalance.triggerType)
                  : "Not reported"}
              </span>
            </div>
            <SemanticBadge tone={toneForState(model.activeRebalance.state)}>
              Stage: {businessStateLabel(model.activeRebalance.state)}
            </SemanticBadge>
          </div>
          <dl className="manage-rebalance-evidence">
            <div>
              <dt>Source readiness</dt>
              <dd>{businessStateLabel(model.activeRebalance.supportabilityState)}</dd>
            </div>
            <div>
              <dt>Source-reported issues</dt>
              <dd>{model.activeRebalance.issueCount}</dd>
            </div>
            <div>
              <dt>Support note</dt>
              <dd>{businessStateLabel(model.activeRebalance.supportabilityReason)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <SectionBlock
        title="Continue Portfolio Management"
        subtitle="Open the source-owned work area required for the next decision."
      >
        <WorkbenchTaskDirectory
          ariaLabel="Manage work areas"
          items={model.moduleItems.map((item) => ({
            key: item.key,
            title: item.title,
            description: item.description,
            status: item.metric,
            href: item.href,
            actionLabel: item.actionLabel,
          }))}
        />
      </SectionBlock>

      <div className="manage-overview-activity">
        <div className="manage-overview-card-header">
          <h3>Recent Operating Activity</h3>
        </div>
        <div className="manage-activity-timeline" role="list">
          {model.latestActivities.map((activity) => (
            <div className="manage-activity-row" role="listitem" key={activity.key}>
              <i aria-hidden="true" />
              <div>
                <strong>{activity.event}</strong>
                <span>{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {model.blockedSurfaces.length ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Some manage views need attention"
          body={`Areas to review: ${model.blockedSurfaces.join(", ")}.`}
        />
      ) : (
        <Text variant="secondary" className="muted">
          Detailed mandate, rebalance, construction, memory, review, and evidence views are
          available from the Manage navigation.
        </Text>
      )}
    </SectionBlock>
  );
}
