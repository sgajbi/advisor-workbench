"use client";

import { useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import {
  requestDpmExceptionSummary,
  runDpmCommandCenterMonitoring,
} from "@/features/workbench/api";
import type {
  DpmCommandCenterGatewayResponse,
  DpmExceptionSummaryResponse,
} from "@/features/workbench/types";
import {
  buildDpmCommandCenterPanelModel,
  type DpmCommandCenterPanelState,
} from "@/features/workbench/dpm-command-center-view-model";

type Props = {
  commandCenter: DpmCommandCenterGatewayResponse | null;
  exceptions?: DpmCommandCenterGatewayResponse | null;
  mandate?: DpmCommandCenterGatewayResponse | null;
  mandateHealth?: DpmCommandCenterGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (
    normalized === "COMPLETE" ||
    normalized === "READY" ||
    normalized === "SUCCEEDED"
  ) {
    return "success";
  }
  if (
    normalized === "PARTIAL" ||
    normalized === "EMPTY" ||
    normalized.includes("REVIEW")
  ) {
    return "warn";
  }
  if (
    normalized === "BLOCKED" ||
    normalized === "UNSUPPORTED" ||
    normalized === "FAILED"
  ) {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: DpmCommandCenterPanelState) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No monitoring run for this PM book",
      body: "Gateway returned an empty manage command-center state. Run monitoring to request a fresh manage-owned assessment.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "Command-center readiness is partial",
      body: "Gateway is preserving a partial manage supportability state. Source readiness, book discovery, or latest-run lineage may need remediation.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Command center is not supported",
      body: "The authoritative manage supportability state says this command-center path is not available for this context.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Command center is unavailable",
    body: "Gateway did not return a usable manage command-center payload.",
  };
}

