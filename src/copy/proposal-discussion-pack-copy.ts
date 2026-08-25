export const PROPOSAL_DISCUSSION_PACK_COPY = Object.freeze({
  navigation: Object.freeze({
    label: "Discussion pack",
    detail: "Meeting material",
    title: "Discussion pack review",
    description:
      "Review the current meeting rationale, decision memo, disclosures and client-use controls.",
    primaryDecision:
      "What remains before this material can support a client discussion?",
    nextAction:
      "Resolve narrative, memo, disclosure and consent actions before using the pack.",
  }),
  worklistAriaLabel: "Discussion pack proposals",
  defaultNextAction:
    "Confirm the meeting material and every client-use control.",
  selectedRecordLabel: "Selected discussion pack",
  selectionStatus:
    "Discussion-pack information is being checked for the selected proposal version.",
  decisionLabel: "Meeting decision",
  refreshAction: "Refresh discussion pack",
  refreshingAction: "Refreshing discussion pack…",
  controlsLabel: "Meeting controls",
  controlsTitle: "Client-discussion checklist",
  controlsBoundary: "Internal approval does not permit client release.",
  narrativeLabel: "Meeting preparation",
  narrativeTitle: "Adviser conversation narrative",
  narrativeEvidenceUnavailable:
    "Conversation narrative and preparation details are unavailable for this proposal version.",
  policyEvidenceUnavailable:
    "Disclosure requirements are unavailable for this proposal version.",
  generation: Object.freeze({
    aiAssisted: "AI-assisted draft",
    deterministic: "Template-prepared narrative",
    notReported: "Preparation method not reported",
  }),
  controlSources: Object.freeze({
    narrative: "Narrative review record",
    memo: "Memo review record",
    reportPackage: "Report production record",
    consent: "Consent record",
    release: "Client release control",
    currentVersion: "Current proposal version",
  }),
  releaseSummary:
    "Internal preparation does not authorise publication, delivery or client contact.",
  supportDetailsLabel: "Support details",
  supportReferenceLabel: "Support reference",
  responseVersionLabel: "Response version",
  footer:
    "Continue in the full proposal record to complete reviews and controls. This workspace cannot publish, deliver or send material to the client.",
  memoLabel: "Decision record",
  memoTitle: "Adviser decision memo",
  registerLabel: "Client-use controls",
  registerTitle: "Disclosure and limitation register",
  noIssueTitle: "No disclosure issue reported",
  noIssueBody:
    "An empty register does not confirm client-release approval. Verify the release control before any external use.",
  memoUnavailable:
    "No usable adviser memo is available for this proposal version.",
  sourceLabel: "Proposal discussion material and client-use controls",
  boundaryNote:
    "Adviser-use material, a report package and recorded client consent do not authorise publication, delivery or client contact.",
});

export const PROPOSAL_DISCUSSION_PACK_STATE_COPY = Object.freeze({
  permissionBlocked: Object.freeze({
    title: "Discussion pack access is restricted",
    body:
      "You cannot view the current narrative, memo, report package, consent or release controls. No discussion material is shown. Select an entitled portfolio or contact access support.",
  }),
  loading: Object.freeze({
    title: "Preparing the discussion pack",
    body:
      "Checking the current narrative, decision memo, report package, consent and client-use controls.",
  }),
  unavailable: Object.freeze({
    title: "Discussion pack is unavailable",
    body:
      "The current proposal version could not be loaded. No lifecycle status has been used as a substitute. Retry before using this material for meeting preparation.",
  }),
  incomplete: Object.freeze({
    title: "Discussion pack is incomplete",
    body:
      "The current proposal version did not return one complete set of meeting material and client-use controls. No earlier version is substituted. Refresh before relying on this pack.",
  }),
  narrativeUnavailable: Object.freeze({
    title: "Conversation narrative is unavailable",
    body:
      "The current proposal version has no usable conversation narrative. Other confirmed discussion-pack information remains visible. Refresh or continue in the proposal record before relying on the narrative.",
  }),
});

export type ProposalDiscussionPackStatus =
  | "incomplete"
  | "action-required"
  | "internal-ready";

export function proposalDiscussionPackStatusCopy(
  status: ProposalDiscussionPackStatus,
) {
  switch (status) {
    case "incomplete":
      return {
        label: "Information incomplete",
        title: "Complete the discussion pack before use",
        summary:
          "Some meeting material or client-use controls are unavailable. Confirmed items remain available for internal preparation. Refresh or resolve the missing information before a client discussion.",
        nextAction:
          "Resolve the unavailable information before relying on this pack in a client meeting.",
      };
    case "action-required":
      return {
        label: "Action required",
        title: "Resolve the remaining client-discussion controls",
        summary:
          "The current proposal version is available for internal preparation, but at least one narrative, memo, package, consent or release control still needs action.",
        nextAction:
          "Open the proposal record and complete the highlighted review or client-use control.",
      };
    case "internal-ready":
      return {
        label: "Internal review complete",
        title: "Meeting material is ready for internal use",
        summary:
          "The current narrative, decision memo, report package and consent record are available for this proposal version. Client release still requires separate approval.",
        nextAction:
          "Use this version for internal meeting preparation and confirm release approval before any external use.",
      };
  }
}

