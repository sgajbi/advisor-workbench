import type {
  BankDemoScenarioContractData,
  BankDemoScenarioStep,
  BankDemoSupportedClaim,
  BankDemoSupportedClaimClassification,
  BankDemoSupportedClaimRegisterData,
} from "./types";

type BadgeTone = "default" | "success" | "warn" | "danger";

export type BankDemoProofMetric = {
  label: string;
  value: string;
  detail: string;
  tone: BadgeTone;
};

export type BankDemoProofStepRow = {
  stepId: string;
  title: string;
  owner: string;
  evidenceRefs: string;
  workbenchPanels: string;
};

export type BankDemoProofClaimRow = {
  claimId: string;
  title: string;
  classification: string;
  classificationTone: BadgeTone;
  audience: string;
  materials: string;
  claimText: string;
  proofRequirements: string;
  wordingRules: string[];
  isClientFacingBlocked: boolean;
};

export type BankDemoProofModel = {
  scenarioId: string;
  portfolioId: string;
  governedAsOfDate: string;
  proofMarker: string;
  primaryDecision: string;
  recommendedAction: string;
  metrics: BankDemoProofMetric[];
  steps: BankDemoProofStepRow[];
  claims: BankDemoProofClaimRow[];
  unsupportedBoundaries: string[];
  artifactPolicyRules: string[];
  sourceProducts: string[];
};

export function buildBankDemoProofModel({
  scenario,
  claimRegister,
  portfolioId,
}: {
  scenario?: BankDemoScenarioContractData;
  claimRegister?: BankDemoSupportedClaimRegisterData;
  portfolioId: string;
}): BankDemoProofModel {
  const claims = (claimRegister?.claims ?? []).map(mapClaim);
  const implementationBackedCount = claims.filter(
    (claim) => claim.classification === "Implementation Backed",
  ).length;
  const blockedClaimCount = claims.filter((claim) => claim.isClientFacingBlocked).length;
  const steps = (scenario?.steps ?? []).map(mapStep);
  const unsupportedBoundaries = normalizeList(scenario?.unsupported_boundaries);
  const sourceProducts = normalizeList(scenario?.required_source_products).map(formatSourceProduct);
  const artifactPolicyRules = normalizeArtifactRules(claimRegister?.artifact_policy);

  return {
    scenarioId: scenario?.scenario_id ?? claimRegister?.scenario_id ?? "Not published",
    portfolioId:
      scenario?.primary_portfolio_id ?? claimRegister?.primary_portfolio_id ?? portfolioId,
    governedAsOfDate: formatDate(scenario?.governed_as_of_date),
    proofMarker: scenario?.proof_marker ?? claimRegister?.proof_marker ?? "Not published",
    primaryDecision:
      "Which bank-demo claims are implementation-backed enough for advisor or pre-sales use?",
    recommendedAction:
      blockedClaimCount > 0
        ? "Use the supported-claim register wording and keep blocked publication claims out of client-ready material."
        : "Use implementation-backed claims with the recorded proof marker and scenario contract.",
    metrics: [
      {
        label: "Scenario",
        value: scenario?.scenario_id ? "Published" : "Unavailable",
        detail: scenario?.scenario_id ?? "No source-owned scenario contract loaded.",
        tone: scenario?.scenario_id ? "success" : "warn",
      },
      {
        label: "Proof Marker",
        value: scenario?.proof_marker ? "Required" : "Missing",
        detail: scenario?.proof_marker ?? "Proof marker not available.",
        tone: scenario?.proof_marker ? "success" : "warn",
      },
      {
        label: "Claims",
        value: String(claims.length),
        detail: `${implementationBackedCount} implementation-backed, ${blockedClaimCount} blocked or planned.`,
        tone: blockedClaimCount > 0 ? "warn" : "success",
      },
      {
        label: "Client Publication",
        value: blockedClaimCount > 0 ? "Blocked" : "Review",
        detail:
          blockedClaimCount > 0
            ? "Client-ready publication is not promoted by this surface."
            : "Publication still requires source-owned claim review.",
        tone: blockedClaimCount > 0 ? "danger" : "warn",
      },
    ],
    steps,
    claims,
    unsupportedBoundaries,
    artifactPolicyRules,
    sourceProducts,
  };
}

function mapStep(step: BankDemoScenarioStep): BankDemoProofStepRow {
  return {
    stepId: step.step_id ?? "scenario_step",
    title: step.title ?? "Scenario step",
    owner: formatToken(step.owner_repository ?? "source owner"),
    evidenceRefs:
      normalizeList(step.required_evidence_refs).map(formatEvidenceRef).join(", ") ||
      "None recorded",
    workbenchPanels:
      normalizeList(step.required_workbench_panels).map(formatToken).join(", ") ||
      "Not a Workbench panel",
  };
}

function mapClaim(claim: BankDemoSupportedClaim): BankDemoProofClaimRow {
  const classification = formatClassification(claim.classification);
  const blocked = isBlockedClassification(claim.classification);
  return {
    claimId: claim.claim_id ?? "claim",
    title: claim.title ?? "Supported claim",
    classification,
    classificationTone: toneForClassification(claim.classification),
    audience: normalizeList(claim.audiences).map(formatToken).join(", ") || "Not specified",
    materials: normalizeList(claim.allowed_materials).map(formatToken).join(", ") || "No client-facing material",
    claimText: claim.claim_text ?? "No claim text provided by the source register.",
    proofRequirements:
      (claim.proof_requirements ?? [])
        .map((requirement) => requirement.requirement_id ?? requirement.evidence_ref)
        .filter(Boolean)
        .map((requirement) => formatEvidenceRef(String(requirement)))
        .join(", ") || "No additional proof requirement recorded",
    wordingRules: normalizeList(claim.wording_rules),
    isClientFacingBlocked: blocked,
  };
}

function normalizeArtifactRules(policy: Record<string, unknown> | undefined): string[] {
  if (!policy) {
    return [];
  }
  const rules = policy.sensitive_material_rules;
  return Array.isArray(rules) ? rules.filter((rule): rule is string => typeof rule === "string") : [];
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function isBlockedClassification(
  classification: BankDemoSupportedClaimClassification | undefined,
): boolean {
  return classification === "PLANNED_RFC" || classification === "UNSUPPORTED";
}

function toneForClassification(
  classification: BankDemoSupportedClaimClassification | undefined,
): BadgeTone {
  switch (classification) {
    case "IMPLEMENTATION_BACKED":
      return "success";
    case "DEGRADED_SUPPORTED":
    case "BACKEND_BACKED_UI_PENDING":
      return "warn";
    case "PLANNED_RFC":
    case "UNSUPPORTED":
      return "danger";
    default:
      return "default";
  }
}

function formatClassification(
  classification: BankDemoSupportedClaimClassification | undefined,
): string {
  return formatToken(classification ?? "UNKNOWN");
}

function formatToken(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (["AI", "API", "BFF", "CRM", "OMS", "PDF", "RFC", "RFP", "UI"].includes(upper)) {
        return upper;
      }
      if (/^rfc\d+$/i.test(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function formatEvidenceRef(value: string): string {
  return formatToken(value.replace(/^proof\.assets\./, ""));
}

function formatSourceProduct(value: string): string {
  return value.replace(/:v\d+$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatDate(value: string | undefined): string {
  return value?.trim() || "Not recorded";
}
