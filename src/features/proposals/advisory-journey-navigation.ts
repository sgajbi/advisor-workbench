import type { PortfolioScreenRailModeItem } from "@/apps/portfolio/components/portfolio-screen-rail";
import { PROPOSAL_DISCUSSION_PACK_COPY } from "@/copy/proposal-discussion-pack-copy";
import {
  buildReviewContextHref,
  type ReviewContext,
} from "@/shell/review-context";
import { SUITABILITY_WORKFLOW_LABELS } from "./suitability-terminology";

export type AdvisoryJourneyReviewContext = ReviewContext &
  Readonly<{ portfolioId: string }>;

export type AdvisoryJourneyMode =
  | "overview"
  | "cockpit"
  | "copilot"
  | "client-context"
  | "opportunities"
  | "proposal-builder"
  | "suitability"
  | "risk-impact"
  | "approval-queue"
  | "discussion-pack"
  | "implementation"
  | "proof";

export type AdvisoryJourneyDefinition = {
  key: AdvisoryJourneyMode;
  label: string;
  detail: string;
  title: string;
  description: string;
  primaryDecision: string;
  nextAction: string;
  dataSources: string[];
  shellVisible: boolean;
};

export const ADVISORY_JOURNEY_DEFINITIONS: AdvisoryJourneyDefinition[] = [
  {
    key: "overview",
    label: "Overview",
    detail: "Adviser priorities",
    title: "Advisory Overview",
    description:
      "Prioritise open proposals and continue the next permitted advisory action.",
    primaryDecision: "Which client or portfolio action needs attention first?",
    nextAction: "Open the relevant opportunity, proposal, or approval item.",
    dataSources: ["lotus-gateway", "lotus-advise", "lotus-core"],
    shellVisible: true,
  },
  {
    key: "cockpit",
    label: "Cockpit",
    detail: "Operating actions",
    title: "Advisor Cockpit",
    description:
      "Advisor priorities, preparation evidence, operating boundaries, and review posture.",
    primaryDecision:
      "Which source-backed action needs advisor attention first?",
    nextAction:
      "Review the action item and record acknowledgement only when appropriate.",
    dataSources: ["lotus-gateway", "lotus-advise"],
    shellVisible: true,
  },
  {
    key: "copilot",
    label: "Copilot",
    detail: "Advisor review",
    title: "Advisory Copilot",
    description:
      "Gateway-backed advisor-use copilot actions over Advise-owned source evidence.",
    primaryDecision:
      "Which source-backed copilot action should support internal advisor review?",
    nextAction:
      "Prepare the evidence packet, review the generated output, and keep client publication blocked.",
    dataSources: ["lotus-gateway", "lotus-advise", "lotus-ai"],
    shellVisible: true,
  },
  {
    key: "client-context",
    label: "Client Context",
    detail: "Profile and mandate",
    title: "Client Context",
    description:
      "Client profile, mandate, liquidity, constraints, and suitability baseline.",
    primaryDecision:
      "Is the advisory idea aligned to documented client context?",
    nextAction: "Confirm mandate and constraints before drafting an idea.",
    dataSources: ["lotus-gateway", "lotus-core", "lotus-manage"],
    shellVisible: false,
  },
  {
    key: "opportunities",
    label: "Ideas",
    detail: "Opportunities",
    title: "Opportunities And Ideas",
    description:
      "Advisor ideas, monitored opportunities, and recommended follow-up candidates.",
    primaryDecision: "Which opportunity should become a proposal?",
    nextAction: "Promote the selected idea into the proposal builder.",
    dataSources: [
      "lotus-gateway",
      "lotus-advise",
      "lotus-performance",
      "lotus-risk",
    ],
    shellVisible: true,
  },
  {
    key: "proposal-builder",
    label: "Builder",
    detail: "Draft trades",
    title: "Proposal Builder",
    description:
      "Position-level proposal construction from the live portfolio book.",
    primaryDecision:
      "What buy, sell, off-book, or cash movement should be tested?",
    nextAction: "Evaluate the workspace through Advise.",
    dataSources: ["lotus-gateway", "lotus-advise", "lotus-core"],
    shellVisible: true,
  },
  {
    key: "suitability",
    label: "Suitability",
    detail: "Mandate fit",
    title: SUITABILITY_WORKFLOW_LABELS.review,
    description: "Mandate, suitability, disclosure, and blocking-issue review.",
    primaryDecision:
      "Can the proposal proceed under documented client and product constraints?",
    nextAction: "Resolve blockers or request approval.",
    dataSources: ["lotus-gateway", "lotus-advise", "lotus-manage"],
    shellVisible: true,
  },
  {
    key: "risk-impact",
    label: "Risk Impact",
    detail: "Risk and allocation",
    title: "Risk and Impact",
    description:
      "Concentration, risk, allocation, liquidity, and performance impact.",
    primaryDecision: "Is the risk and performance trade-off acceptable?",
    nextAction: "Attach risk evidence to the approval pack.",
    dataSources: [
      "lotus-gateway",
      "lotus-risk",
      "lotus-performance",
      "lotus-advise",
    ],
    shellVisible: true,
  },
  {
    key: "approval-queue",
    label: "Approvals",
    detail: "Review worklist",
    title: "Approval Queue",
    description:
      "Advisor review posture, supporting evidence, and governed next actions.",
    primaryDecision:
      "Which proposals are ready, blocked, or waiting for review?",
    nextAction: "Open a proposal to verify evidence and determine the governed next step.",
    dataSources: ["lotus-gateway", "lotus-advise"],
    shellVisible: true,
  },
  {
    key: "discussion-pack",
    ...PROPOSAL_DISCUSSION_PACK_COPY.navigation,
    dataSources: ["lotus-gateway", "lotus-advise", "lotus-report"],
    shellVisible: true,
  },
  {
    key: "implementation",
    label: "Implementation",
    detail: "Execution follow-up",
    title: "Implementation Status",
    description:
      "Execution handoff, implementation status, and post-trade follow-up.",
    primaryDecision: "Has the approved proposal been implemented as intended?",
    nextAction: "Track execution status and follow-up exceptions.",
    dataSources: ["lotus-gateway", "lotus-advise", "lotus-manage"],
    shellVisible: true,
  },
  {
    key: "proof",
    label: "Proof",
    detail: "Supported claims",
    title: "Bank Demo Proof",
    description:
      "Gateway-backed scenario, supported claims, and publication boundaries for the advisory demo journey.",
    primaryDecision:
      "Which bank-demo claims are implementation-backed enough for advisor or pre-sales use?",
    nextAction:
      "Use source-owned claim wording and keep blocked claims out of client-ready material.",
    dataSources: ["lotus-gateway", "lotus-advise"],
    shellVisible: true,
  },
];

