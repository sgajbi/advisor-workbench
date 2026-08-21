import type { SemanticBadgeTone } from "@/design-system";

import {
  proposalRiskImpactMissingEvidenceIdentity,
  proposalRiskImpactRequirementIdentity,
  proposalRiskImpactWorkflowGateReasonIdentity,
  type ProposalRiskImpactAllocationSnapshot,
  type ProposalRiskImpactData,
  type ProposalRiskImpactEnvelope,
  type ProposalRiskImpactOverallState,
  type ProposalRiskImpactSectionState,
  type ProposalRiskImpactSeverity,
} from "./proposal-risk-impact-contract";

export type ProposalRiskImpactAllocationRow = {
  key: string;
  label: string;
  currentWeight: string;
  currentValue: string;
  currentPositions: string;
  currentBarWidth: number;
  proposedWeight: string;
  proposedValue: string;
  proposedPositions: string;
  proposedBarWidth: number;
};

export type ProposalRiskImpactModel = ReturnType<
  typeof buildProposalRiskImpactModel
>;

export function buildProposalRiskImpactModel(
  envelope: ProposalRiskImpactEnvelope,
) {
  const { data } = envelope;
  const effectiveOverallState = reconcileOverallState(data);
  const allocationState = reconcileSectionState(
    effectiveOverallState,
    data.allocation.state,
  );
  const riskState = reconcileSectionState(
    effectiveOverallState,
    data.risk.state,
  );
  const decisionState = reconcileSectionState(
    effectiveOverallState,
    data.decision.state,
  );
  const workflowGateState = reconcileSectionState(
    effectiveOverallState,
    data.workflow_gate.state,
  );
  const decisionIsAvailable = decisionState === "ready";
  const effectiveWorkflowGateState = decisionIsAvailable
    ? workflowGateState
    : decisionState;
  const allocationIsAvailable =
    allocationState === "ready" || allocationState === "partial";
  const riskIsAvailable = riskState === "ready" || riskState === "partial";
  const workflowGateIsAvailable = effectiveWorkflowGateState === "ready";
  const activeRequirements = decisionIsAvailable
    ? data.decision.approval_requirements.filter(({ required }) => required)
    : [];
  const blockingRequirements = activeRequirements.filter(
    ({ blocking_until_approved }) => blocking_until_approved,
  );
  const blockingEvidence = data.decision.missing_evidence.filter(
    ({ blocking }) => blocking,
  );

  return {
    identity: {
      proposalId: data.proposal_id,
      portfolioId: data.portfolio_id,
      title: data.title ?? data.proposal_id,
      stage: businessLabel(data.current_state),
      version: `Version ${data.version_no}`,
      recorded: formatDate(data.version_created_at),
    },
    supportability: {
      label: supportabilityLabel(effectiveOverallState),
      tone: supportabilityTone(effectiveOverallState),
      explanation:
        effectiveOverallState === "ready"
          ? "Source evidence is available for the current proposal version. This is not an approval decision."
          : effectiveOverallState === "partial"
            ? "Some proposal evidence is available, but the decision record has source gaps or fallback evidence."
            : "The source does not provide enough evidence for a proposal risk decision.",
    },
    decision: {
      isAvailable: decisionIsAvailable,
      state: supportabilityPresentation(decisionState),
      status:
        decisionIsAvailable && data.decision.decision_status
          ? businessLabel(data.decision.decision_status)
          : "Decision not confirmed",
      summary:
        decisionIsAvailable && data.decision.primary_summary
          ? data.decision.primary_summary
          : "The advisory source has not confirmed a decision record for this proposal version.",
      nextAction:
        decisionIsAvailable && data.decision.recommended_next_action
          ? businessLabel(data.decision.recommended_next_action)
          : "Confirm the source evidence before progressing",
      confidence:
        decisionIsAvailable && data.decision.confidence
          ? businessLabel(data.decision.confidence)
          : "Not reported",
      policyVersion:
        (decisionIsAvailable && data.decision.decision_policy_version) ||
        "Not reported",
      activeRequirements: activeRequirements.map((requirement) => ({
        id: proposalRiskImpactRequirementIdentity(requirement),
        type: businessLabel(requirement.approval_type),
        summary: requirement.summary,
        severity: businessLabel(requirement.severity),
        tone: severityTone(requirement.severity),
        blocking: requirement.blocking_until_approved,
        policyVersion: requirement.policy_version,
      })),
      materialChanges: (decisionIsAvailable
        ? data.decision.material_changes
        : []
      ).map((change) => ({
        id: change.change_id,
        family: businessLabel(change.family),
        summary: change.summary,
        severity: businessLabel(change.severity),
        tone: severityTone(change.severity),
      })),
      missingEvidence: (decisionIsAvailable
        ? data.decision.missing_evidence
        : []
      ).map((evidence) => ({
        id: proposalRiskImpactMissingEvidenceIdentity(evidence),
        type: businessLabel(evidence.evidence_type),
        summary: evidence.summary,
        blocking: evidence.blocking,
      })),
      blockingCount: decisionIsAvailable
        ? blockingRequirements.length + blockingEvidence.length
        : null,
    },
    risk: {
      isAvailable: riskIsAvailable,
      state: supportabilityPresentation(riskState),
      source: data.risk.source_service ?? "Source not reported",
      summary:
        (riskIsAvailable && data.risk.summary) ||
        "The source has not confirmed proposal risk evidence.",
      highlights: riskIsAvailable ? data.risk.highlights : [],
    },
    allocation: {
      isAvailable: allocationIsAvailable,
      state: supportabilityPresentation(allocationState),
      source: allocationSourceLabel(data),
      contractVersion: data.allocation.contract_version ?? "Not reported",
      calculatorVersion: data.allocation.calculator_version ?? "Not reported",
      expectedDimensions:
        data.allocation.expected_dimensions.map(businessLabel),
      missingExpectedDimensions: allocationIsAvailable
        ? data.allocation.expected_dimensions
            .filter(
              (dimension) =>
                !data.allocation.views.some(
                  (view) => view.dimension === dimension,
                ),
            )
            .map(businessLabel)
        : [],
      views: (allocationIsAvailable ? data.allocation.views : []).map(
        (view) => ({
          dimension: view.dimension,
          label: businessLabel(view.dimension),
          currentTotal: formatMoney(view.current?.total_value),
          proposedTotal: formatMoney(view.proposed?.total_value),
          rows: allocationRows(view.current, view.proposed),
        }),
      ),
    },
    workflowGate: {
      isAvailable: workflowGateIsAvailable,
      state: supportabilityPresentation(effectiveWorkflowGateState),
      gate:
        workflowGateIsAvailable && data.workflow_gate.gate
          ? businessLabel(data.workflow_gate.gate)
          : "Gate not confirmed",
      nextStep:
        workflowGateIsAvailable && data.workflow_gate.recommended_next_step
          ? businessLabel(data.workflow_gate.recommended_next_step)
          : "Source next step not confirmed",
      reasons: (workflowGateIsAvailable ? data.workflow_gate.reasons : []).map(
        (reason) => ({
          id: proposalRiskImpactWorkflowGateReasonIdentity(reason),
          reason: businessLabel(reason.reason_code),
          source: businessLabel(reason.source),
          severity: businessLabel(reason.severity),
          tone: severityTone(reason.severity),
        }),
      ),
      disclaimer:
        "Workflow gate evidence controls progression. It does not prove that an approval was recorded.",
    },
    capabilities: data.capabilities.map((capability) => {
      const reconciledCoreState =
        capability.key === "allocation_comparison"
          ? allocationState
          : capability.key === "proposal_risk_lens"
            ? riskState
            : capability.key === "decision_posture"
              ? decisionState
              : capability.key === "workflow_gate"
                ? effectiveWorkflowGateState
                : capability.state;
      return {
        key: capability.key,
        name: capability.label,
        status: supportabilityLabel(reconciledCoreState),
        tone: supportabilityTone(reconciledCoreState),
      };
    }),
    lineage: {
      correlationId: envelope.correlation_id,
      contractVersion: envelope.contract_version,
      decisionSupportReference: data.decision.support_reference,
      workflowGateSupportReference: data.workflow_gate.support_reference,
      capabilitySupportReferences: data.capabilities
        .filter(
          (capability) =>
            capability.support_reference &&
            capability.support_reference !== data.decision.support_reference &&
            capability.support_reference !==
              data.workflow_gate.support_reference,
        )
        .map((capability) => ({
          key: capability.key,
          label: `${capability.label} support reference`,
          value: capability.support_reference as string,
        })),
      proposalVersionId: data.lineage.proposal_version_id,
      requestHash: data.lineage.request_hash ?? "Not reported",
      artifactHash: data.lineage.artifact_hash ?? "Not reported",
      simulationHash: data.lineage.simulation_hash ?? "Not reported",
    },
  };
}

