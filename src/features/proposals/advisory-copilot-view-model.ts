import type { SemanticBadgeTone } from "@/design-system";

import type {
  AdvisoryCopilotActionFamily,
  AdvisoryCopilotEvidencePacketData,
  AdvisoryCopilotRunData,
  AdvisoryCopilotSupportabilityData,
  ProposalSummary,
} from "./types";

export type AdvisoryCopilotActionOption = {
  family: AdvisoryCopilotActionFamily;
  label: string;
  purpose: string;
  outputKey: string;
  intent: string;
};

export const ADVISORY_COPILOT_ACTION_OPTIONS: AdvisoryCopilotActionOption[] = [
  {
    family: "PROPOSAL_EXPLANATION",
    label: "Proposal explanation",
    purpose: "Summarize the advisor-use proposal evidence and blockers.",
    outputKey: "advisor_review_summary",
    intent: "explain_policy_posture",
  },
  {
    family: "EVIDENCE_QA",
    label: "Evidence Q&A",
    purpose: "Answer bounded evidence questions from cited source posture.",
    outputKey: "evidence_answer",
    intent: "answer_source_evidence_question",
  },
  {
    family: "MEETING_PREPARATION",
    label: "Meeting preparation",
    purpose: "Prepare an internal meeting note from available source evidence.",
    outputKey: "meeting_preparation_note",
    intent: "prepare_meeting_review",
  },
  {
    family: "COMPLIANCE_REVIEW_SUMMARY",
    label: "Compliance review summary",
    purpose: "Summarize policy review posture for compliance review.",
    outputKey: "compliance_review_summary",
    intent: "summarize_compliance_review",
  },
  {
    family: "OPERATIONS_REPORT_HANDOFF",
    label: "Operations handoff",
    purpose: "Summarize report and operations handoff evidence.",
    outputKey: "operations_handoff_summary",
    intent: "summarize_operations_handoff",
  },
  {
    family: "CLIENT_FOLLOW_UP_DRAFT",
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
  run?: AdvisoryCopilotRunData;
}): AdvisoryCopilotWorkspaceModel {
  const proposal = proposals[0];
  const supportedFamilies = new Set(supportability?.supported_action_families ?? []);
  const availableActions = ADVISORY_COPILOT_ACTION_OPTIONS.filter(
    (option) => supportedFamilies.size === 0 || supportedFamilies.has(option.family),
  );
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
      text: section.text ?? "No advisor-use output returned.",
    })),
    reviewGuidance: runBody?.review_guidance_json ?? [],
    guardrailResults: (runBody?.guardrail_results_json ?? []).map(formatCode),
    runPosture: formatCode(runBody?.review_posture ?? "No run yet"),
    runTone: reviewTone(runBody?.review_posture),
    clientReadyPosture: formatCode(runBody?.client_ready_publication ?? "BLOCKED"),
  };
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
