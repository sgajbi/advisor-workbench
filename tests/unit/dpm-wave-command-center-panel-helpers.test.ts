import { describe, expect, it } from "vitest";

import {
  buildDpmWaveMetricTiles,
  buildDpmWaveProposedChangeRows,
  dpmWaveActionTone,
  dpmWaveStatePanelCopy,
  findDpmWaveMetricValue,
  firstDpmWaveBusinessValue,
  formatDpmWaveDisplayDate,
  isDpmWaveActionBlocked,
  resolveDpmWaveLifecycleIndex,
} from "../../src/features/workbench/dpm-wave-command-center-panel-helpers";
import type {
  DpmWaveItemRow,
  DpmWaveMetricRow,
} from "../../src/features/workbench/dpm-wave-command-center-view-model";

const metricRows: DpmWaveMetricRow[] = [
  { key: "turnover_pct", label: "Turnover Pct", value: "4.8%" },
  { key: "cash_after_pct", label: "Cash After Pct", value: "2.1%" },
  { key: "drift_improvement_pct", label: "Drift Improvement Pct", value: "72.4%" },
];

const itemRows: DpmWaveItemRow[] = [
  {
    key: "item-1",
    waveItemId: "dwi_1",
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    security: "AAPL US",
    proposedAction: "Trim",
    estimatedValue: "7,420.00",
    reason: "Equity overweight",
    mandateImpact: "Improves equity band",
    status: "READY",
    state: "SIMULATION_READY",
    sourceReadinessState: "READY",
    alternativeSetId: "N/A",
    selectedAlternativeId: "N/A",
    proofPackId: "N/A",
    handoffRef: "N/A",
    reasonCodes: "PM_WAVE_READY",
  },
  {
    key: "item-2",
    waveItemId: "dwi_2",
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    security: "N/A",
    proposedAction: "UNKNOWN",
    estimatedValue: "N/A",
    reason: "N/A",
    mandateImpact: "N/A",
    status: "N/A",
    state: "PENDING",
    sourceReadinessState: "READY",
    alternativeSetId: "N/A",
    selectedAlternativeId: "N/A",
    proofPackId: "N/A",
    handoffRef: "N/A",
    reasonCodes: "MANDATE_ATTENTION_REQUIRED",
  },
];

describe("DPM wave command-center panel helpers", () => {
  it("builds state-panel copy for source-owned wave readiness states", () => {
    expect(dpmWaveStatePanelCopy("empty", "PB_SG_GLOBAL_BAL_001")).toEqual({
      kind: "empty",
      title: "No rebalance proposal is available",
      body: "No active rebalance proposal is available for PB_SG_GLOBAL_BAL_001.",
    });
    expect(dpmWaveStatePanelCopy("partial", "PB_SG_GLOBAL_BAL_001")).toEqual({
      kind: "partial",
      title: "Rebalance readiness is partial",
      body: "Some required inputs need review before approval can proceed.",
    });
    expect(dpmWaveStatePanelCopy("blocked", "PB_SG_GLOBAL_BAL_001")).toEqual({
      kind: "permission_blocked",
      title: "Approval is blocked",
      body: "Resolve the open attention items before requesting approval.",
    });
    expect(dpmWaveStatePanelCopy("ready", "PB_SG_GLOBAL_BAL_001")).toEqual({
      kind: "unavailable",
      title: "Rebalance data is temporarily unavailable",
      body: "Rebalance details could not be loaded.",
    });
  });

  it("builds metric tiles from Manage-owned metric rows without calculating analytics", () => {
    expect(buildDpmWaveMetricTiles(metricRows, "2", "0")).toEqual([
      { label: "Turnover", value: "4.8%" },
      { label: "Cash After", value: "2.1%" },
      { label: "Est. Trades", value: "2" },
      { label: "Issues", value: "0", tone: "success" },
    ]);
    expect(findDpmWaveMetricValue(metricRows, ["drift reduction", "drift"], "Pending")).toBe(
      "72.4%"
    );
  });

  it("shapes proposed change rows with front-office fallbacks", () => {
    expect(buildDpmWaveProposedChangeRows(itemRows)).toEqual([
      expect.objectContaining({
        key: "item-1",
        security: "AAPL US",
        action: "Trim",
        actionTone: "trim",
        estimatedValue: "7,420.00",
        reason: "Equity overweight",
        mandateImpact: "Improves equity band",
        status: "READY",
      }),
      expect.objectContaining({
        key: "item-2",
        security: "Proposal item 2",
        action: "Review",
        estimatedValue: "Pending",
        reason: "Mandate Attention Required",
        mandateImpact: "Review against mandate",
        status: "PENDING",
      }),
    ]);
  });

  it("classifies action tones and blocked action posture", () => {
    expect(dpmWaveActionTone("Buy")).toBe("buy");
    expect(dpmWaveActionTone("Sell down")).toBe("sell");
    expect(dpmWaveActionTone("Reduce exposure")).toBe("trim");
    expect(dpmWaveActionTone("Review")).toBe("default");
    expect(isDpmWaveActionBlocked(["REQUEST_APPROVAL", "stage_rebalance"], "approval")).toBe(true);
    expect(isDpmWaveActionBlocked(["REQUEST_APPROVAL"], "handoff")).toBe(false);
  });

  it("resolves lifecycle index and display date deterministically", () => {
    expect(resolveDpmWaveLifecycleIndex("SOURCE_CHECKED")).toBe(1);
    expect(resolveDpmWaveLifecycleIndex("SIMULATION_READY")).toBe(2);
    expect(resolveDpmWaveLifecycleIndex("APPROVAL_REQUESTED")).toBe(3);
    expect(resolveDpmWaveLifecycleIndex("HANDOFF_READY")).toBe(4);
    expect(formatDpmWaveDisplayDate("2026-05-03")).toBe("As of 03 May 2026");
    expect(formatDpmWaveDisplayDate("not-a-date")).toBe("As of not-a-date");
  });

  it("ignores technical placeholder values in business fallbacks", () => {
    expect(firstDpmWaveBusinessValue("N/A", "UNKNOWN", "NOT_REQUESTED", "Ready")).toBe("Ready");
    expect(firstDpmWaveBusinessValue("N/A", undefined)).toBe("Pending");
  });
});