function reconcileOverallState(
  data: ProposalRiskImpactData,
): ProposalRiskImpactOverallState {
  const coreSectionStates = [
    data.allocation.state,
    data.risk.state,
    data.decision.state,
    data.workflow_gate.state,
  ];
  const hasUsableCoreEvidence = coreSectionStates.some(
    (state) => state === "ready" || state === "partial",
  );

  if (data.overall_state === "unavailable" || !hasUsableCoreEvidence) {
    return "unavailable";
  }
  if (
    data.overall_state === "partial" ||
    coreSectionStates.some((state) => state !== "ready")
  ) {
    return "partial";
  }
  return "ready";
}

function reconcileSectionState(
  overallState: ProposalRiskImpactOverallState,
  sectionState: ProposalRiskImpactSectionState,
): ProposalRiskImpactSectionState {
  return overallState === "unavailable" ? "unavailable" : sectionState;
}

function allocationRows(
  current: ProposalRiskImpactAllocationSnapshot | null,
  proposed: ProposalRiskImpactAllocationSnapshot | null,
): ProposalRiskImpactAllocationRow[] {
  const orderedKeys = [
    ...(current?.buckets.map(({ key }) => key) ?? []),
    ...(proposed?.buckets.map(({ key }) => key) ?? []),
  ].filter((key, index, values) => values.indexOf(key) === index);

  return orderedKeys.map((key) => {
    const currentBucket = current?.buckets.find((bucket) => bucket.key === key);
    const proposedBucket = proposed?.buckets.find(
      (bucket) => bucket.key === key,
    );
    return {
      key,
      label: businessLabel(key),
      currentWeight: formatWeight(currentBucket?.weight),
      currentValue: formatMoney(currentBucket?.value),
      currentPositions: formatPositions(currentBucket?.position_count),
      currentBarWidth: visualWeight(currentBucket?.weight),
      proposedWeight: formatWeight(proposedBucket?.weight),
      proposedValue: formatMoney(proposedBucket?.value),
      proposedPositions: formatPositions(proposedBucket?.position_count),
      proposedBarWidth: visualWeight(proposedBucket?.weight),
    };
  });
}

