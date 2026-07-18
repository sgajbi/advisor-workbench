import type { SemanticBadgeTone } from "@/design-system";

import type {
  AdvisorCockpitActionItem,
  AdvisorCockpitActionPageData,
  AdvisorCockpitDependencyReadiness,
  AdvisorCockpitPreparationPacketPageData,
  AdvisorCockpitPreparationPacket,
  AdvisorCockpitSnapshotData,
  AdvisorCockpitSourceReadinessGap,
  AdvisorCockpitSupportabilityData,
} from "./types";
import {
  presentAdvisorCockpitOperatingBoundary,
  presentAdvisorCockpitReadiness,
  type AdvisorCockpitOperatingBoundaryPresentation,
  type AdvisorCockpitReadinessState,
} from "./advisor-cockpit-readiness-presentation";

export type AdvisorCockpitActionRow = {
  actionItemId: string;
  actionItemVersion: number;
  title: string;
  status: string;
  statusTone: SemanticBadgeTone;
  priority: string;
  priorityTone: SemanticBadgeTone;
  owner: string;
  family: string;
  sla: string;
  nextRequiredAction: string;
  reasonSummary: string;
  evidenceSummary: string;
  sourceGapSummary: string;
  dependencySummary: string;
  unsupportedClaims: string;
  acknowledgementLabel: string;
  acknowledgementDetail: string;
  canAcknowledge: boolean;
};

export type AdvisorCockpitMetric = {
  label: string;
  value: string;
  detail: string;
  tone: SemanticBadgeTone;
};

export type AdvisorCockpitActionPosture =
  | "actionable"
  | "details-unavailable"
  | "clear";

export type AdvisorCockpitPreparationPosture =
  | "available"
  | "details-unavailable"
  | "clear";

export type AdvisorCockpitReadinessRow = {
  label: string;
  value: string;
  detail: string;
  tone: SemanticBadgeTone;
  state: AdvisorCockpitReadinessState;
};

export type AdvisorCockpitSupportDetail = {
  label: string;
  value: string;
};

export type AdvisorCockpitModel = {
  title: string;
  primaryDecision: string;
  recommendedAction: string;
  metrics: AdvisorCockpitMetric[];
  actionRows: AdvisorCockpitActionRow[];
  preparationRows: Array<{
    packetId: string;
    context: string;
    status: string;
    evidenceSummary: string;
  }>;
  supportabilityRows: AdvisorCockpitReadinessRow[];
  operatingBoundaries: AdvisorCockpitOperatingBoundaryPresentation[];
  supportDetails: AdvisorCockpitSupportDetail[];
  unsupportedClaims: string[];
  actionCount: number | null;
  actionPosture: AdvisorCockpitActionPosture;
  preparationCount: number | null;
  preparationPosture: AdvisorCockpitPreparationPosture;
};

