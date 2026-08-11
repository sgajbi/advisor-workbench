import type { PortfolioScreenRailModeItem } from "@/apps/portfolio/components/portfolio-screen-rail";

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
    detail: "Advisor priorities",
    title: "Advisory Overview",
    description:
      "Portfolio-scoped advisory priorities, open proposal posture, and next actions.",
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
    title: "Suitability Review",
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
    title: "Risk And Impact",
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
    detail: "Maker-checker",
    title: "Approval Queue",
    description:
      "Advisor, risk, compliance, and maker-checker approval posture.",
    primaryDecision:
      "Which proposals are ready, blocked, or waiting for review?",
    nextAction: "Approve, reject, or return the proposal for revision.",
    dataSources: ["lotus-gateway", "lotus-advise"],
    shellVisible: true,
  },
  {
    key: "discussion-pack",
    label: "Discussion Pack",
    detail: "Gated rationale",
    title: "Discussion Pack Review",
    description:
      "Advisor-reviewed rationale, evidence, and gated discussion-pack posture.",
    primaryDecision:
      "What evidence or review remains before client discussion?",
    nextAction:
      "Resolve policy, memo, narrative, and consent blockers before using the pack.",
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
  portfolioId: string,
  mode: AdvisoryJourneyMode,
): string {
  const encoded = encodeURIComponent(portfolioId);
  switch (mode) {
    case "overview":
      return `/recommendations?portfolioId=${encoded}`;
    case "opportunities":
      return `/recommendations?portfolioId=${encoded}&mode=opportunities`;
    case "cockpit":
      return `/recommendations?portfolioId=${encoded}&mode=cockpit`;
    case "copilot":
      return `/recommendations?portfolioId=${encoded}&mode=copilot`;
    case "proof":
      return `/recommendations?portfolioId=${encoded}&mode=proof`;
    case "proposal-builder":
      return `/proposals/simulate?portfolioId=${encoded}`;
    case "client-context":
      return `/portfolio?portfolioId=${encoded}`;
    case "approval-queue":
      return `/proposals?portfolioId=${encoded}`;
    default:
      return `/proposals?portfolioId=${encoded}&mode=${mode}`;
  }
}

export function buildAdvisoryJourneyModeItems(
  portfolioId: string,
  activeMode: AdvisoryJourneyMode,
): PortfolioScreenRailModeItem[] {
  return ADVISORY_JOURNEY_DEFINITIONS.filter(
    (definition) => definition.shellVisible,
  ).map((definition) => ({
    key: definition.key,
    label: definition.label,
    detail: definition.detail,
    active: activeMode === definition.key,
    href: buildAdvisoryJourneyHref(portfolioId, definition.key),
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
