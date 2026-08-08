"use client";

import { useState } from "react";

import { ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import {
  clampMandateHealthPercent,
  findMandateHealthRow,
  formatMandateAction,
  formatMandateAttentionObservation,
  formatMandateHealthDimensionLabel,
  formatMandateHealthDisplayDate,
  formatMandateHealthObservation,
  mandateHealthScoreToPercent,
  mandateHealthSummaryStateLabel,
} from "@/features/workbench/manage-mandate-health-helpers";
import {
  businessStateLabel,
  buildManageExceptionRows,
  buildMandateHealthDimensionRows,
  filterManageExceptionRowsForMandate,
  formatBusinessMandateType,
  formatBusinessOwner,
  formatBusinessSource,
  isManageExceptionEvidenceComplete,
  readStringFromResponse,
  toneForState,
} from "@/features/workbench/manage-workspace-view-model";

import type {
  MandateHealthRow,
  ManageExceptionRow,
} from "@/features/workbench/manage-workspace-view-model";

import type { ManageWorkspaceData } from "../manage-workspace-data";

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
  const exceptionRows = filterManageExceptionRowsForMandate(
    buildManageExceptionRows(data.commandCenterExceptions),
    commandModel.mandateId,
  );
  const hasCompleteExceptionEvidence = isManageExceptionEvidenceComplete(data);
  const healthRows = buildMandateHealthDimensionRows(commandModel);
  const [selectedExceptionKey, setSelectedExceptionKey] = useState<string | null>(
    exceptionRows[0]?.key ?? null,
  );
  const selectedException =
    exceptionRows.find((row) => row.key === selectedExceptionKey) ?? exceptionRows[0] ?? null;
  const mandateType = formatBusinessMandateType(
    readStringFromResponse(data.mandate, "mandate_type") ??
      readStringFromResponse(data.mandate, "type"),
  );
  const riskProfile =
    readStringFromResponse(data.mandate, "risk_profile") ??
    readStringFromResponse(data.mandate, "risk_profile_code") ??
    "Not available";
  const currency =
    readStringFromResponse(data.mandate, "base_currency") ??
    readStringFromResponse(data.mandate, "currency") ??
    data.portfolio.portfolio.base_currency ??
    "Not available";
  const asOfDate =
    readStringFromResponse(data.mandate, "as_of_date") ??
    readStringFromResponse(data.mandate, "as_of") ??
    data.portfolio.as_of_date ??
    "N/A";
  const marketDataRow = findMandateHealthRow(healthRows, ["market", "source", "data"]);
  const benchmarkRow = findMandateHealthRow(healthRows, ["benchmark"]);
  const healthScore = mandateHealthScoreToPercent(commandModel.mandateHealthScore);
  const dataReadinessScore = mandateHealthScoreToPercent(marketDataRow?.score);
  const benchmarkScore = mandateHealthScoreToPercent(benchmarkRow?.score);

  return (
    <SectionBlock
      title="Mandate review workflow"
      subtitle="Review mandate posture, select an attention item, and inspect its source-owned next step and evidence."
      className="manage-mandate-panel"
      actions={
        <SemanticBadge tone={toneForState(commandModel.supportabilityState)}>
          {businessStateLabel(commandModel.supportabilityState)}
        </SemanticBadge>
      }
    >
      <MandateStateNotice
        state={commandModel.state}
        supportabilityState={commandModel.supportabilityState}
        dataCompletenessState={commandModel.dataCompletenessState}
        mandateHealthState={commandModel.mandateHealthState}
        hasSourceError={Boolean(
          data.commandCenterError ||
            data.commandCenterExceptionsError ||
            !hasCompleteExceptionEvidence ||
            data.mandateHealthError
        )}
      />

      <div className="mandate-health-context-row" aria-label="Mandate context">
        <span>{mandateType}</span>
        <span>{riskProfile}</span>
        <span>{currency}</span>
        <span>
          As of {asOfDate === "N/A" ? "Not available" : formatMandateHealthDisplayDate(asOfDate)}
        </span>
      </div>

      <div className="mandate-health-summary-grid" aria-label="Mandate health summary">
        <HealthSummaryCard
          label="Mandate health"
          value={businessStateLabel(commandModel.mandateHealthState)}
          detail={formatSourceScoreDetail(healthScore)}
          tone={toneForState(commandModel.mandateHealthState)}
          meter={healthScore}
        />
        <HealthSummaryCard
          label="Data readiness"
          value={businessStateLabel(commandModel.dataCompletenessState)}
          detail={formatSourceScoreDetail(dataReadinessScore)}
          tone={toneForState(commandModel.dataCompletenessState)}
          meter={dataReadinessScore}
        />
        <HealthSummaryCard
          label="Benchmark alignment"
          value={mandateHealthSummaryStateLabel(benchmarkRow)}
          detail={formatSourceScoreDetail(benchmarkScore)}
          tone={toneForState(benchmarkRow?.state ?? "N/A")}
          meter={benchmarkScore}
        />
        <HealthSummaryCard
          label="Latest monitoring"
          value={businessStateLabel(commandModel.latestMonitoringRunStatus)}
          detail={
            commandModel.latestMonitoringRunId === "N/A"
              ? "Run not available"
              : `Run ${commandModel.latestMonitoringRunId}`
          }
          tone={toneForState(commandModel.latestMonitoringRunStatus)}
          meter={null}
        />
      </div>

      <div className="mandate-health-review-workspace" id="mandate-attention-review">
        <AttentionReviewQueue
          rows={exceptionRows}
          hasCompleteEvidence={hasCompleteExceptionEvidence}
          selectedKey={selectedException?.key ?? null}
          onSelect={setSelectedExceptionKey}
        />
        {selectedException ? (
          <SelectedReviewItem
            row={selectedException}
            mandateId={selectedException.mandateId}
            monitoringRunId={commandModel.latestMonitoringRunId}
            sourceRunId={commandModel.sourceRunId}
            correlationId={commandModel.correlationId}
            authority={commandModel.authority}
          />
        ) : null}
      </div>

      <HealthDimensionsCard rows={healthRows} />
    </SectionBlock>
  );
}

