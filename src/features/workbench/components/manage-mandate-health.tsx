import { ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import {
  businessLastReviewed,
  businessStateLabel,
  buildManageExceptionRows,
  buildMandateHealthDimensionRows,
  buildMandateRecommendedActions,
  formatBusinessExceptionTitle,
  formatBusinessMandateType,
  formatBusinessOwner,
  formatBusinessReason,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

import type {
  MandateHealthRow,
  MandateRecommendedActionRow,
  ManageExceptionRow,
} from "@/features/workbench/manage-workspace-view-model";

import type { ManageWorkspaceData } from "../manage-workspace";

type Props = {
  data: ManageWorkspaceData;
};

export default function ManageMandateHealth({ data }: Props) {
  const commandModel = buildDpmCommandCenterPanelModel({
    commandCenter: data.commandCenter,
    exceptions: data.commandCenterExceptions,
    mandate: data.mandate,
    mandateHealth: data.mandateHealth,
  });
  const exceptionRows = buildManageExceptionRows(data.commandCenterExceptions);
  const healthRows = buildMandateHealthDimensionRows(commandModel);
  const actionRows = buildMandateRecommendedActions(commandModel, exceptionRows);
  const mandateType = formatBusinessMandateType(
    readStringFromResponse(data.mandate, "mandate_type") ??
      readStringFromResponse(data.mandate, "type")
  );
  const riskProfile =
    readStringFromResponse(data.mandate, "risk_profile") ??
    readStringFromResponse(data.mandate, "risk_profile_code") ??
    "Balanced";
  const currency =
    readStringFromResponse(data.mandate, "base_currency") ??
    readStringFromResponse(data.mandate, "currency") ??
    data.portfolio.portfolio.base_currency ??
    "USD";
  const asOfDate =
    readStringFromResponse(data.mandate, "as_of_date") ??
    readStringFromResponse(data.mandate, "as_of") ??
    "13 May 2026";
  const healthState =
    commandModel.mandateHealthState !== "N/A"
      ? commandModel.mandateHealthState
      : commandModel.dataCompletenessState;
  const readinessLabel = exceptionRows.length > 0 ? "Needs Attention" : businessStateLabel(healthState);
  const dataReadiness = businessStateLabel(commandModel.dataCompletenessState);
  const marketDataRow = findHealthRow(healthRows, ["market", "source", "data"]);
  const benchmarkRow = findHealthRow(healthRows, ["benchmark"]);
  const constraintRow = findHealthRow(healthRows, ["constraint", "mandate"]);
  const latestReview = businessLastReviewed(commandModel.latestMonitoringRunStatus);

  return (
    <SectionBlock
      title="Mandate Health"
      subtitle="Mandate readiness, advisor attention items, and recommended actions for review."
      className="manage-mandate-panel"
      actions={<SemanticBadge tone={toneForState(healthState)}>Evidence Available</SemanticBadge>}
    >
      {data.commandCenterError ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Mandate readiness data is partial"
          body={data.commandCenterError}
        />
      ) : null}

      <div className="mandate-health-context-row" aria-label="Mandate context">
        <span>{mandateType}</span>
        <span>{riskProfile}</span>
        <span>{currency}</span>
        <span>As of {formatDisplayDate(asOfDate)}</span>
      </div>

      <div className="mandate-health-summary-grid" aria-label="Mandate health summary">
        <HealthSummaryCard
          label="Mandate Readiness"
          value={readinessLabel}
          tone={exceptionRows.length > 0 ? "danger" : toneForState(healthState)}
          meter={exceptionRows.length > 0 ? 74 : 96}
        />
        <HealthSummaryCard
          label="Data Readiness"
          value={dataReadiness}
          tone={toneForState(commandModel.dataCompletenessState)}
          meter={scoreToPercent(marketDataRow?.score, dataReadiness.includes("attention") ? 62 : 82)}
        />
        <HealthSummaryCard
          label="Benchmark Alignment"
          value={summaryStateLabel(benchmarkRow, "On Track")}
          tone={toneForState(benchmarkRow?.state ?? "READY")}
          meter={scoreToPercent(benchmarkRow?.score, 98)}
        />
        <HealthSummaryCard
          label="Constraint Fit"
          value={summaryStateLabel(constraintRow, "Compliant")}
          tone={toneForState(constraintRow?.state ?? "READY")}
          meter={scoreToPercent(constraintRow?.score, 100)}
        />
      </div>

      <div className="mandate-health-workspace-grid">
        <AttentionRequiredCard rows={exceptionRows} />

        <div className="mandate-side-stack">
          <RecommendedActionsCard rows={actionRows} healthState={healthState} />
          <LatestReviewCard
            latestReview={latestReview}
            dataReadiness={dataReadiness}
            owner={formatBusinessOwner(
              commandModel.remediationOwner,
              commandModel.sourceService
            )}
          />
        </div>
      </div>

      <HealthDimensionsCard rows={healthRows} />
    </SectionBlock>
  );
}

function HealthSummaryCard({
  label,
  value,
  tone,
  meter,
}: {
  label: string;
  value: string;
  tone: "default" | "success" | "warn" | "danger";
  meter: number;
}) {
  return (
    <div className={`mandate-health-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <i aria-hidden="true">
        <span style={{ width: `${clampPercent(meter)}%` }} />
      </i>
    </div>
  );
}

function AttentionRequiredCard({ rows }: { rows: ManageExceptionRow[] }) {
  return (
    <div className="manage-overview-table-card mandate-attention-card">
      <div className="manage-overview-card-header">
        <div>
          <span>Attention Required</span>
          <h3>{rows.length ? `${rows.length} items for review` : "No open items"}</h3>
        </div>
      </div>
      <table className="manage-overview-table">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Observation</th>
            <th>Owner</th>
            <th>Age</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.slice(0, 5).map((row) => (
              <tr key={row.key}>
                <td>
                  <SemanticBadge tone={toneForState(row.severity)}>
                    {businessStateLabel(row.severity)}
                  </SemanticBadge>
                </td>
                <td>{formatAttentionObservation(row)}</td>
                <td>{formatBusinessOwner(row.owner, row.source)}</td>
                <td>{row.age === "N/A" ? "Current" : row.age}</td>
                <td>{formatAction(row.nextAction)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>No advisor attention items are open.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RecommendedActionsCard({
  rows,
  healthState,
}: {
  rows: MandateRecommendedActionRow[];
  healthState: string;
}) {
  return (
    <div className="manage-overview-card mandate-recommended-actions-card" id="mandate-recommended-actions">
      <div className="manage-overview-card-header">
        <div>
          <span>Recommended Actions</span>
          <h3>{rows.length ? `${rows.length} suggested` : "No action required"}</h3>
        </div>
        <SemanticBadge tone={toneForState(healthState)}>{businessStateLabel(healthState)}</SemanticBadge>
      </div>
      <div className="mandate-action-stack" role="list">
        {rows.length ? (
          rows.slice(0, 3).map((row, index) => (
            <div className="mandate-action-card" role="listitem" key={row.key}>
              <span>{index + 1}</span>
              <strong>{formatAction(row.action)}</strong>
              <p>{formatRecommendedDetail(row.detail)}</p>
            </div>
          ))
        ) : (
          <ScreenStatePanel
            kind="empty"
            surface="portfolio"
            title="No recommended actions"
            body="The mandate is ready for the next advisor review."
          />
        )}
      </div>
    </div>
  );
}

function LatestReviewCard({
  latestReview,
  dataReadiness,
  owner,
}: {
  latestReview: string;
  dataReadiness: string;
  owner: string;
}) {
  return (
    <div className="mandate-latest-review-card">
      <span>Latest Review</span>
      <strong>{latestReview}</strong>
      <dl>
        <div>
          <dt>Data Readiness</dt>
          <dd>{dataReadiness}</dd>
        </div>
        <div>
          <dt>Review Owner</dt>
          <dd>{owner}</dd>
        </div>
        <div>
          <dt>Audit Trail</dt>
          <dd>Available</dd>
        </div>
      </dl>
    </div>
  );
}

function HealthDimensionsCard({ rows }: { rows: MandateHealthRow[] }) {
  return (
    <div className="manage-overview-table-card mandate-health-dimensions-card">
      <div className="manage-overview-card-header">
        <div>
          <span>Health Dimensions Breakdown</span>
          <h3>Mandate review factors</h3>
        </div>
      </div>
      <table className="manage-overview-table">
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Score</th>
            <th>Status</th>
            <th>Latest Review</th>
            <th>Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.key}>
                <td>{formatDimensionLabel(row.dimension)}</td>
                <td>{row.score}</td>
                <td>
                  <SemanticBadge tone={toneForState(row.state)}>
                    {businessStateLabel(row.state)}
                  </SemanticBadge>
                </td>
                <td>{formatHealthObservation(row.reasons)}</td>
                <td>
                  {row.state.toUpperCase() === "READY"
                    ? "No action required"
                    : formatAction(row.recommendedAction)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>No mandate health dimensions are available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function findHealthRow(rows: MandateHealthRow[], needles: string[]): MandateHealthRow | undefined {
  return rows.find((row) => {
    const haystack = `${row.key} ${row.dimension}`.toLowerCase();
    return needles.some((needle) => haystack.includes(needle));
  });
}

function summaryStateLabel(row: MandateHealthRow | undefined, fallback: string): string {
  if (!row || row.state === "N/A") {
    return fallback;
  }
  if (row.state.toUpperCase() === "READY") {
    return fallback;
  }
  return businessStateLabel(row.state);
}

function scoreToPercent(score: string | undefined, fallback: number): number {
  if (!score) {
    return fallback;
  }
  const numeric = Number.parseFloat(score.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric > 1 ? numeric : numeric * 100;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDisplayDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return value;
}

function formatDimensionLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("source") || normalized.includes("market")) {
    return "Market Data Readiness";
  }
  if (normalized.includes("allocation")) {
    return "Allocation Drift";
  }
  if (normalized.includes("risk")) {
    return "Risk Drift";
  }
  if (normalized.includes("cash")) {
    return "Cash Liquidity";
  }
  if (normalized.includes("tax")) {
    return "Tax And Turnover";
  }
  if (normalized.includes("eligibility")) {
    return "Eligibility Restrictions";
  }
  if (normalized.includes("performance")) {
    return "Performance Review";
  }
  if (normalized.includes("workflow")) {
    return "Review Readiness";
  }
  if (normalized.includes("cadence")) {
    return "Review Cadence";
  }
  if (normalized.includes("model")) {
    return "Model Freshness";
  }
  if (normalized.includes("constraint")) {
    return "Mandate Constraints";
  }
  return businessStateLabel(value);
}

function formatAttentionObservation(row: ManageExceptionRow): string {
  const text = `${row.title} ${row.nextAction}`.toUpperCase();
  if (text.includes("SUSTAINABILITY")) {
    return "Sustainability preferences require review";
  }
  if (text.includes("ALLOCATION")) {
    return "Allocation drift requires review";
  }
  if (text.includes("CASH")) {
    return "Cash weight above soft range";
  }
  return formatBusinessExceptionTitle(row.title);
}

function formatRecommendedDetail(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("SUSTAINABILITY")) {
    return "Confirm mandate-specific sustainability preferences before approval.";
  }
  if (normalized.includes("ALLOCATION")) {
    return "Review allocation drift before moving the rebalance forward.";
  }
  if (normalized.includes("CASH")) {
    return "Confirm tactical cash position remains within mandate tolerance.";
  }
  if (normalized.includes("ADVISOR")) {
    return value;
  }
  return businessStateLabel(value);
}

function formatHealthObservation(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("ALLOCATION")) {
    return "Allocation drift review";
  }
  if (normalized.includes("CASH")) {
    return "Cash range review";
  }
  if (normalized.includes("SUSTAINABILITY")) {
    return "Sustainability review";
  }
  if (normalized.includes("READY")) {
    return "No action required";
  }
  const reason = formatBusinessReason(value);
  return reason === "-" ? "No action required" : reason;
}

function formatAction(value: string): string {
  if (!value || value === "-" || value === "N/A") {
    return "No action required";
  }
  const normalized = value.toUpperCase();
  if (normalized.includes("SIMULATE_REBALANCE")) {
    return "Review rebalance simulation";
  }
  if (normalized.includes("REVIEW_WORKFLOW")) {
    return "Review mandate workflow";
  }
  if (normalized.includes("SUSTAINABILITY")) {
    return "Review sustainability preferences";
  }
  if (normalized.includes("ACKNOWLEDGE")) {
    return "Acknowledge";
  }
  if (value.toLowerCase().includes("evidence")) {
    return "Review supporting evidence";
  }
  return businessStateLabel(value);
}
