import {
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
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
      subtitle="Advisor-facing view of mandate readiness, rebalance status, and items needing attention."
      className="manage-overview-panel"
      actions={
        <SemanticBadge tone={model.overviewPostureTone}>
          {model.overviewPostureLabel}
        </SemanticBadge>
      }
    >
      <div className="manage-decision-readiness-grid" aria-label="Decision readiness">
        {model.readinessCards.map((item) => (
          <div className={`manage-decision-readiness-card is-${item.tone}`} key={item.key}>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <span className="manage-status-icon" data-icon={item.icon} aria-hidden="true" />
            <div className="manage-readiness-meter" aria-hidden="true">
              <i style={{ width: `${item.progress}%` }} />
            </div>
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
            <span>{model.exceptionRows.length} items pending</span>
          </div>
          <table className="manage-overview-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Observation</th>
                <th>Source</th>
                <th>Age</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {model.exceptionRows.length ? (
                model.exceptionRows.slice(0, 4).map((row) => (
                  <tr key={row.key}>
                    <td>
                      <SemanticBadge tone={toneForState(row.severity)}>
                        {businessStateLabel(row.severity)}
                      </SemanticBadge>
                    </td>
                    <td>{formatBusinessExceptionTitle(row.title)}</td>
                    <td>{formatBusinessOwner(row.owner)}</td>
                    <td>{row.age}</td>
                    <td>
                      <a href={buildManageModeHref(model.portfolioSummary.portfolioId, "mandate")}>
                        {row.nextAction}
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No active attention items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="manage-overview-card manage-active-rebalance-card">
          <div className="manage-overview-card-header">
            <div>
              <h3>Active Rebalance</h3>
              <span>Wave: {formatBusinessTrigger(model.activeRebalance.triggerType)}</span>
            </div>
            <SemanticBadge tone={toneForState(model.activeRebalance.state)}>
              Stage: {businessStateLabel(model.activeRebalance.state)}
            </SemanticBadge>
          </div>
          <div className="manage-wave-stepper" aria-label="Rebalance wave lifecycle">
            {model.activeRebalance.steps.map(({ step, isActive, isComplete }) => {
              return (
                <span
                  key={step}
                  className={[
                    isComplete ? "manage-wave-step-complete" : "",
                    isActive ? "manage-wave-step-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {step}
                </span>
              );
            })}
          </div>
          <div className="manage-rebalance-blocker">
            <span className="manage-status-icon" data-icon="info" aria-hidden="true" />
            <p>
              {model.activeRebalance.approvalReadiness === "Blocked"
                ? "Blocker: approval pending exception resolution."
                : "Ready for approval review."}
            </p>
          </div>
        </div>
      </div>

      <div className="manage-module-grid" aria-label="Manage work areas">
        {model.moduleItems.map((item) => (
          <a className="manage-module-card" href={item.href} key={item.key}>
            <span className="manage-module-icon" data-icon={item.icon} aria-hidden="true" />
            <strong>{item.title}</strong>
            <span className="manage-module-metric">{item.metric}</span>
          </a>
        ))}
      </div>

      <div className="manage-overview-activity">
        <div className="manage-overview-card-header">
          <h3>Audit Log &amp; Timeline</h3>
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