export function buildAdvisorCockpitModel({
  snapshot,
  actionPage,
  preparationPage,
  supportability,
}: {
  snapshot?: AdvisorCockpitSnapshotData;
  actionPage?: AdvisorCockpitActionPageData;
  preparationPage?: AdvisorCockpitPreparationPacketPageData;
  supportability?: AdvisorCockpitSupportabilityData;
}): AdvisorCockpitModel {
  const actions = actionPage?.items ?? snapshot?.top_priority_actions ?? [];
  const actionCounts = snapshot?.action_counts ?? {};
  const pendingCount = countFromSnapshot(actionCounts, "status.PENDING_REVIEW");
  const blockedCount = countFromSnapshot(actionCounts, "status.BLOCKED");
  const highPriorityCount =
    countFromSnapshot(actionCounts, "priority.CRITICAL") +
    countFromSnapshot(actionCounts, "priority.HIGH");
  const reportedActionCount =
    typeof actionPage?.total_count === "number"
      ? actionPage.total_count
      : null;
  const actionPosture: AdvisorCockpitActionPosture =
    actions.length > 0
      ? "actionable"
      : reportedActionCount === 0
        ? "clear"
        : "details-unavailable";
  const preparationPackets =
    preparationPage?.items ?? snapshot?.preparation_packets ?? [];
  const reportedPreparationCount =
    typeof preparationPage?.total_count === "number"
      ? preparationPage.total_count
      : null;
  const preparationPosture: AdvisorCockpitPreparationPosture =
    preparationPackets.length > 0
      ? "available"
      : reportedPreparationCount === 0
        ? "clear"
        : "details-unavailable";
  const supportabilityPosture =
    supportability?.posture ??
    stringValue(snapshot?.supportability?.cockpit_api) ??
    stringValue(snapshot?.supportability?.api);
  const supportabilityModel = buildSupportabilityModel(
    snapshot,
    supportability,
    supportabilityPosture,
  );
  const operatingBoundaries = Array.from(
    new Set([
      ...(snapshot?.unsupported_capabilities ?? []),
      ...(supportability?.unsupported_capabilities ?? []),
    ]),
  ).map(presentAdvisorCockpitOperatingBoundary);
  const topAction = actions[0];

  return {
    title: "Advisor Cockpit",
    primaryDecision:
      topAction?.title ??
      (actionPosture === "details-unavailable"
        ? "Action review details unavailable"
        : "No advisor actions require review"),
    recommendedAction:
      topAction?.next_required_action ??
      (actionPosture === "details-unavailable"
        ? reportedActionCount === null
          ? "The action scope is not reported. Refresh or verify source readiness before client discussion."
          : `${formatActionCount(reportedActionCount)} in scope. Refresh or verify source readiness before client discussion.`
        : "Continue with source-backed preparation and supportability review."),
    metrics: [
      {
        label: "Actions in scope",
        value:
          reportedActionCount !== null
            ? String(reportedActionCount)
            : actions.length > 0
              ? `At least ${actions.length}`
              : "Not reported",
        detail:
          reportedActionCount !== null
            ? "Source-reported actions for the selected portfolio."
            : actions.length > 0
              ? "Loaded actions are visible; the full source scope is not reported."
              : "Source action scope is not reported for the selected portfolio.",
        tone:
          reportedActionCount === 0
            ? "success"
            : reportedActionCount !== null || actions.length > 0
              ? "warn"
              : "default",
      },
      {
        label: "Pending review",
        value: String(pendingCount),
        detail: "Source-reported actions awaiting review.",
        tone: pendingCount > 0 ? "warn" : "success",
      },
      {
        label: "Blocked",
        value: String(blockedCount),
        detail: "Source-reported actions with a blocking condition.",
        tone: blockedCount > 0 ? "danger" : "success",
      },
      {
        label: "High priority",
        value: String(highPriorityCount),
        detail: "Critical or high priority actions from Advise.",
        tone: highPriorityCount > 0 ? "danger" : "default",
      },
    ],
    actionRows: actions.map(toActionRow),
    preparationRows: preparationPackets.map(toPreparationRow),
    supportabilityRows: supportabilityModel.rows,
    operatingBoundaries,
    supportDetails: [
      ...supportabilityModel.details,
      ...operatingBoundaries.map((boundary, index) => ({
        label: `Operating boundary source value ${index + 1}`,
        value: boundary.rawValue,
      })),
    ],
    unsupportedClaims: operatingBoundaries.map((boundary) => boundary.label),
    actionCount: reportedActionCount,
    actionPosture,
    preparationCount: reportedPreparationCount,
    preparationPosture,
  };
}

function formatActionCount(count: number): string {
  return `${count} ${count === 1 ? "action is" : "actions are"} reported`;
}

function toActionRow(
  action: AdvisorCockpitActionItem,
): AdvisorCockpitActionRow {
  const acknowledged = Boolean(action.acknowledgement_state?.acknowledged);
  const externalOwner = action.owner_role !== "ADVISOR";
  return {
    actionItemId: action.action_item_id,
    actionItemVersion: action.action_item_version,
    title: action.title,
    status: formatStatus(action.status),
    statusTone: statusTone(action.status),
    priority: formatCode(action.priority),
    priorityTone: priorityTone(action.priority),
    owner: formatCode(action.owner_role),
    family: formatCode(action.action_family),
    sla: formatCode(action.sla_age_band ?? "NOT_APPLICABLE"),
    nextRequiredAction:
      action.next_required_action ?? "Follow source-owned next action.",
    reasonSummary: listCodes(action.reason_codes),
    evidenceSummary: summarizeEvidence(action.evidence_refs),
    sourceGapSummary: summarizeSourceGaps(action.source_readiness_gaps),
    dependencySummary: summarizeDependencies(action.dependency_readiness),
    unsupportedClaims: listCodes(action.unsupported_capabilities),
    acknowledgementLabel: acknowledged
      ? "Acknowledged"
      : externalOwner
        ? "External owner"
        : "Acknowledge review",
    acknowledgementDetail: acknowledged
      ? `Recorded by ${action.acknowledgement_state?.acknowledged_by ?? "source workflow"}`
      : externalOwner
        ? `${formatCode(action.owner_role)} remains the owning role.`
        : "Records review only; blockers remain source-owned.",
    canAcknowledge: !acknowledged && !externalOwner,
  };
}

function toPreparationRow(packet: AdvisorCockpitPreparationPacket) {
  return {
    packetId: packet.packet_id ?? "Preparation packet",
    context:
      `${formatCode(packet.context_type)} ${packet.context_ref ?? ""}`.trim(),
    status: formatStatus(packet.status),
    evidenceSummary: summarizeEvidence(packet.evidence_refs),
  };
}

