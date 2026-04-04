import { Panel } from "@/design-system";

import { buildPerformanceAdvisorBriefViewModel } from "../advisor-brief-view-model";
import { formatDate } from "../formatters";

import AdvisorBriefHeader from "./advisor-brief/advisor-brief-header";
import AdvisorBriefToolbar from "./advisor-brief/advisor-brief-toolbar";
import AuditMetadataDrawer from "./advisor-brief/audit-metadata-drawer";
import MetricEvidenceCard from "./advisor-brief/metric-evidence-card";
import SupportabilityPanel from "./advisor-brief/supportability-panel";
import TalkingPointCard from "./advisor-brief/talking-point-card";
import type { PerformanceAdvisorBriefModeProps } from "./performance-workspace-types";

export default function PerformanceAdvisorBriefMode({
  workspace,
  capabilities,
  period,
  detailBasis,
  contributionDimension,
  attributionDimension,
  chartFrequency,
  benchmark,
  isDetailsPending,
  onSelectMode,
}: PerformanceAdvisorBriefModeProps) {
  const brief = buildPerformanceAdvisorBriefViewModel({
    workspace,
    capabilities,
    period,
    detailBasis,
    contributionDimension,
    attributionDimension,
    chartFrequency,
    benchmark,
    isDetailsPending,
  });

  return (
    <section className="performance-advisor-brief-stage" aria-label="Advisor Brief">
      <Panel className="performance-advisor-brief-shell">
        <AdvisorBriefHeader
          title="Performance > Advisor Brief"
          summary={brief.summary}
          portfolioId={workspace.portfolio.portfolio_id}
          benchmarkLabel={workspace.benchmark_code ?? "Unassigned"}
          asOfDate={formatDate(workspace.as_of_date)}
          period={period}
        />

        <AdvisorBriefToolbar
          status={brief.status}
          noteText={toAdvisorNoteCopy(brief)}
          onRefresh={() => onSelectMode("advisor")}
        />

        <div className="performance-advisor-brief-body-grid">
          <section
            className="performance-advisor-brief-main-column"
            aria-label="Advisor brief narrative"
          >
            <section
              className="performance-advisor-brief-section"
              aria-label="Client Talking Points"
            >
              <h3>Client Talking Points</h3>
              <div className="performance-advisor-brief-item-list">
                {brief.talkingPoints.length ? (
                  brief.talkingPoints.map((item) => (
                    <TalkingPointCard
                      key={item.headline}
                      item={item}
                      onSelectMode={onSelectMode}
                    />
                  ))
                ) : (
                  <div className="performance-advisor-brief-empty-note">
                    No client talking points are available for this selection.
                  </div>
                )}
              </div>
            </section>

            <section
              className="performance-advisor-brief-section"
              aria-label="Recommended Actions"
            >
              <h3>Recommended Actions</h3>
              <div className="performance-advisor-brief-action-list">
                {brief.recommendedActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="performance-advisor-brief-action"
                    onClick={() => onSelectMode(action.targetMode)}
                  >
                    <span>{action.label}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </section>

            <section
              className="performance-advisor-brief-section"
              aria-label="Risks and Exceptions"
            >
              <h3>Risks / Exceptions</h3>
              {brief.risksAndExceptions.length ? (
                <div className="performance-advisor-brief-item-list">
                  {brief.risksAndExceptions.map((item) => (
                    <TalkingPointCard
                      key={item.headline}
                      item={item}
                      onSelectMode={onSelectMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="performance-advisor-brief-empty-note">
                  No material supportability exceptions are flagged in the current source bundle.
                </div>
              )}
            </section>
          </section>

          <aside
            className="performance-advisor-brief-side-column"
            aria-label="Advisor brief source evidence"
          >
            <section
              className="performance-advisor-brief-section"
              aria-label="Source Metrics"
            >
              <h3>Source Metrics</h3>
              <div className="performance-advisor-brief-metric-list">
                {brief.sourceMetrics.map((metric) => (
                  <MetricEvidenceCard
                    key={metric.label}
                    metric={metric}
                    onSelectMode={onSelectMode}
                  />
                ))}
              </div>
            </section>

            <section
              className="performance-advisor-brief-section"
              aria-label="Drill-down Actions"
            >
              <h3>Drill-down Actions</h3>
              <div className="performance-advisor-brief-action-list">
                {brief.recommendedActions.map((action) => (
                  <button
                    key={`source-${action.label}`}
                    type="button"
                    className="performance-advisor-brief-action"
                    onClick={() => onSelectMode(action.targetMode)}
                  >
                    <span>{action.label}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </section>

            <SupportabilityPanel items={brief.supportability} />
          </aside>
        </div>

        <AuditMetadataDrawer audit={brief.audit} />
      </Panel>
    </section>
  );
}

function toAdvisorNoteCopy(brief: ReturnType<typeof buildPerformanceAdvisorBriefViewModel>) {
  const sections = [
    brief.summary,
    "",
    "Client Talking Points",
    ...brief.talkingPoints.map((item) => `- ${item.headline} ${item.detail}`),
    "",
    "Recommended Actions",
    ...brief.recommendedActions.map((action) => `- ${action.label}`),
    "",
    "Risks / Exceptions",
    ...(brief.risksAndExceptions.length
      ? brief.risksAndExceptions.map((item) => `- ${item.headline} ${item.detail}`)
      : ["- No material supportability exceptions are flagged."]),
  ];

  return sections.join("\n");
}