export function buildAdvisoryJourneyHref(
  reviewContext: AdvisoryJourneyReviewContext,
  mode: AdvisoryJourneyMode,
): string {
  const {
    selectedRecordId: _selectedRecordId,
    batchId: _batchId,
    ...workspaceContext
  } = reviewContext;
  let destination: string;
  switch (mode) {
    case "overview":
      destination = "/recommendations";
      break;
    case "opportunities":
      destination = "/recommendations?mode=opportunities";
      break;
    case "cockpit":
      destination = "/recommendations?mode=cockpit";
      break;
    case "copilot":
      destination = "/recommendations?mode=copilot";
      break;
    case "proof":
      destination = "/recommendations?mode=proof";
      break;
    case "proposal-builder":
      destination = "/proposals/simulate";
      break;
    case "client-context":
      destination = "/portfolio";
      break;
    case "approval-queue":
      destination = "/proposals";
      break;
    default:
      destination = `/proposals?mode=${mode}`;
  }
  return buildReviewContextHref(destination, workspaceContext);
}

export function buildAdvisoryJourneyModeItems(
  reviewContext: AdvisoryJourneyReviewContext,
  activeMode: AdvisoryJourneyMode,
): PortfolioScreenRailModeItem[] {
  return ADVISORY_JOURNEY_DEFINITIONS.filter(
    (definition) => definition.shellVisible,
  ).map((definition) => ({
    key: definition.key,
    label: definition.label,
    detail: definition.detail,
    active: activeMode === definition.key,
    href: buildAdvisoryJourneyHref(reviewContext, definition.key),
    title: definition.description,
  }));
}

export function normalizeAdvisoryJourneyMode(
  value: string | undefined,
): AdvisoryJourneyMode {
  const requested = value?.trim().toLowerCase();
  return ADVISORY_JOURNEY_DEFINITIONS.some(
    (definition) => definition.key === requested,
  )
    ? (requested as AdvisoryJourneyMode)
    : "overview";
}

export function getAdvisoryJourneyDefinition(
  mode: AdvisoryJourneyMode,
): AdvisoryJourneyDefinition {
  return (
    ADVISORY_JOURNEY_DEFINITIONS.find(
      (definition) => definition.key === mode,
    ) ?? ADVISORY_JOURNEY_DEFINITIONS[0]
  );
}