function MandateStateNotice({
  state,
  supportabilityState,
  dataCompletenessState,
  mandateHealthState,
  hasSourceError,
}: {
  state: ReturnType<typeof buildDpmCommandCenterPanelModel>["state"];
  supportabilityState: string;
  dataCompletenessState: string;
  mandateHealthState: string;
  hasSourceError: boolean;
}) {
  const hasPartialEvidence = [dataCompletenessState, mandateHealthState].some((value) => {
    const normalized = value.trim();
    return (
      !normalized ||
      normalized === "N/A" ||
      /PARTIAL|DEGRADED|STALE|UNKNOWN/i.test(normalized)
    );
  });
  if (state === "complete" && !hasSourceError && !hasPartialEvidence) {
    return null;
  }
  if (state === "empty") {
    return (
      <ScreenStatePanel
        kind="empty"
        surface="portfolio"
        title="No mandate monitoring records"
        body="Manage returned no mandate monitoring records for the selected portfolio."
      />
    );
  }
  if (state === "unsupported") {
    if (supportabilityState.toUpperCase() !== "BLOCKED") {
      return (
        <ScreenStatePanel
          kind="unavailable"
          surface="portfolio"
          title="Mandate monitoring is not supported"
          body="The current service contract does not publish mandate monitoring for this portfolio."
        />
      );
    }
    return (
      <ScreenStatePanel
        kind="permission_blocked"
        surface="portfolio"
        title="Mandate monitoring is not available for this access context"
        body="Your current access or the supported service contract does not permit this mandate monitoring view."
      />
    );
  }
  if (state === "unavailable") {
    return (
      <ScreenStatePanel
        kind="unavailable"
        surface="portfolio"
        title="Mandate monitoring is unavailable"
        body="The Gateway could not load mandate monitoring. Portfolio context remains available while the service recovers."
      />
    );
  }
  return (
    <ScreenStatePanel
      kind="partial"
      surface="portfolio"
      title="Mandate monitoring requires attention"
      body="Some mandate monitoring evidence is stale, degraded, or unavailable. Available source-owned results remain visible below."
    />
  );
}

