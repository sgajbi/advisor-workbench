import type {
  ConstructionAlternativeRow,
  ConstructionPanelModel,
  ConstructionPanelState,
} from "./construction-alternatives-view-model";

export type ConstructionBadgeTone = "default" | "success" | "warn" | "danger";

export type ConstructionEvidenceStatus = {
  state:
    | "not_generated"
    | "generating"
    | "available"
    | "partial"
    | "blocked"
    | "unsupported"
    | "unavailable";
  label: string;
  tone: ConstructionBadgeTone;
};

export type ConstructionStatePanelCopy = {
  kind: "empty" | "permission_blocked" | "unavailable" | "partial";
  title: string;
  body: string;
};

export type ConstructionAuthorityEvidenceSummary = {
  state: string;
  missingDataFamilies: string[];
  blockedCapabilities: string[];
  reasonCodes: string[];
  shouldRender: boolean;
};

export function constructionBadgeTone(state: string): ConstructionBadgeTone {
  const normalized = state.toUpperCase();
  if (
    normalized === "READY" ||
    normalized === "SUPPORTED" ||
    normalized === "SELECTED" ||
    normalized === "PASS" ||
    normalized.includes("WITHIN")
  ) {
    return "success";
  }
  if (
    normalized === "DEGRADED" ||
    normalized === "PENDING_REVIEW" ||
    normalized.includes("REVIEW") ||
    normalized.includes("PENDING") ||
    normalized.includes("ACCEPTABLE")
  ) {
    return "warn";
  }
  if (
    normalized === "BLOCKED" ||
    normalized === "UNSUPPORTED" ||
    normalized === "INFEASIBLE"
  ) {
    return "danger";
  }
  return "default";
}

export function resolveConstructionEvidenceStatus(input: {
  panelState: ConstructionPanelState;
  generatePending: boolean;
  actionError: string | null;
}): ConstructionEvidenceStatus {
  if (input.generatePending) {
    return { state: "generating", label: "Generating", tone: "warn" };
  }
  if (input.actionError && input.panelState === "idle") {
    return { state: "unavailable", label: "Unavailable", tone: "danger" };
  }

  const statusByPanelState: Record<
    ConstructionPanelState,
    ConstructionEvidenceStatus
  > = {
    idle: { state: "not_generated", label: "Not generated", tone: "default" },
    ready: { state: "available", label: "Evidence available", tone: "success" },
    partial: { state: "partial", label: "Partial evidence", tone: "warn" },
    blocked: { state: "blocked", label: "Blocked", tone: "danger" },
    unsupported: { state: "unsupported", label: "Unsupported", tone: "danger" },
    unavailable: { state: "unavailable", label: "Unavailable", tone: "danger" },
  };
  return statusByPanelState[input.panelState];
}

export function constructionGenerationMessage(
  panelState: ConstructionPanelState,
): string {
  const messageByPanelState: Record<ConstructionPanelState, string> = {
    idle: "Construction request completed.",
    ready: "Construction alternatives generated from mandate data.",
    partial: "Construction alternatives generated with partial evidence.",
    blocked: "Construction request completed with blocking conditions.",
    unsupported: "Construction is not supported for this mandate.",
    unavailable: "Construction request completed without comparable alternatives.",
  };
  return messageByPanelState[panelState];
}

export function buildConstructionStatePanelCopy(
  state: ConstructionPanelState,
  portfolioId: string,
): ConstructionStatePanelCopy {
  if (state === "idle") {
    return {
      kind: "empty",
      title: "Construction alternatives have not been generated",
      body: `Request alternatives for ${portfolioId} when data readiness is sufficient for comparison.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked",
      title: "Construction alternatives are blocked",
      body: "Selection remains disabled until the blocking data issue is resolved.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable",
      title: "Construction alternatives are unsupported",
      body: "Construction alternatives are not available for the current mandate state.",
    };
  }
  return {
    kind: "partial",
    title: "Construction alternatives are unavailable",
    body: "Construction alternatives are temporarily unavailable for this portfolio.",
  };
}

export function shouldShowConstructionStatePanel(
  state: ConstructionPanelState,
  actionError: string | null,
): boolean {
  return (
    state === "idle" ||
    state === "blocked" ||
    state === "unsupported" ||
    state === "unavailable" ||
    Boolean(actionError)
  );
}

export function shouldShowConstructionAttentionReasons(
  state: ConstructionPanelState,
  reasons: readonly string[],
): boolean {
  return state !== "idle" && state !== "ready" && reasons.length > 0;
}

export function buildConstructionAuthorityEvidenceSummary(
  model: Pick<
    ConstructionPanelModel,
    "currencyOverlayEvidence" | "executionAcknowledgementEvidence"
  >,
): ConstructionAuthorityEvidenceSummary {
  const executionAcknowledgementEvidence =
    model.executionAcknowledgementEvidence;
  return {
    state:
      model.currencyOverlayEvidence?.state ??
      executionAcknowledgementEvidence?.state ??
      "UNKNOWN",
    missingDataFamilies: uniqueStrings([
      ...(model.currencyOverlayEvidence?.missingDataFamilies ?? []),
      ...(executionAcknowledgementEvidence?.missingDataFamilies ?? []),
    ]),
    blockedCapabilities: uniqueStrings([
      ...(model.currencyOverlayEvidence?.blockedCapabilities ?? []),
      ...(executionAcknowledgementEvidence?.blockedCapabilities ?? []),
    ]),
    reasonCodes: uniqueStrings([
      ...(model.currencyOverlayEvidence?.reasonCodes ?? []),
      ...(executionAcknowledgementEvidence?.reasonCodes ?? []),
    ]),
    shouldRender: Boolean(
      model.currencyOverlayEvidence || executionAcknowledgementEvidence,
    ),
  };
}

export function canSelectConstructionAlternative(input: {
  selectedAlternative: ConstructionAlternativeRow | null;
  alternativeSetId: string;
  state: ConstructionPanelState;
  selectedAlternativeId: string | null;
  selectionPendingId: string | null;
}): boolean {
  return Boolean(
    input.selectedAlternative &&
      input.alternativeSetId !== "N/A" &&
      input.state !== "blocked" &&
      input.state !== "unsupported" &&
      input.selectedAlternativeId !== input.selectedAlternative.alternativeId &&
      !input.selectionPendingId,
  );
}

export function resolveConstructionAlternativeLabel(
  alternatives: ConstructionAlternativeRow[],
  alternativeId: string,
): string {
  return (
    alternatives.find((alternative) => alternative.alternativeId === alternativeId)
      ?.label ?? "construction path"
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