export type ProposalDiscussionPackRefreshState =
  | "failed"
  | "pending"
  | "confirmed";

export function proposalDiscussionPackRefreshCopy({
  state,
  hasConfirmedMaterial,
}: {
  state: ProposalDiscussionPackRefreshState;
  hasConfirmedMaterial: boolean;
}) {
  if (state === "failed") {
    return {
      eyebrow: "Discussion pack not updated",
      title: "Update failed",
      message: hasConfirmedMaterial
        ? "Earlier confirmed material remains visible. Retry before treating it as current."
        : "No current discussion pack is available. Retry before continuing.",
    };
  }
  if (state === "pending") {
    return {
      eyebrow: "Updating discussion pack",
      title: "Checking the current version",
      message:
        "Refreshing the narrative, decision memo, report package, consent and client-use controls.",
    };
  }
  return {
    eyebrow: "Discussion pack updated",
    title: "Current version available",
  };
}

const CAPABILITY_LABELS = Object.freeze({
  proposal_identity: "Proposal identity",
  advisor_narrative: "Conversation narrative",
  advisor_memo: "Decision memo",
  disclosure_policy: "Disclosure requirements",
  report_package: "Report package",
  approval_and_consent_records: "Approval and consent records",
  client_release: "Client release",
  client_delivery: "Client delivery",
});

const CAPABILITY_STATE_LABELS = Object.freeze({
  supported: "Available",
  partial: "Incomplete",
  restricted: "Restricted",
  unavailable: "Unavailable",
  not_available: "Unavailable",
  not_supported: "Not supported",
});

const MEMO_STATUS_LABELS = Object.freeze({
  READY: "Ready",
  PENDING_REVIEW: "Review required",
  BLOCKED: "Blocked",
  supported: "Available",
  partial: "Incomplete",
  restricted: "Restricted",
  unavailable: "Unavailable",
  not_available: "Unavailable",
  not_supported: "Not supported",
});

const MEMO_OWNER_LABELS = Object.freeze({
  ADVISOR: "Adviser",
  RELATIONSHIP_MANAGER: "Relationship manager",
  PORTFOLIO_MANAGER: "Portfolio manager",
  INVESTMENT_SPECIALIST: "Investment specialist",
  RISK: "Risk",
  COMPLIANCE: "Compliance",
  OPERATIONS: "Operations",
});

const PRODUCT_TYPE_LABELS = Object.freeze({
  MULTI_ASSET: "Multi-asset",
  EQUITY: "Equity",
  FIXED_INCOME: "Fixed income",
  CASH: "Cash",
  ALTERNATIVES: "Alternatives",
  FUND: "Fund",
  STRUCTURED_PRODUCT: "Structured product",
});

const LIMITATION_AREA_LABELS = Object.freeze({
  report_archive_lineage: "Released document record",
});

const USE_PURPOSE_LABELS = Object.freeze({
  ADVISOR_REVIEW: "Adviser review",
  CLIENT_READY: "Client-use review",
});

export function proposalDiscussionCapabilityLabel(sourceValue: string): string {
  return lookup(CAPABILITY_LABELS, sourceValue, "Additional control");
}

export function proposalDiscussionCapabilityStateLabel(
  sourceValue: string,
): string {
  return lookup(CAPABILITY_STATE_LABELS, sourceValue, "Review required");
}

export function proposalDiscussionMemoStatusLabel(sourceValue: string): string {
  return lookup(MEMO_STATUS_LABELS, sourceValue, "Review required");
}

export function proposalDiscussionMemoOwnerLabel(sourceValue: string): string {
  return lookup(MEMO_OWNER_LABELS, sourceValue, "Owner not reported");
}

export function proposalDiscussionProductTypeLabel(sourceValue: string): string {
  return lookup(PRODUCT_TYPE_LABELS, sourceValue, "Product type not reported");
}

export function proposalDiscussionLimitationAreaLabel(
  sourceValue: string,
): string {
  return lookup(LIMITATION_AREA_LABELS, sourceValue, "Supporting record");
}

export function proposalDiscussionUsePurposeLabel(sourceValue: string): string {
  return lookup(USE_PURPOSE_LABELS, sourceValue, "Client-use review");
}

function lookup(
  labels: Readonly<Record<string, string>>,
  sourceValue: string,
  fallback: string,
): string {
  return labels[sourceValue] ?? fallback;
}
