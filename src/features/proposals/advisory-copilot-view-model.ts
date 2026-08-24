import {
  createAiAssistanceDisclosure,
  type AiAssistanceDisclosureModel,
  type SemanticBadgeTone,
} from "@/design-system";
import { formatTimestampValue } from "@/design-system/utils/financial-formatters";

import type {
  AdvisoryCopilotAudience,
  AdvisoryCopilotActionFamily,
  AdvisoryCopilotEvidencePacketData,
  AdvisoryCopilotReviewData,
  AdvisoryCopilotRunData,
  AdvisoryCopilotReviewRecord,
  AdvisoryCopilotSupportabilityData,
  ProposalSummary,
} from "./types";

type AdvisoryCopilotResultData = AdvisoryCopilotRunData | AdvisoryCopilotReviewData;

export type AdvisoryCopilotActionOption = {
  family: AdvisoryCopilotActionFamily;
  audience: AdvisoryCopilotAudience;
  label: string;
  purpose: string;
  outputKey: string;
  intent: string;
};

export const ADVISORY_COPILOT_ACTION_OPTIONS: AdvisoryCopilotActionOption[] = [
  {
    family: "PROPOSAL_EXPLANATION",
    audience: "ADVISOR",
    label: "Proposal explanation",
    purpose: "Summarize the advisor-use proposal evidence and blockers.",
    outputKey: "advisor_review_summary",
    intent: "explain_policy_posture",
  },
  {
    family: "EVIDENCE_QA",
    audience: "ADVISOR",
    label: "Evidence Q&A",
    purpose: "Answer bounded evidence questions from cited source posture.",
    outputKey: "evidence_answer",
    intent: "answer_source_evidence_question",
  },
  {
    family: "MEETING_PREPARATION",
    audience: "ADVISOR",
    label: "Meeting preparation",
    purpose: "Prepare an internal meeting note from available source evidence.",
    outputKey: "meeting_preparation_note",
    intent: "prepare_meeting_review",
  },
  {
    family: "COMPLIANCE_REVIEW_SUMMARY",
    audience: "COMPLIANCE_REVIEWER",
    label: "Compliance review summary",
    purpose: "Summarize policy review posture for compliance review.",
    outputKey: "compliance_review_summary",
    intent: "summarize_compliance_review",
  },
  {
    family: "OPERATIONS_REPORT_HANDOFF",
    audience: "OPERATIONS_SUPPORT",
    label: "Operations handoff",
    purpose: "Summarize report and operations handoff evidence.",
    outputKey: "operations_handoff_summary",
    intent: "summarize_operations_handoff",
  },
  {
    family: "CLIENT_FOLLOW_UP_DRAFT",
    audience: "ADVISOR",
    label: "Follow-up draft",
    purpose: "Draft advisor-reviewed follow-up points without external delivery.",
    outputKey: "advisor_follow_up_draft",
    intent: "draft_internal_follow_up",
  },
];

export type AdvisoryCopilotWorkspaceModel = {
  proposal?: ProposalSummary;
  availableActions: AdvisoryCopilotActionOption[];
  supportabilityRows: Array<{ label: string; value: string; tone: SemanticBadgeTone }>;
  packetSections: Array<{ title: string; summary: string }>;
  unsupportedEvidence: string[];
  runSections: Array<{ title: string; text: string }>;
  reviewGuidance: string[];
  guardrailResults: string[];
  runPosture: string;
  runTone: SemanticBadgeTone;
  clientReadyPosture: string;
  aiDisclosure: AiAssistanceDisclosureModel;
};

