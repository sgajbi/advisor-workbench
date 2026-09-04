import type { PortfolioScreenRailModeItem } from "@/apps/portfolio/components/portfolio-screen-rail";
import type { PortfolioReviewContext } from "@/apps/portfolio/portfolio-screen-navigation";
import { MANAGE_OUTCOME_REVIEW_LABELS } from "@/features/workbench/manage-terminology";
import { buildReviewContextHref } from "@/shell/review-context";

export type ManageMode =
  | "overview"
  | "mandate"
  | "waves"
  | "construction"
  | "memory"
  | "copilot"
  | "quality"
  | "reviews"
  | "proof";

export type ManageModeDefinition = {
  key: ManageMode;
  label: string;
  detail: string;
  title: string;
  description: string;
};

export const MANAGE_MODE_DEFINITIONS: ManageModeDefinition[] = [
  {
    key: "overview",
    label: "Overview",
    detail: "Mandate posture",
    title: "Manage Overview",
    description: "Discretionary mandate readiness and rebalance posture.",
  },
  {
    key: "mandate",
    label: "Mandate",
    detail: "Health and exceptions",
    title: "Mandate Health",
    description: "Mandate readiness, attention items, and recommended actions.",
  },
  {
    key: "waves",
    label: "Rebalance",
    detail: "Rebalance lifecycle",
    title: "Rebalance Waves",
    description: "Rebalance simulation, approval readiness, and execution handoff.",
  },
  {
    key: "construction",
    label: "Construction",
    detail: "Alternatives",
    title: "Construction Alternatives",
    description: "Supported construction alternatives for advisor and PM review.",
  },
  {
    key: "memory",
    label: "Memory",
    detail: "Portfolio memory",
    title: "Portfolio Memory",
    description: "Portfolio decision memory and operating history.",
  },
  {
    key: "copilot",
    label: "Copilot",
    detail: "AI workflow packs",
    title: "PM Copilot",
    description: "Governed internal decision support from the portfolio evidence under review.",
  },
  {
    key: "quality",
    label: "PM Quality",
    detail: "Operating quality",
    title: "PM Operating Quality",
    description: "Governance review of Manage-owned PM quality policy and evidence.",
  },
  {
    key: "reviews",
    label: "Reviews",
    detail: "Outcome review",
    title: MANAGE_OUTCOME_REVIEW_LABELS.screenTitle,
    description:
      "Post-rebalance expected-versus-realised comparison and evidence review.",
  },
  {
    key: "proof",
    label: "Evidence",
    detail: "Decision evidence",
    title: "Evidence Pack",
    description: "Mandate evidence, approval readiness, and client handoff support.",
  },
];

export function buildManageModeItems(
  reviewContext: PortfolioReviewContext,
  activeMode: ManageMode
): PortfolioScreenRailModeItem[] {
  return MANAGE_MODE_DEFINITIONS.map((mode) => ({
    key: mode.key,
    label: mode.label,
    detail: mode.detail,
    active: activeMode === mode.key,
    href: buildManageModeHref(reviewContext, mode.key),
    prefetch: false,
    title: mode.description,
  }));
}

export function buildManageModeHref(
  reviewContext: PortfolioReviewContext,
  mode: ManageMode,
) {
  const {
    portfolioId,
    selectedRecordId: _selectedRecordId,
    batchId: _batchId,
    ...workspaceContext
  } = reviewContext;
  const destination =
    mode === "overview"
      ? `/workbench/${encodeURIComponent(portfolioId)}`
      : `/workbench/${encodeURIComponent(portfolioId)}?mode=${mode}`;
  return buildReviewContextHref(destination, {
    ...workspaceContext,
    portfolioId,
  });
}

export function normalizeManageMode(value: string | undefined): ManageMode {
  const requested = value?.trim().toLowerCase();
  return MANAGE_MODE_DEFINITIONS.some((mode) => mode.key === requested)
    ? (requested as ManageMode)
    : "overview";
}

export function getManageModeDefinition(mode: ManageMode) {
  return (
    MANAGE_MODE_DEFINITIONS.find((definition) => definition.key === mode) ??
    MANAGE_MODE_DEFINITIONS[0]
  );
}