function buildSupportabilityModel(
  snapshot: AdvisorCockpitSnapshotData | undefined,
  supportabilityResponse: AdvisorCockpitSupportabilityData | undefined,
  supportabilityPosture: string | undefined,
): {
  rows: AdvisorCockpitReadinessRow[];
  details: AdvisorCockpitSupportDetail[];
} {
  const supportability =
    snapshot?.supportability ?? supportabilityResponse?.supportability ?? {};
  const sources = [
    {
      kind: "overall" as const,
      label: "Internal preparation",
      value: supportabilityPosture,
    },
    {
      kind: "integration" as const,
      label: "Advisory information",
      value: stringValue(supportability.gateway_posture),
    },
    {
      kind: "workstation" as const,
      label: "Advisor workspace",
      value: stringValue(supportability.workbench_posture),
    },
    {
      kind: "data" as const,
      label: "Preparation data",
      value: stringValue(supportability.data_product_posture),
    },
    {
      kind: "client_publication" as const,
      label: "Client publication",
      value: stringValue(supportability.client_ready_publication),
    },
  ];

  const presentations = sources.map((source) => ({
    source,
    presentation: presentAdvisorCockpitReadiness(source.kind, source.value),
  }));

  return {
    rows: presentations.map(({ source, presentation }) => ({
      label: source.label,
      value: presentation.label,
      detail: presentation.detail,
      tone: presentation.tone,
      state: presentation.state,
    })),
    details: presentations
      .filter(({ presentation }) => presentation.rawValue !== null)
      .map(({ source, presentation }) => ({
        label: `${source.label} source value`,
        value: presentation.rawValue!,
      })),
  };
}

function countFromSnapshot(
  counts: Record<string, number>,
  key: string,
): number {
  return typeof counts[key] === "number" ? counts[key] : 0;
}

function summarizeEvidence(
  evidenceRefs: AdvisorCockpitActionItem["evidence_refs"],
): string {
  if (!evidenceRefs?.length) {
    return "No source evidence listed";
  }
  return evidenceRefs
    .slice(0, 3)
    .map(
      (ref) =>
        ref.summary ||
        ref.evidence_type ||
        ref.evidence_id ||
        "Source evidence",
    )
    .join("; ");
}

function summarizeSourceGaps(
  gaps: AdvisorCockpitSourceReadinessGap[] | undefined,
): string {
  if (!gaps?.length) {
    return "No source gaps reported";
  }
  return gaps
    .slice(0, 3)
    .map(
      (gap) => gap.message || gap.gap_code || gap.source_family || "Source gap",
    )
    .join("; ");
}

function summarizeDependencies(
  dependencies: AdvisorCockpitDependencyReadiness[] | undefined,
): string {
  if (!dependencies?.length) {
    return "No dependency degradation reported";
  }
  return dependencies
    .slice(0, 3)
    .map(
      (dependency) =>
        dependency.summary || dependency.reason_code || dependency.dependency,
    )
    .filter(Boolean)
    .join("; ");
}

function listCodes(values: string[] | undefined): string {
  if (!values?.length) {
    return "None reported";
  }
  return values.map(formatCode).join(", ");
}

function formatStatus(value: unknown): string {
  return formatCode(stringValue(value) ?? "UNKNOWN");
}

function formatCode(value: unknown): string {
  const text = stringValue(value);
  if (!text) {
    return "Not reported";
  }
  const label = text
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(formatCodePart)
    .join(" ");
  return label.replace(/\bClient Ready\b/g, "Client-ready");
}

function formatCodePart(part: string): string {
  const acronyms: Record<string, string> = {
    ai: "AI",
    api: "API",
    dpm: "DPM",
    esg: "ESG",
    kyc: "KYC",
    oms: "OMS",
    pm: "PM",
    rfc: "RFC",
    sla: "SLA",
  };
  if (acronyms[part]) {
    return acronyms[part];
  }
  const rfcMatch = part.match(/^rfc(\d+)$/);
  if (rfcMatch) {
    return `RFC ${rfcMatch[1]}`;
  }
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function statusTone(value: unknown): SemanticBadgeTone {
  switch (value) {
    case "READY":
    case "COMPLETED":
      return "success";
    case "BLOCKED":
      return "danger";
    case "PENDING_REVIEW":
    case "HANDOFF_REQUESTED":
      return "warn";
    default:
      return "default";
  }
}

function priorityTone(value: unknown): SemanticBadgeTone {
  switch (value) {
    case "CRITICAL":
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warn";
    case "LOW":
    case "INFORMATIONAL":
      return "default";
    default:
      return "default";
  }
}
