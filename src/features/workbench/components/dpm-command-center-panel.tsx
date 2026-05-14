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
import {
  businessStateLabel,
  formatBusinessReason,
  formatBusinessSource,
} from "@/features/workbench/manage-workspace-view-model";

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
      body: "Run monitoring to request a fresh mandate assessment.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "Mandate readiness is partial",
      body: "Some data readiness or mandate-review inputs need attention.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Command center is not supported",
      body: "Mandate health is not available for this context.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Mandate health is unavailable",
    body: "Mandate health is temporarily unavailable.",
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
  const runPending = pendingAction !== null;

  async function runMonitoring() {
    if (runPending) {
      return;
    }
    setPendingAction("monitoring");
    setRunError(null);
    setRunMessage(null);
    try {
      const response = await runDpmCommandCenterMonitoring();
      setRunResponse(response);
      setRunMessage(
        `Monitoring completed with ${businessStateLabel(String(response.data.status ?? "UNKNOWN"))}.`,
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
    setPendingAction("exception-summary");
    setRunError(null);
    setRunMessage(null);
    try {
      const response = await requestDpmExceptionSummary({
        exceptionId: model.selectedExceptionId,
        mandateId: model.mandateId !== "N/A" ? model.mandateId : undefined,
        state: "ACTIVE",
      });
      setExceptionSummary(response);
      setRunMessage(`Exception summary ${businessStateLabel(readWorkflowPackStatus(response.data))}.`);
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
      title="Mandate Health"
      subtitle="Mandate readiness, attention items, and advisor actions."
      className="dpm-command-center-panel"
      actions={
        <div className="dpm-command-center-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Decision support available</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage || runError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={
            errorMessage || runError
              ? "Mandate health is unavailable"
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
        <MetricRow label="Completeness" value={businessStateLabel(model.dataCompletenessState)} />
        <MetricRow label="Latest Check" value={model.sourceRunId !== "N/A" ? "Available" : "Not available"} />
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
            Monitoring and exception summaries use approved workflow actions.
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
              body: "No health distribution rows are currently available.",
            }}
          />
        </div>

        <div className="dpm-command-center-subsection">
          <Text as="h3" variant="subsectionTitle">
            Data Readiness
          </Text>
          <div className="dpm-command-center-metric-grid">
            {model.sourceReadiness.length > 0 ? (
              model.sourceReadiness.map((row) => (
                <MetricRow key={row.key} label={formatBusinessSource(row.label)} value={businessStateLabel(row.value)} />
              ))
            ) : (
              <ScreenStatePanel
                kind="empty"
                surface="portfolio"
                title="No source readiness summary"
                body="No data readiness summary is currently available."
              />
            )}
          </div>
        </div>
      </div>

      <div className="dpm-command-center-status-strip">
        <MetricRow label="Latest Check" value={latestRunId !== "N/A" ? "Available" : "Not available"} />
        <MetricRow
          label="Run Status"
          value={
            <SemanticBadge tone={badgeTone(latestRunStatus)}>
              {businessStateLabel(latestRunStatus)}
            </SemanticBadge>
          }
        />
        <MetricRow label="Mandate" value={model.mandateId} />
        <MetricRow label="Mandate Health" value={businessStateLabel(model.mandateHealthState)} />
        <MetricRow label="Exception Summary" value={businessStateLabel(exceptionSummaryStatus)} />
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
            formatBusinessReason(row.reasonCode),
            row.recommendedAction,
            row.count,
          ],
        }))}
        emptyState={{
          title: "No attention buckets returned",
          body: "No attention buckets are currently available.",
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
              {businessStateLabel(row.severity)}
            </SemanticBadge>,
            row.count,
          ],
        }))}
        emptyState={{
          title: "No recommended actions returned",
          body: "No recommended actions are currently available.",
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
            formatBusinessReason(row.reasonCode),
            row.recommendedAction,
            businessStateLabel(row.state),
          ],
        }))}
        emptyState={{
          title: "No active exceptions returned",
          body: "No active exception rows are currently available for the selected book.",
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
              {businessStateLabel(row.state)}
            </SemanticBadge>,
            formatBusinessReason(row.reasons),
          ],
        }))}
        emptyState={{
          title: "No mandate dimensions returned",
          body: "Mandate drill-down is available when health dimension rows are present.",
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

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
