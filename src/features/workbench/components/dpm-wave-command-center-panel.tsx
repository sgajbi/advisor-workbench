"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";
import {
  approveDpmWave,
  createDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  handoffDpmWave,
  previewDpmWave,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "@/features/workbench/api";
import type { DpmWaveGatewayResponse } from "@/features/workbench/types";
import {
  buildDpmWaveCommandCenterModel,
  type DpmWaveCommandCenterPanelState,
  type DpmWaveItemRow,
  type DpmWaveMetricRow,
} from "@/features/workbench/dpm-wave-command-center-view-model";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolioId: string;
  waveList: DpmWaveGatewayResponse | null;
  errorMessage?: string | null;
};

type MetricTile = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
};

const REBALANCE_LIFECYCLE_STEPS = [
  "Preview",
  "Data Check",
  "Simulation",
  "Approval",
  "Staging",
];

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (
    [
      "READY",
      "SUPPORTED",
      "COMPLETE",
      "HANDOFF_READY",
      "STAGED",
      "SIMULATION_READY",
      "SIMULATED",
      "SOURCE_CHECKED",
    ].includes(normalized)
  ) {
    return "success";
  }
  if (["DEGRADED", "PARTIAL", "DRAFT", "REVIEW_REQUIRED", "PENDING"].includes(normalized)) {
    return "warn";
  }
  if (["BLOCKED", "UNSUPPORTED", "FAILED", "CANCELLED"].includes(normalized)) {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: DpmWaveCommandCenterPanelState, portfolioId: string) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No rebalance proposal is available",
      body: `No active rebalance proposal is available for ${portfolioId}.`,
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "Rebalance readiness is partial",
      body: "Some required inputs need review before approval can proceed.",
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Approval is blocked",
      body: "Resolve the open attention items before requesting approval.",
    };
  }
  return {
    kind: "unavailable" as const,
    title: "Rebalance data is temporarily unavailable",
    body: "Rebalance details could not be loaded.",
  };
}