export default function DpmCommandCenterPanel({
  commandCenter,
  exceptions = null,
  mandate = null,
  mandateHealth = null,
  errorMessage = null,
}: Props) {
  const [runResponse, setRunResponse] =
    useState<DpmCommandCenterGatewayResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "monitoring" | "exception-summary" | null
  >(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [exceptionSummary, setExceptionSummary] =
    useState<DpmExceptionSummaryResponse | null>(null);
  const model = buildDpmCommandCenterPanelModel({
    commandCenter,
    exceptions,
    mandate,
    mandateHealth,
  });
  const runModel = buildDpmCommandCenterPanelModel({
    commandCenter: runResponse,
  });
  const latestRunId =
    runModel.latestMonitoringRunId !== "N/A"
      ? runModel.latestMonitoringRunId
      : model.latestMonitoringRunId;
  const latestRunStatus =
    runModel.latestMonitoringRunStatus !== "N/A"
      ? runModel.latestMonitoringRunStatus
      : model.latestMonitoringRunStatus;
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    Boolean(runError) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "unsupported" ||
    model.state === "unavailable";
  const stateCopy = statePanelCopy(model.state);
  const exceptionSummaryStatus = readWorkflowPackStatus(exceptionSummary?.data);
  const exceptionSummaryRunId = readWorkflowPackRunId(exceptionSummary?.data);
  const runPending = pendingAction !== null;

  async function runMonitoring() {
    if (runPending) {
      return;
    }
    setPendingAction("exception-summary");
    setRunError(null);
    setRunMessage(null);
    try {
      const response = await runDpmCommandCenterMonitoring();
      setRunResponse(response);
      setRunMessage(
        `Monitoring ${response.data.monitoring_run_id ?? "run"} returned ${
          response.data.status ?? "UNKNOWN"
        }`,
      );
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : "DPM command-center monitoring failed",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function requestExceptionSummary() {
    if (runPending || !model.selectedExceptionId) {
      return;
    }
    setPendingAction("monitoring");
    setRunError(null);
    setRunMessage(null);
    try {
      const response = await requestDpmExceptionSummary({
        exceptionId: model.selectedExceptionId,
        mandateId: model.mandateId !== "N/A" ? model.mandateId : undefined,
        state: "ACTIVE",
      });
      setExceptionSummary(response);
      setRunMessage(
        `Exception summary ${readWorkflowPackStatus(response.data)} (${readWorkflowPackRunId(
          response.data,
        )})`,
      );
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : "DPM exception summary request failed",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <SectionBlock
      title="DPM Command Center"
      subtitle={`Manage authority: ${model.authority}. Correlation: ${model.correlationId}`}
      className="dpm-command-center-panel"
      actions={
        <div className="dpm-command-center-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {model.supportabilityState}
          </SemanticBadge>
          <SemanticBadge>{model.sourceService}</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage || runError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={
            errorMessage || runError
              ? "Command-center endpoint is unavailable"
              : stateCopy.title
          }
          body={errorMessage ?? runError ?? stateCopy.body}
        />
      ) : null}

      <div className="dpm-command-center-status-strip">
        <MetricRow label="Evaluated Mandates" value={model.evaluatedMandates} />
        <MetricRow
          label="Active Exceptions"
          value={model.activeExceptionCount}
        />
        <MetricRow label="Completeness" value={model.dataCompletenessState} />
        <MetricRow label="Source Run" value={model.sourceRunId} />
      </div>

      <div className="dpm-command-center-action-row">
        <ActionButton
          priority="secondary"
          onClick={runMonitoring}
          disabled={runPending}
        >
          {pendingAction === "monitoring" ? "Running monitoring" : "Run monitoring"}
        </ActionButton>
        <ActionButton
          priority="secondary"
          onClick={requestExceptionSummary}
          disabled={runPending || !model.selectedExceptionId}
        >
          {pendingAction === "exception-summary" ? "Requesting summary" : "Exception summary"}
        </ActionButton>
        <div>
          {runMessage ? (
            <Text variant="secondary" className="muted">
              {runMessage}
            </Text>
          ) : null}
          <Text variant="secondary" className="muted">
            Workbench calls Gateway only; manage owns monitoring, mandate
            health, source readiness, exceptions, and recommended actions.
          </Text>
        </div>
      </div>

      {model.partialReadinessReasons.length > 0 ? (
        <div className="dpm-command-center-reason-row">
          {model.partialReadinessReasons.map((reason) => (
            <SemanticBadge key={reason} tone="warn">
              {reason}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <div className="dpm-command-center-summary-grid">
        <div className="dpm-command-center-subsection">
          <Text as="h3" variant="subsectionTitle">
            Book Health Strip
          </Text>
          <AnalyticsTable
            ariaLabel="DPM command-center health distribution"
            variant="portfolio"
            density="compact"
            columns={[
              { key: "state", label: "Health State" },
              { key: "count", label: "Mandates", align: "right" },
            ]}
            rows={model.healthDistribution.map((row) => ({
              key: row.key,
              cells: [
                <SemanticBadge
                  key={`${row.key}-state`}
                  tone={badgeTone(row.key)}
                >
                  {row.label}
                </SemanticBadge>,
                row.value,
              ],
            }))}
            emptyState={{
              title: "No health distribution returned",
              body: "Gateway preserved the manage payload, but no distribution rows were present.",
            }}
          />
        </div>

        <div className="dpm-command-center-subsection">
          <Text as="h3" variant="subsectionTitle">
            Source Readiness
          </Text>
          <div className="dpm-command-center-metric-grid">
            {model.sourceReadiness.length > 0 ? (
              model.sourceReadiness.map((row) => (
                <MetricRow key={row.key} label={row.label} value={row.value} />
              ))
            ) : (
              <ScreenStatePanel
                kind="empty"
                surface="portfolio"
                title="No source readiness summary"
                body="Manage did not publish source-readiness summary rows for this view."
              />
            )}
          </div>
        </div>
      </div>

      <div className="dpm-command-center-status-strip">
        <MetricRow label="Latest Run" value={latestRunId} />
        <MetricRow
          label="Run Status"
          value={
            <SemanticBadge tone={badgeTone(latestRunStatus)}>
              {latestRunStatus}
            </SemanticBadge>
          }
        />
        <MetricRow label="Mandate" value={model.mandateId} />
        <MetricRow label="Mandate Health" value={model.mandateHealthState} />
        <MetricRow label="Exception Summary" value={exceptionSummaryStatus} />
        <MetricRow label="Exception Summary Run" value={exceptionSummaryRunId} />
      </div>

      <AnalyticsTable
        ariaLabel="DPM attention queue"
        variant="analysis"
        density="compact"
        columns={[
          { key: "dimension", label: "Dimension" },
          { key: "severity", label: "Severity" },
          { key: "reason", label: "Reason" },
          { key: "action", label: "Recommended Action" },
          { key: "count", label: "Count", align: "right" },
        ]}
        rows={model.attentionRows.map((row) => ({
          key: row.key,
          cells: [
            row.dimension,
            <SemanticBadge
              key={`${row.key}-severity`}
              tone={badgeTone(row.severity)}
            >
              {row.severity}
            </SemanticBadge>,
            row.reasonCode,
            row.recommendedAction,
            row.count,
          ],
        }))}
        emptyState={{
          title: "No attention buckets returned",
          body: "The Gateway command-center payload did not include manage attention buckets.",
        }}
      />

      <AnalyticsTable
        ariaLabel="DPM recommended actions"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "action", label: "Action" },
          { key: "severity", label: "Severity" },
          { key: "count", label: "Count", align: "right" },
        ]}
        rows={model.recommendedActions.map((row) => ({
          key: row.key,
          cells: [
            row.action,
            <SemanticBadge
              key={`${row.key}-severity`}
              tone={badgeTone(row.severity)}
            >
              {row.severity}
            </SemanticBadge>,
            row.count,
          ],
        }))}
        emptyState={{
          title: "No recommended actions returned",
          body: "Manage did not publish command-center recommended actions for this context.",
        }}
      />

      <AnalyticsTable
        ariaLabel="DPM active exceptions"
        variant="observation"
        density="compact"
        columns={[
          { key: "exception", label: "Exception" },
          { key: "mandate", label: "Mandate" },
          { key: "severity", label: "Severity" },
          { key: "reason", label: "Reason" },
          { key: "action", label: "Action" },
          { key: "state", label: "State" },
        ]}
        rows={model.exceptionRows.map((row) => ({
          key: row.key,
          cells: [
            row.exceptionId,
            row.mandateId,
            <SemanticBadge
              key={`${row.key}-severity`}
              tone={badgeTone(row.severity)}
            >
              {row.severity}
            </SemanticBadge>,
            row.reasonCode,
            row.recommendedAction,
            row.state,
          ],
        }))}
        emptyState={{
          title: "No active exceptions returned",
          body: "Gateway returned no manage exception rows for the selected PM book.",
        }}
      />

      <AnalyticsTable
        ariaLabel="DPM mandate health dimensions"
        variant="analysis"
        density="compact"
        columns={[
          { key: "dimension", label: "Dimension" },
          { key: "score", label: "Score", align: "right" },
          { key: "state", label: "State" },
          { key: "reasons", label: "Reasons" },
        ]}
        rows={model.mandateHealthDimensions.map((row) => ({
          key: row.key,
          cells: [
            row.dimension,
            row.score,
            <SemanticBadge key={`${row.key}-state`} tone={badgeTone(row.state)}>
              {row.state}
            </SemanticBadge>,
            row.reasons,
          ],
        }))}
        emptyState={{
          title: "No mandate dimensions returned",
          body: "Mandate drill-down is available only when manage publishes health dimension rows.",
        }}
      />

      <Text variant="secondary" className="muted">
        Health score {model.mandateHealthScore}; recommended action{" "}
        {model.mandateRecommendedAction}; remediation owner{" "}
        {model.remediationOwner}.
      </Text>
    </SectionBlock>
  );
}

function readWorkflowPackStatus(data: Record<string, unknown> | undefined): string {
  if (!data) {
    return "NOT_REQUESTED";
  }
  const workflowPackRun = readRecord(data.workflow_pack_run);
  const output = readRecord(data.output);
  return (
    readString(data.status) ??
    readString(data.review_state) ??
    readString(workflowPackRun.review_state) ??
    readString(output.review_state) ??
    "REVIEW_REQUIRED"
  );
}

function readWorkflowPackRunId(data: Record<string, unknown> | undefined): string {
  if (!data) {
    return "N/A";
  }
  const workflowPackRun = readRecord(data.workflow_pack_run);
  const execution = readRecord(data.execution);
  const audit = readRecord(execution.audit);
  return (
    readString(data.run_id) ??
    readString(data.workflow_run_id) ??
    readString(workflowPackRun.run_id) ??
    readString(audit.workflow_pack_run_id) ??
    "N/A"
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
