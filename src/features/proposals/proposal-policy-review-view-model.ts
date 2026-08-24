import type { SemanticBadgeTone } from "@/design-system";
import type { WorkspaceReviewContext } from "@/shell/review-context";

import type {
  AdvisoryPolicyEvaluationRecord,
  AdvisoryPolicySignOffPackageData,
  AdvisoryPolicyWorkflowData,
} from "./types";
import { buildProposalDetailHref } from "./proposal-lifecycle-workspace-view-model";
import { SUITABILITY_WORKFLOW_LABELS } from "./suitability-terminology";

export type PolicyReviewQueueRow = {
  evaluationId: string;
  portfolioId: string;
  proposalId: string;
  proposalVersion: string;
  sourceIdentityComplete: boolean;
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

export type PolicyReviewQueueEmptyPresentation = {
  kind: "empty" | "loading" | "partial";
  title: string;
  body: string;
};

export type PolicyEvaluationEvidenceModel = {
  evaluationId: string;
  proposalId: string;
  proposalVersion: string;
  policyPack: string;
  sourceIdentityAligned: boolean;
  sourceEvaluationHash: string | null;
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
  workflowStatus: string;
  workflowTone: SemanticBadgeTone;
  makerCheckerPosture: string;
  slaPosture: string;
  workflowBlockers: string[];
  nextAction: string;
};

export function resolvePolicyReviewSelection({
  rows,
  preferredEvaluationId,
}: {
  rows: PolicyReviewQueueRow[];
  preferredEvaluationId?: string | null;
}): string | null {
  if (
    preferredEvaluationId &&
    rows.some((row) => row.evaluationId === preferredEvaluationId)
  ) {
    return preferredEvaluationId;
  }

  return (
    rows
      .map((row) => row.evaluationId)
      .sort((left, right) => left.localeCompare(right))[0] ?? null
  );
}

export function buildPolicyReviewQueueModel({
  records,
  reviewContext,
}: {
  records: AdvisoryPolicyEvaluationRecord[];
  reviewContext?: WorkspaceReviewContext;
}): PolicyReviewQueueModel {
  const rows = records.map((record) => {
    const proposalId = stringValue(record.proposal_id, "Proposal not reported");
    const portfolioId = stringValue(record.portfolio_id, "");
    const policyStatus = policyStatusLabel(record.evaluation_status);
    const approvalDependencies = stringArray(record.approval_dependencies);
    const disclosureRequirements = stringArray(record.disclosure_requirements);
    const consentRequirements = stringArray(record.consent_requirements);
    const sourceGaps = stringArray(record.source_gaps);

    return {
      evaluationId: stringValue(
        record.evaluation_id,
        "Evaluation not reported",
      ),
      portfolioId: portfolioId || "Portfolio not reported",
      proposalId,
      proposalVersion: stringValue(
        record.proposal_version_id,
        "Version not reported",
      ),
      sourceIdentityComplete: requiredIdentityPresent([
        record.evaluation_id,
        record.portfolio_id,
        record.proposal_id,
        record.proposal_version_id,
      ]),
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
      href: buildProposalDetailHref({
        proposalId,
        reviewContext: portfolioId
          ? {
              ...reviewContext,
              portfolioId,
            }
          : undefined,
        fromMode: "suitability",
      }),
    };
  });
  return {
    totalCount: rows.length,
    actionCount: rows.filter((row) => row.policyStatus !== "Ready").length,
    rows,
  };
}

export function buildPolicyReviewQueueEmptyPresentation({
  portfolioId,
  rowCount,
  isRefreshing,
  hasRefreshFailure,
}: {
  portfolioId: string;
  rowCount: number;
  isRefreshing: boolean;
  hasRefreshFailure: boolean;
}): PolicyReviewQueueEmptyPresentation | null {
  if (rowCount > 0) {
    return null;
  }

  if (isRefreshing) {
    return {
      kind: "loading",
      title: `Refreshing ${SUITABILITY_WORKFLOW_LABELS.reviewWorklist.toLowerCase()}`,
      body: "Confirming whether any suitability evaluations need adviser review.",
    };
  }

  if (hasRefreshFailure) {
    return {
      kind: "partial",
      title: `${SUITABILITY_WORKFLOW_LABELS.reviewWorklist} is unconfirmed`,
      body: "The latest suitability review worklist could not be confirmed. Retry before concluding that no evaluations need review.",
    };
  }

  return {
    kind: "empty",
    title: "No suitability reviews need attention",
    body: `No suitability evaluations are waiting for review for ${portfolioId}.`,
  };
}

export function buildPolicyEvaluationEvidenceModel({
  evaluation,
  signOffPackage,
  workflow,
  selectedReview,
  portfolioId,
}: {
  evaluation?: AdvisoryPolicyEvaluationRecord | null;
  signOffPackage?: AdvisoryPolicySignOffPackageData | null;
  workflow?: AdvisoryPolicyWorkflowData | null;
  selectedReview?: PolicyReviewQueueRow | null;
  portfolioId?: string | null;
}): PolicyEvaluationEvidenceModel | null {
  if (!evaluation) {
    return null;
  }

  const sourceRefs = stringArray(evaluation.source_refs);
  const sourceGaps = stringArray(evaluation.source_gaps);
  const ruleResults = recordArray(
    recordValue(evaluation.evaluation_json)?.rule_results,
  );
  const packagePosture = recordValue(signOffPackage?.package_posture);
  const lineage = recordValue(signOffPackage?.lineage);
  const lineagePosture = recordValue(lineage?.lineage_posture);
  const auditEvents = recordArray(lineage?.audit_events);
  const approvalDependencies = stringArray(evaluation.approval_dependencies);
  const disclosureRequirements = stringArray(
    evaluation.disclosure_requirements,
  );
  const consentRequirements = stringArray(evaluation.consent_requirements);
  const workflowBlockers = stringArray(workflow?.sign_off_blockers);
  const sourceEvaluationHash = stringValue(evaluation.evaluation_hash, "");
  const evaluationId = stringValue(
    evaluation.evaluation_id,
    "Evaluation not reported",
  );
  const evaluationPortfolioId = stringValue(
    evaluation.portfolio_id,
    "Portfolio not reported",
  );
  const proposalId = stringValue(
    evaluation.proposal_id,
    "Proposal not reported",
  );
  const proposalVersion = stringValue(
    evaluation.proposal_version_id,
    "Version not reported",
  );

  return {
    evaluationId,
    proposalId,
    proposalVersion,
    policyPack: policyLabel(
      evaluation.policy_pack_id,
      evaluation.policy_version,
    ),
    sourceIdentityAligned: sourceIdentityAligned({
      evaluationId,
      proposalId,
      proposalVersion,
      evaluationPortfolioId,
      evaluationIdentityComplete: requiredIdentityPresent([
        evaluation.evaluation_id,
        evaluation.portfolio_id,
        evaluation.proposal_id,
        evaluation.proposal_version_id,
      ]),
      selectedReview,
      portfolioId,
      signOffPackage,
      workflow,
    }),
    sourceEvaluationHash: sourceEvaluationHash || null,
    policyStatus: policyStatusLabel(evaluation.evaluation_status),
    policyStatusTone: policyStatusTone(evaluation.evaluation_status),
    sourcePosture: evidencePosture(sourceGaps),
    sourceRefs: sourceRefs.map(friendlySourceRef).slice(0, 4),
    sourceGaps: sourceGaps.map(friendlyRequirement).slice(0, 4),
    ruleCount: ruleResults.length,
    blockingRuleCount: ruleResults.filter(
      (rule) => policyStatusTone(rule.status) === "danger",
    ).length,
    approvalDependencies: approvalDependencies
      .map(friendlyRequirement)
      .slice(0, 4),
    disclosureRequirements: disclosureRequirements
      .map(friendlyRequirement)
      .slice(0, 4),
    consentRequirements: consentRequirements
      .map(friendlyRequirement)
      .slice(0, 4),
    auditEventCount: auditEvents.length,
    signOffPackagePosture: signOffPackagePosture(packagePosture),
    clientPublicationPosture: clientPublicationPosture(
      packagePosture,
      lineagePosture,
    ),
    workflowStatus: workflowStatusLabel(workflow?.sign_off_status),
    workflowTone: workflowStatusTone(workflow?.sign_off_status),
    makerCheckerPosture:
      workflow?.maker_checker_required === true
        ? "Independent checker required"
        : "Maker-checker requirement not reported",
    slaPosture: slaPosture(recordValue(workflow?.sla_posture)),
    workflowBlockers: workflowBlockers.map(friendlyRequirement).slice(0, 4),
    nextAction: nextAction({
      policyStatus: evaluation.evaluation_status,
      approvalDependencies,
      disclosureRequirements,
      consentRequirements,
    }),
  };
}

function sourceIdentityAligned({
  evaluationId,
  proposalId,
  proposalVersion,
  evaluationPortfolioId,
  evaluationIdentityComplete,
  selectedReview,
  portfolioId,
  signOffPackage,
  workflow,
}: {
  evaluationId: string;
  proposalId: string;
  proposalVersion: string;
  evaluationPortfolioId: string;
  evaluationIdentityComplete: boolean;
  selectedReview?: PolicyReviewQueueRow | null;
  portfolioId?: string | null;
  signOffPackage?: AdvisoryPolicySignOffPackageData | null;
  workflow?: AdvisoryPolicyWorkflowData | null;
}): boolean {
  const packageEvaluation = signOffPackage?.evaluation;
  return (
    evaluationIdentityComplete &&
    (!selectedReview ||
      (selectedReview.sourceIdentityComplete &&
        evaluationId === selectedReview.evaluationId &&
        proposalId === selectedReview.proposalId &&
        proposalVersion === selectedReview.proposalVersion &&
        evaluationPortfolioId === selectedReview.portfolioId)) &&
    (!portfolioId ||
      (evaluationPortfolioId === portfolioId &&
        (!selectedReview || selectedReview.portfolioId === portfolioId))) &&
    valuesAgree(evaluationPortfolioId, [
      packageEvaluation?.portfolio_id,
      signOffPackage?.lineage?.portfolio_id,
      workflow?.portfolio_id,
    ]) &&
    valuesAgree(evaluationId, [
      packageEvaluation?.evaluation_id,
      signOffPackage?.lineage?.evaluation_id,
      workflow?.evaluation_id,
    ]) &&
    valuesAgree(proposalId, [
      packageEvaluation?.proposal_id,
      signOffPackage?.lineage?.proposal_id,
      workflow?.proposal_id,
    ]) &&
    valuesAgree(proposalVersion, [
      packageEvaluation?.proposal_version_id,
      signOffPackage?.lineage?.proposal_version_id,
      workflow?.proposal_version_id,
    ])
  );
}

function requiredIdentityPresent(candidates: unknown[]): boolean {
  return candidates.every(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );
}

function valuesAgree(expected: string, candidates: unknown[]): boolean {
  return candidates.every(
    (candidate) =>
      candidate == null ||
      (typeof candidate === "string" &&
        (!candidate.trim() || candidate.trim() === expected)),
  );
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
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function policyLabel(policyPackId: unknown, policyVersion: unknown): string {
  const pack = friendlyPhrase(
    stringValue(policyPackId, "Policy pack not reported"),
  );
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
  if (
    Array.isArray(record.sign_off_events_json) &&
    record.sign_off_events_json.length > 0
  ) {
    return "Sign-off recorded";
  }
  if (record.evaluation_status === "READY") {
    return "Ready for sign-off";
  }
  return "Sign-off pending";
}

function signOffTone(
  record: AdvisoryPolicyEvaluationRecord,
): SemanticBadgeTone {
  if (
    Array.isArray(record.sign_off_events_json) &&
    record.sign_off_events_json.length > 0
  ) {
    return "success";
  }
  return record.evaluation_status === "READY" ? "success" : "warn";
}

function workflowStatusLabel(status: unknown): string {
  switch (status) {
    case "READY_FOR_SIGN_OFF":
      return "Ready for sign-off";
    case "SIGNED_OFF":
      return "Signed off";
    case "PENDING_REVIEW":
      return "Review required";
    case "BLOCKED":
      return "Blocked";
    default:
      return "Workflow not reported";
  }
}

function workflowStatusTone(status: unknown): SemanticBadgeTone {
  switch (status) {
    case "READY_FOR_SIGN_OFF":
    case "SIGNED_OFF":
      return "success";
    case "PENDING_REVIEW":
      return "warn";
    case "BLOCKED":
      return "danger";
    default:
      return "default";
  }
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
    countPhrase(
      approvalDependencies.length,
      "approval dependency",
      "approval dependencies",
    ),
    countPhrase(
      disclosureRequirements.length,
      "disclosure review",
      "disclosure reviews",
    ),
    countPhrase(
      consentRequirements.length,
      "client consent",
      "client consents",
    ),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "No open requirements reported";
}

function countPhrase(
  count: number,
  singular: string,
  plural: string,
): string | null {
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
    return "Resolve blocking policy evidence before adviser sign-off.";
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

function signOffPackagePosture(
  posture: Record<string, unknown> | null,
): string {
  const sourcePackage = stringValue(posture?.sign_off_source_package, "");
  if (sourcePackage.includes("SUPPORTED")) {
    return "Source package available";
  }
  return "Source package posture not reported";
}

function clientPublicationPosture(
  packagePosture: Record<string, unknown> | null,
  lineagePosture: Record<string, unknown> | null,
): string {
  const value =
    stringValue(packagePosture?.client_ready_publication, "") ||
    stringValue(lineagePosture?.client_ready_publication, "");
  return value === "BLOCKED"
    ? "Client publication blocked"
    : "Client publication not supported";
}

function slaPosture(posture: Record<string, unknown> | null): string {
  const status = stringValue(posture?.status, "");
  const openCount =
    typeof posture?.open_requirement_count === "number"
      ? posture.open_requirement_count
      : null;
  const label = status === "OVERDUE" ? "Review overdue" : "Within review deadline";
  return openCount === null ? label : `${label}, ${openCount} open`;
}

function friendlySourceRef(value: string): string {
  return friendlyPhrase(
    value.replace(/^lotus-[^:]+:/, "").replace(/^lotus-/, ""),
  );
}

function friendlyRequirement(value: string): string {
  const parts = value.split(":").filter(Boolean);
  return friendlyPhrase(parts.at(-1) ?? value);
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
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}