export default function DpmWaveCommandCenterPanel({
  portfolioId,
  waveList,
  errorMessage = null,
}: Props) {
  const [itemsResponse, setItemsResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [actionResponse, setActionResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [proofPackResponse, setProofPackResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [autoLoadedWaveId, setAutoLoadedWaveId] = useState<string | null>(null);

  const model = buildDpmWaveCommandCenterModel({
    waveList,
    waveDetail: proofPackResponse,
    waveItems: itemsResponse,
    actionResponse,
  });
  const selectedWaveId = model.selectedWaveId;
  const lifecycleIndex = resolveLifecycleIndex(model.selectedWaveState);
  const approvalBlocked =
    isWaveActionBlocked(model.blockedActions, "approve") ||
    Number.parseInt(model.selectedWaveIssueCount.replaceAll(",", ""), 10) > 0 ||
    model.reasonCodes.length > 0 ||
    model.state === "blocked" ||
    model.state === "partial";
  const stagingBlocked = isWaveActionBlocked(model.blockedActions, "stage");
  const handoffBlocked = isWaveActionBlocked(model.blockedActions, "handoff");
  const proofState =
    model.proofPackRows.length > 0 || proofPackResponse
      ? "READY"
      : model.reportInputStatus !== "NOT_REQUESTED"
        ? model.reportInputStatus
        : "AVAILABLE";
  const stateCopy = statePanelCopy(model.state, portfolioId);
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    Boolean(actionError) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "blocked" ||
    model.state === "unavailable";
  const proposedRows = useMemo(() => buildProposedChangeRows(model.itemRows), [model.itemRows]);
  const metricTiles = buildMetricTiles(model.metricRows, model.selectedWaveItemCount, model.selectedWaveIssueCount);
  const asOfDate = formatDisplayDate(model.summaryRows[0]?.asOfDate);

  useEffect(() => {
    if (!selectedWaveId || autoLoadedWaveId === selectedWaveId || itemsResponse || pendingAction) {
      return;
    }
    setAutoLoadedWaveId(selectedWaveId);
    getDpmWaveItems(selectedWaveId)
      .then(setItemsResponse)
      .catch(() => {
        setAutoLoadedWaveId(null);
      });
  }, [autoLoadedWaveId, itemsResponse, pendingAction, selectedWaveId]);

  async function runAction(label: string, action: () => Promise<DpmWaveGatewayResponse>) {
    if (pendingAction) {
      return;
    }
    setPendingAction(label);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await action();
      setActionResponse(response);
      setActionMessage(`${label} completed.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setPendingAction(null);
    }
  }

  function previewRebalance() {
    void runAction("Preview", () => previewDpmWave({ portfolioId }));
  }

  function createRebalance() {
    void runAction("Create rebalance", () => createDpmWave({ portfolioId }));
  }

  function loadProposedChanges() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Load proposed changes", async () => {
      const response = await getDpmWaveItems(selectedWaveId);
      setItemsResponse(response);
      return response;
    });
  }

  function reviewDataReadiness() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Review data", () => sourceCheckDpmWave(selectedWaveId));
  }

  function runSimulation() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Simulate", () => simulateDpmWave(selectedWaveId));
  }

  function requestApproval() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Request approval", () => approveDpmWave(selectedWaveId));
  }

  function stageRebalance() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Stage rebalance", () => stageDpmWave(selectedWaveId));
  }

  function prepareHandoff() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Prepare handoff", () => handoffDpmWave(selectedWaveId));
  }

  function openEvidencePack() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Open evidence pack", async () => {
      const response = await getDpmWaveProofPackPosture(selectedWaveId);
      setProofPackResponse(response);
      return response;
    });
  }

  return (
    <SectionBlock
      title="Rebalance"
      subtitle="Proposed rebalance, advisor review, and approval readiness."
      className="dpm-wave-command-center-panel rebalance-workspace"
      actions={
        <div className="rebalance-context-row" aria-label="Rebalance context">
          <span>Discretionary Balanced</span>
          <span>USD</span>
          <span>{asOfDate}</span>
          <SemanticBadge tone={badgeTone(proofState)}>Evidence available</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage || actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage || actionError ? "Rebalance data needs attention" : stateCopy.title}
          body={errorMessage ?? actionError ?? stateCopy.body}
        />
      ) : null}

      <div className="rebalance-summary-strip" aria-label="Rebalance readiness">
        <SummaryCell
          label="Rebalance Status"
          value={businessStateLabel(model.selectedWaveState)}
          tone={badgeTone(model.selectedWaveState)}
        />
        <SummaryCell
          label="Approval Readiness"
          value={approvalBlocked ? "Blocked" : "Ready"}
          tone={approvalBlocked ? "danger" : "success"}
        />
        <SummaryCell label="Proposed Changes" value={model.selectedWaveItemCount} />
        <SummaryCell
          label="Drift Improvement"
          value={findMetricValue(model.metricRows, ["drift improvement", "drift reduction", "drift"], "Pending")}
          tone="success"
        />
      </div>

      <div className="rebalance-main-grid">
        <section className="rebalance-active-card" aria-labelledby="rebalance-active-title">
          <div className="rebalance-section-heading">
            <h3 id="rebalance-active-title">Active Rebalance</h3>
            <SemanticBadge tone={badgeTone(model.selectedWaveState)}>
              {businessStateLabel(model.selectedWaveState)}
            </SemanticBadge>
          </div>

          <div className="rebalance-stepper" aria-label="Rebalance lifecycle">
            {REBALANCE_LIFECYCLE_STEPS.map((step, index) => (
              <div
                className={[
                  "rebalance-step",
                  index < lifecycleIndex ? "is-complete" : "",
                  index === lifecycleIndex ? "is-active" : "",
                  index > lifecycleIndex ? "is-pending" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={step}
              >
                <span aria-hidden="true" />
                <strong>{step}</strong>
              </div>
            ))}
          </div>

          {approvalBlocked ? (
            <div className="rebalance-alert" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">
                warning
              </span>
              <span>Resolve mandate attention items before approval.</span>
            </div>
          ) : (
            <div className="rebalance-ready-note" role="status">
              <span className="material-symbols-outlined" aria-hidden="true">
                check_circle
              </span>
              <span>Approval can proceed after advisor review.</span>
            </div>
          )}

          <div className="rebalance-metric-grid" aria-label="Rebalance metrics">
            {metricTiles.map((metric) => (
              <MetricTileView key={metric.label} metric={metric} />
            ))}
          </div>

          <div className="rebalance-command-row" aria-label="Rebalance workflow actions">
            <ActionButton priority="secondary" onClick={previewRebalance} disabled={Boolean(pendingAction)}>
              Preview
            </ActionButton>
            <ActionButton priority="secondary" onClick={createRebalance} disabled={Boolean(pendingAction)}>
              Create Rebalance
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={reviewDataReadiness}
              disabled={!selectedWaveId || Boolean(pendingAction)}
            >
              Review Data
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={runSimulation}
              disabled={!selectedWaveId || Boolean(pendingAction)}
            >
              Simulate
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={requestApproval}
              disabled={!selectedWaveId || Boolean(pendingAction) || approvalBlocked}
            >
              Request Approval
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={stageRebalance}
              disabled={!selectedWaveId || Boolean(pendingAction) || stagingBlocked}
            >
              Stage
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={prepareHandoff}
              disabled={!selectedWaveId || Boolean(pendingAction) || handoffBlocked}
            >
              Prepare Handoff
            </ActionButton>
            <ActionButton
              priority="secondary"
              onClick={openEvidencePack}
              disabled={!selectedWaveId || Boolean(pendingAction)}
            >
              Open Evidence Pack
            </ActionButton>
          </div>

          {actionMessage ? <p className="rebalance-action-message">{actionMessage}</p> : null}
        </section>

        <section className="rebalance-actions-card" aria-labelledby="rebalance-actions-title">
          <div className="rebalance-section-heading">
            <h3 id="rebalance-actions-title">Recommended Actions</h3>
          </div>
          <div className="rebalance-action-list">
            <RecommendedAction
              title="Review rebalance simulation"
              detail="Check proposed allocation changes against mandate drift."
            />
            <RecommendedAction
              title="Resolve mandate attention items"
              detail={
                approvalBlocked
                  ? "Clear the open mandate items before approval."
                  : "No blocking attention items remain."
              }
            />
            <RecommendedAction
              title="Open evidence pack"
              detail="Review the decision evidence before staging."
            />
          </div>
        </section>
      </div>

      <section className="rebalance-proposed-card" aria-labelledby="rebalance-proposed-title">
        <div className="rebalance-table-heading">
          <h3 id="rebalance-proposed-title">Proposed Changes</h3>
          <div>
            <button type="button" onClick={loadProposedChanges} disabled={!selectedWaveId || Boolean(pendingAction)}>
              Load Changes
            </button>
            <button type="button">Filter</button>
          </div>
        </div>
        <AnalyticsTable
          ariaLabel="Proposed rebalance changes"
          variant="portfolio"
          density="compact"
          columns={[
            { key: "security", label: "Security" },
            { key: "action", label: "Action" },
            { key: "value", label: "Est. Value", align: "right" },
            { key: "reason", label: "Reason" },
            { key: "impact", label: "Mandate Impact" },
            { key: "status", label: "Status" },
          ]}
          rows={proposedRows.map((row) => ({
            key: row.key,
            cells: [
              row.security,
              <span className={`rebalance-action rebalance-action-${row.actionTone}`} key={`${row.key}-action`}>
                {row.action}
              </span>,
              row.estimatedValue,
              row.reason,
              row.mandateImpact,
              <SemanticBadge key={`${row.key}-status`} tone={badgeTone(row.status)}>
                {businessStateLabel(row.status)}
              </SemanticBadge>,
            ],
          }))}
          emptyState={{
            title: "No proposed changes loaded",
            body: "Load proposed changes after selecting a rebalance proposal.",
          }}
        />
      </section>
    </SectionBlock>
  );
}

function SummaryCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  return (
    <div className={`rebalance-summary-cell rebalance-summary-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricTileView({ metric }: { metric: MetricTile }) {
  return (
    <div className={`rebalance-metric-tile rebalance-metric-${metric.tone ?? "default"}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
    </div>
  );
}

function RecommendedAction({ title, detail }: { title: string; detail: string }) {
  return (
    <button className="rebalance-recommended-action" type="button">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <span className="material-symbols-outlined" aria-hidden="true">
        chevron_right
      </span>
    </button>
  );
}

function buildMetricTiles(
  metricRows: DpmWaveMetricRow[],
  selectedWaveItemCount: string,
  selectedWaveIssueCount: string
): MetricTile[] {
  return [
    {
      label: "Turnover",
      value: findMetricValue(metricRows, ["turnover"], "Pending"),
    },
    {
      label: "Cash After",
      value: findMetricValue(metricRows, ["cash after", "cash_after", "cash"], "Pending"),
    },
    {
      label: "Est. Trades",
      value: findMetricValue(metricRows, ["trade count", "trades"], selectedWaveItemCount),
    },
    {
      label: "Issues",
      value: selectedWaveIssueCount,
      tone: selectedWaveIssueCount === "0" ? "success" : "danger",
    },
  ];
}

function buildProposedChangeRows(itemRows: DpmWaveItemRow[]) {
  return itemRows.map((row, index) => {
    const action = firstBusinessValue(row.proposedAction, "Review");
    return {
      key: row.key,
      security: firstBusinessValue(row.security, `Proposal item ${index + 1}`),
      action,
      actionTone: actionTone(action),
      estimatedValue: firstBusinessValue(row.estimatedValue, "Pending"),
      reason: firstBusinessValue(row.reason, formatBusinessReason(row.reasonCodes), "Requires review"),
      mandateImpact: firstBusinessValue(row.mandateImpact, "Review against mandate"),
      status: firstBusinessValue(row.status, row.state, "PENDING"),
    };
  });
}

function firstBusinessValue(...values: Array<string | null | undefined>): string {
  return (
    values.find((value) => {
      const normalized = value?.trim();
      return normalized && !["N/A", "UNKNOWN", "NOT_REQUESTED"].includes(normalized.toUpperCase());
    }) ?? "Pending"
  );
}

function actionTone(action: string): "buy" | "sell" | "trim" | "default" {
  const normalized = action.toLowerCase();
  if (normalized.includes("buy")) {
    return "buy";
  }
  if (normalized.includes("sell")) {
    return "sell";
  }
  if (normalized.includes("trim") || normalized.includes("reduce")) {
    return "trim";
  }
  return "default";
}

function findMetricValue(rows: DpmWaveMetricRow[], needles: string[], fallback: string): string {
  const normalizedNeedles = needles.map((needle) => needle.toLowerCase());
  const row = rows.find((candidate) => {
    const key = `${candidate.key} ${candidate.label}`.replaceAll("_", " ").toLowerCase();
    return normalizedNeedles.some((needle) => key.includes(needle));
  });
  return firstBusinessValue(row?.value, fallback);
}

function resolveLifecycleIndex(state: string): number {
  const normalized = state.toUpperCase();
  if (normalized.includes("STAG") || normalized.includes("HANDOFF")) {
    return 4;
  }
  if (normalized.includes("APPROV")) {
    return 3;
  }
  if (normalized.includes("SIMUL")) {
    return 2;
  }
  if (normalized.includes("SOURCE") || normalized.includes("DATA")) {
    return 1;
  }
  return 0;
}

function isWaveActionBlocked(blockedActions: string[], action: string): boolean {
  return blockedActions.some((blockedAction) =>
    blockedAction.toLowerCase().includes(action.toLowerCase())
  );
}

function formatDisplayDate(value: string | undefined): string {
  if (!value || value === "N/A") {
    return "As of 03 May 2026";
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return `As of ${value}`;
  }
  return `As of ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}
