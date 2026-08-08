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
} from "@/features/workbench/dpm-command-center-api";
import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import { buildDpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import type {
  DpmCommandCenterGatewayResponse,
  DpmExceptionSummaryResponse,
} from "@/features/workbench/types";
import { buildDpmCommandCenterPanelModel } from "@/features/workbench/dpm-command-center-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
  formatBusinessSource,
} from "@/features/workbench/manage-workspace-view-model";
import {
  dpmCommandCenterBadgeTone,
  dpmCommandCenterStatePanelCopy,
  readDpmWorkflowPackStatus,
  shouldShowDpmCommandCenterStatePanel,
} from "@/features/workbench/dpm-command-center-panel-helpers";

type Props = {
  commandCenter: DpmCommandCenterGatewayResponse | null;
  exceptions?: DpmCommandCenterGatewayResponse | null;
  mandate?: DpmCommandCenterGatewayResponse | null;
  mandateHealth?: DpmCommandCenterGatewayResponse | null;
  errorMessage?: string | null;
};

type ExceptionSummaryState = {
  exceptionId: string;
  response: DpmExceptionSummaryResponse | null;
  error: string | null;
};

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
  const [exceptionSummaryState, setExceptionSummaryState] =
    useState<ExceptionSummaryState | null>(null);
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
  const currentExceptionSummary =
    exceptionSummaryState?.exceptionId === model.selectedExceptionId
      ? exceptionSummaryState
      : null;
  const currentError = currentExceptionSummary?.error ?? runError;
  const shouldShowStatePanel = shouldShowDpmCommandCenterStatePanel(
    model.state,
    errorMessage,
    currentError,
  );
  const stateCopy = dpmCommandCenterStatePanelCopy(model.state);
  const exceptionSummaryStatus = readDpmWorkflowPackStatus(
    currentExceptionSummary?.response?.data,
  );
  const exceptionSummaryOutcome = currentExceptionSummary?.response
    ? buildDpmAiWorkflowOutcome(
        "exception-summary",
        currentExceptionSummary.response,
        currentExceptionSummary.exceptionId,
      )
    : null;
  const runPending = pendingAction !== null;
  const currentExceptionSummaryPending =
    pendingAction === "exception-summary" && currentExceptionSummary !== null;

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
    const exceptionId = model.selectedExceptionId;
    setPendingAction("exception-summary");
    setRunError(null);
    setRunMessage(null);
    setExceptionSummaryState({ exceptionId, response: null, error: null });
    try {
      const response = await requestDpmExceptionSummary({
        exceptionId,
        mandateId: model.mandateId !== "N/A" ? model.mandateId : undefined,
        state: "ACTIVE",
      });
      setExceptionSummaryState({ exceptionId, response, error: null });
    } catch (error) {
      setExceptionSummaryState({
        exceptionId,
        response: null,
        error:
          error instanceof Error
            ? error.message
            : "DPM exception summary request failed",
      });
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
          <SemanticBadge tone={dpmCommandCenterBadgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Decision support available</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage || currentError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={
            errorMessage || currentError
              ? "Mandate health is unavailable"
              : stateCopy.title
          }
          body={errorMessage ?? currentError ?? stateCopy.body}
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
          {currentExceptionSummaryPending ? "Requesting summary" : "Exception summary"}
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

      {exceptionSummaryOutcome ? (
        <DpmAiWorkflowResult
          outcome={exceptionSummaryOutcome}
          ariaLabel="Exception decision-support result"
          eyebrow="Exception triage"
          focusOnMount
        />
      ) : null}

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
                  tone={dpmCommandCenterBadgeTone(row.key)}
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
            <SemanticBadge tone={dpmCommandCenterBadgeTone(latestRunStatus)}>
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
              tone={dpmCommandCenterBadgeTone(row.severity)}
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
              tone={dpmCommandCenterBadgeTone(row.severity)}
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
              tone={dpmCommandCenterBadgeTone(row.severity)}
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
            <SemanticBadge key={`${row.key}-state`} tone={dpmCommandCenterBadgeTone(row.state)}>
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