function supportabilityPresentation(state: ProposalRiskImpactSectionState) {
  return { label: supportabilityLabel(state), tone: supportabilityTone(state) };
}

function supportabilityLabel(
  state:
    | ProposalRiskImpactSectionState
    | ProposalRiskImpactEnvelope["data"]["overall_state"],
) {
  switch (state) {
    case "ready":
      return "Source evidence ready";
    case "partial":
      return "Partial source evidence";
    case "not_supported":
      return "Not supported";
    default:
      return "Source evidence unavailable";
  }
}

function supportabilityTone(
  state:
    ProposalRiskImpactSectionState | ProposalRiskImpactData["overall_state"],
): SemanticBadgeTone {
  if (state === "ready") return "success";
  if (state === "unavailable") return "danger";
  return "warn";
}

function severityTone(severity: ProposalRiskImpactSeverity): SemanticBadgeTone {
  if (severity === "HIGH") return "danger";
  if (severity === "MEDIUM") return "warn";
  return "default";
}

function allocationSourceLabel(data: ProposalRiskImpactData): string {
  if (data.allocation.source_mode === "LOTUS_CORE")
    return "Core allocation calculation";
  if (data.allocation.source_mode === "LOTUS_ADVISE_LOCAL_FALLBACK") {
    return "Advisory fallback calculation";
  }
  return data.allocation.source_service ?? "Source not reported";
}

function formatDate(value: string | null): string {
  if (!value) return "Not reported";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMoney(
  value: { amount: string; currency: string } | null | undefined,
): string {
  if (!value) return "Not reported";
  const [whole, fraction] = value.amount.split(".");
  const sign = whole.startsWith("-") ? "-" : "";
  const unsignedWhole = sign ? whole.slice(1) : whole;
  const grouped = unsignedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${value.currency} ${sign}${grouped}${fraction ? `.${fraction}` : ""}`;
}

function formatWeight(value: string | undefined): string {
  if (!value) return "Not reported";
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const digits = `${whole}${fraction}`.padEnd(whole.length + 2, "0");
  const point = whole.length + 2;
  const percentWhole = digits.slice(0, point).replace(/^0+(?=\d)/, "") || "0";
  const percentFraction = digits.slice(point).replace(/0+$/, "");
  return `${negative ? "-" : ""}${percentWhole}${percentFraction ? `.${percentFraction}` : ""}%`;
}

function visualWeight(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed * 100)) : 0;
}

function formatPositions(value: number | undefined): string {
  if (value === undefined) return "Not reported";
  return `${value} ${value === 1 ? "position" : "positions"}`;
}

function businessLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
