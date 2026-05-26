import type { SemanticBadgeTone } from "@/design-system";

import type {
  AdvisoryPolicyEvaluationRecord,
  AdvisoryPolicySignOffPackageData,
} from "./types";

export type PolicyReviewQueueRow = {
  evaluationId: string;
  proposalId: string;
  proposalVersion: string;
  policyPack: string;
  policyStatus: string;
  policyStatusTone: SemanticBadgeTone;
  signOffStatus: string;
  signOffTone: SemanticBadgeTone;
  openRequirements: string;
  nextAction: string;
  evidencePosture: string;
  href: string;
};

export type PolicyReviewQueueModel = {
  totalCount: number;
  actionCount: number;
  rows: PolicyReviewQueueRow[];
};

export type PolicyEvaluationEvidenceModel = {
  evaluationId: string;
  policyStatus: string;
  policyStatusTone: SemanticBadgeTone;
  sourcePosture: string;
  sourceRefs: string[];
  sourceGaps: string[];
  ruleCount: number;
  blockingRuleCount: number;
  approvalDependencies: string[];
  disclosureRequirements: string[];
  consentRequirements: string[];
  auditEventCount: number;
  signOffPackagePosture: string;
  clientPublicationPosture: string;
  nextAction: string;
};

export function buildPolicyReviewQueueModel({
  records,
}: {
  records: AdvisoryPolicyEvaluationRecord[];
}): PolicyReviewQueueModel {
  const rows = records.map((record) => {
    const proposalId = stringValue(record.proposal_id, "Proposal not reported");
    const policyStatus = policyStatusLabel(record.evaluation_status);
    const approvalDependencies = stringArray(record.approval_dependencies);
    const disclosureRequirements = stringArray(record.disclosure_requirements);
    const consentRequirements = stringArray(record.consent_requirements);
    const sourceGaps = stringArray(record.source_gaps);

    return {
      evaluationId: stringValue(record.evaluation_id, "Evaluation not reported"),
      proposalId,
      proposalVersion: stringValue(record.proposal_version_id, "Version not reported"),
      policyPack: policyLabel(record.policy_pack_id, record.policy_version),
      policyStatus,
      policyStatusTone: policyStatusTone(record.evaluation_status),
      signOffStatus: signOffStatus(record),
      signOffTone: signOffTone(record),
      openRequirements: requirementSummary({
        approvalDependencies,
        disclosureRequirements,
        consentRequirements,
      }),
      nextAction: nextAction({
        policyStatus: record.evaluation_status,
        approvalDependencies,
        disclosureRequirements,
        consentRequirements,
      }),
      evidencePosture: evidencePosture(sourceGaps),
      href: `/proposals/${encodeURIComponent(proposalId)}`,
    };
  });

  return {
    totalCount: rows.length,
    actionCount: rows.filter((row) => row.policyStatus !== "Ready").length,
    rows,
  };
}