export function buildAdvisoryCopilotWorkspaceModel({
  proposals,
  supportability,
  packet,
  run,
}: {
  proposals: ProposalSummary[];
  supportability?: AdvisoryCopilotSupportabilityData;
  packet?: AdvisoryCopilotEvidencePacketData;
  run?: AdvisoryCopilotResultData;
}): AdvisoryCopilotWorkspaceModel {
  const proposal = proposals[0];
  const supportabilityFamilies = supportability?.supported_action_families;
  const supportedFamilies = new Set(supportabilityFamilies ?? []);
  const availableActions =
    Array.isArray(supportabilityFamilies) && supportabilityFamilies.length > 0
      ? ADVISORY_COPILOT_ACTION_OPTIONS.filter((option) =>
          supportedFamilies.has(option.family),
        )
      : [];
  const packetBody = packet?.evidence_packet;
  const runBody = run?.run;
  return {
    proposal,
    availableActions,
    supportabilityRows: [
      {
        label: "Copilot posture",
        value: formatCode(supportability?.support_status ?? "Not reported"),
        tone: supportability?.support_status ? "success" : "warn",
      },
      {
        label: "Client publication",
        value: formatCode(supportability?.client_ready_publication ?? "BLOCKED"),
        tone: "warn",
      },
      {
        label: "Available actions",
        value: String(availableActions.length),
        tone: availableActions.length > 0 ? "success" : "warn",
      },
      {
        label: "Active proposal",
        value: proposal?.proposal_id ?? "No proposal selected",
        tone: proposal ? "success" : "warn",
      },
    ],
    packetSections: (packetBody?.sections ?? []).map((section) => ({
      title: section.title ?? formatCode(section.section_key ?? "Evidence section"),
      summary: (section.summary_items ?? []).join(" "),
    })),
    unsupportedEvidence: (packetBody?.unsupported_evidence ?? []).map(
      (item) => item.advisor_message ?? formatCode(item.reason_code ?? "Evidence unavailable"),
    ),
    runSections: (runBody?.output_sections_json ?? []).map((section) => ({
      title: section.title ?? formatCode(section.section_key ?? "Copilot section"),
      text: nonEmptyString(section.text) ?? "No advisor-use output returned.",
    })),
    reviewGuidance: runBody?.review_guidance_json ?? [],
    guardrailResults: (runBody?.guardrail_results_json ?? []).map(formatCode),
    runPosture: formatCode(runBody?.review_posture ?? "No run yet"),
    runTone: reviewTone(runBody?.review_posture),
    clientReadyPosture: formatCode(runBody?.client_ready_publication ?? "BLOCKED"),
    aiDisclosure: buildCopilotAiDisclosure(packet, run),
  };
}