function HealthSummaryCard({
  label,
  value,
  detail,
  tone,
  meter,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "default" | "success" | "warn" | "danger";
  meter: number | null;
}) {
  return (
    <div className={`mandate-health-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {meter === null ? null : (
        <div
          className="mandate-health-meter"
          role="img"
          aria-label={`Source score ${clampMandateHealthPercent(meter)} out of 100`}
        >
          <span style={{ width: `${clampMandateHealthPercent(meter)}%` }} />
        </div>
      )}
    </div>
  );
}

function AttentionReviewQueue({
  rows,
  hasCompleteEvidence,
  selectedKey,
  onSelect,
}: {
  rows: ManageExceptionRow[];
  hasCompleteEvidence: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <section
      className="manage-overview-table-card mandate-attention-card"
      aria-labelledby="mandate-attention-heading"
    >
      <div className="manage-overview-card-header">
        <div>
          <span>Mandate monitoring</span>
          <h3 id="mandate-attention-heading">Attention Required</h3>
        </div>
        <strong>
          {hasCompleteEvidence
            ? rows.length
              ? `${rows.length} open`
              : "No open items"
            : "Evidence unavailable"}
        </strong>
      </div>
      {!hasCompleteEvidence ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Attention items are temporarily unavailable"
          body="The mandate summary remains visible, but the source exception queue could not be confirmed. No zero-attention conclusion has been inferred."
        />
      ) : rows.length ? (
        <div
          className="mandate-attention-table-scroll"
          tabIndex={0}
          aria-label="Mandate attention items"
        >
          <table className="manage-overview-table">
            <thead>
              <tr>
                <th>Observation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className={row.key === selectedKey ? "is-selected" : undefined}
                  key={row.key}
                >
                  <td>
                    <button
                      type="button"
                      aria-pressed={row.key === selectedKey}
                      onClick={() => onSelect(row.key)}
                    >
                      {formatMandateAttentionObservation(row)}
                    </button>
                  </td>
                  <td>
                    <SemanticBadge tone={toneForState(row.severity)}>
                      {businessStateLabel(row.severity)}
                    </SemanticBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ScreenStatePanel
          kind="empty"
          surface="portfolio"
          title="No open attention items"
          body="Manage returned no open mandate exceptions for this portfolio."
        />
      )}
    </section>
  );
}

function SelectedReviewItem({
  row,
  mandateId,
  monitoringRunId,
  sourceRunId,
  correlationId,
  authority,
}: {
  row: ManageExceptionRow;
  mandateId: string | null;
  monitoringRunId: string;
  sourceRunId: string;
  correlationId: string;
  authority: string;
}) {
  return (
    <aside
      className="mandate-review-detail"
      aria-label="Selected mandate review item"
      aria-live="polite"
    >
      <div className="manage-overview-card-header">
        <div>
          <span>Selected review item</span>
          <h3>{formatMandateAttentionObservation(row)}</h3>
        </div>
        <SemanticBadge tone={toneForState(row.severity)}>
          {businessStateLabel(row.severity)}
        </SemanticBadge>
      </div>
      <div className="mandate-review-detail-body">
        <dl className="mandate-review-facts">
          <div>
            <dt>Workflow status</dt>
            <dd>{businessStateLabel(row.state)}</dd>
          </div>
          <div>
            <dt>Accountable owner</dt>
            <dd>{formatBusinessOwner(row.owner)}</dd>
          </div>
          <div>
            <dt>Open for</dt>
            <dd>{row.age === "N/A" ? "Not available" : row.age}</dd>
          </div>
          <div>
            <dt>Evidence source</dt>
            <dd>{formatBusinessSource(row.source)}</dd>
          </div>
        </dl>
        <div className="mandate-source-next-step">
          <span>Source-owned next step</span>
          <strong>{formatMandateAction(row.nextAction)}</strong>
        </div>
        <details className="mandate-technical-evidence">
          <summary>Evidence and technical identifiers</summary>
          <dl>
            <div>
              <dt>Exception ID</dt>
              <dd>{row.key}</dd>
            </div>
            <div>
              <dt>Mandate ID</dt>
              <dd>{businessIdentifier(mandateId)}</dd>
            </div>
            <div>
              <dt>Monitoring run</dt>
              <dd>{businessIdentifier(monitoringRunId)}</dd>
            </div>
            <div>
              <dt>Source run</dt>
              <dd>{businessIdentifier(sourceRunId)}</dd>
            </div>
            <div>
              <dt>Correlation ID</dt>
              <dd>{businessIdentifier(correlationId)}</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>{businessIdentifier(authority)}</dd>
            </div>
          </dl>
        </details>
      </div>
    </aside>
  );
}

function HealthDimensionsCard({ rows }: { rows: MandateHealthRow[] }) {
  return (
    <section
      className="manage-overview-table-card mandate-health-dimensions-card"
      aria-labelledby="mandate-dimensions-heading"
    >
      <div className="manage-overview-card-header">
        <div>
          <span>Source-owned mandate evidence</span>
          <h3 id="mandate-dimensions-heading">Health Dimensions Breakdown</h3>
        </div>
      </div>
      <div
        className="mandate-health-dimensions-scroll"
        tabIndex={0}
        aria-label="Mandate health dimensions"
      >
        <table className="manage-overview-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Source score</th>
              <th>Status</th>
              <th>Source observation</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.key}>
                  <td>{formatMandateHealthDimensionLabel(row.dimension)}</td>
                  <td>{formatSourceScore(mandateHealthScoreToPercent(row.score))}</td>
                  <td>
                    <SemanticBadge tone={toneForState(row.state)}>
                      {businessStateLabel(row.state)}
                    </SemanticBadge>
                  </td>
                  <td>{formatMandateHealthObservation(row.reasons)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No mandate health dimensions are available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatSourceScoreDetail(score: number | null): string {
  return score === null ? "Score not available" : `Source score ${formatSourceScore(score)}`;
}

function formatSourceScore(score: number | null): string {
  return score === null ? "Not available" : `${clampMandateHealthPercent(score)}/100`;
}

function businessIdentifier(value: string | null | undefined): string {
  return !value || value === "N/A" ? "Not available" : value;
}