export function buildPolicyEvaluationEvidenceModel({
  evaluation,
  signOffPackage,
}: {
  evaluation?: AdvisoryPolicyEvaluationRecord | null;
  signOffPackage?: AdvisoryPolicySignOffPackageData | null;
}): PolicyEvaluationEvidenceModel | null {
  if (!evaluation) {
    return null;
  }

  const sourceRefs = stringArray(evaluation.source_refs);
  const sourceGaps = stringArray(evaluation.source_gaps);
  const ruleResults = recordArray(recordValue(evaluation.evaluation_json)?.rule_results);
  const packagePosture = recordValue(signOffPackage?.package_posture);
  const lineage = recordValue(signOffPackage?.lineage);
  const lineagePosture = recordValue(lineage?.lineage_posture);
  const auditEvents = recordArray(lineage?.audit_events);
  const approvalDependencies = stringArray(evaluation.approval_dependencies);
  const disclosureRequirements = stringArray(evaluation.disclosure_requirements);
  const consentRequirements = stringArray(evaluation.consent_requirements);

  return {
    evaluationId: stringValue(evaluation.evaluation_id, "Evaluation not reported"),
    policyStatus: policyStatusLabel(evaluation.evaluation_status),
    policyStatusTone: policyStatusTone(evaluation.evaluation_status),
    sourcePosture: evidencePosture(sourceGaps),
    sourceRefs: sourceRefs.map(friendlySourceRef).slice(0, 4),
    sourceGaps: sourceGaps.map(friendlyRequirement).slice(0, 4),
    ruleCount: ruleResults.length,
    blockingRuleCount: ruleResults.filter((rule) => policyStatusTone(rule.status) === "danger").length,
    approvalDependencies: approvalDependencies.map(friendlyRequirement).slice(0, 4),
    disclosureRequirements: disclosureRequirements.map(friendlyRequirement).slice(0, 4),
    consentRequirements: consentRequirements.map(friendlyRequirement).slice(0, 4),
    auditEventCount: auditEvents.length,
    signOffPackagePosture: signOffPackagePosture(packagePosture),
    clientPublicationPosture: clientPublicationPosture(packagePosture, lineagePosture),
    nextAction: nextAction({
      policyStatus: evaluation.evaluation_status,
      approvalDependencies,
      disclosureRequirements,
      consentRequirements,
    }),
  };
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function policyLabel(policyPackId: unknown, policyVersion: unknown): string {
  const pack = friendlyPhrase(stringValue(policyPackId, "Policy pack not reported"));
  const version = stringValue(policyVersion, "");
  return version ? `${pack} / ${version}` : pack;
}

function policyStatusLabel(status: unknown): string {
  switch (status) {
    case "READY":
      return "Ready";
    case "PENDING_REVIEW":
      return "Review required";
    case "BLOCKED":
      return "Blocked";
    case "NOT_APPLICABLE":
      return "Not applicable";
    default:
      return "Needs review";
  }
}

function policyStatusTone(status: unknown): SemanticBadgeTone {
  switch (status) {
    case "READY":
    case "NOT_APPLICABLE":
      return "success";
    case "BLOCKED":
      return "danger";
    case "PENDING_REVIEW":
      return "warn";
    default:
      return "default";
  }
}

function signOffStatus(record: AdvisoryPolicyEvaluationRecord): string {
  if (Array.isArray(record.sign_off_events_json) && record.sign_off_events_json.length > 0) {
    return "Sign-off recorded";
  }
  if (record.evaluation_status === "READY") {
    return "Ready for sign-off";
  }
  return "Sign-off pending";
}

function signOffTone(record: AdvisoryPolicyEvaluationRecord): SemanticBadgeTone {
  if (Array.isArray(record.sign_off_events_json) && record.sign_off_events_json.length > 0) {
    return "success";
  }
  return record.evaluation_status === "READY" ? "success" : "warn";
}

function requirementSummary({
  approvalDependencies,
  disclosureRequirements,
  consentRequirements,
}: {
  approvalDependencies: string[];
  disclosureRequirements: string[];
  consentRequirements: string[];
}): string {
  const parts = [
    countPhrase(approvalDependencies.length, "approval dependency", "approval dependencies"),
    countPhrase(disclosureRequirements.length, "disclosure review", "disclosure reviews"),
    countPhrase(consentRequirements.length, "client consent", "client consents"),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No open requirements reported";
}

function countPhrase(count: number, singular: string, plural: string): string | null {
  if (count === 0) {
    return null;
  }
  return `${count} ${count === 1 ? singular : plural}`;
}

function nextAction({
  policyStatus,
  approvalDependencies,
  disclosureRequirements,
  consentRequirements,
}: {
  policyStatus: unknown;
  approvalDependencies: string[];
  disclosureRequirements: string[];
  consentRequirements: string[];
}): string {
  if (policyStatus === "BLOCKED") {
    return "Resolve blocking policy evidence before advisor sign-off.";
  }
  if (approvalDependencies.length > 0) {
    return "Complete required approval review.";
  }
  if (disclosureRequirements.length > 0) {
    return "Complete disclosure review.";
  }
  if (consentRequirements.length > 0) {
    return "Confirm client consent evidence.";
  }
  if (policyStatus === "READY") {
    return "Record sign-off when maker-checker review is complete.";
  }
  return "Review policy evidence before client discussion.";
}

function evidencePosture(sourceGaps: string[]): string {
  if (sourceGaps.length === 0) {
    return "Source evidence complete";
  }
  return `${sourceGaps.length} evidence ${sourceGaps.length === 1 ? "gap" : "gaps"}`;
}

function signOffPackagePosture(posture: Record<string, unknown> | null): string {
  const sourcePackage = stringValue(posture?.sign_off_source_package, "");
  if (sourcePackage.includes("SUPPORTED")) {
    return "Source package available";
  }
  return "Source package posture not reported";
}

function clientPublicationPosture(
  packagePosture: Record<string, unknown> | null,
  lineagePosture: Record<string, unknown> | null
): string {
  const value =
    stringValue(packagePosture?.client_ready_publication, "") ||
    stringValue(lineagePosture?.client_ready_publication, "");
  return value === "BLOCKED" ? "Client publication blocked" : "Client publication not supported";
}

function friendlySourceRef(value: string): string {
  return friendlyPhrase(value.replace(/^lotus-[^:]+:/, "").replace(/^lotus-/, ""));
}

function friendlyRequirement(value: string): string {
  return friendlyPhrase(value.replace(/^[^:]+:/, ""));
}

function friendlyPhrase(value: string): string {
  if (!value || value === "Policy pack not reported") {
    return value;
  }
  return value
    .split(/[_:\s-]+/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 3
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(" ");
}
