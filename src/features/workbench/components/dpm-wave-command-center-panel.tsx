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
  approveDpmWave,
  createDpmWave,
  getDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  getDpmWaveSupportability,
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
} from "@/features/workbench/dpm-wave-command-center-view-model";

type Props = {
  portfolioId: string;
  waveList: DpmWaveGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (["READY", "SUPPORTED", "COMPLETE", "HANDOFF_READY", "STAGED"].includes(normalized)) {
    return "success";
  }
  if (["DEGRADED", "PARTIAL", "DRAFT", "SOURCE_CHECKED", "SIMULATED"].includes(normalized)) {
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
      title: "No rebalance wave is available",
      body: `Gateway returned no manage-owned explicit portfolio-list rebalance wave for ${portfolioId}.`,
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "Wave supportability is partial",
      body: "Manage returned a degraded or partial wave posture. Workbench preserves the reason codes and disables unsupported actions.",
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Wave actions are blocked",
      body: "Manage reports a blocked wave supportability state. Source, proof-pack, or item remediation is required upstream.",
    };
  }
  return {
    kind: "unavailable" as const,
    title: "Wave command center is unavailable",
    body: "Gateway did not return a usable rebalance-wave payload.",
  };
}

export default function DpmWaveCommandCenterPanel({
  portfolioId,
  waveList,
  errorMessage = null,
}: Props) {
  const [detailResponse, setDetailResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [itemsResponse, setItemsResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [actionResponse, setActionResponse] = useState<DpmWaveGatewayResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const model = buildDpmWaveCommandCenterModel({
    waveList,
    waveDetail: detailResponse,
    waveItems: itemsResponse,
    actionResponse,
  });
  const selectedWaveId = model.selectedWaveId;
  const stateCopy = statePanelCopy(model.state, portfolioId);
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    Boolean(actionError) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "blocked" ||
    model.state === "unavailable";

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
      setActionMessage(`${label} completed through Gateway.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setPendingAction(null);
    }
  }

  function previewWave() {
    void runAction("Preview wave", () => previewDpmWave({ portfolioId }));
  }

  function createWave() {
    void runAction("Create wave", () => createDpmWave({ portfolioId }));
  }

  function loadDetail(waveId = selectedWaveId) {
    if (!waveId) {
      return;
    }
    void runAction("Load wave detail", async () => {
      const response = await getDpmWave(waveId);
      setDetailResponse(response);
      return response;
    });
  }

  function loadItems() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Load wave items", async () => {
      const response = await getDpmWaveItems(selectedWaveId);
      setItemsResponse(response);
      return response;
    });
  }

  function runSourceCheck() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Source-check wave", () => sourceCheckDpmWave(selectedWaveId));
  }

  function runSimulation() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Simulate wave", () => simulateDpmWave(selectedWaveId));
  }

  function approveWave() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Approve wave", () => approveDpmWave(selectedWaveId));
  }

  function stageWave() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Stage wave", () => stageDpmWave(selectedWaveId));
  }

  function handoffWave() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Handoff wave", () => handoffDpmWave(selectedWaveId));
  }

  function loadProofPackPosture() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Load proof posture", () => getDpmWaveProofPackPosture(selectedWaveId));
  }

  function loadSupportability() {
    if (!selectedWaveId) {
      return;
    }
    void runAction("Load supportability", () => getDpmWaveSupportability(selectedWaveId));
  }

  return (
    <SectionBlock
      title="Rebalance Wave Command Center"
      subtitle={`Manage authority: ${model.authority}. Correlation: ${model.correlationId}`}
      className="dpm-wave-command-center-panel"
      actions={
        <div className="dpm-wave-command-center-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {model.supportabilityState}
          </SemanticBadge>
          <SemanticBadge>{model.sourceService}</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage || actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage || actionError ? "Wave endpoint is unavailable" : stateCopy.title}
          body={errorMessage ?? actionError ?? stateCopy.body}
        />
      ) : null}

      <div className="dpm-wave-command-center-status-strip">
        <MetricRow label="Selected Wave" value={selectedWaveId ?? "N/A"} />
        <MetricRow
          label="Wave State"
          value={<SemanticBadge tone={badgeTone(model.selectedWaveState)}>{model.selectedWaveState}</SemanticBadge>}
        />
        <MetricRow label="Items" value={model.selectedWaveItemCount} />
        <MetricRow label="Issues" value={model.selectedWaveIssueCount} />
      </div>

      <div className="dpm-wave-command-center-action-row" aria-label="DPM rebalance-wave actions">
        <ActionButton priority="secondary" onClick={previewWave} disabled={Boolean(pendingAction)}>
          {pendingAction === "Preview wave" ? "Previewing" : "Preview wave"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={createWave} disabled={Boolean(pendingAction)}>
          {pendingAction === "Create wave" ? "Creating" : "Create wave"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={() => loadDetail()} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Load detail
        </ActionButton>
        <ActionButton priority="secondary" onClick={loadItems} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Load items
        </ActionButton>
        <ActionButton priority="secondary" onClick={runSourceCheck} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Source-check
        </ActionButton>
        <ActionButton priority="secondary" onClick={runSimulation} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Simulate
        </ActionButton>
        <ActionButton priority="secondary" onClick={approveWave} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Approve
        </ActionButton>
        <ActionButton priority="secondary" onClick={stageWave} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Stage
        </ActionButton>
        <ActionButton priority="secondary" onClick={handoffWave} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Handoff
        </ActionButton>
        <ActionButton priority="secondary" onClick={loadProofPackPosture} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Proof posture
        </ActionButton>
        <ActionButton priority="secondary" onClick={loadSupportability} disabled={!selectedWaveId || Boolean(pendingAction)}>
          Supportability
        </ActionButton>
      </div>

      <Text variant="secondary" className="muted">
        {actionMessage ??
          "Workbench uses Gateway wave composition only; manage owns wave state, readiness, proof-pack posture, and internal handoff evidence."}
      </Text>

      {model.reasonCodes.length > 0 || model.blockedActions.length > 0 ? (
        <div className="dpm-wave-command-center-reason-row">
          {model.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone="warn">
              {reason}
            </SemanticBadge>
          ))}
          {model.blockedActions.map((action) => (
            <SemanticBadge key={action} tone="danger">
              Blocked {action}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <AnalyticsTable
        ariaLabel="DPM rebalance waves"
        variant="analysis"
        density="compact"
        columns={[
          { key: "wave", label: "Wave" },
          { key: "state", label: "State" },
          { key: "trigger", label: "Trigger" },
          { key: "as-of", label: "As Of" },
          { key: "items", label: "Items", align: "right" },
          { key: "support", label: "Supportability" },
          { key: "action", label: "Action" },
        ]}
        rows={model.summaryRows.map((row) => ({
          key: row.key,
          cells: [
            row.waveId,
            <SemanticBadge key={`${row.key}-state`} tone={badgeTone(row.state)}>
              {row.state}
            </SemanticBadge>,
            row.triggerType,
            row.asOfDate,
            row.itemCount,
            `${row.supportabilityState} / ${row.supportabilityReason}`,
            <ActionButton
              key={`${row.key}-load`}
              priority="quiet"
              onClick={() => loadDetail(row.waveId)}
              disabled={row.waveId === "N/A" || Boolean(pendingAction)}
            >
              Open
            </ActionButton>,
          ],
        }))}
        emptyState={{
          title: "No rebalance waves returned",
          body: "Create or preview a manage-owned explicit portfolio-list wave to populate this queue.",
        }}
      />

      <div className="dpm-wave-command-center-summary-grid">
        <div className="dpm-wave-command-center-subsection">
          <Text as="h3" variant="subsectionTitle">
            Aggregate Metrics
          </Text>
          <div className="dpm-wave-command-center-metric-grid">
            {model.metricRows.length > 0 ? (
              model.metricRows.map((row) => (
                <MetricRow key={row.key} label={row.label} value={row.value} />
              ))
            ) : (
              <ScreenStatePanel
                kind="empty"
                surface="portfolio"
                title="No aggregate metrics returned"
                body="Manage did not publish aggregate wave metrics in the current Gateway payload."
              />
            )}
          </div>
        </div>

        <div className="dpm-wave-command-center-subsection">
          <Text as="h3" variant="subsectionTitle">
            Proof And Handoff
          </Text>
          <div className="dpm-wave-command-center-metric-grid">
            <MetricRow label="Proof Packs" value={model.proofPackRows.length.toString()} />
            <MetricRow label="Handoff Refs" value={model.handoffRows.length.toString()} />
            <MetricRow label="External Execution" value={model.externalExecutionClaimed} />
            <MetricRow label="Remediation Owner" value={model.remediationOwner} />
          </div>
        </div>
      </div>

      <AnalyticsTable
        ariaLabel="DPM rebalance wave items"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "item", label: "Item" },
          { key: "portfolio", label: "Portfolio" },
          { key: "state", label: "State" },
          { key: "readiness", label: "Source Readiness" },
          { key: "alternative", label: "Alternative" },
          { key: "proof", label: "Proof Pack" },
          { key: "handoff", label: "Handoff" },
          { key: "reasons", label: "Reasons" },
        ]}
        rows={model.itemRows.map((row) => ({
          key: row.key,
          cells: [
            row.waveItemId,
            row.portfolioId,
            <SemanticBadge key={`${row.key}-state`} tone={badgeTone(row.state)}>
              {row.state}
            </SemanticBadge>,
            row.sourceReadinessState,
            row.selectedAlternativeId !== "N/A" ? row.selectedAlternativeId : row.alternativeSetId,
            row.proofPackId,
            row.handoffRef,
            row.reasonCodes,
          ],
        }))}
        emptyState={{
          title: "No wave items returned",
          body: "Load wave items after selecting a manage-owned wave.",
        }}
      />
    </SectionBlock>
  );
}