function buildCopilotAiDisclosure(
  packet: AdvisoryCopilotEvidencePacketData | undefined,
  run: AdvisoryCopilotResultData | undefined,
): AiAssistanceDisclosureModel {
  const runBody = run?.run;
  const outputAvailable = Boolean(
    runBody?.output_sections_json?.some((section) => nonEmptyString(section.text)),
  );
  const workflowRunId = runBody?.lotus_ai_workflow_run_id ?? null;
  const evidencePacketId =
    runBody?.evidence_packet_id ?? packet?.evidence_packet?.evidence_packet_id;
  const evidencePacketHash =
    runBody?.evidence_packet_hash ?? packet?.evidence_packet?.evidence_packet_hash;
  const evidenceSourceCount = countDistinctCopilotSourceRefs(packet);
  const singularReview = run?.review;
  const reviewHistory = Array.isArray(run?.reviews) ? run.reviews : [];
  const hasSingularReview = singularReview !== undefined && singularReview !== null;
  const reviewRecord = isSourceRecordedReview(singularReview)
    ? singularReview
    : hasSingularReview
      ? undefined
      : reviewHistory.find(isSourceRecordedReview);
  const reviewPosture = runBody?.review_posture;
  const humanReview = mapCopilotReview(reviewPosture, reviewRecord);
  const hasAiProvenance = Boolean(workflowRunId && outputAvailable);
  const unsupportedEvidence = packet?.evidence_packet?.unsupported_evidence ?? [];
  const limitations = [
    ...unsupportedEvidence.map(
      (item) => item.advisor_message ?? formatCode(item.reason_code ?? "Evidence unavailable"),
    ),
    ...(!runBody
      ? ["No advisory-assistance output has been requested for this proposal scope."]
      : []),
    ...(outputAvailable && !workflowRunId
      ? ["The source returned output without a Lotus AI workflow-run reference."]
      : []),
    ...(outputAvailable && evidenceSourceCount === 0
      ? ["The evidence packet did not publish source references for this output."]
      : []),
    ...(reviewPosture === "APPROVED_FOR_INTERNAL_USE" && !reviewRecord
      ? ["The source did not publish reviewer identity and review time with this response."]
      : []),
  ];
  const diagnostics = [
    runBody?.run_id ? { label: "Advisory run", value: runBody.run_id } : null,
    workflowRunId ? { label: "AI workflow run", value: workflowRunId } : null,
    runBody?.workflow_pack_id
      ? {
          label: "Workflow pack",
          value: `${runBody.workflow_pack_id}${runBody.workflow_pack_version ? `@${runBody.workflow_pack_version}` : ""}`,
        }
      : null,
    runBody?.created_at
      ? {
          label: "Prepared",
          value: formatTimestampValue(runBody.created_at, {
            nullDisplay: "Not reported",
          }),
        }
      : null,
    evidencePacketId ? { label: "Evidence packet", value: evidencePacketId } : null,
    evidencePacketHash ? { label: "Evidence packet hash", value: evidencePacketHash } : null,
    runBody?.output_hash ? { label: "Output hash", value: runBody.output_hash } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return createAiAssistanceDisclosure({
    scopeLabel: "Advisory Copilot output",
    preparation: !runBody
      ? "unavailable"
      : hasAiProvenance
        ? "ai-assisted"
        : outputAvailable
          ? "unavailable"
          : "requested",
    availability: !runBody || !outputAvailable
      ? "unavailable"
      : hasAiProvenance
        ? "live"
        : "partial",
    evidence: {
      state:
        evidenceSourceCount === 0
          ? "missing"
          : unsupportedEvidence.length > 0
            ? "limited"
            : "supported",
      sourceCount: evidenceSourceCount,
    },
    humanReview,
    clientUse: mapClientUse(runBody?.client_ready_publication),
    freshness: { state: "not-reported" },
    limitations,
    diagnostics,
  });
}

function countDistinctCopilotSourceRefs(
  packet: AdvisoryCopilotEvidencePacketData | undefined,
): number {
  const sourceIdentities = new Set<string>();
  for (const section of packet?.evidence_packet?.sections ?? []) {
    for (const sourceRef of section.source_refs ?? []) {
      const sourceSystem = nonEmptyString(sourceRef.source_system);
      const sourceType = nonEmptyString(sourceRef.source_type);
      const sourceId = nonEmptyString(sourceRef.source_id);
      const accessClass = nonEmptyString(sourceRef.access_class);
      if (!sourceSystem || !sourceType || !sourceId || !accessClass) {
        continue;
      }
      sourceIdentities.add(`${sourceSystem}\u0000${sourceType}\u0000${sourceId}\u0000${accessClass}`);
    }
  }
  return sourceIdentities.size;
}

function isSourceRecordedReview(
  review: unknown,
): review is AdvisoryCopilotReviewRecord {
  if (!review || typeof review !== "object") {
    return false;
  }
  const candidate = review as Partial<AdvisoryCopilotReviewRecord>;
  return Boolean(
    nonEmptyString(candidate.actor_id) && nonEmptyString(candidate.occurred_at),
  );
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapCopilotReview(
  posture: string | undefined,
  reviewRecord: AdvisoryCopilotReviewRecord | undefined,
) {
  if (posture === "APPROVED_FOR_INTERNAL_USE") {
    return reviewRecord
      ? {
          state: "reviewed" as const,
          sourceRecorded: true,
          actor: reviewRecord.actor_id,
          occurredAt: reviewRecord.occurred_at,
        }
      : { state: "unavailable" as const, sourceRecorded: false };
  }
  if (posture === "REVIEW_REQUIRED") {
    return { state: "review-required" as const, sourceRecorded: false };
  }
  if (posture === "REJECTED") {
    return {
      state: "rejected" as const,
      sourceRecorded: Boolean(reviewRecord),
      ...(reviewRecord?.actor_id ? { actor: reviewRecord.actor_id } : {}),
      ...(reviewRecord?.occurred_at ? { occurredAt: reviewRecord.occurred_at } : {}),
    };
  }
  return { state: "unavailable" as const, sourceRecorded: false };
}

function mapClientUse(value: string | undefined) {
  switch (value) {
    case "APPROVED":
    case "CLIENT_READY":
      return "approved" as const;
    case "ELIGIBLE_AFTER_REVIEW":
      return "eligible-after-review" as const;
    case "INTERNAL_ONLY":
      return "internal-only" as const;
    case "BLOCKED":
      return "blocked" as const;
    default:
      return "unavailable" as const;
  }
}

export function formatCode(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Not reported";
  }
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => ACRONYMS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/\bClient Ready\b/g, "Client-ready")
    .replace(/\bQa\b/g, "Q&A");
}

function reviewTone(value: unknown): SemanticBadgeTone {
  switch (value) {
    case "APPROVED_FOR_INTERNAL_USE":
      return "success";
    case "REJECTED":
    case "GUARDRAIL_REJECTED":
      return "danger";
    case "REVIEW_REQUIRED":
    case "UNAVAILABLE":
    case "UNSUPPORTED":
      return "warn";
    default:
      return "default";
  }
}

const ACRONYMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  qa: "Q&A",
  oms: "OMS",
  rfc0027: "RFC 0027",
};
