import { describe, expect, it } from "vitest";

import {
  buildConstructionAuthorityEvidenceSummary,
  buildConstructionStatePanelCopy,
  canSelectConstructionAlternative,
  constructionBadgeTone,
  resolveConstructionAlternativeLabel,
  shouldShowConstructionStatePanel,
} from "../../src/features/workbench/construction-alternatives-panel-helpers";
import type {
  ConstructionAlternativeRow,
  ConstructionPanelModel,
} from "../../src/features/workbench/construction-alternatives-view-model";

const alternative: ConstructionAlternativeRow = {
  alternativeId: "alt_balanced_transition",
  method: "BALANCED_TRANSITION",
  status: "READY",
  label: "Balanced Transition",
  objective: "Restore model weights",
  mandateFit: "Within Range",
  actionLabel: "Select path",
  isRecommended: true,
  rationale: "Balances drift and turnover.",
  turnoverPct: "4.8%",
  cashAfterPct: "2.1%",
  driftImprovementPct: "72.4%",
  riskDelta: "N/A",
  trackingErrorDeltaBps: "N/A",
  tradeCount: "8",
  metrics: [],
  reasonCodes: [],
  objectiveTraceCount: 1,
  constraintTraceCount: 1,
};

describe("construction alternatives panel helpers", () => {
  it("maps construction states to product-safe badge tones", () => {
    expect(constructionBadgeTone("READY")).toBe("success");
    expect(constructionBadgeTone("Within Range")).toBe("success");
    expect(constructionBadgeTone("PENDING_REVIEW")).toBe("warn");
    expect(constructionBadgeTone("Acceptable")).toBe("warn");
    expect(constructionBadgeTone("BLOCKED")).toBe("danger");
    expect(constructionBadgeTone("UNKNOWN")).toBe("default");
  });

  it("builds deterministic state panel copy without backend recomputation", () => {
    expect(
      buildConstructionStatePanelCopy("idle", "PB_SG_GLOBAL_BAL_001"),
    ).toMatchObject({
      kind: "empty",
      title: "Construction alternatives have not been generated",
    });
    expect(buildConstructionStatePanelCopy("blocked", "P1")).toMatchObject({
      kind: "permission_blocked",
      title: "Construction alternatives are blocked",
    });
    expect(buildConstructionStatePanelCopy("unsupported", "P1")).toMatchObject(
      {
        kind: "unavailable",
        title: "Construction alternatives are unsupported",
      },
    );
    expect(buildConstructionStatePanelCopy("unavailable", "P1")).toMatchObject(
      {
        kind: "partial",
        title: "Construction alternatives are unavailable",
      },
    );
  });

  it("renders the state panel for non-ready states or action failures", () => {
    expect(shouldShowConstructionStatePanel("ready", null)).toBe(false);
    expect(shouldShowConstructionStatePanel("partial", null)).toBe(false);
    expect(shouldShowConstructionStatePanel("idle", null)).toBe(true);
    expect(shouldShowConstructionStatePanel("blocked", null)).toBe(true);
    expect(shouldShowConstructionStatePanel("unsupported", null)).toBe(true);
    expect(shouldShowConstructionStatePanel("unavailable", null)).toBe(true);
    expect(shouldShowConstructionStatePanel("ready", "Gateway failed")).toBe(
      true,
    );
  });

  it("deduplicates authority evidence posture from source-owned diagnostics", () => {
    const summary = buildConstructionAuthorityEvidenceSummary({
      currencyOverlayEvidence: {
        state: "BLOCKED",
        sourceProductName: "ExternalHedgePolicy",
        sourceProductVersion: "v1",
        sourceId: "sha256:hedge-policy",
        contentHash: "sha256:hedge-policy-content",
        ruleCount: "0",
        rules: [],
        eligibleInstrumentEvidence: null,
        missingDataFamilies: ["external_hedge_policy", "shared_family"],
        blockedCapabilities: ["hedge_policy_approval", "best_execution"],
        reasonCodes: ["EXTERNAL_HEDGE_POLICY_FAIL_CLOSED"],
      },
      executionAcknowledgementEvidence: {
        state: "UNAVAILABLE",
        sourceProductName: "ExternalOrderExecutionAcknowledgement",
        sourceProductVersion: "v1",
        sourceId: "sha256:oms-ack",
        contentHash: "sha256:oms-ack-content",
        acknowledgementCount: "0",
        acknowledgements: [],
        missingDataFamilies: [
          "external_oms_order_execution_acknowledgement",
          "shared_family",
        ],
        blockedCapabilities: [
          "order_generation",
          "best_execution",
          "settlement",
        ],
        reasonCodes: [
          "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
          "EXTERNAL_HEDGE_POLICY_FAIL_CLOSED",
        ],
      },
    } satisfies Pick<
      ConstructionPanelModel,
      "currencyOverlayEvidence" | "executionAcknowledgementEvidence"
    >);

    expect(summary).toEqual({
      state: "BLOCKED",
      missingDataFamilies: [
        "external_hedge_policy",
        "shared_family",
        "external_oms_order_execution_acknowledgement",
      ],
      blockedCapabilities: [
        "hedge_policy_approval",
        "best_execution",
        "order_generation",
        "settlement",
      ],
      reasonCodes: [
        "EXTERNAL_HEDGE_POLICY_FAIL_CLOSED",
        "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
      ],
      shouldRender: true,
    });
  });

  it("keeps selection gating tied to returned alternative state", () => {
    expect(
      canSelectConstructionAlternative({
        selectedAlternative: alternative,
        alternativeSetId: "cas_1",
        state: "ready",
        selectedAlternativeId: null,
        selectionPendingId: null,
      }),
    ).toBe(true);
    expect(
      canSelectConstructionAlternative({
        selectedAlternative: alternative,
        alternativeSetId: "N/A",
        state: "ready",
        selectedAlternativeId: null,
        selectionPendingId: null,
      }),
    ).toBe(false);
    expect(
      canSelectConstructionAlternative({
        selectedAlternative: alternative,
        alternativeSetId: "cas_1",
        state: "blocked",
        selectedAlternativeId: null,
        selectionPendingId: null,
      }),
    ).toBe(false);
    expect(
      canSelectConstructionAlternative({
        selectedAlternative: alternative,
        alternativeSetId: "cas_1",
        state: "ready",
        selectedAlternativeId: "alt_balanced_transition",
        selectionPendingId: null,
      }),
    ).toBe(false);
  });

  it("resolves action feedback labels with a safe fallback", () => {
    expect(
      resolveConstructionAlternativeLabel(
        [alternative],
        "alt_balanced_transition",
      ),
    ).toBe("Balanced Transition");
    expect(resolveConstructionAlternativeLabel([alternative], "missing")).toBe(
      "construction path",
    );
  });
});
